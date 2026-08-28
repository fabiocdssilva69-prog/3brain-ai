import { ENTRADAS } from './peneira.mjs';
for (const id of process.argv.slice(2)) {
  const e = ENTRADAS.find(x => x.id === id);
  if (!e) { console.log('## ' + id + ' -> NAO EXISTE'); continue; }
  console.log('## ' + id + '   fonte: ' + (e.fonte||'-'));
  console.log('   tags: ' + (e.tags||[]).join(', '));
  console.log('   perguntas: ' + (e.perguntas||[]).join(' | '));
  console.log('   pt: ' + (e.pt||'').replace(/\s+/g,' '));
  console.log('');
}
