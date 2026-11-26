// Server-only price source. Never send the provider key or raw provider errors to clients.
const TTL=6*60*60*1000;
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/xampu/g,'shampoo').replace(/(\d)([a-z])/g,'$1 $2').replace(/[^a-z0-9]+/g,' ').trim();
export function amazonQuery(item){return [item.name,item.brand,item.size].filter(Boolean).join(' ').trim();}
export function queryKey(item){return JSON.stringify([item.name,item.brand,item.size].map(normalize));}
function measures(value){
 return [...String(value||'').toLowerCase().replace(/,/g,'.').matchAll(/(\d+(?:\.\d+)?)\s*(ml|mililitros?|litros?|l|kg|quilogramas?|g|gramas?)\b/g)].map(([,amount,unit])=>{
  const volume=/^(ml|mililitro|l|litro)/.test(unit),factor=/^(l|litro|kg|quilograma)/.test(unit)?1000:1;
  return `${volume?'volume':'peso'}:${Math.round(Number(amount)*factor*1000)/1000}`;
 });
}
export function selectAmazonOffer(item,results,now=Date.now()){
 const tokens=normalize([item.name,item.brand].filter(Boolean).join(' ')).split(' ').filter(t=>t&&!['de','da','do','das','dos','e','com','para'].includes(t));
 if(!tokens.length)return null;
 const requiredMeasures=measures([item.name,item.size].filter(Boolean).join(' '));
 const sizeDescription=String(item.size||'').replace(/\d+(?:[.,]\d+)?\s*(?:ml|mililitros?|litros?|l|kg|quilogramas?|g|gramas?)\b/gi,'');
 const sizeTokens=normalize(sizeDescription).split(' ').filter(Boolean);
 const requestedBundle=/\b(kit|combo|pack|pacote|unidades)\b/.test(normalize(item.name+' '+(item.size||'')));
 const candidates=[];
 for(const result of Array.isArray(results)?results:[]){
  if(typeof result.title!=='string'||!Number.isFinite(result.price?.value)||result.price.value<=0||result.price.value>999999||result.price.currency!=='BRL'||!/^B[A-Z0-9]{9}$/.test(result.asin||''))continue;
  const title=normalize(result.title),words=new Set(title.split(' '));
  if(!tokens.every(t=>words.has(t))||!sizeTokens.every(t=>words.has(t)))continue;
  const found=measures(result.title);
  if(!requiredMeasures.every(m=>found.includes(m)))continue;
  // Do not silently compare a multipack with a single bottle.
  if(!requestedBundle&&(/\b(kit|combo|pack)\b|\b\d+\s*(unidades|unid|frascos)\b/.test(title)||/\d\s*[x×]\s*\d/i.test(result.title)))continue;
  candidates.push({name:result.title.slice(0,500),price:result.price.value,currency:'BRL',source:`https://www.amazon.com.br/dp/${result.asin}`,prime:result.is_prime===true,checkedAt:now,expiresAt:now+TTL});
 }
 // Prefer Prime-eligible suggestions for this household; never assume free delivery.
 candidates.sort((a,b)=>Number(b.prime)-Number(a.prime)||a.price-b.price);
 return candidates[0]||null;
}
export async function searchAmazon(item,apiKey,{fetcher=fetch,now=Date.now()}={}){
 const url=new URL('https://api.rainforestapi.com/request');
 url.search=new URLSearchParams({api_key:apiKey,type:'search',amazon_domain:'amazon.com.br',search_term:amazonQuery(item),exclude_sponsored:'true'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetcher(url.toString(),{signal:controller.signal,redirect:'error'});
  if(!response.ok)throw Error('provider_unavailable');
  const data=await response.json();
  if(data.request_info?.success!==true||!Array.isArray(data.search_results))throw Error('provider_unavailable');
  const offer=selectAmazonOffer(item,data.search_results,now);
  return {status:offer?'found':'not_found',offer,checkedAt:now,expiresAt:offer?.expiresAt||now+60*60*1000};
 }finally{clearTimeout(timer);}
}
export async function lookupAmazon(db,item,env,{now=Date.now(),fetcher=fetch}={}){
 if(!env.RAINFOREST_API_KEY)return {status:'not_configured',offer:null,expiresAt:now+5*60*1000};
 const key=queryKey(item);
 const cached=await db.prepare('SELECT body, expires_at FROM amazon_lookups WHERE query_key = ?').bind(key).first();
 if(cached&&cached.expires_at>now)return JSON.parse(cached.body);
 // A unique lease prevents two phones from paying for the same query concurrently.
 await db.prepare('DELETE FROM amazon_lookup_locks WHERE expires_at <= ?').bind(now).run();
 const lock=await db.prepare('INSERT OR IGNORE INTO amazon_lookup_locks(query_key, expires_at) VALUES(?, ?)').bind(key,now+40000).run();
 if(!lock.meta?.changes)return {status:'pending',offer:null,expiresAt:now+5000};
 try{
  const configured=Number(env.AMAZON_DAILY_LIMIT||20),limit=Number.isInteger(configured)?Math.max(1,Math.min(configured,100)):20;
  const day=new Date(now).toISOString().slice(0,10);
  const quota=await db.prepare('INSERT INTO amazon_lookup_usage(day, requests) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET requests=requests+1 WHERE requests < ? RETURNING requests').bind(day,limit).first();
  if(!quota)return {status:'limit_reached',offer:null,expiresAt:Date.parse(day+'T00:00:00Z')+86400000};
  let result;
  try{result=await searchAmazon(item,env.RAINFOREST_API_KEY,{fetcher,now});}
  catch{result={status:'unavailable',offer:null,expiresAt:now+5*60*1000};}
  await db.prepare('INSERT INTO amazon_lookups(query_key, body, expires_at) VALUES(?, ?, ?) ON CONFLICT(query_key) DO UPDATE SET body=excluded.body, expires_at=excluded.expires_at').bind(key,JSON.stringify(result),result.expiresAt).run();
  return result;
 }finally{await db.prepare('DELETE FROM amazon_lookup_locks WHERE query_key = ? AND expires_at = ?').bind(key,now+40000).run();}
}
