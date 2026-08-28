import { BASE_CRUA, comBase } from './peneira.mjs';
const pares = [];
BASE_CRUA.entradas.forEach(e => (e.perguntas||[]).forEach(t => {
  if (t.trim().length >= 8) pares.push([e.id, t]);
}));
const amostra = pares.filter((_, i) => i % 4 === 0);
let n = 0;
for (const [id, gatilho] of amostra) {
  const base = JSON.parse(JSON.stringify(BASE_CRUA));
  const alvo = base.entradas.find(x => x.id === id);
  alvo.perguntas = alvo.perguntas.filter(x => x !== gatilho);
  const M = comBase(base);
  const l = /\b(what|how|who|why|where|is|are|do|does|can|the|your)\b/i.test(gatilho) ? 'en' : 'pt';
  const ctx = M.paraOWorker(gatilho, l) || [];
  const busca = M.textoDeBusca(alvo, l);
  if (ctx.findIndex(c => c.busca === busca) >= 0) continue;
  n++;
  if (n <= 14) {
    console.log('x ' + id.padEnd(24) + '"' + gatilho.slice(0,38) + '"');
    console.log('    fichas=[' + M.fichas(gatilho).join(',') + ']  lexical devolveu ' +
                (M.candidatos(gatilho,999)||[]).length + '  |  enviados ' + ctx.length);
    console.log('    gatilhos que sobraram: ' + (alvo.perguntas||[]).slice(0,4).join(' | ').slice(0,90));
  }
}
console.log('');
console.log('total que nao chega: ' + n + ' de ' + amostra.length);
