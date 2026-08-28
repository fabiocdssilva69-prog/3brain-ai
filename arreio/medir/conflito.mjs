import { M, ENTRADAS } from './peneira.mjs';
const p = 'voces estao contratando';
const r = M.candidatos(p, 999) || [];
console.log('fichas: [' + M.fichas(p).join(',') + ']');
console.log('top5: ' + r.slice(0,5).map(e => e.id).join(', '));
for (const id of ['contratacao-imas','tamanho-time']) {
  const e = ENTRADAS.find(x => x.id === id);
  console.log('');
  console.log('## ' + id);
  console.log('   perguntas: ' + (e.perguntas||[]).join(' | '));
  console.log('   tags: ' + (e.tags||[]).join(', '));
}
