import {api} from './radio-api';
export function installRadioSettings(panel:HTMLElement){
 panel.innerHTML=`<h2>服务设置</h2><form autocomplete="off"><label>知乎 Access Secret<input name="access_secret" type="password" autocomplete="new-password" maxlength="8000" placeholder="留空保留已保存的凭据"></label><p>只查询此凭据所属账号；不需要 OAuth 代查其他用户。</p><label>本地小智 Server<input name="xiaozhi_url" type="text" value="ws://127.0.0.1:8000/xiaozhi/v1/" required></label><label>小智连接 Token（选填）<input name="xiaozhi_token" type="password" autocomplete="new-password" maxlength="8000" placeholder="启用小智鉴权时填写"></label><button type="submit">保存设置</button><p role="status" class="settings-status">正在读取配置…</p><p>密钥加密保存在本机 Python 后端，不写入浏览器存储。模型、音色使用小智 Server 配置。</p></form>`;
 const form=panel.querySelector('form')!,status=panel.querySelector('.settings-status')!;
 const clear=()=>form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(i=>i.value='');
 api('/settings').then(data=>{(form.elements.namedItem('xiaozhi_url') as HTMLInputElement).value=data.xiaozhi_url;status.textContent=data.access_secret_configured?'已有知乎凭据（尚未验证）':'尚未配置知乎凭据';}).catch(e=>status.textContent=e.message);
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button')!;button.disabled=true;const data:Record<string,string>={};new FormData(form).forEach((v,k)=>{if(String(v).trim())data[k]=String(v).trim();});try{const result=await api('/settings','PUT',data);clear();status.textContent=result.message;}catch(e){status.textContent=(e as Error).message;}finally{button.disabled=false;}};
 new MutationObserver(()=>{if(panel.hidden)clear();}).observe(panel,{attributes:true,attributeFilter:['hidden']});window.addEventListener('pagehide',clear);return clear;
}
