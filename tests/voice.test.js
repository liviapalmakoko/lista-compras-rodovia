import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSpokenItems} from '../site/voice.js';
test('separa vários produtos pela palavra SOMA, inclusive com pontuação',()=>{
 assert.deepEqual(splitSpokenItems('arroz SOMA feijão soma detergente.'),['arroz','feijão','detergente']);
 assert.deepEqual(splitSpokenItems('soma café, SOMA soma leite soma'),['café','leite']);
});
test('não divide palavras parecidas nem usa mais como separador',()=>{
 assert.deepEqual(splitSpokenItems('maisena soma leite'),['maisena','leite']);
 assert.deepEqual(splitSpokenItems('somatório soma café'),['somatório','café']);
 assert.deepEqual(splitSpokenItems('café mais forte soma leite'),['café mais forte','leite']);
 assert.deepEqual(splitSpokenItems(''),[]);
});
