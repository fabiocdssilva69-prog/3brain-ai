/* Porta o arreio das 53 (que era de navegador) para Node, usando a MESMA fatia
   de codigo de producao. Mede busca() local: a base acha a entrada certa? */
import { readFileSync } from 'node:fs';
import { M } from './peneira.mjs';
const src = readFileSync(new URL('../prova_rag/arreio.js', import.meta.url), 'utf8');
const ini = src.indexOf('var CASOS = [');
const fim = src.indexOf('];', ini);
const CASOS = new Function('return ' + src.slice(ini + 'var CASOS = '.length, fim + 1))();
/* Comparar SEM acento dos dois lados. Os trechos esperados foram escritos
   quando metade da base estava sem acento; em 28/08 o texto passou a ter acento
   e cinco casos "falharam" sem que a resposta tivesse mudado -- "uniao" deixou
   de casar com "uniao" acentuado. O arreio afere CONTEUDO, nao ortografia, e a
   propria busca do produto ja normaliza assim (assistente.js, normalize NFD). */
const sa = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let ok = 0; const maus = [];
for (const [p, esperados] of CASOS) {
  const e = M.busca(p);
  const t = e ? (e.pt || '') : '';
  const falta = esperados.filter(s => sa(t).indexOf(sa(s)) < 0);
  if (e && !falta.length) ok++;
  else maus.push([p, e ? e.id : '(nada)', falta.join(',')]);
}
console.log('53 do arreio original: ' + ok + '/' + CASOS.length);
maus.forEach(([p, id, f]) => console.log('  x ' + p.padEnd(42) + ' -> ' + id + '  falta: ' + f));
