/* Mede a PENEIRA local, fatiando o codigo REAL de assistente.js.
   Fatiar em vez de reimplementar e o ponto: um arreio que reimplementa a busca
   mede o arreio, nao o produto. */
/* eval/new Function aqui sao DELIBERADOS e a entrada NAO e de terceiro: e o
   nosso proprio assistente.js, versionado no repo. O objetivo e justamente
   executar o codigo de producao sem copia-lo. Arreio local, nunca embarcado. */
import { readFileSync } from 'node:fs';

const ARQ = new URL('../../assistente.js', import.meta.url);
const src = readFileSync(ARQ, 'utf8');
const linhas = src.split(String.fromCharCode(10));

// a base inteira mora numa linha so: window.BASE_3BRAIN = {...};
const linhaBase = linhas.find(l => l.indexOf('window.BASE_3BRAIN =') === 0);
if (!linhaBase) throw new Error('nao achei window.BASE_3BRAIN');
const window = {};
eval(linhaBase);
const BASE = window.BASE_3BRAIN;

// do comentario de normalizacao ate o fim de candidatos()
const ini = linhas.findIndex(l => l.indexOf('var PARAR =') >= 0);
const marcaFim = linhas.findIndex(l => l.indexOf('function paraOWorker(') >= 0) >= 0
  ? 'function paraOWorker(' : 'function candidatos(';
const fim = linhas.findIndex(l => l.indexOf(marcaFim) >= 0);
let f = fim;
let prof = 0, achou = false;
for (; f < linhas.length; f++) {
  for (const c of linhas[f]) { if (c === '{') { prof++; achou = true; } else if (c === '}') prof--; }
  if (achou && prof === 0) break;
}
const corpo = linhas.slice(ini, f + 1).join(String.fromCharCode(10));
const monta = new Function('BASE', corpo + String.fromCharCode(10) +
  'return {candidatos, busca, fichas, limpa, conhecida, INDICE, VOCAB, ehSocial, SOCIAL, '
  + 'paraOWorker, textoDeBusca};');
export const M = monta(BASE);
/* deixa reconstruir o indice com uma base MODIFICADA -- e o que permite o
   teste de exclusao: tirar um gatilho e perguntar com ele. */
export function comBase(b){ return monta(b); }
export const BASE_CRUA = BASE;
export const ENTRADAS = BASE.entradas;
