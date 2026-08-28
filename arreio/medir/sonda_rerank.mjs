/* Sonda de ALINHAMENTO: 60 contextos-isca, um alvo plantado numa posicao conhecida.
   Se o reordenador estiver alinhado, a fonte que volta e a do alvo. */
const espera = ms => new Promise(r => setTimeout(r, ms));
const ALVO = 'A capital da Mongolia e Ulan Bator, com 1,6 milhao de habitantes.';
const ISCA = i => 'Nota tecnica numero ' + i + ' sobre logistica de containers refrigerados no porto de Roterda.';

for (const pos of [3, 37, 58]) {
  const ctx = [];
  for (let i = 0; i < 60; i++) {
    ctx.push({ texto: i === pos ? ALVO : ISCA(i), fonte: 'IDX-' + String(i).padStart(2, '0') });
  }
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: 'qual a capital da Mongolia', idioma: 'pt', contexto: ctx, historico: [] })
  });
  const d = await r.json();
  const certo = (d.fontes || []).includes('IDX-' + String(pos).padStart(2, '0'));
  console.log('alvo plantado no indice ' + pos + '  ->  fontes=' + JSON.stringify(d.fontes) +
              '   ' + (certo ? 'ALINHADO' : '*** DESALINHADO ***'));
  await espera(22000);
}
