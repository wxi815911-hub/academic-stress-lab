import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import schema from './schema.mjs';
const contexts = new AsyncLocalStorage();
globalThis.__stressPortableDB = { prepare(sql) {
  const context = contexts.getStore();
  return { bind(...args) { return {
    async first() { return context.db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: context.db.prepare(sql).all(...args) }; },
    async run() { const result=context.db.prepare(sql).run(...args); if(result.changes) context.dirty=true; return {success:true,meta:{changes:Number(result.changes)}}; }
  }; } };
} };
const handlers = await import('../handlers.mjs');
const error = (message,status) => Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export function makeBackend(getStorage) {
 return async function(request) {
  const url=new URL(request.url);
  const match=url.pathname.match(/^\/api\/session(?:\/([A-Z2-9]{6})(?:\/(forum|analytics))?)?$/);
  if(!match) return error('Not found.',404);
  if(!['GET','POST'].includes(request.method)) return error('Method not allowed.',405);
  if(request.headers.get('sec-fetch-site')==='cross-site' || (request.headers.get('origin') && request.headers.get('origin')!==url.origin)) return error('This request is not allowed.',403);
  const raw=request.method==='POST'?await request.text():undefined;
  if(raw?.length>4096) return error('Request is too large.',413);
  const code=match[1];
  const handler=(code?handlers[match[2]||'room']:handlers.create)[request.method];
  if(!handler) return error('Method not allowed.',405);
  try {
   const store=getStorage();
   const tables=['sessions','participants','votes','posts'];
   const primary={sessions:['code'],participants:['code','participant'],votes:['code','stage','participant'],posts:['id']};
   const prefix=code?'records/'+code+'/':null;
   const existing=prefix?await store.get(prefix+'session',{type:'json',consistency:'strong'}):null;
   if(code&&(!existing||existing.deleted||existing.expires_at<Date.now())) return error('This room does not exist or has expired. Ask your presenter for the current code.',404);
   const db=new DatabaseSync(':memory:');
   try {
    db.exec(schema); db.exec('PRAGMA foreign_keys=ON;');
    const insert=(table,row)=> {const keys=Object.keys(row);db.prepare('INSERT INTO '+table+' ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));};
    if(existing) {
     insert('sessions',existing);
     const listing=await store.list({prefix:prefix+'data/'});
     const rows=await Promise.all(listing.blobs.map(async item=>({key:item.key,row:await store.get(item.key,{type:'json',consistency:'strong'})})));
     for(const table of tables.slice(1)) for(const item of rows) if(item.row&&item.key.startsWith(prefix+'data/'+table+'/')) insert(table,item.row);
    }
    const keyOf=(table,row)=>primary[table].map(k=>row[k]).join('-');
    const before=Object.fromEntries(tables.map(table=>[table,new Map(db.prepare('SELECT * FROM '+table).all().map(row=>[keyOf(table,row),JSON.stringify(row)]))]));
    const ctx={db,dirty:false};
    const retryRequest=new Request(request.url,{method:request.method,headers:request.headers,...(raw!==undefined?{body:raw}:{})});
    const response=await contexts.run(ctx,()=>handler(retryRequest,{params:Promise.resolve({code})}));
    if(!response.ok||!ctx.dirty) return response;
    const result=code?{code}:await response.clone().json();
    const root='records/'+result.code+'/';
    const after=Object.fromEntries(tables.map(table=>[table,db.prepare('SELECT * FROM '+table).all()]));
    if(!code) {
     const saved=await store.setJSON(root+'session',after.sessions[0],{onlyIfNew:true});
     if(!saved.modified)return error('Please create the classroom again.',409);
    } else if(!after.sessions.length) {
     await store.setJSON(root+'session',{deleted:true});
     const listing=await store.list({prefix:root+'data/'});
     await Promise.all(listing.blobs.map(item=>store.delete(item.key)));
    } else {
     // Each participant, vote and post has its own durable key. Concurrent
     // students never overwrite a shared room snapshot or one another's rows.
     const writes=[];
     for(const table of tables) {
      const remaining=new Set();
      for(const row of after[table]) {
       const key=keyOf(table,row);remaining.add(key);
       if(before[table].get(key)!==JSON.stringify(row)) writes.push(store.setJSON(table==='sessions'?root+'session':root+'data/'+table+'/'+key,row));
      }
      if(table!=='sessions')for(const key of before[table].keys())if(!remaining.has(key))writes.push(store.delete(root+'data/'+table+'/'+key));
     }
     await Promise.all(writes);
    }
    response.headers.set('X-Classroom-Backend','netlify-native-v2');
    return response;
   } finally {db.close();}
  } catch(err) {
   console.error('Netlify classroom storage failed',err);
   return error('Classroom storage could not be reached. Please retry shortly.',503);
  }
 };
}
