let session:Promise<void>|null=null;
export async function api<T=any>(path:string, method='GET', body?:unknown):Promise<T>{
 if(!session)session=fetch('/api/session',{method:'POST',headers:{'X-Forge-Client':'web'}}).then(r=>{if(!r.ok)throw Error('无法连接本机 Python 服务');}).catch(e=>{session=null;throw e;});
 await session;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),70000);
 try{
  const response=await fetch('/api'+path,{method,signal:controller.signal,headers:{'Content-Type':'application/json','X-Forge-Client':'web'},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===401)session=null;
  const data=await response.json();if(!response.ok)throw Error(data.message||'请求失败');return data as T;
 }catch(e){if(e instanceof DOMException&&e.name==='AbortError')throw Error('请求超时，未自动重试');throw e;}finally{clearTimeout(timer);}
}
