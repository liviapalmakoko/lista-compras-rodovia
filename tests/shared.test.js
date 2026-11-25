import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedClient,readLocalSnapshot} from '../site/shared.js';
const response=state=>({ok:true,status:200,json:async()=>state});
test('migra lista antiga preservando compras, quantidade e prazo',()=>{
 const local=readLocalSnapshot(JSON.stringify({one:{name:'feijão',quantity:'2 kg',duration:'1 mês',category:'alimentos',done:true,createdAt:1,purchasedAt:2,actualPaid:10}}));
 assert.equal(local.items.one.name,'feijão');assert.equal(local.history.bought_one_2.actualPaid,10);assert.equal(local.history.added_one_1.duration,'1 mês');
 const envelope={version:2,items:local.items,history:local.history};assert.deepEqual(readLocalSnapshot(JSON.stringify(envelope)),local);
});
test('escritas enviam somente campos alterados e recebem a lista comum',async()=>{
 const requests=[],states=[];
 const client=createSharedClient({url:'https://example.test',listId:'test'},{documentRef:null,onState:state=>states.push(state),fetcher:async(url,options)=>{requests.push({url,options});return response({items:{one:{name:'arroz'}},history:{}});}});
 await client.update(client.ref(null,'items/one'),{quantity:'2 kg'});
 assert.deepEqual(JSON.parse(requests[0].options.body),{updates:{'items/one/quantity':'2 kg'}});assert.equal(states[0].items.one.name,'arroz');
});
test('resposta de leitura antiga não apaga uma escrita mais recente',async()=>{
 let resolveRead;const states=[];
 const client=createSharedClient({url:'https://example.test',listId:'test'},{documentRef:null,onState:state=>states.push(state),fetcher:async(url,options)=>options.method==='GET'?new Promise(resolve=>resolveRead=resolve):response({items:{new:{name:'feijão'}},history:{}})});
 try{
  const starting=client.start();await client.update('',{'items/new':{name:'feijão'}});resolveRead(response({items:{},history:{}}));await starting;
  assert.equal(states.length,1);assert.ok(states[0].items.new);
 }finally{client.stop();}
});
