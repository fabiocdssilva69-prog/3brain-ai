import { M, ENTRADAS } from './peneira.mjs';
const p = process.argv[2];
const ctx = M.paraOWorker(p, 'pt');
const r = await fetch('https://api.3brain.com.br', { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
  body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
const d = await r.json();
console.log('fontes que fundamentaram: ' + JSON.stringify(d.fontes));
for (const f of (d.fontes || [])) {
  const e = ENTRADAS.find(x => x.fonte === f);
  console.log('   -> ' + (e ? e.id : '?'));
}
console.log('resposta: ' + (d.texto||'').replace(/\s+/g,' ').slice(0,200));
