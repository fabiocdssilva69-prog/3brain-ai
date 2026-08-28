import { M } from './peneira.mjs';
const Q = ['o savi ja tem cliente','posso investir em voces','e caro',
           'voces estao contratando','qual o email de contato','quantas pessoas trabalham ai'];
for (const p of Q) {
  const r = M.candidatos(p, 999) || [];
  console.log(p + '  (' + r.length + ')');
  console.log('   top5 local: ' + r.slice(0,5).map(e => e.id).join(', '));
}
