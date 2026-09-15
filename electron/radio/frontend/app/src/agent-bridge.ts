type Adapter={state:()=>unknown;execute:(command:unknown)=>Promise<unknown>};
/** Opt-in, same-origin transport only. No endpoint/token in localStorage. */
export function installAgentBridge(adapter:Adapter){
 const link=document.createElement('a');link.href='/api/docs';link.textContent='查询 API';link.target='_blank';link.rel='noopener';link.style.cssText='font-size:12px;color:#a8caff;white-space:nowrap';document.querySelector('header')!.append(link);
 const match=location.hash.match(/^#agent=([\w-]+):([a-f0-9]{64})$/);if(!match)return;
 const [,id,key]=match;history.replaceState(null,'',location.pathname+location.search);
 const bar=document.createElement('div');bar.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:20;padding:12px;background:#102548;color:white;border:1px solid #74b8ff;border-radius:12px;max-width:90vw;display:flex;gap:12px;align-items:center';
 const label=document.createElement('span');label.textContent='Agent 请求控制此仿真（含屏幕代码），鼠标仍可操作。';label.style.fontSize='12px';
 const button=document.createElement('button');button.textContent='允许 Agent 连接';bar.append(label,button);document.body.append(bar);
 const instance=crypto.randomUUID();let active=false,timer:ReturnType<typeof setTimeout>|undefined;
 async function request(route:string,data:object){
  const response=await fetch(`/api/v1/sessions/${id}/browser/${route}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({instance,...data}),signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error(`HTTP ${response.status}：连接已停止，请重新创建会话`);return response.json();
 }
 async function poll(){
  if(!active)return;
  try{
   const data=await request('poll',{state:adapter.state()});
   if(data.command&&active){const {id:commandId,type,params}=data.command;
    let ack;try{ack={id:commandId,ok:true,result:await adapter.execute({type,params})};}catch(error){ack={id:commandId,ok:false,error:String(error)};}
    if(active)await request('ack',ack);
   }
   if(active)timer=setTimeout(poll,350);
  }catch(error){active=false;label.textContent=String(error);button.textContent='关闭提示';}
 }
 button.onclick=()=>{
  if(active){active=false;clearTimeout(timer);void request('disconnect',{}).catch(()=>{});bar.remove();return;}
  if(button.textContent==='关闭提示'){bar.remove();return;}
  active=true;label.textContent='Agent 已连接 · 鼠标操作仍可用';button.textContent='断开 Agent';void poll();
 };
 window.addEventListener('pagehide',()=>{active=false;clearTimeout(timer);},{once:true});
}
