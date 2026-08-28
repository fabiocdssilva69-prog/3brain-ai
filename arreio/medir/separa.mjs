/* Existe um sinal CONTINUO que separe pergunta nossa de pergunta de fora?
   Testa a melhor cobertura de trigrama contra os gatilhos: se as duas nuvens
   nao se tocam, da para por um limiar; se se tocam, nao da e nao se inventa. */
import { M } from './peneira.mjs';
function melhorCobertura(p) {
  const triQ = M.textoDeBusca ? null : null;
  // reproduz cobertura(triQ, nQ, it.tri) usando o indice real
  const t = ' ' + M.limpa(p) + ' ';
  const q = {}; let n = 0;
  for (let i = 0; i + 3 <= t.length; i++) if (!q[t.slice(i, i+3)]) { q[t.slice(i, i+3)] = 1; n++; }
  let melhor = 0;
  for (const it of M.INDICE) {
    let c = 0;
    for (const k in q) if (it.tri[k]) c++;
    if (c / n > melhor) melhor = c / n;
  }
  return melhor;
}
const FORA = ['qual a capital da mongolia','como faco lasanha a bolonhesa','quem ganhou a copa de 2022',
  'me escreve um poema sobre o mar','qual a raiz quadrada de 144','que horas sao em toquio',
  'qual o melhor carro eletrico','como trocar um pneu','me conta uma piada','quem foi napoleao bonaparte',
  'qual o remedio para dor de cabeca','what is the capital of france','write me a python script',
  'who won the world cup','how do I cook pasta'];
const DENTRO = ['quanto custa','o que e o savi','voces ja tem cliente','e caro','e seguro',
  'onde voces ficam','what do you do','how much are you raising','qual o maior risco',
  'ja esta no ar','tem plano gratis','quantas pessoas trabalham ai','voces seguem a lgpd',
  'voces ja perderam cliente','voces estao inflando os numeros','por que eu nao deveria investir'];
const f = FORA.map(melhorCobertura).sort((a,b)=>a-b);
const d = DENTRO.map(melhorCobertura).sort((a,b)=>a-b);
const pc = v => (100*v).toFixed(0) + '%';
console.log('FORA de escopo   : min ' + pc(f[0]) + '  mediana ' + pc(f[Math.floor(f.length/2)]) + '  MAX ' + pc(f[f.length-1]));
console.log('DENTRO de escopo : MIN ' + pc(d[0]) + '  mediana ' + pc(d[Math.floor(d.length/2)]) + '  max ' + pc(d[d.length-1]));
console.log('');
console.log(d[0] > f[f.length-1]
  ? 'AS NUVENS NAO SE TOCAM: da para por limiar entre ' + pc(f[f.length-1]) + ' e ' + pc(d[0])
  : 'AS NUVENS SE SOBREPOEM (fora chega a ' + pc(f[f.length-1]) + ', dentro comeca em ' + pc(d[0]) +
    ') -- limiar aqui cortaria pergunta legitima. Nao serve.');
