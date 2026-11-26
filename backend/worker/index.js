import {lookupAmazon} from './amazon.js';
// Public-by-link shared list. The access identifier is a client capability, not an admin secret.
const LIST_ID='e90b245fd6684690b4f80d964a7c4595';
const ORIGINS=new Set(['https://liviapalmakoko.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const fields=new Set(['name','brand','size','duration','quantity','category','done','createdAt','purchasedAt','actualPaid','purchaseMarket','purchaseOther','estimatedPrice','priceMarket','kind','at','itemId']);
const sectors=new Set(['hortifruti','limpeza','higiene','bebidas','frios','proteinas','alimentos','congelados','pet','casa','outros']);
const strings={name:100,brand:80,size:80,duration:80,quantity:40,purchaseOther:80,itemId:150};
export function validPatch(collection,patch,full=false){
 if(!patch||Array.isArray(patch)||typeof patch!=='object')return false;
 for(const [key,value] of Object.entries(patch)){
  if(!fields.has(key))return false;if(value===null)continue;
  if(key in strings){if(typeof value!=='string'||value.length>strings[key]||(key==='name'&&!value.trim()))return false;}
  else if(key==='category'){if(!sectors.has(value))return false;}
  else if(key==='done'){if(typeof value!=='boolean')return false;}
  else if(['createdAt','purchasedAt','at'].includes(key)){if(!Number.isFinite(value)||value<=0)return false;}
  else if(['actualPaid','estimatedPrice'].includes(key)){if(!Number.isFinite(value)||value<=0||value>999999)return false;}
  else if(['purchaseMarket','priceMarket'].includes(key)){if(!['','assai','prezunic','other'].includes(value))return false;}
  else if(key==='kind'&&!['added','bought'].includes(value))return false;
 }
 if(full){const required=collection==='items'?['name','category','quantity','done','createdAt']:['name','category','quantity','kind','at','itemId'];if(required.some(key=>patch[key]===null||patch[key]===undefined))return false;}
 return true;
}
function headers(origin){return {'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, X-List-Access','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}:{})};}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:headers(origin)});}
async function snapshot(db){
 const {results}=await db.prepare('SELECT collection, id, body FROM shared_records ORDER BY collection, id').all();
 const data={items:{},history:{}};for(const row of results)data[row.collection][row.id]=JSON.parse(row.body);return data;
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS')return new Response(null,{status:ORIGINS.has(origin)?204:403,headers:headers(origin)});
 const url=new URL(request.url);
 if(url.pathname==='/')return json({service:'Lista Rodovia · sincronização',status:'ok'},200,origin);
 if(!['/api/state','/api/update','/api/import','/api/amazon'].includes(url.pathname))return json({error:'not_found'},404,origin);
 if(origin&&!ORIGINS.has(origin))return json({error:'origin_not_allowed'},403,origin);
 if(request.headers.get('X-List-Access')!==LIST_ID)return json({error:'list_access_required'},403,origin);
 if(!env.DB)return json({error:'storage_unavailable'},503,origin);
 try{
  if(url.pathname==='/api/amazon'){
   if(request.method!=='GET')return json({error:'method_not_allowed'},405,origin);
   const id=url.searchParams.get('itemId')||'';
   if(!/^[a-zA-Z0-9_-]{1,180}$/.test(id))return json({error:'invalid_item'},400,origin);
   const row=await env.DB.prepare("SELECT body FROM shared_records WHERE collection = 'items' AND id = ?").bind(id).first();
   if(!row)return json({error:'item_not_found'},404,origin);
   const item=JSON.parse(row.body);
   if(item.done)return json({status:'skipped',offer:null},200,origin);
   return json(await lookupAmazon(env.DB,item,env),200,origin);
  }
  if(url.pathname==='/api/state'&&request.method==='GET')return json(await snapshot(env.DB),200,origin);
  if(request.method!=='POST'||url.pathname==='/api/state')return json({error:'method_not_allowed'},405,origin);
  const raw=await request.text();if(raw.length>512000)return json({error:'request_too_large'},413,origin);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400,origin);}
  const updates=body.updates;if(!updates||Array.isArray(updates)||typeof updates!=='object')return json({error:'invalid_updates'},400,origin);
  const entries=Object.entries(updates);if(entries.length>1000)return json({error:'too_many_updates'},400,origin);
  const records=new Map();
  for(const [path,value] of entries){
   const parts=path.split('/');if(parts.length<2||parts.length>3||!['items','history'].includes(parts[0])||!(/^[a-zA-Z0-9_-]{1,180}$/).test(parts[1]))return json({error:'invalid_path'},400,origin);
   const [collection,id,field]=parts,key=collection+'/'+id;
   if(!records.has(key))records.set(key,{collection,id,patch:{},remove:false,full:false});const record=records.get(key);
   if(field){if(record.remove||!fields.has(field))return json({error:'invalid_update'},400,origin);record.patch[field]=value;}
   else if(value===null){record.remove=true;}else{record.patch=value;record.full=true;}
  }
  if(records.size>150)return json({error:'too_many_records'},400,origin);
  const importing=url.pathname==='/api/import',statements=[];
  for(const record of records.values()){
   const {collection,id,patch,remove,full}=record;
   if(importing&&(remove||!full))return json({error:'invalid_import'},400,origin);
   if(remove){statements.push(env.DB.prepare('DELETE FROM shared_records WHERE collection = ? AND id = ?').bind(collection,id));continue;}
   if(!validPatch(collection,patch,full))return json({error:'invalid_record'},400,origin);
   const serialized=JSON.stringify(patch),now=Date.now();
   if(importing)statements.push(env.DB.prepare('INSERT OR IGNORE INTO shared_records(collection,id,body,updated_at) VALUES(?,?,?,?)').bind(collection,id,serialized,now));
   else if(full||validPatch(collection,patch,true))statements.push(env.DB.prepare('INSERT INTO shared_records(collection,id,body,updated_at) VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET body=json_patch(shared_records.body,excluded.body), updated_at=excluded.updated_at').bind(collection,id,serialized,now));
   else statements.push(env.DB.prepare('UPDATE shared_records SET body=json_patch(body,?),updated_at=? WHERE collection=? AND id=?').bind(serialized,now,collection,id));
  }
  if(statements.length)await env.DB.batch(statements);
  return json(await snapshot(env.DB),200,origin);
 }catch{return json({error:'storage_error'},503,origin);}
}};
