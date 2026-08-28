/* Seguimento: a pergunta nova nao tem assunto, a anterior tem. */
import { M, ENTRADAS } from './peneira.mjs';
const idDe = c => (ENTRADAS.find(e => M.textoDeBusca(e, 'pt') === c.busca) || {}).id;
const CASOS = [
  ['quanto custa o savi',        'por que',        ['preco-savi', 'precos-resumo', 'ancora-into']],
  ['qual o maior risco',         'por que',        ['maior-risco', 'ressalvas-publicas', 'fosso-savi']],
  ['voces ja tem cliente',       'como assim',     ['receita-hoje', 'quem-usa-savi', 'savi-piloto', 'usuarios-barbergo']],
  ['o que e o barbergo',         'e quanto custa', ['preco-barbergo', 'precos-resumo', 'preco-barbergo-plano']],
  ['quanto estao captando',      'por que esse valor', ['rodada', 'tempo-de-caixa', 'macro-captacao']],
];
let com = 0, sem = 0;
for (const [antes, agora, alvos] of CASOS) {
  const semHist = M.paraOWorker(agora, 'pt', '') || [];
  const comHist = M.paraOWorker(agora, 'pt', antes) || [];
  const pos = l => { const i = l.findIndex(c => alvos.indexOf(idDe(c)) >= 0); return i < 0 ? '--' : (i + 1) + 'o'; };
  const a = pos(semHist), b = pos(comHist);
  if (b !== '--' && parseInt(b) <= 5) com++;
  if (a !== '--' && parseInt(a) <= 5) sem++;
  console.log('  "' + antes + '"  ->  "' + agora + '"');
  console.log('     sem historico: ' + a.padEnd(6) + ' topo=' + (semHist[0] ? idDe(semHist[0]) : '-'));
  console.log('     COM historico: ' + b.padEnd(6) + ' topo=' + (comHist[0] ? idDe(comHist[0]) : '-'));
}
console.log('');
console.log('alvo no top 5 -- sem historico: ' + sem + '/' + CASOS.length + '   com historico: ' + com + '/' + CASOS.length);
