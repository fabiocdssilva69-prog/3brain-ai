import { M, ENTRADAS } from './peneira.mjs';
/* frequencia de documento: em quantas das 136 entradas a ficha aparece nos
   GATILHOS (perguntas+tags). Ficha que esta em muitas entradas nao distingue
   nada -- so espalha peso. */
const df = {};
for (const e of ENTRADAS) {
  const vis = new Set();
  for (const p of (e.perguntas || [])) for (const t of M.fichas(p)) vis.add(t);
  for (const g of (e.tags || []))      for (const t of M.fichas(g)) vis.add(t);
  for (const t of vis) df[t] = (df[t] || 0) + 1;
}
const n = ENTRADAS.length;
const top = Object.entries(df).sort((a,b) => b[1]-a[1]).slice(0, 26);
console.log('ficha            em N entradas   % da base');
for (const [t, c] of top) {
  console.log('  ' + t.padEnd(16) + String(c).padStart(3) + '           ' + (100*c/n).toFixed(0) + '%');
}
