import {test} from 'node:test';
import assert from 'node:assert/strict';

test('Worker static assets, durable queue and chunked screenshots',{skip:!process.env.FORGE_BASE},async t=>{
 const base=process.env.FORGE_BASE;
 assert.ok(new URL(base).hostname==='127.0.0.1','Run against local Wrangler only');
 const req=async(path,method='GET',data,key)=>{
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:data===undefined?undefined:JSON.stringify(data)});
  return {status:r.status,data:await r.json()};
 };
 assert.equal((await req('/api/v1/health')).data.runtime,'cloudflare-workers');
 assert.equal((await req('/api/v1/capabilities')).data.storage,'durable-object-sqlite');
 for(const file of ['/','/assembly.html','/skills/forge-simulation/SKILL.md','/models/body.stl']){
  const r=await fetch(base+file);assert.equal(r.status,200,file);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
 }
 assert.equal((await req('/api/v1/not-found')).status,404);
 const created=await req('/api/v1/sessions','POST',{});assert.equal(created.status,201);
 const s=created.data,path='/api/v1/sessions/'+s.id,key=new URL(s.browserUrl).hash.split(':')[1];
 t.after(()=>req(path,'DELETE',undefined,s.token));
 const poll=()=>req(path+'/browser/poll','POST',{instance:'chunk-test',state:{loaded:true}},key);
 await poll();
 const ids=[];
 for(let n=0;n<2;n++){
  const c=await req(path+'/commands','POST',{type:'snapshot'},s.token);assert.equal(c.status,202);ids.push(c.data.id);
  assert.equal((await poll()).data.command.id,c.data.id);
  // Payload > SQLite row limits; synthetic PNG-prefixed bytes test transport only.
  const image='data:image/png;base64,'+'A'.repeat(1600000+n*4);
  const ack=await req(path+'/browser/ack','POST',{instance:'chunk-test',id:c.data.id,ok:true,result:{image,width:1024,height:1024}},key);
  assert.equal(ack.status,200,JSON.stringify(ack.data));
  const result=await req(path+'/commands/'+c.data.id,'GET',undefined,s.token);
  assert.equal(result.data.status,'applied');assert.equal(result.data.result.image,image);
 }
 const evicted=await req(path+'/commands/'+ids[0],'GET',undefined,s.token);
 assert.equal(evicted.data.result.imageEvicted,true);assert.equal(evicted.data.result.image,undefined);
 assert.equal((await req(path+'/state','GET',undefined,'bad')).status,401);
 assert.equal((await req(path+'/state','GET',undefined,s.token)).data.state.loaded,true);
});
