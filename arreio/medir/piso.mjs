/* Com os dois motores fora, a pagina cai em busca() e responde pela base local.
   E degradacao, nao queda -- mas so vale se o piso responder de verdade. */
import { M } from './peneira.mjs';
const Q = ['quanto custa','quanto custa o savi','o que e o savi','o que e o barbergo',
           'quem sao os fundadores','qual o maior risco','voces ja tem cliente',
           'quanto estao captando','e caro','onde voces ficam','tem plano gratis',
           'como falo com voces','e seguro','oi','obrigado'];
let ok = 0;
for (const p of Q) {
  const soc = M.ehSocial(p);
  const e = soc ? null : M.busca(p);
  const resolve = soc || e;
  if (resolve) ok++;
  console.log((resolve ? '  OK  ' : '  X   ') + p.padEnd(26) +
              (soc ? 'social:' + soc : (e ? e.id : 'SEM RESPOSTA LOCAL')));
}
console.log('');
console.log('piso local responde ' + ok + '/' + Q.length + ' -- e o que o visitante ve enquanto os motores estao fora');
