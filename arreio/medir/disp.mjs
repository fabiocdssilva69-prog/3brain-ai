/* DISPONIBILIDADE real agora, medida e nao suposta: quantos pedidos voltam 200,
   por qual motor, e quantos 503. Custa ~2,2 neuronios cada (so o reordenador)
   sempre que a Groq atende -- entao medir isto NAO consome a franquia do modelo. */
import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const Q = ['quanto custa o savi','quem sao os fundadores','o que e o barbergo','qual o maior risco',
           'e caro','quantas pessoas trabalham ai','voces ja tem cliente','onde voces ficam',
           'quanto estao captando','o que voces fazem'];
const conta = {};
for (const p of Q) {
  const ctx = M.paraOWorker(p, 'pt');
  const t0 = Date.now();
  const r = await fetch('https://api.3brain.com.br', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
  const d = await r.json();
  const k = r.status === 200 ? (d.motor || '?') : (r.status + '/' + (d.erro || ''));
  conta[k] = (conta[k] || 0) + 1;
  console.log('  ' + String(Date.now()-t0).padStart(5) + ' ms  ' + String(r.status) + '  ' + k.padEnd(12) + p);
  await espera(15000);
}
console.log('');
console.log('resultado: ' + JSON.stringify(conta));
