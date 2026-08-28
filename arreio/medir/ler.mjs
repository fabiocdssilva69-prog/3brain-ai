import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
for (const p of ['tem plano gratis','tem versao web','o savi e app ou web',
                 'qual o email de contato','onde voces ficam','voces estao contratando']) {
  const ents = M.candidatos(p, 60) || [];
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt',
      contexto: ents.map(e => ({ texto: (e.pt||'').slice(0,700), fonte: e.fonte||'' })), historico: [] })
  });
  const d = await r.json();
  console.log('P: ' + p);
  console.log('R: ' + (d.texto||d.erro||'').replace(/\s+/g,' '));
  console.log('');
  await espera(22000);
}
