/* TESTE DE EXCLUSAO (leave-one-out). Para cada entrada, TIRA um gatilho do
   indice e pergunta com ele. E o unico teste desta sessao que nao saiu da
   minha cabeca: cobre as 136 entradas, com a redacao que os proprios donos da
   base escolheram, e mede exatamente o caso que interessa -- o visitante que
   formula de um jeito que nao cadastramos.

   Se a entrada so e encontrada pelo gatilho exato, a base decora; se e
   encontrada sem ele, a base generaliza. */
import { BASE_CRUA, comBase } from './peneira.mjs';

const PASSO = Number(process.argv[2] || 4);   // amostra: 1 = todos os gatilhos
const pares = [];
BASE_CRUA.entradas.forEach(e => {
  (e.perguntas || []).forEach((t, i) => {
    if (t.trim().length >= 8) pares.push([e.id, t]);
  });
});
const amostra = pares.filter((_, i) => i % PASSO === 0);

let um = 0, cinco = 0, nada = 0, piso = 0, chega = 0, chega10 = 0;
const maus = [];
for (const [id, gatilho] of amostra) {
  const base = JSON.parse(JSON.stringify(BASE_CRUA));
  const alvo = base.entradas.find(x => x.id === id);
  alvo.perguntas = alvo.perguntas.filter(x => x !== gatilho);
  const M = comBase(base);
  const l = /\b(what|how|who|why|where|is|are|do|does|can|the|your)\b/i.test(gatilho) ? 'en' : 'pt';
  const r = M.candidatos(gatilho, 999) || [];
  const pos = r.findIndex(x => x.id === id);
  const b = M.busca(gatilho);
  if (b && b.id === id) piso++;
  // o que interessa ponta a ponta: a entrada CHEGA ao reordenador?
  const ctx = M.paraOWorker(gatilho, l) || [];
  const busca = M.textoDeBusca(alvo, l);
  const jj = ctx.findIndex(c => c.busca === busca);
  if (jj >= 0) { chega++; if (jj < 10) chega10++; }
  if (pos === 0) { um++; cinco++; }
  else if (pos > 0 && pos < 5) { cinco++; maus.push([id, gatilho, (pos + 1) + 'o']); }
  else if (pos < 0) { nada++; maus.push([id, gatilho, 'NAO ACHOU']); }
  else maus.push([id, gatilho, (pos + 1) + 'o']);
}
const n = amostra.length;
const pct = v => (100 * v / n).toFixed(0) + '%';
console.log('TESTE DE EXCLUSAO -- ' + n + ' gatilhos retirados, um de cada vez');
console.log('  a entrada volta em 1o lugar ....... ' + um + '  ' + pct(um));
console.log('  volta no top 5 .................... ' + cinco + '  ' + pct(cinco));
console.log('  o PISO local acerta ............... ' + piso + '  ' + pct(piso));
console.log('  nao aparece na busca .............. ' + nada + '  ' + pct(nada));
console.log('');
console.log('  CHEGA ao reordenador .............. ' + chega + '  ' + pct(chega) +
            '   <- o que decide ponta a ponta');
console.log('  e chega nas 10 primeiras .......... ' + chega10 + '  ' + pct(chega10));
console.log('');
console.log('as que pioram mais (ate 20):');
maus.filter(m => m[2] === 'NAO ACHOU').slice(0, 20)
    .forEach(([id, g, d]) => console.log('  x ' + id.padEnd(26) + '"' + g.slice(0, 40) + '"  ' + d));
