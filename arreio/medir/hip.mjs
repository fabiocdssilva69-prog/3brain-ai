/* Hipotese: o reordenador erra porque so ve a RESPOSTA. Dando-lhe tambem as
   perguntas cadastradas e as tags, ele passa a casar pergunta com pergunta. */
import { M, ENTRADAS } from './peneira.mjs';
const espera = ms => new Promise(r => setTimeout(r, ms));
const CASOS = [
  ['voces atendem em portugal', 'por-que-portugal'],
  ['quantas pessoas trabalham ai', 'tamanho-time'],
  ['qual o email de contato', 'contato'],
  ['o savi ja tem cliente', 'quem-usa-savi'],
  ['posso investir em voces', 'rodada']
];
function comPerguntas(e) {
  const p = (e.perguntas || []).join(' ');
  const t = (e.tags || []).join(' ');
  return (p + ' ' + t + ' ' + (e.pt || '')).replace(/\s+/g, ' ').trim();
}
async function pede(p, ents, enriquecido) {
  const ctx = ents.map(e => ({
    texto: (enriquecido ? comPerguntas(e) : (e.pt || '')).slice(0, 700), fonte: e.fonte || ''
  }));
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] })
  });
  return r.json();
}
for (const [p, alvo] of CASOS) {
  const todos = M.candidatos(p, 60) || [];
  const fonteAlvo = (ENTRADAS.find(e => e.id === alvo) || {}).fonte;
  const d = await pede(p, todos, true);
  const acertou = (d.fontes || []).includes(fonteAlvo);
  console.log('=== ' + p);
  console.log('   quer: ' + alvo + '  |  ' + (acertou ? 'ESCOLHEU CERTO' : 'errou'));
  console.log('   fontes=' + JSON.stringify(d.fontes));
  console.log('   ' + (d.texto||d.erro||'').replace(/\s+/g,' ').slice(0,180));
  console.log('');
  await espera(22000);
}
