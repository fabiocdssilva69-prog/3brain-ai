/* Em que POSICAO DA LISTA ENVIADA o alvo chega ao reordenador? Antes o
   preenchimento era por ordem de arquivo; agora e por trigrama. Isto mede se a
   entrada certa passou a chegar mais cedo -- e se chega. */
import { M, ENTRADAS } from './peneira.mjs';
import { GRUPOS } from './dificil.mjs';
let n = 0, enviados = 0, top10 = 0;
const fora = [];
for (const [g, casos] of Object.entries(GRUPOS)) {
  for (const [p, alvos] of casos) {
    n++;
    const l = /\b(what|how|who|why|where|is|are|do|does|can|the)\b/.test(p) ? 'en' : 'pt';
    const ctx = M.paraOWorker(p, l);
    const buscas = alvos.map(a => {
      const e = ENTRADAS.find(x => x.id === a);
      return e ? M.textoDeBusca(e, l) : null;
    }).filter(Boolean);
    const i = ctx.findIndex(c => buscas.indexOf(c.busca) >= 0);
    if (i >= 0) { enviados++; if (i < 10) top10++; }
    else fora.push([g, p]);
  }
}
console.log('das ' + n + ' dificeis:');
console.log('  o alvo CHEGA ao reordenador ..... ' + enviados + '  (' + (100*enviados/n).toFixed(0) + '%)');
console.log('  e chega nas 10 primeiras ........ ' + top10);
if (fora.length) { console.log(''); fora.forEach(([g,p]) => console.log('  x [' + g.slice(0,10).padEnd(10) + '] ' + p)); }
