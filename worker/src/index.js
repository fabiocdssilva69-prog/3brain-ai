/**
 * 3BRAIN · ponte entre a landing estatica e o modelo.
 *
 * A CHAVE MORA AQUI E SO AQUI. A pagina no GitHub Pages e publica e nao carrega
 * segredo nenhum: ela manda a pergunta e o contexto, e recebe texto de volta.
 *
 * Cadeia de queda, nesta ordem:
 *   1. Groq  (openai/gpt-oss-120b)      -> chave em env.GROQ_API_KEY
 *   2. Workers AI (llama-3.1-8b)        -> binding env.AI, SEM chave nenhuma
 *   3. devolve 503 e a PAGINA usa a base local de 78 perguntas
 * Ou seja: a landing nunca fica muda, aconteca o que acontecer aqui.
 *
 * Deploy: ver README.md ao lado.
 */

const MAX_CORPO = 8 * 1024;      // 8 KB: pergunta + contexto + historico cabem folgados
const MAX_PERGUNTA = 220;        // igual ao maxlength do input da pagina
const MAX_HISTORICO = 6;         // 6 mensagens = 3 turnos. Teto de TPM, nao de gosto
const MAX_CONTEXTO = 3;          // entradas da base enviadas como fundamento
const TIMEOUT_MS = 9000;

/* ─────────────────────────── instrucao do modelo ───────────────────────────
   Curta de proposito: no free tier da Groq o teto que morde e 8.000 tokens de
   ENTRADA por minuto. Cada palavra aqui e paga em todo turno de toda conversa. */
const INSTRUCAO = {
  pt: `Voce e o assistente da 3BRAIN, uma startup brasileira com tres produtos: SAVI (captura e vigilancia de dado clinico para instituicoes de saude), BarberGO (rede profissional de barbearia, publicado nas duas lojas) e HuntAI (motor de prospeccao, hoje ferramenta interna).

REGRAS:
- Responda SOMENTE com o que estiver no CONTEXTO abaixo. Ele vem da base curada da empresa.
- Se o contexto nao cobrir a pergunta, diga que nao tem esse dado e convide a falar com o fundador. Nunca invente numero, data, nome ou fonte.
- Nunca calcule projecao nem estime valor que nao esteja escrito no contexto.
- Duas a quatro frases. Direto, sem saudacao, sem "com base no contexto".
- Numero sempre com a fonte que veio junto.
- Use **negrito** so no dado que importa.
- Portugues do Brasil.`,

  en: `You are 3BRAIN's assistant. Brazilian startup, three products: SAVI (clinical data capture and surveillance for healthcare institutions), BarberGO (professional network for barbershops, live on both stores) and HuntAI (prospecting engine, currently an internal tool).

RULES:
- Answer ONLY from the CONTEXT below. It comes from the company's curated base.
- If the context does not cover the question, say you do not have that figure and invite them to talk to the founder. Never invent a number, date, name or source.
- Never compute projections or estimate any value not written in the context.
- Two to four sentences. Direct, no greeting, no "based on the context".
- Always pair a number with the source it came with.
- Use **bold** only on the figure that matters.
- English.`,
};

const SEM_CONTEXTO = {
  pt: '\n\n(nenhuma entrada da base casou com esta pergunta — diga que nao tem esse dado e ofereca falar com o fundador)',
  en: '\n\n(no base entry matched this question — say you do not have that figure and offer to talk to the founder)',
};

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
  const bloco = ctx.length
    ? ctx.map((e, i) =>
        `[${i + 1}] ${String(e.texto || '').slice(0, 700)}${e.fonte ? `\nFONTE: ${String(e.fonte).slice(0, 160)}` : ''}`
      ).join('\n\n')
    : SEM_CONTEXTO[idioma];

  const msgs = [{ role: 'system', content: `${INSTRUCAO[idioma]}\n\nCONTEXTO:\n${bloco}` }];

  const hist = Array.isArray(corpo.historico) ? corpo.historico.slice(-MAX_HISTORICO) : [];
  for (const m of hist) {
    const papel = m && m.r === 'assistant' ? 'assistant' : 'user';
    const t = String((m && m.t) || '').slice(0, 400);
    if (t) msgs.push({ role: papel, content: t });
  }

  msgs.push({ role: 'user', content: String(corpo.pergunta).slice(0, MAX_PERGUNTA) });
  return msgs;
}

/* ─────────────────────────────── provedores ─────────────────────────────── */

async function viaGroq(env, mensagens, sinal) {
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
      max_completion_tokens: 400,   // nome atual; "max_tokens" esta depreciado na Groq
      reasoning_effort: 'low',
      reasoning_format: 'hidden',   // sem isto o visitante VE a cadeia de raciocinio
                                    // e o raciocinio conta como saida, queimando o TPM
      stream: false,                // nao-stream de proposito: o fallback so e confiavel assim
    }),
  });

  if (!r.ok) {
    const e = new Error(`groq ${r.status}`);
    e.status = r.status;
    throw e;
  }
  const d = await r.json();
  const txt = d?.choices?.[0]?.message?.content;
  if (!txt || !txt.trim()) throw new Error('groq vazio');
  return { texto: txt.trim(), motor: 'groq' };
}

async function viaWorkersAI(env, mensagens) {
  const opcoes = env.CF_GATEWAY ? { gateway: { id: env.CF_GATEWAY } } : undefined;
  const r = await env.AI.run(
    env.MODELO_CF || '@cf/meta/llama-3.1-8b-instruct-fast',
    { messages: mensagens, max_tokens: 400 },   // aqui o campo E max_tokens
    opcoes
  );
  const txt = (r && (r.response || r.result)) || '';
  if (!txt.trim()) throw new Error('workers-ai vazio');
  return { texto: txt.trim(), motor: 'workers-ai' };
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
    const mensagens = montaMensagens({ ...corpo, pergunta }, idioma);

    const rel = new AbortController();
    const t = setTimeout(() => rel.abort(), TIMEOUT_MS);
    try {
      if (env.GROQ_API_KEY) {
        try {
          return json(await viaGroq(env, mensagens, rel.signal), 200, ch);
        } catch (e) {
          console.log('groq falhou:', e.message);   // so a mensagem; a chave nunca entra em log
        }
      }
      try {
        return json(await viaWorkersAI(env, mensagens), 200, ch);
      } catch (e) {
        console.log('workers-ai falhou:', e.message);
      }
      // Ninguem respondeu. 503 e o sinal combinado para a pagina usar a base local.
      return json({ erro: 'motores' }, 503, ch);
    } finally {
      clearTimeout(t);
    }
  },
};
