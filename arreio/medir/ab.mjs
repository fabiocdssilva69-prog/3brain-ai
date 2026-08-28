import { M } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const CASOS = [
  ['voces atendem em portugal', 'por-que-portugal'],
  ['quantas pessoas trabalham ai', 'tamanho-time'],
  ['qual o email de contato', 'contato']
];
async function pede(p, ents) {
  const ctx = ents.map(e => ({ texto: (e.pt || '').slice(0, 700), fonte: e.fonte || '' }));
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] })
  });
  return r.json();
}
for (const [p, alvo] of CASOS) {
  const todos = M.candidatos(p, 60) || [];
  const posto = todos.findIndex(e => e.id === alvo) + 1;
  console.log('=== ' + p + '   (alvo ' + alvo + ' esta em ' + posto + 'o de ' + todos.length + ')');

  const a = await pede(p, todos);                    // 60 -> reordenador AGE
  console.log('  [60 cand, reordenador ON ] fontes=' + JSON.stringify(a.fontes));
  console.log('     ' + (a.texto||a.erro||'').replace(/\s+/g,' ').slice(0,190));
  await espera(22000);

  const b = await pede(p, todos.slice(0, 5));        // 5 -> reordenador NAO age
  console.log('  [ 5 cand, reordenador OFF] fontes=' + JSON.stringify(b.fontes));
  console.log('     ' + (b.texto||b.erro||'').replace(/\s+/g,' ').slice(0,190));
  console.log('');
  await espera(22000);
}
