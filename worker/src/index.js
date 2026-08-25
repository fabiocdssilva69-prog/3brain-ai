/**
 * 3BRAIN · ponte entre a landing estatica e o modelo.
 *
 * A CHAVE MORA AQUI E SO AQUI. A pagina no GitHub Pages e publica e nao carrega
 * segredo nenhum: ela manda a pergunta e o contexto, e recebe texto de volta.
 *
 * Cadeia de queda, nesta ordem:
 *   1. Groq       (openai/gpt-oss-120b)     -> chave em env.GROQ_API_KEY, de graca
 *   2. Workers AI (@cf/openai/gpt-oss-120b) -> binding env.AI, SEM chave nenhuma
 *   3. devolve 503 e a PAGINA usa a base local curada
 *
 * Os dois primeiros sao O MESMO MODELO por caminhos diferentes, e isso e de
 * proposito: se a resposta mudasse de carater conforme o motor que atendeu, o
 * visitante veria duas empresas diferentes na mesma pagina.
 * Ou seja: a landing nunca fica muda, aconteca o que acontecer aqui.
 *
 * Deploy: ver README.md ao lado.
 */

const MAX_CORPO = 8 * 1024;      // 8 KB: pergunta + contexto + historico cabem folgados
const MAX_PERGUNTA = 220;        // igual ao maxlength do input da pagina
const MAX_HISTORICO = 6;         // 6 mensagens = 3 turnos. Teto de TPM, nao de gosto
const MAX_CONTEXTO = 5;          // entradas da base enviadas como fundamento

/* Dois tetos, nao um. O da Groq tem de deixar tempo para o segundo motor ainda
   responder DENTRO da espera da pagina -- senao a pagina desiste no meio da
   queda e o fallback nunca chega a tela. Era a corrida antiga: Worker 9s e
   pagina 9s, empate tecnico, e quem perdia era o visitante. */
const TIMEOUT_GROQ = 6000;
/* Medido em producao: com o orcamento de raciocinio maior, a Workers AI passou
   a levar de 2 a 7 segundos. O teto de 6s cortava justamente a cauda -- a
   falha caiu em 6904ms. Teto tem de ficar ACIMA da cauda observada, nao acima
   da media, senao ele nao protege de nada e so derruba o que ia dar certo. */
const TIMEOUT_CF = 13000;

/* ─────────────────────────── instrucao do modelo ───────────────────────────
   Curta de proposito: no free tier da Groq o teto que morde e 8.000 tokens de
   ENTRADA por minuto. Cada palavra aqui e paga em todo turno de toda conversa. */
const INSTRUCAO = {
  pt: `Voce e o assistente da 3BRAIN, uma startup brasileira com tres produtos: SAVI (captura e vigilancia de dado clinico para instituicoes de saude), BarberGO (rede profissional de barbearia, publicado nas duas lojas) e HuntAI (motor de prospeccao, hoje ferramenta interna).

REGRAS:
- Responda SOMENTE com o que estiver no CONTEXTO abaixo. Ele vem da base curada da empresa.
- Nunca invente numero, data, nome ou fonte, e nunca calcule projecao, soma, media ou estimativa que nao esteja pronta no contexto.
- UNICA conta permitida: multiplicar um preco UNITARIO do contexto pela quantidade que a PESSOA informou (ex.: "meu hospital tem 120 leitos" com preco por leito no contexto). Nesse caso MOSTRE a conta -- "120 x R$ 99 = R$ 11.880" -- e respeite o piso, se houver. Conta a vista pode ser conferida; conta escondida, nao. Qualquer outro calculo continua proibido: faturamento nosso, projecao, mercado, media.
- Copie cada numero EXATAMENTE como esta escrito, com a mesma pontuacao: 2.126.099, nunca 2 126 099.
- ATRIBUICAO: numero que o contexto atribui a TERCEIRO (concorrente, outro estudo, outra empresa) nunca pode aparecer como se fosse nosso. Diga de quem e, sempre, ou nao use o numero.
- TRACAO: perguntaram se ja vende, se ja tem cliente, receita, faturamento ou usuario? So responda SIM se o contexto afirmar isso com todas as letras. Estar publicado numa loja NAO e vender, piloto NAO e cliente, e cadastro NAO e receita. Na duvida, diga o que o contexto diz e pare.
- Nunca troque o que o numero MEDE. Se a pergunta usa uma palavra diferente da do contexto, responda com a medida que existe e diga qual e -- exemplo: perguntaram "quantas entrevistas" e o contexto tem "86 empregadores distintos com conversa de entrevista"; entao responda isso, nomeando a medida. Nao recuse: so nao renomeie.
- Se o contexto nao responder a pergunta, diga em uma frase que esse dado nao esta publicado e sugira falar com o fundador.
- Duas a quatro frases. Comece pela resposta: sem saudacao e sem dizer de onde tirou.
- Nao escreva a fonte no texto: a pagina mostra a fonte embaixo da resposta.
- Use **negrito** so no dado que importa.
- Portugues do Brasil.`,

  en: `You are 3BRAIN's assistant. Brazilian startup, three products: SAVI (clinical data capture and surveillance for healthcare institutions), BarberGO (professional network for barbershops, live on both stores) and HuntAI (prospecting engine, currently an internal tool).

RULES:
- Answer ONLY from the CONTEXT below. It comes from the company's curated base.
- Never invent a number, date, name or source, and never compute a projection, sum, average or estimate that is not already written in the context.
- The ONLY permitted calculation: multiplying a UNIT price from the context by a quantity THE PERSON gave you. In that case SHOW the arithmetic -- "120 x R$ 99 = R$ 11,880" -- and respect any floor. Visible arithmetic can be checked; hidden arithmetic cannot. Every other calculation stays forbidden: our revenue, projections, market size, averages.
- Copy every figure EXACTLY as written, same punctuation.
- ATTRIBUTION: a figure the context attributes to a THIRD PARTY (a competitor, another study, another company) must never appear as if it were ours. Name whose it is, always, or do not use the figure.
- TRACTION: asked whether you already sell, already have customers, revenue or users? Only answer YES if the context says so in as many words. Being published in an app store is NOT selling, a pilot is NOT a customer, and a signup is NOT revenue.
- Never change what a figure MEASURES. If the question uses a different word than the context, answer with the measure that exists and name it -- do not refuse, just do not rename it.
- If the context does not answer the question, say in one sentence that the figure is not published and suggest talking to the founder.
- Two to four sentences. Lead with the answer: no greeting, no saying where it came from.
- Do not write the source in the text: the page prints the source below the answer.
- Use **bold** only on the figure that matters.
- English.`,
};

/* Sem contexto NAO se pergunta ao modelo. Pedir gentileza a um modelo sem
   fundamento e o caminho mais curto para ele inventar -- ou para repetir a
   propria instrucao de volta, que foi o que o llama-8b fazia aqui. Resposta
   fixa: custo zero, texto sempre igual, e nada a alucinar. */
const SEM_DADO = {
  pt: 'Esse dado não está na nossa base publicada, então prefiro não chutar. O fundador responde direto e consegue te dar o número com a fonte.',
  en: 'That figure is not in our published base, so I would rather not guess. The founder answers directly and can give you the number with its source.',
};

/* O modelo as vezes abre com "Com base no contexto...". A pagina ja mostra a
   fonte embaixo; a muleta so rouba a primeira linha, que e a que a pessoa le. */
const PREAMBULO = /^\s*(com base (n[oa]s?)[^,.:]{0,40}[,.:]|de acordo com [^,.:]{0,40}[,.:]|segundo [^,.:]{0,40}[,.:]|based on the[^,.:]{0,40}[,.:]|according to the[^,.:]{0,40}[,.:])\s*/i;

/* O modelo reescreve numero com espaco no lugar do ponto ("2 126 099") e troca
   o hifen comum pelo hifen-que-nao-quebra. Sao dois erros pequenos que, numa
   pagina em que cada numero tem denominador, fazem o leitor duvidar do resto.
   A instrucao reduz; isto aqui GARANTE -- e garantia deterministica vale mais
   do que pedir por favor a um modelo. */
const HIFEN_ESTRANHO = /[‐‑]/g;
const GRUPO_MILHAR = /\b(\d{1,3})((?:[     ]\d{3})+)\b/g;
const SEPARADOR_SOLTO = /[     ]/g;

function normalizaNumeros(t, idioma) {
  const sep = idioma === 'en' ? ',' : '.';
  return String(t)
    .replace(HIFEN_ESTRANHO, '-')
    .replace(GRUPO_MILHAR, (_, cabeca, resto) =>
      cabeca + resto.replace(SEPARADOR_SOLTO, sep))
    // "0,008 %" -> "0,008%": em portugues o sinal cola no numero
    .replace(/(\d)[     ]+%/g, '$1%');
}

function limpaResposta(t, idioma) {
  return normalizaNumeros(String(t || '').replace(PREAMBULO, '').trim(), idioma);
}

/* A Workers AI nao devolve sempre o mesmo formato: modelo comum devolve
   {response}, e modelo de RACIOCINIO (gpt-oss) devolve a lista {output}, onde
   o item type:"reasoning" e rascunho e NAO pode ir para a tela. Ler as duas
   formas custa dez linhas; apostar em uma custa uma pagina muda. */
function textoDaWorkersAI(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string' && r.response.trim()) return r.response;
  if (typeof r.result === 'string' && r.result.trim()) return r.result;
  const saida = r.output || (r.result && r.result.output);
  if (Array.isArray(saida)) {
    const partes = [];
    for (const it of saida) {
      if (!it || it.type === 'reasoning') continue;
      const c = it.content;
      if (typeof c === 'string') partes.push(c);
      else if (Array.isArray(c)) {
        for (const q of c) if (q && typeof q.text === 'string') partes.push(q.text);
      }
    }
    if (partes.length) return partes.join('\n');
  }
  if (r.choices && r.choices[0] && r.choices[0].message) {
    return String(r.choices[0].message.content || '');
  }
  return '';
}

/* ─────────────────────────────── utilidades ─────────────────────────────── */

function cors(origem, permitidas) {
  const h = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  // Ecoa a origem especifica em vez de "*": permite apertar depois sem reescrever nada.
  if (origem && permitidas.includes(origem)) h['Access-Control-Allow-Origin'] = origem;
  return h;
}

function json(dados, status, cabecalhos) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cabecalhos },
  });
}

/** Chave do rate limit. A Cloudflare desaconselha IP puro (carrier-grade NAT poe
 *  um predio inteiro atras do mesmo IP), entao misturamos o user-agent. */
async function chaveDoVisitante(req) {
  const bruto = (req.headers.get('CF-Connecting-IP') || '0') + '|' + (req.headers.get('User-Agent') || '0');
  const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bruto));
  return [...new Uint8Array(dig)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Turnstile e OPCIONAL: sem o segredo configurado, o Worker sobe e funciona.
 *  Assim da para publicar hoje so com a chave da Groq e apertar depois. */
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    const d = await r.json();
    return d.success === true;
  } catch {
    return false; // falha fechada: sem verificar, nao passa
  }
}

/** Monta as mensagens. Tudo que limita custo e fixado AQUI, no servidor —
 *  nada do que a pagina mandar pode aumentar o gasto. */
function montaMensagens(corpo, idioma) {
  const ctx = Array.isArray(corpo.contexto) ? corpo.contexto.slice(0, MAX_CONTEXTO) : [];
  const bloco = ctx.map((e, i) =>
    `[${i + 1}] ${String(e.texto || '').slice(0, 700)}${e.fonte ? `\nFONTE: ${String(e.fonte).slice(0, 160)}` : ''}`
  ).join('\n\n');

  const msgs = [{ role: 'system', content: `${INSTRUCAO[idioma]}\n\nCONTEXTO:\n${bloco}` }];

  const hist = Array.isArray(corpo.historico) ? corpo.historico.slice(-MAX_HISTORICO) : [];
  for (const m of hist) {
    const papel = m && m.r === 'assistant' ? 'assistant' : 'user';
    const t = String((m && m.t) || '').slice(0, 400);
    if (t) msgs.push({ role: papel, content: t });
  }

  msgs.push({ role: 'user', content: String(corpo.pergunta).slice(0, MAX_PERGUNTA) });
  return { msgs, temContexto: ctx.length > 0 };
}

/* ─────────────────────────────── provedores ─────────────────────────────── */

async function viaGroq(env, mensagens, sinal, idioma) {
  // Se o AI Gateway estiver configurado, so a base da URL muda. Nada mais.
  const base = env.CF_ACCOUNT_ID && env.CF_GATEWAY
    ? `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_GATEWAY}/groq/chat/completions`
    : 'https://api.groq.com/openai/v1/chat/completions';

  const r = await fetch(base, {
    method: 'POST',
    signal: sinal,
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.MODELO_GROQ || 'openai/gpt-oss-120b',
      messages: mensagens,
      temperature: 0.3,
      max_completion_tokens: TETO_RACIOCINIO,  // nome atual; "max_tokens" esta depreciado na Groq
      /* MEDIO, e nao baixo. Medido nos dois motores: com esforco BAIXO o modelo
         larga a instrucao de "duas a quatro frases" e responde so o numero --
         em 10 chamadas, 5 vieram como "**0,008%**." e nada mais. Com MEDIO,
         10 de 10 vieram com a frase inteira, ao custo de ~1,2s. Numa pagina de
         investidor a frase E a resposta: o numero sozinho nao diz o que mede. */
      reasoning_effort: 'medium',
      reasoning_format: 'hidden',   // sem isto o visitante VE a cadeia de raciocinio
      stream: false,                // nao-stream de proposito: o fallback so e confiavel assim
    }),
  });

  if (!r.ok) {
    const e = new Error(`groq ${r.status}`);
    e.status = r.status;
    throw e;
  }
  const d = await r.json();
  const txt = limpaResposta(d?.choices?.[0]?.message?.content, idioma);
  if (!txt) throw new Error('groq vazio');
  return { texto: txt, motor: 'groq' };
}

/* Teto ALTO de proposito, e vale para os DOIS motores. O gpt-oss e modelo de
   RACIOCINIO e o rascunho sai do MESMO orcamento da resposta: com 400, o
   raciocinio as vezes consumia tudo e sobrava mensagem vazia -- medido, 1
   falha a cada 6 chamadas. A resposta continua curta pela INSTRUCAO, nao pelo
   teto; o teto so evita que ela seja decapitada no meio. */
const TETO_RACIOCINIO = 900;

async function viaWorkersAI(env, mensagens, sinal, idioma) {
  const opcoes = { ...(env.CF_GATEWAY ? { gateway: { id: env.CF_GATEWAY } } : {}),
                   ...(sinal ? { signal: sinal } : {}) };
  const extra = Object.keys(opcoes).length ? opcoes : undefined;
  const modelo = env.MODELO_CF || '@cf/openai/gpt-oss-120b';

  // Uma segunda tentativa so quando volta VAZIO. Nao e teimosia: vazio aqui e
  // quase sempre orcamento estourado pelo raciocinio, e isso nao se repete.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    /* reasoning_effort nao esta na doc da Workers AI, mas o gpt-oss o entende e
       o efeito foi medido aqui: sem ele, 4 de 10 chamadas estouravam o prazo;
       com ele, 10 de 10 responderam e a media caiu de ~5s para ~3,8s. */
    const r = await env.AI.run(
      modelo,
      { messages: mensagens, max_tokens: TETO_RACIOCINIO, reasoning_effort: 'medium' },
      extra
    );
    const txt = limpaResposta(textoDaWorkersAI(r), idioma);
    if (txt) return { texto: txt, motor: 'workers-ai' };
    console.log('workers-ai devolveu vazio (tentativa ' + (tentativa + 1) + ')');
  }
  throw new Error('workers-ai vazio');
}

/* ──────────────────────────────── entrada ──────────────────────────────── */

export default {
  async fetch(request, env) {
    const permitidas = String(env.ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origem = request.headers.get('Origin');
    const ch = cors(origem, permitidas);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch });
    if (request.method !== 'POST') return json({ erro: 'metodo' }, 405, ch);
    if (!ch['Access-Control-Allow-Origin']) return json({ erro: 'origem' }, 403, ch);

    // CORS nao e trava: curl ignora. Quem segura de verdade sao os dois baldes abaixo.
    const chave = await chaveDoVisitante(request);
    const rajada = await env.LIM_RAJADA.limit({ key: chave });
    if (!rajada.success) return json({ erro: 'rajada' }, 429, ch);
    const minuto = await env.LIM_MINUTO.limit({ key: chave });
    if (!minuto.success) return json({ erro: 'cota' }, 429, ch);

    const bruto = await request.text();
    if (bruto.length > MAX_CORPO) return json({ erro: 'corpo' }, 413, ch);

    let corpo;
    try { corpo = JSON.parse(bruto); } catch { return json({ erro: 'json' }, 400, ch); }

    const pergunta = String(corpo?.pergunta || '').trim();
    if (!pergunta) return json({ erro: 'vazio' }, 400, ch);

    const ok = await turnstileOk(env, corpo.turnstile, request.headers.get('CF-Connecting-IP'));
    if (!ok) return json({ erro: 'turnstile' }, 403, ch);

    const idioma = corpo?.idioma === 'en' ? 'en' : 'pt';
    const { msgs, temContexto } = montaMensagens({ ...corpo, pergunta }, idioma);

    // A busca da pagina nao achou fundamento nenhum. Nao ha o que reformular:
    // qualquer coisa que o modelo escrevesse aqui sairia da cabeca dele.
    if (!temContexto) return json({ texto: SEM_DADO[idioma], motor: 'sem-contexto' }, 200, ch);

    try {
      if (env.GROQ_API_KEY) {
        const relG = new AbortController();
        const tG = setTimeout(() => relG.abort(), TIMEOUT_GROQ);
        try {
          return json(await viaGroq(env, msgs, relG.signal, idioma), 200, ch);
        } catch (e) {
          console.log('groq falhou:', e.message);   // so a mensagem; a chave nunca entra em log
        } finally {
          clearTimeout(tG);
        }
      }
      const relC = new AbortController();
      const tC = setTimeout(() => relC.abort(), TIMEOUT_CF);
      try {
        return json(await viaWorkersAI(env, msgs, relC.signal, idioma), 200, ch);
      } catch (e) {
        console.log('workers-ai falhou:', e.message);
      } finally {
        clearTimeout(tC);
      }
      // Ninguem respondeu. 503 e o sinal combinado para a pagina usar a base local.
      return json({ erro: 'motores' }, 503, ch);
    } catch (e) {
      console.log('erro inesperado:', e.message);
      return json({ erro: 'motores' }, 503, ch);
    }
  },
};
