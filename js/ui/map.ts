import type { Language } from '../core/model.ts';
import { PositionDictionaryService } from '../core/dictionary.ts';
import { mirageReference } from '../core/map-geometry.ts';
export function escape(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export interface MapOptions { dictionary:PositionDictionaryService; language:Language|'both'; interfaceLanguage?:Language; hidden?:boolean; selected?:string; ids?:string[]; onSelect:(id:string)=>void; compact?:boolean }
const disposers=new Set<()=>void>();const hostDisposers=new WeakMap<HTMLElement,()=>void>();
export function unmountMaps(){for(const dispose of [...disposers])dispose();}
export function mountMap(host:HTMLElement,options:MapOptions) {
 hostDisposers.get(host)?.();
 let zoom=1,x=0,y=0,ignoreClickUntil=0;
 let drag:{x:number;y:number;oldX:number;oldY:number}|null=null;
 let pinch:{distance:number;zoom:number;x:number;y:number;cx:number;cy:number}|null=null;
 const pointers=new Map<number,{x:number;y:number}>();
 const t=(en:string,uk:string)=>options.interfaceLanguage==='uk'?uk:en;
 const positions=options.dictionary.positions().filter(p=>!options.ids||options.ids.includes(p.id));
 host.innerHTML=`<div class="map-viewport ${options.compact?'compact':''}" tabindex="0" aria-label="${t('Mirage radar. Plus/minus to zoom; arrow keys to pan; Tab for markers. Touch: drag or pinch.','Радар Mirage. Плюс/мінус — масштаб; стрілки — переміщення; Tab — маркери. Дотик: перетягування або масштабування двома пальцями.')}"><div class="map-world"><img class="map-art" src="${import.meta.env.BASE_URL}assets/maps/mirage.svg" alt="${t('Mirage radar supplied by the owner. B is northwest; A is south; Mid connects the sites.','Радар Mirage, наданий власником. B — на північному заході, A — на півдні, мід з’єднує пленти.')}" draggable="false">${positions.map((p,i)=>`<button type="button" class="map-marker ${p.id===options.selected?'selected':''}" style="left:${p.x}%;top:${p.y}%" data-position="${escape(p.id)}" aria-label="${options.hidden?`${t('Position','Позиція')} ${i+1}`:escape(options.dictionary.name(p.id,options.language==='both'?'en':options.language))}"><span class="marker-dot">${options.hidden?i+1:''}</span>${options.hidden?'':`<span class="marker-label">${escape(options.dictionary.name(p.id,options.language==='both'?'en':options.language))}${options.language==='both'?`<small>${escape(options.dictionary.name(p.id,'uk'))}</small>`:''}</span>`}</button>`).join('')}</div></div><div class="map-controls"><button data-zoom="out" aria-label="${t('Zoom out','Зменшити масштаб')}">−</button><output>100%</output><button data-zoom="in" aria-label="${t('Zoom in','Збільшити масштаб')}">+</button><button data-zoom="reset">${t('Reset','Скинути')}</button><span class="muted">${t('Drag to pan · pinch or scroll to zoom','Перетягуйте · масштаб: двома пальцями або коліщатком')}</span></div>`;
 const viewport=host.querySelector<HTMLElement>('.map-viewport')!;const world=host.querySelector<HTMLElement>('.map-world')!;
 const update=()=>{world.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${zoom})`;host.querySelector('output')!.textContent=Math.round(zoom*100)+'%';};
 const fit=()=>{const ratio=mirageReference.viewBox.width/mirageReference.viewBox.height;const width=Math.min(viewport.clientWidth,viewport.clientHeight*ratio);world.style.width=width+'px';world.style.height=width/ratio+'px';update();};
 const observer=new ResizeObserver(fit);observer.observe(viewport);fit();
 const dispose=()=>{observer.disconnect();disposers.delete(dispose);hostDisposers.delete(host);};disposers.add(dispose);hostDisposers.set(host,dispose);
 const change=(factor:number)=>{zoom=Math.max(.8,Math.min(3,zoom*factor));update();};
 host.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b=>b.onclick=()=>{if(b.dataset.zoom==='reset'){zoom=1;x=0;y=0;update();}else change(b.dataset.zoom==='in'?1.2:1/1.2);});
 viewport.addEventListener('wheel',event=>{event.preventDefault();change(event.deltaY<0?1.1:1/1.1);},{passive:false});
 viewport.addEventListener('pointerdown',event=>{
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,x,y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};drag=null;viewport.setPointerCapture(event.pointerId);ignoreClickUntil=performance.now()+300;}
  else if(!(event.target as HTMLElement).closest('button')){drag={x:event.clientX,y:event.clientY,oldX:x,oldY:y};viewport.setPointerCapture(event.pointerId);}
 });
 viewport.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()];zoom=Math.max(.8,Math.min(3,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));x=pinch.x+(a.x+b.x)/2-pinch.cx;y=pinch.y+(a.y+b.y)/2-pinch.cy;ignoreClickUntil=performance.now()+300;}
  else if(drag){x=drag.oldX+event.clientX-drag.x;y=drag.oldY+event.clientY-drag.y;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)ignoreClickUntil=performance.now()+300;}
  else return;x=Math.max(-500,Math.min(500,x));y=Math.max(-500,Math.min(500,y));update();
 });
 const end=(event:PointerEvent)=>{pointers.delete(event.pointerId);pinch=null;drag=null;if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);if(pointers.size===1){const a=[...pointers.values()][0];drag={x:a.x,y:a.y,oldX:x,oldY:y};}};
 viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
 viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;const shift=25;if(event.key==='+'||event.key==='=')change(1.2);else if(event.key==='-')change(1/1.2);else if(event.key==='ArrowLeft')x+=shift;else if(event.key==='ArrowRight')x-=shift;else if(event.key==='ArrowUp')y+=shift;else if(event.key==='ArrowDown')y-=shift;else return;event.preventDefault();update();});
 host.querySelectorAll<HTMLButtonElement>('[data-position]').forEach(b=>b.onclick=event=>{if(event.detail!==0&&performance.now()<ignoreClickUntil)return;host.querySelectorAll('.map-marker.selected').forEach(b=>b.classList.remove('selected'));b.classList.add('selected');options.onSelect(b.dataset.position!);});
 return dispose;
}
