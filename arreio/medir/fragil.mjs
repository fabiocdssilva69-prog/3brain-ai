/* ⚠️ ESTE MEDE SO A CAMADA CRUA E SO O 1o LUGAR. Para o numero que decide o
   que o visitante ve, correr `fragil_producao.mjs`, que mede `paraOWorker()`
   e o TOP 5. A diferenca nao e pequena: 28% aqui contra 54% la, e o "28% de
   generalizacao" que ficou anotado na memoria saiu deste ficheiro. Trigrama e
   preenchimento existem justamente para apanhar o que o lexico perde --
   medir so o lexico e ignorar a rede de seguranca. (29/08/2026)

   A entrada aguenta perder um gatilho? Cruza o teste de exclusao com QUANTOS
   gatilhos a entrada tem. Se as fragis forem as magras, o conserto e escrever
   -- e da para saber ONDE escrever, em vez de escrever em toda a parte. */
import { BASE_CRUA, comBase } from './peneira.mjs';
const faixa = { '2-4': [0,0], '5-7': [0,0], '8-11': [0,0], '12+': [0,0] };
const fracas = [];
for (const e of BASE_CRUA.entradas) {
  const gs = (e.perguntas || []).filter(t => t.trim().length >= 8);
  if (!gs.length) continue;
  const n = (e.perguntas || []).length;
  const f = n <= 4 ? '2-4' : n <= 7 ? '5-7' : n <= 11 ? '8-11' : '12+';
  let ok = 0;
  for (const g of gs) {
    const base = JSON.parse(JSON.stringify(BASE_CRUA));
    const alvo = base.entradas.find(x => x.id === e.id);
    alvo.perguntas = alvo.perguntas.filter(x => x !== g);
    const M = comBase(base);
    const r = M.candidatos(g, 999) || [];
    if (r.findIndex(x => x.id === e.id) === 0) ok++;
  }
  faixa[f][0] += ok; faixa[f][1] += gs.length;
  if (ok / gs.length < 0.2) fracas.push([e.id, n, ok + '/' + gs.length]);
}
console.log('gatilhos na entrada   volta em 1o lugar apos perder um');
for (const [f, [ok, tot]] of Object.entries(faixa))
  console.log('  ' + f.padEnd(20) + ok + '/' + tot + '  (' + (100*ok/tot).toFixed(0) + '%)');
console.log('');
console.log('entradas que quase nao se aguentam sozinhas (' + fracas.length + '):');
fracas.slice(0, 24).forEach(([id, n, r]) => console.log('  ' + id.padEnd(28) + n + ' gatilhos   ' + r));
