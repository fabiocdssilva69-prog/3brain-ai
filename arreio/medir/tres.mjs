import { M, ENTRADAS } from './peneira.mjs';
const CASOS = [
  ['quanto tempo de caixa voces tem', 'tempo-de-caixa'],
  ['voces sao quantos e ja faturam', 'tamanho-time'],
  ['o que voces nao sabem ainda', 'o-que-nao-sabemos']
];
for (const [p, alvo] of CASOS) {
  const r = M.candidatos(p, 999) || [];
  const i = r.findIndex(e => e.id === alvo);
  const ctx = M.paraOWorker(p, 'pt');
  // em que posicao da lista ENVIADA o alvo esta?
  const ent = ENTRADAS.find(e => e.id === alvo);
  const busca = M.textoDeBusca(ent, 'pt');
  const jEnv = ctx.findIndex(c => c.busca === busca);
  console.log('P: ' + p);
  console.log('   fichas=[' + M.fichas(p).join(',') + ']  pontuou=' + r.length +
              '  posto lexical=' + (i < 0 ? 'NENHUM' : i + 1) +
              '  posicao no envio=' + (jEnv < 0 ? 'NAO ENVIADO' : jEnv + 1) + ' de ' + ctx.length);
  console.log('   busca: ' + busca.slice(0, 150));
  console.log('');
}
