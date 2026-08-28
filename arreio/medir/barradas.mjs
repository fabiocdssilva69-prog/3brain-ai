import { M } from './peneira.mjs';
import { GRUPOS } from './dificil.mjs';
import { CASOS } from './visitante.mjs';
const todas = [];
for (const [g, casos] of Object.entries(GRUPOS)) for (const [p] of casos) todas.push([g, p]);
for (const [p] of CASOS) todas.push(['visitante', p]);
let n = 0;
for (const [g, p] of todas) {
  if (M.ehSocial(p)) continue;
  const l = /\b(what|how|who|why|where|is|are|do|does|can|the|your)\b/i.test(p) ? 'en' : 'pt';
  if ((M.paraOWorker(p, l) || []).length === 0) {
    n++;
    console.log('  BARRADA [' + g + '] "' + p + '"  fichas=[' + M.fichas(p).join(',') + ']');
  }
}
console.log('total de perguntas legitimas barradas: ' + n + ' de ' + todas.length);
