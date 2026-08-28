import { M } from './peneira.mjs';
import { GRUPOS } from './dificil.mjs';
/* Recall@60: em que fracao dos casos a entrada certa esta entre os 60 que a
   pagina manda? Isso e o TETO de qualquer conserto feito no Worker. Abaixo
   disso, nenhuma reordenacao resolve -- o dado nunca chega la. */
let tot = 0, em60 = 0, em5 = 0, em1 = 0;
const fora = [];
for (const [g, casos] of Object.entries(GRUPOS)) {
  for (const [p, alvos] of casos) {
    tot++;
    const r = M.candidatos(p, 999) || [];
    const i = r.findIndex(e => alvos.indexOf(e.id) >= 0);
    if (i === 0) em1++;
    if (i >= 0 && i < 5) em5++;
    if (i >= 0 && i < 60) em60++;
    else fora.push([g, p, i < 0 ? (r.length ? 'nem pontuou' : 'peneira vazia') : (i+1) + 'o']);
  }
}
const pct = n => (100*n/tot).toFixed(0) + '%';
console.log('sobre ' + tot + ' perguntas dificeis:');
console.log('  em 1o lugar ........ ' + em1 + '  ' + pct(em1));
console.log('  no top 5 ........... ' + em5 + '  ' + pct(em5));
console.log('  DENTRO DOS 60 ...... ' + em60 + '  ' + pct(em60) + '   <- teto de conserto no Worker');
console.log('');
console.log('as que nem chegam ao Worker (' + fora.length + '):');
fora.forEach(([g,p,d]) => console.log('  x [' + g.slice(0,10).padEnd(10) + '] ' + p.padEnd(40) + d));
