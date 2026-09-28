import test from 'node:test';import assert from 'node:assert/strict';import handler from '../netlify/functions/classroom.mjs';
test('gateway preserves protected headers and body, prevents cross-origin requests, and handles upstream failures',async()=>{
 const original=globalThis.fetch;let seen;globalThis.fetch=async(url,options)=>{seen={url,options};return Response.json({code:'ABC234'},{status:201});};
 try{
 const origin='https://classroom.example';
 const request=new Request(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer test-token',Cookie:'private=do-not-forward'},body:'{}'});
 let res=await handler(request);assert.equal(res.status,201);assert.equal(seen.options.headers.get('authorization'),'Bearer test-token');assert.equal(seen.options.headers.get('cookie'),null);assert.equal(seen.options.headers.get('origin'),'https://academic-stress-lab.wxi456.chatgpt.site');assert.equal(new TextDecoder().decode(seen.options.body),'{}');
 res=await handler(new Request(origin+'/api/session',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}));assert.equal(res.status,403);
 res=await handler(new Request(origin+'/api/session',{method:'POST',body:'x'.repeat(16385)}));assert.equal(res.status,413);
 res=await handler(new Request(origin+'/api/anything'));assert.equal(res.status,404);
 await handler(new Request(origin+'/api/session/ABC234/forum?stage=2',{headers:{'x-participant':'participant-test'}}));assert.ok(seen.url.endsWith('/forum?stage=2'));assert.equal(seen.options.headers.get('x-participant'),'participant-test');
 globalThis.fetch=async()=>new Response('login',{status:302});assert.equal((await handler(new Request(origin+'/api/session/ABC234'))).status,502);
 globalThis.fetch=async()=>{throw Error('offline');};assert.equal((await handler(new Request(origin+'/api/session/ABC234'))).status,502);
 }finally{globalThis.fetch=original;}
});
