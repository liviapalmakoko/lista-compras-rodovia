import {normalize} from './categories.js';
import {productKey,DAY} from './history.js';
export function findOffer(name,offers,now=Date.now(),brand=''){
 const tokens=normalize(`${name} ${brand||''}`).split(' ').filter(Boolean);if(!tokens.length)return null;
 const candidates=offers.filter(offer=>offer.expiresAt>now&&offer.checkedAt<=now&&Number.isFinite(offer.price)&&offer.price>0&&tokens.every(token=>normalize(offer.name).split(' ').includes(token)));
 candidates.sort((a,b)=>a.price-b.price||a.name.length-b.name.length);
 if(!candidates.length)return null;
 return {...candidates[0],exact:normalize(candidates[0].name)===normalize(name)};
}
export function historyPrice(name,history,session=null,brand=''){
 return Object.values(history).filter(e=>e.kind==='bought'&&(!session||(e.purchaseMarket===session.market&&(e.purchaseOther||'')===(session.other||'')))&&productKey(e.name)===productKey(name)&&(!brand||normalize(e.brand||'')===normalize(brand))&&Number.isFinite(e.actualPaid)&&e.actualPaid>0).sort((a,b)=>b.at-a.at)[0]||null;
}
export const marketName=(market,other='')=>!market?'Mercado não informado':market==='assai'?'Assaí Méier':market==='prezunic'?'Prezunic Méier':other||'Outro mercado';
