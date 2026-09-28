const UPSTREAM = 'https://academic-stress-lab.wxi456.chatgpt.site';
const json = (message, status) => Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export default async function handler(request) {
 const url = new URL(request.url);
 if (!/^\/api\/session(?:\/[A-Z2-9]{6}(?:\/(?:forum|analytics))?)?$/.test(url.pathname)) return json('Not found',404);
 if (!['GET','POST'].includes(request.method)) return json('Method not allowed',405);
 const origin=request.headers.get('origin');
 if (origin && origin!==url.origin) return json('This request is not allowed.',403);
 if (request.headers.get('sec-fetch-site')==='cross-site') return json('This request is not allowed.',403);
 const headers=new Headers({Accept:'application/json',Origin:UPSTREAM});
 for(const key of ['content-type','authorization','x-participant']) {const value=request.headers.get(key);if(value)headers.set(key,value);}
 let body;
 if(request.method==='POST') {
  if(Number(request.headers.get('content-length'))>16384)return json('Request too large',413);
  const reader=request.body?.getReader();let size=0;const parts=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return json('Request too large',413);}parts.push(value);}
  body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.byteLength;}
 }
 try {
  const upstream=await fetch(UPSTREAM+url.pathname+url.search,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(!upstream.headers.get('content-type')?.includes('application/json')) return json('Classroom service is unavailable. Please retry shortly.',502);
  return new Response(await upstream.arrayBuffer(),{status:upstream.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch {return json('Classroom service is temporarily unavailable. Please retry.',502);}
}
export const config={path:['/api/session','/api/session/*']};
