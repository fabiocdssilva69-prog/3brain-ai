/* TESTE DE EXCLUSAO, medido onde importa.
   O original mede `candidatos()` (camada crua) e so o 1o LUGAR. Mas o que
   decide o que o visitante ve e: a entrada chega as CINCO que o modelo le,
   em PRODUCAO? Trigrama e preenchimento existem justamente para apanhar o
   que o lexico perde -- medir so o lexico e ignorar a rede de seguranca. */
import { BASE_CRUA, comBase } from './peneira.mjs';

const R = { cru1: 0, prod1: 0, prod5: 0, prod60: 0, tot: 0 };
const fracas = [];

for (const e of BASE_CRUA.entradas) {
  const gs = (e.perguntas || []).filter(t => t.trim().length >= 8);
  if (!gs.length) continue;
  let ok5 = 0;
  for (const g of gs) {
    const base = JSON.parse(JSON.stringify(BASE_CRUA));
    const alvo = base.entradas.find(x => x.id === e.id);
    alvo.perguntas = alvo.perguntas.filter(x => x !== g);
    const M = comBase(base);
    R.tot++;

    const cru = (M.candidatos(g, 999) || []).findIndex(x => x.id === e.id);
    if (cru === 0) R.cru1++;

    // producao: casa o texto de volta, porque paraOWorker nao devolve id
    const porTexto = new Map();
    for (const x of base.entradas) for (const l of ['pt','en'])
      if (x[l]) porTexto.set(String(x[l]).slice(0,120), x.id);
    const r = M.paraOWorker(g, 'pt', null) || [];
    const lista = Array.isArray(r) ? r : (r.contexto || []);
    const ids = lista.map(c => porTexto.get(String(c.texto||'').slice(0,120)) || '?');
    const p = ids.indexOf(e.id);
    if (p === 0) R.prod1++;
    if (p >= 0 && p < 5) { R.prod5++; ok5++; }
    if (p >= 0) R.prod60++;
  }
  if (ok5 / gs.length < 0.5) fracas.push([e.id, (e.perguntas||[]).length, ok5 + '/' + gs.length]);
}

const pc = n => (100*n/R.tot).toFixed(0) + '%';
console.log('gatilho retirado, depois perguntado com ele (' + R.tot + ' vezes):');
console.log('');
console.log('  CAMADA CRUA   volta em 1o lugar ......... ' + R.cru1 + '  (' + pc(R.cru1) + ')');
console.log('  PRODUCAO      volta em 1o lugar ......... ' + R.prod1 + '  (' + pc(R.prod1) + ')');
console.log('  PRODUCAO      chega ao top 5 ............ ' + R.prod5 + '  (' + pc(R.prod5) + ')   <- o que o modelo le');
console.log('  PRODUCAO      chega aos 60 do reordenador ' + R.prod60 + '  (' + pc(R.prod60) + ')');
console.log('');
console.log('entradas que perdem o top 5 em mais de metade das vezes (' + fracas.length + '):');
fracas.slice(0, 20).forEach(([id, n, r]) => console.log('  ' + id.padEnd(30) + n + ' perguntas   top5 ' + r));
