/* A MESMA pergunta, 5 vezes. Um chatbot que ora responde e ora recusa e pior
   do que um que erra sempre: o visitante nao pode confiar no que le, e nos nao
   podemos medir o que consertamos. */
import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const RECUSA = ['nao esta publicad', 'nao tenho essa resposta', 'nao esta na base',
                'nao ha informacao publicada', 'esse dado nao esta', 'nao consta'];
const Q = ['o que voces nao sabem ainda', 'quanto tempo de caixa voces tem',
           'e caro', 'quantas pessoas trabalham ai'];
const N = 5;
for (const p of Q) {
  const ctx = M.paraOWorker(p, 'pt');
  let recusou = 0; const motores = {};
  const amostras = [];
  for (let i = 0; i < N; i++) {
    const r = await fetch('https://api.3brain.com.br', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
      body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }) });
    const d = await r.json();
    const t = achata(d.texto || '');
    const rec = !t || RECUSA.some(x => t.indexOf(x) >= 0);
    if (rec) recusou++;
    motores[d.motor || '?'] = (motores[d.motor || '?'] || 0) + 1;
    amostras.push((rec ? 'RECUSOU ' : 'ok      ') + '[' + (d.motor||'?') + '] ' + (d.texto||'').replace(/\s+/g,' ').slice(0, 90));
    await espera(3800);
  }
  console.log('=== ' + p);
  console.log('    recusou ' + recusou + ' de ' + N + '   motores: ' + JSON.stringify(motores));
  amostras.forEach(a => console.log('      ' + a));
  console.log('');
}
