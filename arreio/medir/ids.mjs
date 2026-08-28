import { M, ENTRADAS } from './peneira.mjs';
console.log('entradas:', ENTRADAS.length, '| vocab:', M.VOCAB.length);
console.log(ENTRADAS.map(e => e.id).join(' '));
