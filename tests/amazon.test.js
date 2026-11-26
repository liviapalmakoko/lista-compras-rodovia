import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {selectAmazonOffer,searchAmazon,lookupAmazon} from '../backend/worker/amazon.js';
import worker,{validPatch} from '../backend/worker/index.js';
import {createAmazonClient,amazonSearchUrl} from '../site/amazon.js';
const now=1795730000000;
const item={name:'Shampoo',brand:'Dove',size:'400 ml'};
const result={title:'Dove Shampoo Hidratação 400ml',asin:'B012345678',price:{value:18.90,currency:'BRL'},is_prime:true};
const provider=()=>Promise.resolve(Response.json({request_info:{success:true},search_results:[result]}));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function database(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['0000_shared_records.sql','0001_amazon_lookups.sql'])sqlite.exec(readFileSync(new URL('../backend/drizzle/'+file,import.meta.url),'utf8'));
 return {prepare(sql){return {bind(...args){const statement=sqlite.prepare(sql);return {async first(){return statement.get(...args)||null;},async run(){const row=statement.run(...args);return {meta:{changes:row.changes}};},async all(){return {results:statement.all(...args)};}};}};},close:()=>sqlite.close()};
}
test('Amazon exige marca, tamanho e preço BRL e não confunde kits com frasco',()=>{
 const offer=selectAmazonOffer(item,[{...result,title:'Dove Shampoo 200ml',price:{value:10,currency:'BRL'}},result],now);
 assert.equal(offer.price,18.9);assert.equal(offer.source,'https://www.amazon.com.br/dp/B012345678');
 for(const bad of [{title:'Pantene Shampoo 400ml'},{title:'Dove Condicionador 400ml'},{title:'Kit Dove Shampoo 400ml'},{title:'Dove Shampoo 2 x 400ml'},{price:{value:2,currency:'USD'}},{price:{value:0,currency:'BRL'}},{asin:'invalid'}])assert.equal(selectAmazonOffer(item,[{...result,...bad}],now),null);
 assert.equal(selectAmazonOffer({...item,size:'0,4 L'},[result],now).price,18.9);
 assert.equal(selectAmazonOffer({...item,size:'400ml refil'},[result],now),null);
 assert.equal(selectAmazonOffer({...item,size:'400ml refil'},[{...result,title:'Shampoo Dove Refil 400 ml'}],now).price,18.9);
});
test('anúncio Prime tem preferência sem inventar preço, frete ou anúncio ausente',async()=>{
 assert.equal(selectAmazonOffer(item,[{...result,is_prime:false,price:{value:10,currency:'BRL'}},result],now).prime,true);
 assert.equal((await searchAmazon(item,'test-secret',{fetcher:provider,now})).status,'found');
 const missing=await searchAmazon(item,'test-secret',{now,fetcher:async()=>Response.json({request_info:{success:true},search_results:[]})});
 assert.equal(missing.status,'not_found');assert.equal(missing.offer,null);
 await assert.rejects(searchAmazon(item,'test-secret',{fetcher:async()=>Response.json({request_info:{success:false}})}));
});
test('sem chave não consulta fornecedor; cache compartilhado expira e limita gastos',async()=>{
 const db=database();let calls=0;const fetcher=async()=>{calls++;return provider();};
 try{
  assert.equal((await lookupAmazon(db,item,{}, {now,fetcher})).status,'not_configured');assert.equal(calls,0);
  const env={RAINFOREST_API_KEY:'test-secret',AMAZON_DAILY_LIMIT:'1'};
  assert.equal((await lookupAmazon(db,item,env,{now,fetcher})).status,'found');
  assert.equal((await lookupAmazon(db,item,env,{now:now+1000,fetcher})).status,'found');assert.equal(calls,1);
  assert.equal((await lookupAmazon(db,{...item,brand:'Outra'},env,{now,fetcher})).status,'limit_reached');assert.equal(calls,1);
  assert.equal((await lookupAmazon(db,item,env,{now:now+86400000,fetcher})).status,'found');assert.equal(calls,2);
 }finally{db.close();}
});
test('falhas do fornecedor são temporárias e não expõem chave ou mensagem',async()=>{
 const db=database();let calls=0;
 try{
  const env={RAINFOREST_API_KEY:'test-secret'},fetcher=async()=>{calls++;throw Error('test-secret');};
  const data=await lookupAmazon(db,item,env,{now,fetcher});assert.equal(data.status,'unavailable');assert.ok(!JSON.stringify(data).includes('test-secret'));
  await lookupAmazon(db,item,env,{now:now+1000,fetcher});assert.equal(calls,1);
 }finally{db.close();}
});
test('dois celulares compartilham consulta em andamento',async()=>{
 const db=database();let release,calls=0;const env={RAINFOREST_API_KEY:'test-secret'};
 const fetcher=()=>{calls++;return new Promise(resolve=>{release=()=>resolve(Response.json({request_info:{success:true},search_results:[result]}));});};
 try{
  const first=lookupAmazon(db,item,env,{now,fetcher});await tick();
  assert.equal((await lookupAmazon(db,item,env,{now,fetcher})).status,'pending');assert.equal(calls,1);
  release();assert.equal((await first).status,'found');
 }finally{db.close();}
});
test('API Amazon exige acesso e um item da lista; aceita marca e tamanho novos',async()=>{
 const db=database(),base='https://example.com/api/amazon?itemId=abc';
 try{
  assert.equal((await worker.fetch(new Request(base),{DB:db})).status,403);
  const headers={'X-List-Access':'e90b245fd6684690b4f80d964a7c4595'};
  assert.equal((await worker.fetch(new Request(base,{headers}),{DB:db})).status,404);
  await db.prepare("INSERT INTO shared_records(collection,id,body,updated_at) VALUES('items','abc',?,?)").bind(JSON.stringify(item),now).run();
  const response=await worker.fetch(new Request(base,{headers}),{DB:db});assert.equal((await response.json()).status,'not_configured');
  assert.equal(validPatch('items',{brand:'Dove',size:'400 ml'}),true);assert.equal(validPatch('items',{size:'a'.repeat(81)}),false);
 }finally{db.close();}
});
test('cliente consulta sozinho uma vez e refaz após editar tamanho ou expirar',async()=>{
 let calls=0,time=now;
 const client=createAmazonClient({url:'https://example.com',listId:'test'},{now:()=>time,fetcher:async()=>{calls++;return Response.json({status:'not_found',offer:null,expiresAt:time+10000});}});
 assert.equal(client.get('abc',item).status,'loading');client.get('abc',item);await tick();assert.equal(calls,1);assert.equal(client.get('abc',item).status,'not_found');
 client.get('abc',{...item,size:'200ml'});await tick();assert.equal(calls,2);
 time+=11000;client.get('abc',item);await tick();assert.equal(calls,3);
 assert.ok(amazonSearchUrl(item).includes('Dove'));
});
test('cliente limita paralelismo e não busca toda a lista com integração inativa',async()=>{
 let calls=0;const jobs=[];
 const client=createAmazonClient({url:'https://example.com',listId:'test'},{fetcher:()=>{calls++;return new Promise(resolve=>jobs.push(resolve));}});
 for(let i=0;i<10;i++)client.get(String(i),item);await tick();assert.equal(calls,2);
 for(const resolve of jobs)resolve(Response.json({status:'not_configured',offer:null,expiresAt:Date.now()+300000}));
 await tick();assert.equal(calls,2);assert.equal(client.get('9',item).status,'not_configured');
});
