import { ENTRADAS } from './peneira.mjs';
for (const id of process.argv.slice(2)) {
  const e = ENTRADAS.find(x => x.id === id);
  console.log('## ' + id);
  console.log('EN: ' + (e.en || '').replace(/\s+/g, ' '));
  console.log('');
}
