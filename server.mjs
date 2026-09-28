import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,stat,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const dataDir=resolve(process.env.DATA_DIR||resolve(root,'data'));await mkdir(dataDir,{recursive:true});
const sqlite=new DatabaseSync(resolve(dataDir,'stress-lab.sqlite'));
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)');
for(const name of (await readdir(resolve(root,'migrations'))).filter(x=>x.endsWith('.sql')).sort()){
 if(sqlite.prepare('SELECT name FROM app_migrations WHERE name=?').get(name))continue;
 sqlite.exec('BEGIN');try{sqlite.exec(await readFile(resolve(root,'migrations',name),'utf8'));sqlite.prepare('INSERT INTO app_migrations(name) VALUES(?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
}
globalThis.__stressPortableDB = {
 prepare(sql) {
  let args=[];
  return {
   bind(...values) {args=values;return this;},
   async first() {return sqlite.prepare(sql).get(...args)??null;},
   async all() {return {results:sqlite.prepare(sql).all(...args)};},
   async run() {const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};}
  };
 }
};
const handlers=await import('./handlers.mjs');
const port=Number(process.env.PORT||8080);
const configuredOrigin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:null;
if(process.env.NODE_ENV==='production'&&!configuredOrigin)throw Error('Set PUBLIC_ORIGIN to the public HTTPS origin before production startup.');
const publicDir=resolve(root,'public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
 try{
 const origin=configuredOrigin||`http://127.0.0.1:${port}`;const url=new URL(req.url,origin);
 if(url.pathname.startsWith('/api/')){
  let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>16384){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
  const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
  const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const match=url.pathname.match(/^\/api\/session\/([A-Z2-9]{6})(?:\/(forum|analytics))?$/);
  let result;
  if(url.pathname==='/api/session'&&req.method==='POST')result=await handlers.create.POST(request);
  else if(match){const route=match[2]?handlers[match[2]]:handlers.room;const method=route[req.method];if(method)result=await method(request,{params:Promise.resolve({code:match[1]})});}
  if(!result){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Not found'}));return;}
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const file=resolve(publicDir,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(publicDir+sep)){res.writeHead(403);res.end();return;}
 const info=await stat(file);if(!info.isFile())throw Object.assign(new Error('Not found'),{code:'ENOENT'});
 res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});
 res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch(e){if(e.code==='ENOENT'){res.writeHead(404);res.end('Not found');}else{console.error('Request failed:',e.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Service unavailable. Please retry.'}));}}
});
server.listen(port,'0.0.0.0',()=>console.log(`Stress Lab ready on port ${port}`));
function stop(){server.close(()=>{sqlite.close();process.exit(0);});}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
