/** @module extension/picker
 * @description Manifest V3 browser target selection.
 */
(()=>{if(window.__webwatchPickerInstalled)return;window.__webwatchPickerInstalled=true;let active=false,current=null,overlay=null;
const key=()=>`targets:${location.origin}`;
function selectorFor(element){if(element.id&&CSS.escape(element.id))return `#${CSS.escape(element.id)}`;const parts=[];let node=element;while(node&&node.nodeType===1&&node!==document.documentElement){let part=node.tagName.toLowerCase();const stable=[...node.classList].filter(c=>!/^(active|selected|hover|focus|open|show|ng-|css-|jsx-)/i.test(c)).slice(0,2);if(stable.length)part+=stable.map(c=>`.${CSS.escape(c)}`).join('');const siblings=node.parentElement?[...node.parentElement.children].filter(x=>x.tagName===node.tagName):[];if(siblings.length>1)part+=`:nth-of-type(${siblings.indexOf(node)+1})`;parts.unshift(part);const candidate=parts.join(' > ');try{if(document.querySelectorAll(candidate).length===1)return candidate}catch{}node=node.parentElement}return parts.join(' > ')}
function ensureOverlay(){overlay=document.createElement('div');overlay.id='webwatch-picker-overlay';Object.assign(overlay.style,{position:'fixed',pointerEvents:'none',zIndex:'2147483647',border:'3px solid #CE63A3',background:'rgba(206,99,163,.12)',boxShadow:'0 0 0 2px white',borderRadius:'4px',display:'none'});document.documentElement.append(overlay)}
function move(event){if(!active||event.target===overlay)return;current=event.target;const r=current.getBoundingClientRect();Object.assign(overlay.style,{display:'block',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`})}
async function pick(event){if(!active||!current)return;event.preventDefault();event.stopImmediatePropagation();const selector=selectorFor(current);const data=await chrome.storage.local.get(key());const values=[...new Set([...(data[key()]||[]),selector])];await chrome.storage.local.set({[key()]:values});chrome.runtime.sendMessage({source:'webwatch-picker',type:'updated',selectors:values}).catch(()=>{});current.style.outline='3px solid #00A04B';setTimeout(()=>current?.style.removeProperty('outline'),500)}
function stop(){active=false;overlay?.remove();overlay=null;removeEventListener('mousemove',move,true);removeEventListener('click',pick,true);removeEventListener('keydown',keys,true)}
function keys(event){if(event.key==='Escape')stop()}
function start(){if(active)return;active=true;ensureOverlay();addEventListener('mousemove',move,true);addEventListener('click',pick,true);addEventListener('keydown',keys,true)}
chrome.runtime.onMessage.addListener((message)=>{if(message.source!=='webwatch-picker')return;if(message.type==='start')start();if(message.type==='stop')stop()});
})();
