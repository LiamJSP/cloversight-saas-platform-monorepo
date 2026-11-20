const list=document.querySelector('#selectors');let tab,origin,selectors=[];
async function active(){[tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.url||!/^https?:/.test(tab.url))throw new Error('Open a normal HTTP(S) page first.');origin=new URL(tab.url).origin;const data=await chrome.storage.local.get(`targets:${origin}`);selectors=data[`targets:${origin}`]||[];render()}
function render(){list.innerHTML=selectors.length?selectors.map(s=>`<li>${escapeHtml(s)}</li>`).join(''):'<li class="empty">No targets selected.</li>'}
function escapeHtml(v){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function message(type){await chrome.scripting.executeScript({target:{tabId:tab.id},files:['picker.js']});await chrome.tabs.sendMessage(tab.id,{source:'webwatch-picker',type});window.close()}
document.querySelector('#start').onclick=()=>message('start');document.querySelector('#stop').onclick=()=>message('stop');
document.querySelector('#clear').onclick=async()=>{selectors=[];await chrome.storage.local.set({[`targets:${origin}`]:selectors});render()};
document.querySelector('#export').onclick=()=>{const payload={version:1,origin,selectors,exportedAt:new Date().toISOString()};const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));link.download=`cloversight-targets-${new URL(origin).hostname}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)};
chrome.runtime.onMessage.addListener((message)=>{if(message.source==='webwatch-picker'&&message.type==='updated'){selectors=message.selectors;render()}});
active().catch(e=>{document.querySelector('#start').disabled=true;list.innerHTML=`<li class="empty">${escapeHtml(e.message)}</li>`});
