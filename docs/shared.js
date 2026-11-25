// One shared database for everyone opening this site's link.
export function createSharedClient(config,{onState,onConnection,fetcher=fetch,documentRef=globalThis.document}={}){
 let generation=0,writing=false,inFlight=false,timer=null,lastState=null,started=false;
 const base=config.url.replace(/\/$/,'');
 async function request(path,body){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetcher(base+path,{method:body?'POST':'GET',headers:{'X-List-Access':config.listId,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,credentials:'omit',cache:'no-store'});
   if(!response.ok)throw new Error(`Shared list: HTTP ${response.status}`);
   const state=await response.json();if(!state.items||!state.history)throw new Error('Invalid shared snapshot');
   return state;
  }finally{clearTimeout(timeout);}
 }
 function apply(state){lastState=state;onConnection?.(true);onState?.(state);}
 async function sync(){
  if(writing||inFlight)return lastState;
  inFlight=true;const current=generation;
  try{const state=await request('/api/state');if(current===generation)apply(state);return state;}
  catch(error){if(current===generation)onConnection?.(false);if(!started)throw error;return lastState;}
  finally{inFlight=false;}
 }
 async function write(updates,path='/api/update'){
  generation++;writing=true;
  try{const state=await request(path,{updates});apply(state);return state;}
  catch(error){onConnection?.(false);throw error;}
  finally{writing=false;}
 }
 return {
  shared:true,db:null,ref:(_db,path='')=>path,push:()=>({key:crypto.randomUUID()}),
  async start(){if(!timer){timer=setInterval(()=>{if(!documentRef?.hidden)sync();},3000);documentRef?.addEventListener('visibilitychange',()=>{if(!documentRef.hidden)sync();});}try{return await sync();}finally{started=true;}},
  stop(){clearInterval(timer);},sync,
  update(path,patch){const updates=path?Object.fromEntries(Object.entries(patch).map(([field,value])=>[path+'/'+field,value])):patch;return write(updates);},
  async importLocal(local){
   const entries=[...Object.entries(local.items||{}).map(([id,value])=>['items/'+id,value]),...Object.entries(local.history||{}).map(([id,value])=>['history/'+id,value])];
   for(let i=0;i<entries.length;i+=100)await write(Object.fromEntries(entries.slice(i,i+100)),'/api/import');
   return lastState;
  }
 };
}
export function readLocalSnapshot(raw){
 const value=JSON.parse(raw||'{}');if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Invalid local list');
 if(value.version===2)return {items:value.items||{},history:value.history||{}};
 const history={};
 for(const [id,item] of Object.entries(value)){
  if(item.createdAt)history[`added_${id}_${item.createdAt}`]={name:item.name,category:item.category,quantity:item.quantity||'',duration:item.duration||'',brand:item.brand||'',kind:'added',at:item.createdAt,itemId:id};
  if(item.purchasedAt)history[`bought_${id}_${item.purchasedAt}`]={name:item.name,category:item.category,quantity:item.quantity||'',duration:item.duration||'',brand:item.brand||'',kind:'bought',at:item.purchasedAt,itemId:id,...(item.actualPaid?{actualPaid:item.actualPaid}:{}),...(item.purchaseMarket?{purchaseMarket:item.purchaseMarket,purchaseOther:item.purchaseOther||''}:{})};
 }
 return {items:value,history};
}
