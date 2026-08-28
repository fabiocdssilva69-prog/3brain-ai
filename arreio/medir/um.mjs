import { M } from './peneira.mjs';
const p = process.argv[2];
const ctx = M.paraOWorker(p, 'pt');
const corpo = JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] });
console.log(ctx.length + ' candidatos, corpo ' + (corpo.length/1024).toFixed(1) + ' KB');
const r = await fetch('https://api.3brain.com.br', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' }, body: corpo });
const d = await r.json();
console.log('HTTP ' + r.status + '  motor=' + (d.motor||'-') + '  erro=' + (d.erro||'-'));
console.log((d.texto||'').replace(/\s+/g,' ').slice(0,260));
