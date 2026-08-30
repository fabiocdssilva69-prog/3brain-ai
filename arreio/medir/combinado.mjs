/* FRAGILIDADE COMBINADA: o que o visitante REALMENTE recebe.
   O `fragil_producao.mjs` mede so a camada local -- o indice semantico vive no
   Worker e nao entra la. Isto mede as DUAS, e com o cuidado que torna o teste
   honesto: o vetor da propria pergunta retirada e DESCARTADO dos resultados,
   senao o semantico achava-se a si mesmo e o numero seria fraude.
   Amostra, nao censo: 1.554 embeddings custariam ~2.000 neuronios e 20 min. */
import { BASE_CRUA, comBase } from './peneira.mjs';
import { readFileSync } from 'fs';
const CFG = process.env.APPDATA + '/xdg.config/.wrangler/config/default.toml';
const T = readFileSync(CFG, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)[1];
const CONTA = 'ff1bc9fefd0373aef2027bfaa88a6b2d';
async function api(p, b) {
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + CONTA + p, {
    method: 'POST', headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
    body: JSON.stringify(b) });
  return r.json();
}
const M0 = comBase(BASE_CRUA);
const porTexto = new Map();
for (const x of BASE_CRUA.entradas) for (const l of ['pt','en']) if (x[l]) porTexto.set(String(x[l]).slice(0,120), x.id);

// junta todos os casos e amostra
const casos = [];
for (const e of BASE_CRUA.entradas)
  for (const g of (e.perguntas||[]).filter(t=>t.trim().length>=8)) casos.push([e.id, g]);
const PASSO = Math.max(1, Math.floor(casos.length / 200));
const amostra = casos.filter((_, i) => i % PASSO === 0);
console.log('amostra: ' + amostra.length + ' de ' + casos.length + ' retiradas');

let soLex = 0, soSem = 0, ambos = 0, nenhum = 0;
for (const [id, g] of amostra) {
  // --- LOCAL, com a pergunta retirada ---
  const base = JSON.parse(JSON.stringify(BASE_CRUA));
  const alvo = base.entradas.find(x => x.id === id);
  alvo.perguntas = alvo.perguntas.filter(x => x !== g);
  const M = comBase(base);
  const pt2 = new Map();
  for (const x of base.entradas) for (const l of ['pt','en']) if (x[l]) pt2.set(String(x[l]).slice(0,120), x.id);
  const r = M.paraOWorker(g, 'pt', null) || [];
  const lista = Array.isArray(r) ? r : (r.contexto || []);
  const iL = lista.map(c => pt2.get(String(c.texto||'').slice(0,120)) || '?').indexOf(id);
  const lexOk = iL >= 0 && iL < 5;

  // --- SEMANTICO, descartando o vetor da propria pergunta ---
  let semOk = false;
  try {
    const emb = await api('/ai/run/@cf/baai/bge-m3', { text: [g] });
    if (!emb || emb.success === false || !emb.result || !emb.result.data) {
      console.log('SEMANTICO recusado:', JSON.stringify(emb && emb.errors).slice(0,160));
      process.exit(2);
    }
    const v = emb.result.data[0];
    const q = await api('/vectorize/v2/indexes/base-3brain/query',
                        { vector: v, topK: 30, returnMetadata: 'all' });
    const vistos = new Set(), ids = [];
    for (const m of q.result.matches) {
      const md = m.metadata || {};
      if (md.pergunta === g) continue;            // <- descarta o proprio vetor
      if (!md.entrada || vistos.has(md.entrada)) continue;
      vistos.add(md.entrada); ids.push(md.entrada);
      if (ids.length >= 5) break;
    }
    semOk = ids.indexOf(id) >= 0;
  } catch (e) {
    /* NUNCA CALAR. A primeira corrida deste ficheiro deu 0% para o semantico
       -- incluindo ZERO concordancias com o lexico, que e impossivel se ele
       funcionasse. Causa: o OAuth do wrangler expirara e a API devolvia 401,
       e este catch transformava "nao consegui perguntar" em "nao achou".
       E o padrao `except-mudo` que o proprio Oraculo cataloga, escrito por
       mim. Falha de medicao tem de PARAR a medicao, nao virar um numero. */
    console.log('SEMANTICO FALHOU:', (e && e.message) || e);
    process.exit(2);
  }

  if (lexOk && semOk) ambos++;
  else if (lexOk) soLex++;
  else if (semOk) soSem++;
  else nenhum++;
}
const n = amostra.length, pc = x => (100*x/n).toFixed(0) + '%';
console.log('');
console.log('  so o LEXICO acha ......... ' + String(soLex).padStart(3) + '  ' + pc(soLex));
console.log('  so o SEMANTICO acha ...... ' + String(soSem).padStart(3) + '  ' + pc(soSem) + '   <- o que o indice acrescentou');
console.log('  os DOIS acham ............ ' + String(ambos).padStart(3) + '  ' + pc(ambos));
console.log('  NENHUM acha .............. ' + String(nenhum).padStart(3) + '  ' + pc(nenhum));
console.log('');
console.log('  lexico sozinho ........... ' + pc(soLex + ambos));
console.log('  COMBINADO (o que o visitante recebe) ... ' + pc(soLex + soSem + ambos));
