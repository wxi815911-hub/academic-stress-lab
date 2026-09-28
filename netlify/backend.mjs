import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
   for(let attempt=0;attempt<40;attempt++) {
    const snapshot=code?await store.getWithMetadata('room/'+code,{type:'arrayBuffer',consistency:'strong'}):null;
    if(code&&!snapshot) return error('This room does not exist or has expired. Ask your presenter for the current code.',404);
    const dir=await mkdtemp(join(tmpdir(),'stress-'));
    let db;
    try {
     const path=join(dir,'room.sqlite');
     if(snapshot) await writeFile(path,new Uint8Array(snapshot.data));
     db=new DatabaseSync(path);
     db.exec('PRAGMA foreign_keys=ON;');
     if(!snapshot) db.exec(schema);
     const ctx={db,dirty:false};
     const retryRequest=new Request(request.url,{method:request.method,headers:request.headers,...(raw!==undefined?{body:raw}:{})});
     const response=await contexts.run(ctx,()=>handler(retryRequest,{params:Promise.resolve({code})}));
     if(!response.ok||!ctx.dirty) return response;
     const result=code?{code}:await response.clone().json();
     db.close(); db=null;
     const bytes=await readFile(path);
     const saved=await store.set('room/'+result.code,bytes,{...(snapshot?{onlyIfMatch:snapshot.etag}:{onlyIfNew:true})});
     if(saved.modified) { response.headers.set('X-Classroom-Backend','netlify-native-v1'); return response; }
    } finally { if(db)db.close(); await rm(dir,{recursive:true,force:true}); }
    await new Promise(r=>setTimeout(r,Math.min(300,20*(attempt+1))+Math.random()*150));
   }
   return error('The classroom is busy. Please submit again.',409);
  } catch(err) {
   console.error('Netlify classroom storage failed',err);
   return error('Classroom storage could not be reached. Please retry shortly.',503);
  }
 };
}
