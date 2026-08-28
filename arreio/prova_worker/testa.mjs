/* Arreio do Worker. Sobe o modulo de verdade com um env de mentira: da para
   exercitar a cadeia inteira (CORS, baldes, sem-contexto, queda de motor,
   formatos de resposta) sem gastar neuronio nem tocar em producao. */
// IMPORTA O ARQUIVO REAL, nao uma copia. Ate 27/08/2026 este arreio lia um
// worker.mjs copiado a mao: o index.js mudou, a copia nao, e o arreio
// continuou imprimindo '38 passaram' medindo codigo velho. Instrumento que
// nao acompanha o produto nao mede o produto -- ratifica o passado.
import worker from '../../worker/src/index.js';

const ORIGEM = 'https://fabiocdssilva69-prog.github.io';
let passou = 0, falhou = 0;

function ok(nome, cond, detalhe) {
  if (cond) { passou++; console.log('OK    ' + nome); }
  else { falhou++; console.log('FALHA ' + nome + (detalhe ? '  -> ' + detalhe : '')); }
}

function envBase(extra = {}) {
  return {
    ORIGENS: ORIGEM + ',https://3brain.com.br',
    MODELO_CF: '@cf/openai/gpt-oss-120b',
    LIM_RAJADA: { limit: async () => ({ success: true }) },
    LIM_MINUTO: { limit: async () => ({ success: true }) },
    AI: { run: async () => ({ response: 'Resposta do modelo.' }) },
    ...extra,
  };
}

function pede(corpo, { origem = ORIGEM, metodo = 'POST' } = {}) {
  const h = { 'Content-Type': 'application/json', 'User-Agent': 'teste' };
  if (origem) h.Origin = origem;
  return new Request('https://exemplo/', {
    method: metodo,
    headers: h,
    body: metodo === 'POST' ? JSON.stringify(corpo) : undefined,
  });
}

const CTX = [{ texto: 'O SAVI custa R$ 99 por leito por mes.', fonte: 'tabela 22/08/2026' }];

// 1. porta: origem errada nao passa
{
  const r = await worker.fetch(pede({ pergunta: 'oi' }, { origem: 'https://mal.com' }), envBase());
  ok('origem nao autorizada -> 403', r.status === 403, 'veio ' + r.status);
}
// 2. preflight
{
  const r = await worker.fetch(pede(null, { metodo: 'OPTIONS' }), envBase());
  ok('OPTIONS -> 204 com Allow-Origin', r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === ORIGEM);
}
// 3. SEM CONTEXTO nao chama o modelo
{
  let chamou = false;
  const env = envBase({ AI: { run: async () => { chamou = true; return { response: 'x' }; } } });
  const r = await worker.fetch(pede({ pergunta: 'qual a cor do cavalo de napoleao', contexto: [] }), env);
  const d = await r.json();
  ok('sem contexto -> nao chama o modelo', !chamou);
  ok('sem contexto -> motor=sem-contexto', d.motor === 'sem-contexto', JSON.stringify(d));
  ok('sem contexto -> texto fixo em pt', /não está na nossa base publicada/.test(d.texto), d.texto);
}
// 4. com contexto: chama e devolve
{
  let visto = null;
  const env = envBase({ AI: { run: async (m, o) => { visto = o; return { response: 'R$ **99** por leito.' }; } } });
  const r = await worker.fetch(pede({ pergunta: 'quanto custa o savi', contexto: CTX }), env);
  const d = await r.json();
  ok('com contexto -> motor=workers-ai', d.motor === 'workers-ai', JSON.stringify(d));
  ok('o contexto viaja no system', /R\$ 99 por leito/.test(visto.messages[0].content));
  ok('a FONTE viaja junto', /tabela 22\/08\/2026/.test(visto.messages[0].content));
}
// 5. formato de RACIOCINIO: o rascunho nao pode ir para a tela
{
  const env = envBase({ AI: { run: async () => ({
    output: [
      { type: 'reasoning', content: [{ text: 'deixa eu pensar... o usuario quer o preco' }] },
      { type: 'message', content: [{ text: 'Custa **R$ 99** por leito.' }] },
    ] }) } });
  const r = await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env);
  const d = await r.json();
  ok('formato output[]: pega a mensagem', /R\$ 99/.test(d.texto), d.texto);
  ok('formato output[]: descarta o raciocinio', !/deixa eu pensar/.test(d.texto), d.texto);
}
// 6. preambulo some
{
  const env = envBase({ AI: { run: async () => ({ response: 'Com base no contexto fornecido, custa R$ 99.' }) } });
  const d = await (await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env)).json();
  ok('preambulo removido', d.texto.startsWith('custa R$ 99') || d.texto.startsWith('Custa R$ 99'), d.texto);
}
// 7. Groq cai -> Workers AI atende
{
  const env = envBase({ GROQ_API_KEY: 'chave-de-mentira' });
  const antes = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('groq fora do ar'); };
  const d = await (await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env)).json();
  globalThis.fetch = antes;
  ok('groq cai -> workers-ai assume', d.motor === 'workers-ai', JSON.stringify(d));
}
// 8. os dois motores caem -> 503 para a pagina usar a base local
{
  const env = envBase({ GROQ_API_KEY: 'x', AI: { run: async () => { throw new Error('fora'); } } });
  const antes = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('groq fora'); };
  const r = await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env);
  globalThis.fetch = antes;
  ok('os dois caem -> 503', r.status === 503, 'veio ' + r.status);
}
// 9. modelo devolve vazio -> nao vira bolha em branco
{
  const env = envBase({ AI: { run: async () => ({ response: '   ' }) } });
  const r = await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env);
  ok('resposta vazia -> 503, nunca bolha em branco', r.status === 503, 'veio ' + r.status);
}
// 10. teto de contexto: 5, e nem um a mais
{
  let visto = null;
  const env = envBase({ AI: { run: async (m, o) => { visto = o; return { response: 'ok' }; } } });
  const muitos = Array.from({ length: 9 }, (_, i) => ({ texto: 'entrada ' + i, fonte: 'f' + i }));
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos }), env);
  const c = visto.messages[0].content;
  ok('manda 5 entradas', /entrada 4/.test(c), 'faltou a 5a');
  ok('e corta a 6a', !/entrada 5/.test(c), 'passou do teto');
}
// 11. idioma en
{
  const d = await (await worker.fetch(pede({ pergunta: 'x', idioma: 'en', contexto: [] }), envBase())).json();
  ok('sem contexto em ingles', /not in our published base/.test(d.texto), d.texto);
}


/* Normalizacao do numero. Uso \u.... de proposito: escrever o espaco exotico
   direto no arquivo e justamente o que se perde no caminho ate ele. */
async function respondeCom(texto, idioma) {
  const env = envBase({ AI: { run: async () => ({ response: texto }) } });
  const r = await worker.fetch(pede({ pergunta: 'x', idioma, contexto: CTX }), env);
  return (await r.json()).texto;
}
{
  const t = await respondeCom('Sao 2 126 099 e‑mails unicos.', 'pt');
  ok('espaco de milhar vira ponto (pt)', t.includes('2.126.099'), t);
  ok('hifen que nao quebra vira hifen comum', t.includes('e-mails'), t);
}
{
  const t = await respondeCom('There are 2 126 099 unique emails.', 'en');
  ok('espaco de milhar vira virgula (en)', t.includes('2,126,099'), t);
}
{
  const t = await respondeCom('Sao 2 126 099 e 79 828 casos.', 'pt');
  ok('espaco estreito tambem e corrigido', t.includes('2.126.099') && t.includes('79.828'), t);
}
{
  const t = await respondeCom('Piso de R$ 3 000 por contrato.', 'pt');
  ok('grupo unico tambem agrupa', t.includes('R$ 3.000'), t);
}
{
  const t = await respondeCom('Em 2026 100 pessoas usaram.', 'pt');
  ok('ano de 4 digitos NAO vira milhar', t.includes('2026 100'), t);
}
{
  const t = await respondeCom('Foram 154 mensagens em 86 empregadores.', 'pt');
  ok('numero comum nao e mexido', t.includes('154 mensagens em 86 empregadores'), t);
}


{
  // primeira volta vazia (raciocinio comeu o orcamento), segunda responde
  let n = 0;
  const env = envBase({ AI: { run: async () => { n++; return { response: n === 1 ? '' : 'Custa **R$ 99**.' }; } } });
  const d = await (await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env)).json();
  ok('vazio na 1a volta -> a 2a resgata', d.texto === 'Custa **R$ 99**.' && n === 2, JSON.stringify(d) + ' voltas=' + n);
}
{
  // e nao insiste para sempre: duas voltas vazias entregam o 503
  let n = 0;
  const env = envBase({ AI: { run: async () => { n++; return { response: '' }; } } });
  const r = await worker.fetch(pede({ pergunta: 'preco', contexto: CTX }), env);
  ok('duas voltas vazias -> 503 e para', r.status === 503 && n === 2, 'status=' + r.status + ' voltas=' + n);
}


{
  const t = await respondeCom('A taxa foi 0,008 % em agosto.', 'pt');
  ok('porcentagem cola no numero', t.includes('0,008%'), t);
}
{
  const t = await respondeCom('Foram 89,4 % de entrega e 46,1 % de conversao.', 'pt');
  ok('cola em todas as porcentagens', t.includes('89,4%') && t.includes('46,1%'), t);
}


/* ---------- reordenador: a peca nova ---------- */
function muitos(n) {
  return Array.from({ length: n }, (_, i) => ({ texto: 'entrada numero ' + i, fonte: 'fonte ' + i }));
}
function envCom(aoReordenar) {
  return envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) return aoReordenar(entrada);
        return { response: 'resposta' };
      },
    },
  });
}
{
  // com 5 ou menos, nao ha o que reordenar: nao pode nem chamar
  let chamou = false;
  const env = envCom(() => { chamou = true; return { response: [] }; });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(4) }), env);
  ok('ate 5 candidatos -> nao chama o reordenador', !chamou);
}
{
  // com 60, chama e RESPEITA a escolha dele
  let visto = null;
  const env = envCom(e => { visto = e; return { response: [{ id: 42, score: 0.9 }, { id: 7, score: 0.8 }] }; });
  const d = await (await worker.fetch(pede({ pergunta: 'quanto fatura', contexto: muitos(60) }), env)).json();
  ok('60 candidatos -> chama o reordenador', visto !== null);
  ok('manda a pergunta junto', visto && visto.query === 'quanto fatura', JSON.stringify(visto && visto.query));
  ok('o piso da peneira sobrevive ao reordenador',
     JSON.stringify(d.fontes) === JSON.stringify(['fonte 0', 'fonte 42']), JSON.stringify(d.fontes));
}
{
  // teto de candidatos respeitado
  let n = 0;
  const env = envCom(e => { n = e.contexts.length; return { response: [{ id: 0 }] }; });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(200) }), env);
  ok('corta em 60 candidatos', n === 60, 'mandou ' + n);
}
{
  // formato alternativo: lista crua de indices
  const env = envCom(() => [{ id: 3 }, { id: 1 }]);
  const d = await (await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env)).json();
  ok('aceita a lista crua', JSON.stringify(d.fontes) === JSON.stringify(['fonte 0', 'fonte 3']), JSON.stringify(d.fontes));
}
{
  // o reordenador cai -> nao pode calar a pagina
  const env = envCom(() => { throw new Error('reranker fora do ar'); });
  const r = await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env);
  const d = await r.json();
  ok('reordenador cai -> ainda responde', r.status === 200 && !!d.texto, 'status ' + r.status);
  ok('reordenador cai -> usa a ordem antiga', JSON.stringify(d.fontes) === JSON.stringify(['fonte 0', 'fonte 1']), JSON.stringify(d.fontes));
}
{
  // formato inesperado -> mesma rede de seguranca
  const env = envCom(() => ({ resultado: 'nada a ver' }));
  const d = await (await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env)).json();
  ok('formato estranho -> cai na ordem antiga', JSON.stringify(d.fontes) === JSON.stringify(['fonte 0', 'fonte 1']), JSON.stringify(d.fontes));
}
{
  // so 5 chegam ao MODELO, mesmo com 60 peneirados
  let sistema = '';
  const env = envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) return { response: [0, 1, 2, 3, 4].map(i => ({ id: i })) };
        sistema = entrada.messages[0].content;
        return { response: 'ok' };
      },
    },
  });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env);
  ok('so 5 entradas chegam ao modelo', /entrada numero 4/.test(sistema) && !/entrada numero 5/.test(sistema));
}

{
  /* A REGRA NOVA, medida em 27/08/2026: o reordenador COMPLETA a peneira, nao a
     substitui. Antes, a entrada certa vinha em 1o lugar da busca por palavra e
     ele a descartava -- "quantas pessoas trabalham ai" respondia sobre emprego
     de barbeiro, e "e caro" sobre custo de WhatsApp. Agora as 2 primeiras da
     busca sao piso garantido e ele preenche as 3 vagas que sobram. */
  let sistema = '';
  const env = envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) return { response: [50, 51, 52, 53, 54].map(i => ({ id: i })) };
        sistema = entrada.messages[0].content;
        return { response: 'ok' };
      },
    },
  });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env);
  ok('o topo da peneira NUNCA e descartado',
     /entrada numero 0\b/.test(sistema), sistema.slice(0, 160));
  ok('o reordenador ainda preenche o resto',
     /entrada numero 50\b/.test(sistema) && /entrada numero 51\b/.test(sistema) && /entrada numero 52\b/.test(sistema));
  ok('o reordenador fica com as 4 vagas restantes',
     /entrada numero 53\b/.test(sistema) && !/entrada numero 54\b/.test(sistema));
}
{
  // o piso nao pode DUPLICAR quando o reordenador escolhe as mesmas entradas
  let sistema = '';
  const env = envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) return { response: [0, 1, 9].map(i => ({ id: i })) };
        sistema = entrada.messages[0].content;
        return { response: 'ok' };
      },
    },
  });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env);
  const quantas = (sistema.match(/entrada numero 0\b/g) || []).length;
  ok('piso coincidindo com a escolha nao duplica', quantas === 1, 'apareceu ' + quantas + ' vezes');
  ok('e a vaga liberada e aproveitada', /entrada numero 9\b/.test(sistema));
}

{
  /* O CAMPO `busca` e o campo `texto` tem destinos DIFERENTES, e trocar um pelo
     outro e invisivel em producao -- a resposta so fica pior. Medido em
     27/08/2026: reordenador vendo a resposta acha 2 de 18; vendo a pergunta
     cadastrada, 11 de 18. Este teste e o que impede a regressao silenciosa. */
  let viuNaBusca = '', viuNoModelo = '';
  const env = envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) {
          viuNaBusca = entrada.contexts.map(c => c.text).join(' | ');
          return { response: [{ id: 0 }] };
        }
        viuNoModelo = entrada.messages[0].content;
        return { response: 'ok' };
      },
    },
  });
  const ctx = Array.from({ length: 60 }, (_, i) => ({
    texto: 'FUNDAMENTO ' + i, fonte: 'fonte ' + i, busca: 'CASAMENTO ' + i,
  }));
  await worker.fetch(pede({ pergunta: 'x', contexto: ctx }), env);
  ok('o reordenador recebe `busca`', /CASAMENTO 0\b/.test(viuNaBusca), viuNaBusca.slice(0, 80));
  ok('o reordenador NAO recebe `texto`', !/FUNDAMENTO/.test(viuNaBusca));
  ok('o modelo recebe `texto`', /FUNDAMENTO 0\b/.test(viuNoModelo));
  ok('o modelo NAO recebe `busca`', !/CASAMENTO/.test(viuNoModelo));
}
{
  // sem `busca`, cai em `texto`: pagina antiga com Worker novo nao pode quebrar
  let viu = '';
  const env = envBase({
    AI: {
      run: async (modelo, entrada) => {
        if (modelo.indexOf('reranker') >= 0) { viu = entrada.contexts[0].text; return { response: [{ id: 0 }] }; }
        return { response: 'ok' };
      },
    },
  });
  await worker.fetch(pede({ pergunta: 'x', contexto: muitos(60) }), env);
  ok('sem `busca`, o reordenador usa `texto`', /entrada numero 0/.test(viu), viu);
}

console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
