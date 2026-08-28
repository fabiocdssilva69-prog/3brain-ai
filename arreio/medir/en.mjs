import { M, ENTRADAS } from './peneira.mjs';
/* O indice e montado com fichas(e.pt) -- o e.en NUNCA entra no saco.
   Se for verdade, o visitante estrangeiro so acha entrada que tenha
   variante de pergunta em ingles cadastrada. Quantas tem? */
let comEN = 0;
for (const e of ENTRADAS) {
  const temEN = (e.perguntas || []).some(p => /\b(what|how|who|why|where|when|is|are|do|does|can|the)\b/i.test(p));
  if (temEN) comEN++;
}
console.log('entradas com ALGUMA pergunta em ingles: ' + comEN + ' de ' + ENTRADAS.length);
console.log('');
const Q = ['how much does it cost','who are the founders','do you have customers',
           'how much are you raising','what is savi','is it secure','where are you based',
           'what is the biggest risk','do you have revenue','how does the ai work',
           'what is barbergo','can I invest','how many people work there','is there a free plan'];
let achou = 0, vazio = 0;
for (const p of Q) {
  const r = M.candidatos(p, 999) || [];
  const b = M.busca(p);
  if (!r.length) vazio++; else achou++;
  console.log(p.padEnd(32) + ' candidatos=' + String(r.length).padStart(3) +
              '  topo=' + (r[0] ? r[0].id : 'NENHUM'));
}
console.log('');
console.log('peneira vazia em ' + vazio + ' de ' + Q.length + ' perguntas em ingles');
