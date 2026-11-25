import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSpokenItems} from '../site/voice.js';
test('separa vários produtos pela palavra MAIS, inclusive com pontuação',()=>{
 assert.deepEqual(splitSpokenItems('arroz MAIS feijão mais detergente.'),['arroz','feijão','detergente']);
 assert.deepEqual(splitSpokenItems('mais café, MAIS mais leite mais'),['café','leite']);
});
test('não divide palavras que só contêm mais e ignora fala vazia',()=>{
 assert.deepEqual(splitSpokenItems('maisena mais leite'),['maisena','leite']);
 assert.deepEqual(splitSpokenItems(''),[]);
});
