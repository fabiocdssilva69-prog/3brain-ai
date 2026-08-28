/* Para onde vao as fichas de cada pedido. Importa porque o teto da Groq e de
   8.000 FICHAS POR MINUTO: e o tamanho do pedido, nao a quantidade, que decide
   quantas conversas a pagina aguenta. Estimativa de ~4 caracteres por ficha,
   que e a regra corrente para portugues e ingles. */
import { readFileSync } from 'node:fs';
import { M } from './peneira.mjs';
const W = readFileSync(new URL('../../worker/src/index.js', import.meta.url), 'utf8');
const pega = (nome) => {
  const i = W.indexOf('const ' + nome + ' = {');
  const j = W.indexOf('};', i);
  return W.slice(i, j).length;
};
const instr = pega('INSTRUCAO'), fatos = pega('FATOS_FIXOS');
// so a metade pt de cada um
const instrPT = Math.round(instr * 0.5), fatosPT = Math.round(fatos * 0.5);
const ctx = M.paraOWorker('quanto custa o savi', 'pt').slice(0, 5);
const bloco = ctx.reduce((a, e) => a + e.texto.length + (e.fonte ? e.fonte.length + 8 : 0) + 8, 0);
const f = c => Math.round(c / 4);
console.log('  instrucao (pt) ......... ' + String(instrPT).padStart(5) + ' car  ~' + String(f(instrPT)).padStart(4) + ' fichas');
console.log('  fatos fixos (pt) ....... ' + String(fatosPT).padStart(5) + ' car  ~' + String(f(fatosPT)).padStart(4) + ' fichas');
console.log('  contexto, 5 x 700 ...... ' + String(bloco).padStart(5) + ' car  ~' + String(f(bloco)).padStart(4) + ' fichas');
const total = instrPT + fatosPT + bloco + 200;
console.log('  ' + '-'.repeat(52));
console.log('  entrada por pedido ..... ' + String(total).padStart(5) + ' car  ~' + String(f(total)).padStart(4) + ' fichas');
console.log('  + resposta e raciocinio                    ~ 900 fichas (teto)');
console.log('');
const porMin = Math.floor(8000 / (f(total) + 450));
console.log('  teto da Groq: 8.000 fichas/minuto  ->  cerca de ' + porMin + ' conversas por minuto');
console.log('  (o que a pagina aguenta num pico; fora de pico, irrelevante)');
console.log('');
const semCtx = f(instrPT + fatosPT + 200);
console.log('  quanto e FIXO (instrucao+fatos): ' + semCtx + ' fichas, ' +
            (100 * semCtx / f(total)).toFixed(0) + '% da entrada -- vai em TODOS os pedidos');
