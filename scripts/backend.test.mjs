import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend} from '../netlify/backend.mjs';
class Store {
 data=new Map(); n=0;
 async getWithMetadata(key){const v=this.data.get(key); return v?{data:Uint8Array.from(v.data).buffer,etag:v.etag}:null;}
 async set(key,data,opts){const old=this.data.get(key); if(opts.onlyIfNew&&old||opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch)return {modified:false}; const etag=String(++this.n);this.data.set(key,{data:Uint8Array.from(data),etag});return {modified:true,etag};}
}
test('persistent rooms, 50 concurrent students, votes, host permissions and forum',async()=>{
 const store=new Store();const api=makeBackend(()=>store);
 const call=async(path,body,token,headers={})=>{const r=await api(new Request('https://example.com/api/session'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}));return {status:r.status,data:await r.json()};};
 const created=await call('',{});assert.equal(created.status,201); const {code,token}=created.data; const path='/'+code;
 const people=Array.from({length:50},(_,i)=>(i+1).toString(16).padStart(32,'0'));
 for(const results of [await Promise.all(people.map(participant=>call(path,{action:'join',participant}))),await Promise.all(people.map(participant=>call(path,{action:'vote',participant,stage:0,choices:['workload']})))])for(const r of results)assert.equal(r.status,200,JSON.stringify(r));
 let room=await call(path); assert.equal(room.data.participants,50);assert.equal(room.data.responses,50);assert.deepEqual(room.data.counts,{});
 assert.equal((await call(path,{action:'reveal'})).status,403);
 await call(path,{action:'vote',participant:people[0],stage:0,choices:['future']});
 assert.equal((await call(path+'/forum',{action:'post',participant:people[0],stage:0,content:'Test classroom discussion'})).status,201);
 let posts=(await call(path+'/forum?stage=0')).data.posts;assert.equal(posts.length,1);assert.deepEqual(posts[0].choices,['future']);
 await call(path+'/forum',{action:'post',participant:people[1],stage:0,content:'Test reply',parentId:posts[0].id});
 assert.equal((await call(path+'/forum?stage=0')).data.posts.length,2);
 assert.equal((await call(path+'/analytics')).status,403);
 assert.equal((await call(path+'/analytics',null,token)).data.rounds[0].responses,50);
 await call(path,{action:'reveal'},token);room=await call(path);assert.equal(room.data.counts.workload,49);assert.equal(room.data.counts.future,1);
 assert.equal((await call(path,{action:'vote',participant:people[0],stage:0,choices:['future']})).status,409);
 assert.equal((await call(path,{action:'open'},token,{origin:'https://evil.example'})).status,403);
 await call(path,{action:'stage',stage:2},token);
 assert.equal((await call(path,{action:'vote',participant:people[0],stage:2,choices:['assessment','resources']})).status,200);
 await call(path,{action:'delete'},token);assert.equal((await call(path)).status,404);
});
