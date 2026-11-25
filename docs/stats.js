import {productKey,DAY} from './history.js';
export function purchaseStats(history,period='30',now=Date.now()){
 const from=period==='all'?0:now-Number(period)*DAY,seen=new Set(),products=new Map(),categories=new Map(),days=new Set();
 const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
 let total=0,spent=0,priced=0;
 for(const event of Object.values(history).sort((a,b)=>b.at-a.at)){
  if(event.kind!=='bought'||!Number.isFinite(event.at)||event.at<from||event.at>now)continue;
  const day=dayFormat.format(new Date(event.at)),dedupe=`${event.itemId||productKey(event.name,event.brand)}_${day}`;
  if(seen.has(dedupe))continue;seen.add(dedupe);total++;days.add(day);if(Number.isFinite(event.actualPaid)&&event.actualPaid>0){spent+=event.actualPaid;priced++;}
  const key=productKey(event.name,event.brand),existing=products.get(key)||{name:event.name+(event.brand?' · '+event.brand:''),count:0};existing.count++;products.set(key,existing);
  categories.set(event.category,(categories.get(event.category)||0)+1);
 }
 return {total,spent,priced,unique:products.size,days:days.size,products:[...products.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR')).slice(0,5),categories:[...categories].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count)};
}
