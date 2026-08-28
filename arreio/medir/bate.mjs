import { M } from './peneira.mjs';
const p = process.argv[2] || 'o savi ja tem cliente';
const l = 'pt';
const ctx = (M.candidatos(p, 60) || []).map(e => ({
  texto: (e[l] || e.pt || '').slice(0, 700), fonte: e.fonte || ''
}));
const ids = (M.candidatos(p, 60) || []).map(e => e.id);
console.log('mandando ' + ctx.length + ' candidatos. Ordem local (5 primeiros): ' + ids.slice(0,5).join(', '));
const r = await fetch('https://api.3brain.com.br', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Origin': 'https://3brain.com.br' },
  body: JSON.stringify({ pergunta: p, idioma: l, contexto: ctx, historico: [] })
});
const d = await r.json();
console.log('HTTP ' + r.status + ' | motor=' + (d.motor || '?'));
console.log('fontes: ' + JSON.stringify(d.fontes));
console.log('---');
console.log((d.texto || d.erro || '').slice(0, 400));
