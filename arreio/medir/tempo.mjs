import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const Q = ['quanto custa o savi','quem sao os fundadores','o que e o barbergo','qual o maior risco','e caro'];
const ts = [];
for (const p of Q) {
  const ctx = M.paraOWorker(p, 'pt');
  const t0 = process.hrtime.bigint();
  const r = await fetch('https://api.3brain.com.br', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
  const d = await r.json();
  const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
  ts.push([p, ms, d.motor]);
  console.log('  ' + String(ms).padStart(6) + ' ms  [' + (d.motor||'?') + ']  ' + p);
  await espera(3800);
}
const so = ts.map(x => x[1]).sort((a,b)=>a-b);
console.log('');
console.log('mediana: ' + so[Math.floor(so.length/2)] + ' ms   pior: ' + so[so.length-1] + ' ms');
