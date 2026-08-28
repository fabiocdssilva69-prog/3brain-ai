/* Pergunta composta precisa de DUAS entradas entre as que fundamentam. Mede se
   ambas chegam nas 5 primeiras da lista ENVIADA -- e ali que o piso e as
   primeiras escolhas do reordenador vao buscar. */
import { M, ENTRADAS } from './peneira.mjs';
const CASOS = [
  ['quanto custa e voces ja tem cliente',   ['precos-resumo','preco-savi'], ['receita-hoje','quem-usa-savi','usuarios-barbergo']],
  ['o que e o savi e quem paga por ele',    ['o-que-e-savi'], ['quem-paga-reembolso','para-quem-savi','savi-segmentos']],
  ['voces sao quantos e ja faturam',        ['tamanho-time'], ['receita-hoje']],
  ['qual o risco maior e o que voces fazem',['maior-risco'], ['o-que-a-3brain-faz']],
  ['quanto custa o savi e quanto custa o barbergo', ['preco-savi','precos-resumo'], ['preco-barbergo','preco-barbergo-plano']],
];
let dois = 0, um = 0;
for (const [p, A, B] of CASOS) {
  const ctx = M.paraOWorker(p, 'pt');
  const idDe = c => (ENTRADAS.find(e => M.textoDeBusca(e,'pt') === c.busca) || {}).id;
  const top5 = ctx.slice(0,5).map(idDe);
  const temA = A.some(x => top5.includes(x)), temB = B.some(x => top5.includes(x));
  if (temA && temB) dois++; else if (temA || temB) um++;
  console.log((temA && temB ? '  OK  ' : temA || temB ? '  ~   ' : '  X   ') + p.padEnd(46) + top5.join(', '));
}
console.log('');
console.log('as duas metades no top 5 enviado: ' + dois + '/' + CASOS.length + '   so uma: ' + um);
