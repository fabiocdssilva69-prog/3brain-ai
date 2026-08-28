/* O reordenador e deterministico? Mesmo pedido, 5 vezes, so olhando as fontes. */
import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const p = 'o que voces nao sabem ainda';
const ctx = M.paraOWorker(p, 'pt');
const vistos = {};
for (let i = 0; i < 5; i++) {
  const r = await fetch('https://api.3brain.com.br', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
  const d = await r.json();
  const k = JSON.stringify(d.fontes);
  vistos[k] = (vistos[k] || 0) + 1;
  console.log('  ' + (d.motor||'?').padEnd(11) + ' ' + k);
  await espera(3800);
}
console.log('');
console.log('combinacoes distintas de fonte: ' + Object.keys(vistos).length + ' em 5');
