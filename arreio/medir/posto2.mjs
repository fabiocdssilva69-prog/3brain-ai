import { M } from './peneira.mjs';
const CASOS = [
  ['quantas pessoas trabalham ai', 'tamanho-time'],
  ['e caro', 'precos-resumo'],
  ['preciso instalar alguma coisa', 'onde-publicado'],
  ['voces estao contratando', 'tamanho-time'],
  ['e seguro', 'lgpd-savi']
];
for (const [p, alvo] of CASOS) {
  const r = M.candidatos(p, 999) || [];
  const i = r.findIndex(e => e.id === alvo);
  console.log(p.padEnd(30) + ' fichas=[' + M.fichas(p).join(',') + ']  alvo em ' +
              (i < 0 ? 'NAO PONTUOU' : (i+1) + 'o de ' + r.length));
  console.log('   top5: ' + r.slice(0,5).map(e => e.id).join(', '));
}
