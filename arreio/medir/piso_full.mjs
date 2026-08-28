/* O PISO nas 88 perguntas das duas baterias. busca() e um caminho SEPARADO de
   candidatos(): tem atalho de frase, pisos de pontuacao e devolve UMA entrada
   ou nada. E o que o visitante ve sempre que os dois motores caem -- hoje, o
   dia inteiro. Eu tinha medido 15 perguntas; sao 88. */
import { M } from './peneira.mjs';
import { GRUPOS } from './dificil.mjs';
import { CASOS as VISITANTE } from './visitante.mjs';

const TODOS = [];
for (const [g, casos] of Object.entries(GRUPOS)) for (const [p, a] of casos) TODOS.push([g, p, a]);
for (const [p, a] of VISITANTE) TODOS.push(['visitante', p, a]);

const por = {};
const maus = [];
for (const [g, p, alvos] of TODOS) {
  por[g] = por[g] || { n: 0, certo: 0, nada: 0 };
  por[g].n++;
  if (M.ehSocial(p)) { por[g].certo++; continue; }
  const e = M.busca(p);
  if (!e) { por[g].nada++; maus.push([g, p, 'NAO RESPONDE']); }
  else if (alvos.indexOf(e.id) >= 0) por[g].certo++;
  else maus.push([g, p, 'errado: ' + e.id]);
}
let N = 0, C = 0, Z = 0;
console.log('grupo                 acerta   nao responde');
console.log('-'.repeat(48));
for (const [g, v] of Object.entries(por)) {
  N += v.n; C += v.certo; Z += v.nada;
  console.log('  ' + g.padEnd(20) + String(v.certo).padStart(2) + '/' + String(v.n).padEnd(6) +
              '  ' + (v.nada ? v.nada : '-'));
}
console.log('-'.repeat(48));
console.log('  TOTAL               ' + C + '/' + N + '  (' + (100*C/N).toFixed(0) + '%)   ' +
            Z + ' sem resposta');
console.log('');
maus.slice(0, 26).forEach(([g,p,d]) => console.log('  x [' + g.slice(0,10).padEnd(10) + '] ' + p.slice(0,38).padEnd(40) + d));
if (maus.length > 26) console.log('  ... e mais ' + (maus.length-26));
