import {durationDays} from './duration.js';
import {normalize} from './categories.js';
import {correctProduct} from './correction.js';
export const DAY=86400000;
export const productKey=(name,brand='')=>normalize(correctProduct(name).text)+(brand?'|'+normalize(brand):'');
export function suggestions(history,items,now=Date.now()){
 const pending=new Set(Object.values(items).filter(i=>!i.done).map(i=>productKey(i.name)));
 const products=new Map();
 for(const event of Object.values(history)){
  if(!event||!Number.isFinite(event.at)||event.at>now||!['added','bought'].includes(event.kind))continue;
  const key=productKey(event.name);if(!key)continue;
  if(!products.has(key))products.set(key,[]);products.get(key).push(event);
 }
 const results=[];
 for(const [key,events] of products){
  if(pending.has(key))continue;
  events.sort((a,b)=>a.at-b.at);
  const dates=kind=>events.filter(e=>e.kind===kind).filter((e,i,all)=>i===0||e.at-all[i-1].at>=DAY);
  const bought=dates('bought'),added=dates('added');
  const samples=bought.length>=2?bought:added;
  const latest=events[events.length-1];
  const lastPurchase=[...events].reverse().find(event=>event.kind==='bought');
  const planned=durationDays(latest.duration||'');
  if(planned&&lastPurchase){
   const nextAt=lastPurchase.at+planned*DAY;
   if(nextAt<=now+3*DAY)results.push({key,name:latest.name,brand:'',duration:latest.duration,category:latest.category,quantity:latest.quantity||'',nextAt,days:planned,samples:bought.length,source:'prazo informado',initial:false});
   continue;
  }
  if(samples.length<2)continue;
  const gaps=samples.slice(1).map((e,i)=>e.at-samples[i].at).filter(g=>g>=DAY).slice(-8).sort((a,b)=>a-b);
  if(!gaps.length)continue;
  const mid=Math.floor(gaps.length/2),interval=gaps.length%2?gaps[mid]:(gaps[mid-1]+gaps[mid])/2;
  // Uma compra recente reinicia a contagem, mesmo se a estimativa usa inclusões.
  const nextAt=latest.at+interval;
  if(nextAt>now+3*DAY)continue;
  results.push({key,name:latest.name,brand:'',duration:latest.duration||'',category:latest.category,quantity:latest.quantity||'',nextAt,days:Math.max(1,Math.round(interval/DAY)),samples:samples.length,source: samples===bought?'compras':'inclusões',initial:samples.length<3});
 }
 return results.sort((a,b)=>a.nextAt-b.nextAt);
}
