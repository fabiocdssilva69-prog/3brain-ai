/* O reordenador SABE achar a entrada certa entre 60, se ela estiver la?
   E muda alguma coisa dar-lhe a PERGUNTA cadastrada em vez da RESPOSTA?

   O alvo e PLANTADO de proposito num contexto de 60, entao isto mede so o
   reordenador -- fora da influencia da busca lexical, que e o que quero
   isolar. Le-se apenas `fontes`, que sao as entradas que ELE escolheu. */
import { M, ENTRADAS } from './peneira.mjs';

const espera = ms => new Promise(r => setTimeout(r, ms));

const CASOS = [
  ['how much does it cost',                 'precos-resumo'],
  ['how much are you raising',              'rodada'],
  ['is it secure',                          'lgpd-savi'],
  ['can I invest in you',                   'rodada'],
  ['are you profitable',                    'receita-hoje'],
  ['how do you acquire customers',          'aquisicao-e-canal'],
  ['what is the market size',               'mercado-savi'],
  ['who are your competitors',              'concorrentes-savi'],
  ['how does the ai work',                  'savi-modelo-ia'],
  ['is there a free plan',                  'precos-resumo'],
  ['e se o google resolver fazer isso',     'risco-copia'],
  ['isso e so um chatgpt com outra roupa',  'savi-modelo-ia'],
  ['por que eu nao deveria investir',       'maior-risco'],
  ['ja recusaram voces em algum lugar',     'aceleradoras-investidor'],
  ['como voces ganham dinheiro',            'modelo-receita-barbergo'],
  ['quanto tempo de caixa voces tem',       'tempo-de-caixa'],
  ['o que pode dar errado',                 'maior-risco'],
  ['quem decide a compra num hospital',     'quem-paga-reembolso'],
];

// texto de BUSCA: a pergunta cadastrada + tags + comeco da resposta.
// A hipotese e que a pergunta do visitante casa com a PERGUNTA, nao com a RESPOSTA.
function paraBusca(e) {
  return ((e.perguntas || []).join('. ') + '. ' + (e.tags || []).join(' ') + '. ' +
          (e.pt || '').slice(0, 260)).replace(/\s+/g, ' ').trim();
}

// 60 candidatos: o alvo numa posicao fixa no meio + 59 outros, sempre os mesmos
function contexto(alvoId, comoBusca) {
  const alvo = ENTRADAS.find(e => e.id === alvoId);
  const outros = ENTRADAS.filter(e => e.id !== alvoId).slice(0, 59);
  const lista = outros.slice(0, 30).concat([alvo], outros.slice(30));
  return lista.map((e, i) => ({
    texto: (comoBusca ? paraBusca(e) : (e.pt || '')).slice(0, 700),
    // A fonte vira o ID, para eu ler a escolha dele. E as DUAS PRIMEIRAS vao com
    // fonte VAZIA de proposito: o piso as poe sempre no topo, e o Worker pula
    // entrada sem fonte ao montar `fontes` -- entao o que volta e a escolha do
    // REORDENADOR, que e justamente o que este arreio quer medir.
    fonte: i < 2 ? '' : e.id,
  }));
}

async function pede(p, ctx) {
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] }),
  });
  return r.json();
}

let okA = 0, okB = 0;
console.log('pergunta                              A(resposta)  B(pergunta)');
console.log('-'.repeat(66));
for (const [p, alvo] of CASOS) {
  const a = await pede(p, contexto(alvo, false));
  await espera(22000);
  const b = await pede(p, contexto(alvo, true));
  await espera(22000);
  // fontes[0] e a 1a do PISO (a entrada de indice 0), entao o que interessa e
  // se o alvo aparece entre as escolhidas -- leio as duas fontes devolvidas.
  const achouA = (a.fontes || []).includes(alvo);
  const achouB = (b.fontes || []).includes(alvo);
  if (achouA) okA++;
  if (achouB) okB++;
  console.log(p.slice(0, 36).padEnd(38) + (achouA ? '   ACHOU  ' : '   ----   ') +
              (achouB ? '   ACHOU' : '   ----'));
}
console.log('-'.repeat(66));
console.log('A: reordenador vendo a RESPOSTA  -> ' + okA + '/' + CASOS.length);
console.log('B: reordenador vendo a PERGUNTA  -> ' + okB + '/' + CASOS.length);
