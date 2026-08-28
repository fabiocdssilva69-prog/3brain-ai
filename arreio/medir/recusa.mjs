/* Mede a TAXA DE RECUSA nas 36 perguntas de visitante. Nao julga se a resposta
   esta certa -- julga se ela EXISTE. "Nao tenho essa resposta" quando a entrada
   certa esta no top 5 e falha de fundamentacao, e da para contar sozinho. */
import { M } from './peneira.mjs';
import { CASOS } from './visitante.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const RECUSA = ['nao esta publicad', 'nao tenho essa resposta', 'nao esta na base',
                'nao ha informacao publicada', 'nao temos essa', 'nao sei',
                'esse dado nao esta', 'nao esta no material', 'fora de escopo'];
let recusou = 0, respondeu = 0;
const maus = [];
for (const [p] of CASOS) {
  if (M.ehSocial(p)) { respondeu++; continue; }
  const ents = M.candidatos(p, 60) || [];
  if (!ents.length) { recusou++; maus.push([p, '(peneira vazia)']); continue; }
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt',
      contexto: ents.map(e => ({ texto: (e.pt||'').slice(0,700), fonte: e.fonte||'' })), historico: [] })
  });
  const d = await r.json();
  const t = achata(d.texto || '');
  if (RECUSA.some(x => t.indexOf(x) >= 0)) { recusou++; maus.push([p, (d.texto||'').replace(/\s+/g,' ').slice(0,110)]); }
  else respondeu++;
  await espera(22000);
}
console.log('');
console.log('36 perguntas de visitante, ponta a ponta:');
console.log('  responderam com fundamento .. ' + respondeu);
console.log('  recusaram ................... ' + recusou);
maus.forEach(([p, t]) => console.log('  x ' + p.padEnd(30) + ' ' + t));
