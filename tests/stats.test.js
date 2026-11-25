import test from 'node:test';
import assert from 'node:assert/strict';
import {purchaseStats} from '../site/stats.js';
import {DAY} from '../site/history.js';
const now=Date.UTC(2026,10,25,12);
const event=(name,days,itemId,kind='bought')=>({name,at:now-days*DAY,itemId,kind,category:'alimentos'});
test('filtra período e conta produtos, dias e repetições sem duplicar marcação',()=>{
 const h={a:event('arroz',1,'1'),b:event('arroz',1,'1'),c:event('arroz',3,'2'),d:event('feijão',2,'3'),e:event('macarrão',60,'4'),f:event('sal',1,'5','added')};
 const stats=purchaseStats(h,'30',now);assert.equal(stats.total,3);assert.equal(stats.unique,2);assert.equal(stats.days,3);assert.equal(stats.products[0].count,2);assert.equal(stats.categories[0].count,3);
 assert.equal(purchaseStats(h,'all',now).total,4);
});
test('histórico vazio retorna zero sem estimar gastos',()=>assert.equal(purchaseStats({},'30',now).total,0));
test('soma só preços efetivamente pagos e informa cobertura',()=>{
 const stats=purchaseStats({a:{...event('arroz',1,'1'),actualPaid:20},b:event('feijão',1,'2')},'30',now);
 assert.equal(stats.spent,20);assert.equal(stats.priced,1);assert.equal(stats.total,2);
});
