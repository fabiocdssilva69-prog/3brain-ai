/* As 52 dificeis PONTA A PONTA, pelo mesmo caminho da pagina.
   Duas medidas objetivas, sem eu julgar o texto:
     1. RECUSOU?  ("nao esta publicado" etc.) -- e o que o visitante sente como
        "nao sabe nem as perguntas simples".
     2. A FONTE da entrada certa aparece entre as que fundamentaram? Com
        PISO_PENEIRA=1 as `fontes` sao [1a da busca, 1a escolha do reordenador],
        entao isto e um sinal PARCIAL: acertar conta, errar nao condena. */
import { M, ENTRADAS } from './peneira.mjs';
import { GRUPOS } from './dificil.mjs';

const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RECUSA = ['nao esta publicad', 'nao tenho essa resposta', 'nao esta na base',
                'nao ha informacao publicada', 'nao temos essa', 'nao sei',
                'esse dado nao esta', 'nao esta no material', 'fora de escopo',
                'nao esta disponivel', 'nao consta'];

const fonteDe = id => (ENTRADAS.find(e => e.id === id) || {}).fonte || '';

const resumo = {};
const maus = [];
for (const [grupo, casos] of Object.entries(GRUPOS)) {
  resumo[grupo] = { n: 0, respondeu: 0, fonteCerta: 0 };
  for (const [p, alvos] of casos) {
    resumo[grupo].n++;
    const l = /[a-z]/.test(p) && /\b(what|how|who|why|where|is|are|do|does|can|the)\b/.test(p) ? 'en' : 'pt';
    const ctx = M.paraOWorker(p, l);
    let d = { texto: '', fontes: [] };
    if (ctx.length) {
      const r = await fetch('https://api.3brain.com.br', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
        body: JSON.stringify({ pergunta: p, idioma: l, contexto: ctx, historico: [] }),
      });
      d = await r.json();
      await espera(22000);
    }
    const t = achata(d.texto || '');
    const recusou = !t || RECUSA.some(x => t.indexOf(x) >= 0);
    const certa = alvos.some(a => (d.fontes || []).includes(fonteDe(a)));
    if (!recusou) resumo[grupo].respondeu++;
    if (certa) resumo[grupo].fonteCerta++;
    if (recusou) maus.push([grupo, p, (d.texto || '(sem contexto)').replace(/\s+/g, ' ').slice(0, 110)]);
  }
}

console.log('');
console.log('grupo                 respondeu    fonte certa entre as 2 mostradas');
console.log('-'.repeat(68));
let N = 0, R = 0, F = 0;
for (const [g, v] of Object.entries(resumo)) {
  N += v.n; R += v.respondeu; F += v.fonteCerta;
  console.log('  ' + g.padEnd(20) + String(v.respondeu).padStart(2) + '/' + String(v.n).padEnd(6) +
              '    ' + String(v.fonteCerta).padStart(2) + '/' + v.n);
}
console.log('-'.repeat(68));
console.log('  TOTAL               ' + R + '/' + N + '  (' + (100 * R / N).toFixed(0) + '%)' +
            '    ' + F + '/' + N + '  (' + (100 * F / N).toFixed(0) + '%)');
if (maus.length) {
  console.log('');
  console.log('recusaram (' + maus.length + '):');
  maus.forEach(([g, p, t]) => console.log('  x [' + g.slice(0, 10).padEnd(10) + '] ' + p.padEnd(38) + t));
}
