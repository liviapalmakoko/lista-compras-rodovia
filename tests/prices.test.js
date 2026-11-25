import test from 'node:test';
import assert from 'node:assert/strict';
import {findOffer,historyPrice,marketName} from '../site/prices.js';
const now=Date.now(),offer={name:'Café Marca 500g',price:20,market:'assai',expiresAt:now+10000,checkedAt:now-1000};
test('busca ofertas por palavras completas, ignora vencidas e preserva referência',()=>{
 assert.equal(findOffer('cafe',[offer],now).price,20);
 assert.equal(findOffer('cafe',[{...offer,expiresAt:now-1}],now),null);
 assert.equal(findOffer('caf',[offer],now),null);
 assert.equal(findOffer('Café Marca 500g',[offer],now).exact,true);
});
test('preço aprendido respeita mercado escolhido e rótulo de outro',()=>{
 const history={a:{name:'Café',kind:'bought',actualPaid:12,purchaseMarket:'other',purchaseOther:'Mercadinho',at:1},b:{name:'Café',kind:'bought',actualPaid:15,purchaseMarket:'assai',at:2}};
 assert.equal(historyPrice('cafe',history).actualPaid,15);
 assert.equal(historyPrice('cafe',history,{market:'other',other:'Mercadinho'}).actualPaid,12);
 assert.equal(marketName('other','Mercadinho'),'Mercadinho');
});
