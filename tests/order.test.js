import test from 'node:test';
import assert from 'node:assert/strict';
import {orderItems} from '../site/order.js';
const items={b:{name:'Zebra',createdAt:1},a:{name:'água',createdAt:3},c:{name:'Banana',createdAt:2}};
test('ordem de inclusão preserva sequência original',()=>assert.deepEqual(orderItems(items,'added').map(([id])=>id),['b','c','a']));
test('ordem alfabética considera acentos em português',()=>assert.deepEqual(orderItems(items,'alphabetical').map(([id])=>id),['a','c','b']));
test('categoria mantém sequência original dentro do setor sem alterar itens',()=>{assert.deepEqual(orderItems(items,'category').map(([id])=>id),['b','c','a']);assert.deepEqual(Object.keys(items),['b','a','c']);});
