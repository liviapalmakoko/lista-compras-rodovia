import test from 'node:test';
import assert from 'node:assert/strict';
import {listTotals} from '../site/totals.js';
const now=Date.now(),offers=[{name:'Arroz',price:5.25,checkedAt:now-1,expiresAt:now+10000,market:'assai'}];
test('total soma quantidade conhecida, substitui estimativa pelo pago e aponta faltantes',()=>{
 const items={a:{name:'arroz',quantity:'2 unidades',done:false},b:{name:'feijão',done:true,actualPaid:8},c:{name:'banana',quantity:'2 kg',done:false}};
 const totals=listTotals(items,offers,{},null,now);assert.equal(totals.estimated,18.50);assert.equal(totals.actual,8);assert.equal(totals.missing,1);
 items.a.done=true;items.a.actualPaid=11;
 assert.equal(listTotals(items,offers,{},null,now).estimated,19);assert.equal(listTotals(items,offers,{},null,now).actual,19);
});
test('histórico só é somado para a mesma quantidade; sessão não inclui compras antigas',()=>{
 const history={a:{name:'café',quantity:'500 g',kind:'bought',actualPaid:20,at:now-100,purchaseMarket:'assai'}};
 const items={a:{name:'cafe',quantity:'500 g'},b:{name:'arroz',done:true,actualPaid:10,purchasedAt:now-1000}};
 const totals=listTotals(items,offers,history,{market:'assai',other:'',startedAt:now-500},now);assert.equal(totals.estimated,20);assert.equal(totals.actual,0);
 items.a.quantity='1 kg';assert.equal(listTotals(items,offers,history,null,now).missing,1);
});
