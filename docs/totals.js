import {findOffer,historyPrice} from './prices.js';
import {normalize} from './categories.js';
export function estimateItem(item,offers,history,session=null,now=Date.now()){
 const quantity=normalize(item.quantity||'');
 const countMatch=quantity.match(/^(\d+(?:[.,]\d+)?)\s*(?:un|und|unid|unidade|unidades|pacote|pacotes|pote|potes|garrafa|garrafas|caixa|caixas|lata|latas)?$/);
 const count=!quantity?1:countMatch?Number(countMatch[1].replace(',','.')):null;
 const offer=findOffer(item.name,session?offers.filter(o=>o.market===session.market):offers,now,item.brand);
 if(offer&&count!==null&&count>0)return Math.round(offer.price*count*100);
 const past=historyPrice(item.name,history,session,item.brand);
 if(past&&normalize(past.quantity||'')===quantity)return Math.round(past.actualPaid*100);
 return null;
}
export function listTotals(items,offers,history,session=null,now=Date.now()){
 let estimated=0,actual=0,missing=0,priced=0,count=0,pending=0;
 for(const item of Object.values(items)){
  if(session&&item.done&&(!item.purchasedAt||item.purchasedAt<session.startedAt))continue;
  count++;if(!item.done)pending++;
  if(item.done&&Number.isFinite(item.actualPaid)&&item.actualPaid>0){const paid=Math.round(item.actualPaid*100);actual+=paid;estimated+=paid;priced++;continue;}
  const value=estimateItem(item,offers,history,session,now);
  if(value===null)missing++;else estimated+=value;
 }
 return {estimated:estimated/100,actual:actual/100,missing,priced,count,pending};
}
