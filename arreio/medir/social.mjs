import { M } from './peneira.mjs';
const Q = ['funciona no iphone','isso ja funciona','como funciona o savi','o barbergo funciona mesmo',
  'como funciona a ia de voces','isso funciona de verdade','da pra testar de graca',
  'quero testar o produto','como funciona o preco','o motor de aquisicao funciona',
  'oi','obrigado','quanto custa','o que e o savi','ja funciona em producao',
  'como funciona a implantacao','voces ja testaram com cliente real'];
let n = 0;
for (const p of Q) {
  const s = M.ehSocial(p);
  if (s) { n++; console.log('  SEQUESTRADA -> "' + p + '"   vira resposta pronta de "' + s + '"'); }
}
console.log('');
console.log(n + ' de ' + Q.length + ' perguntas nunca chegam a busca.');
