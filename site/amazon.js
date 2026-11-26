export function amazonSearchUrl(item){
 return 'https://www.amazon.com.br/s?'+new URLSearchParams({k:[item.name,item.brand,item.size].filter(Boolean).join(' ')});
}
export function amazonSignature(item){return JSON.stringify([item.name,item.brand||'',item.size||'']);}
export function createAmazonClient(config,{fetcher=fetch,onUpdate=()=>{},now=()=>Date.now()}={}){
 const entries=new Map(),queue=[];let active=0,disabledUntil=0;
 const base=(config.url||'').replace(/\/$/,'');
 async function drain(){
  while(active<2&&queue.length){
   const job=queue.shift();
   if(disabledUntil>now()){job.value.status='not_configured';job.value.expiresAt=disabledUntil;onUpdate();continue;}
   active++;
   (async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
     const response=await fetcher(base+'/api/amazon?'+new URLSearchParams({itemId:job.id}),{headers:{'X-List-Access':config.listId},credentials:'omit',cache:'no-store',signal:controller.signal});
     if(!response.ok)throw Error('lookup_failed');
     const data=await response.json();
     if(!['found','not_found','pending','not_configured','unavailable','limit_reached','skipped'].includes(data.status))throw Error('invalid_lookup');
     if(data.status==='found'&&(!Number.isFinite(data.offer?.price)||data.offer.price<=0||data.offer.currency!=='BRL'||!/^https:\/\/www\.amazon\.com\.br\/dp\/B[A-Z0-9]{9}$/.test(data.offer.source)))throw Error('invalid_offer');
     Object.assign(job.value,data,{expiresAt:Number.isFinite(data.expiresAt)?data.expiresAt:now()+300000});
     if(data.status==='not_configured')disabledUntil=job.value.expiresAt;
    }catch{Object.assign(job.value,{status:'unavailable',offer:null,expiresAt:now()+300000});}
    finally{clearTimeout(timer);active--;onUpdate();drain();}
   })();
  }
 }
 return {
  get(id,item){
   const key=id+':'+amazonSignature(item),cached=entries.get(key);
   if(cached&&(cached.status==='loading'||cached.expiresAt>now()))return cached;
   const value={status:disabledUntil>now()||!base?'not_configured':'loading',offer:null,expiresAt:disabledUntil||now()+300000};
   entries.set(key,value);
   if(value.status==='loading'){queue.push({id,value});queueMicrotask(drain);}
   return value;
  },
  // The existing minute tick refreshes only expired references, never every list sync.
  hasExpired(){return [...entries.values()].some(e=>e.status!=='loading'&&e.expiresAt<=now());}
 };
}
