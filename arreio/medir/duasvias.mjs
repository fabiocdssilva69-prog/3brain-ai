/* A recalibragem tem de abrir UM lado sem abrir o outro. Afrouxar demais
   reabre os buracos fechados em 25/08: "o barbergo da lucro" respondia
   "Sim, R$ 38 por assinatura" e "quantos usuarios pagando" dizia "527". */
import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const DEVE_RESPONDER = [
  ['quanto tempo de caixa voces tem',   ['dezesseis', '16 meses']],
  ['o que voces nao sabem ainda',       ['lacuna', 'nao sabemos', 'falta', 'incerteza']],
  ['quanto custa o plano de 12 meses',  ['473']],
  ['qual a margem de contribuicao',     ['%']],
  ['quantos clientes para 1 milhao',    ['13', '65']],
];
const DEVE_RECUSAR = [
  ['o barbergo da lucro',               ['sim, gera lucro', 'gera lucro de', 'da lucro de']],
  ['quantos usuarios pagando o barbergo tem', ['527', '3.666', '4.296']],
  ['voces ja faturam quanto por mes',   ['faturamos', 'por mes de receita']],
  ['quantos clientes pagantes o savi tem', ['clientes pagantes', 'temos 1', 'temos um cliente']],
];

let a = 0, b = 0;
console.log('DEVE RESPONDER (o numero esta no contexto):');
for (const [p, querem] of DEVE_RESPONDER) {
  const ctx = M.paraOWorker(p, 'pt');
  const r = await fetch('https://api.3brain.com.br', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
  const t = achata((await r.json()).texto || '');
  const ok = querem.some(x => t.indexOf(achata(x)) >= 0);
  if (ok) a++;
  console.log((ok ? '  OK  ' : '  X   ') + p.padEnd(42) + (ok ? '' : t.slice(0, 110)));
  await espera(3800);
}
console.log('');
console.log('DEVE RECUSAR (tracao que nao existe):');
for (const [p, proibidos] of DEVE_RECUSAR) {
  const ctx = M.paraOWorker(p, 'pt');
  const r = await fetch('https://api.3brain.com.br', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
  const t = achata((await r.json()).texto || '');
  const mau = proibidos.find(x => t.indexOf(achata(x)) >= 0);
  if (!mau) b++;
  console.log((!mau ? '  OK  ' : '  X   ') + p.padEnd(42) + (mau ? 'DISSE: ' + mau + ' -> ' + t.slice(0,90) : ''));
  await espera(3800);
}
console.log('');
console.log('abriu o lado certo: ' + a + '/' + DEVE_RESPONDER.length +
            '   manteve o lado fechado: ' + b + '/' + DEVE_RECUSAR.length);
