import { ENTRADAS } from './peneira.mjs';
const EN = /\b(what|how|who|why|where|when|is|are|do|does|can|the|your|you|of|for)\b/i;
for (const e of ENTRADAS.filter(e => !(e.perguntas||[]).some(p => EN.test(p)))) {
  console.log(e.id.padEnd(26) + '| ' + (e.tags||[]).join(',').padEnd(24) + '| ' +
              (e.pt||'').replace(/\s+/g,' ').replace(/\*\*/g,'').slice(0, 96));
}
