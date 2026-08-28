/* PONTA A PONTA TEIMOSO. Nao espera a franquia reiniciar: insiste.

   A Groq responde de forma INTERMITENTE (teto diario, 429 a alternar com 200) e
   e de graca. O que falhou hoje nao foi a falta de motor -- foi o meu metodo:
   bateria grande, rapida, sem repeticao, tratando o primeiro 503 como resposta.

   Aqui cada pergunta tem varias tentativas com espera crescente, e o arreio
   REGISTA quantas precisou. Assim a medida sai hoje, e sai honesta: se uma
   pergunta so passou na quinta tentativa, isso aparece.

   Custo em neuronios: ZERO quando a Groq atende. O reordenador (Workers AI)
   falha por franquia e o Worker cai na ordem lexical -- entao isto mede a
   BUSCA + o MODELO, que e exatamente o que mudou hoje. */
import { M } from './peneira.mjs';

const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CASOS = [
  ['oi',                            ['3brain']],
  ['o que voces fazem',             ['savi', 'barbergo']],
  ['what do you do',                ['savi', 'barbergo']],
  ['quanto custa',                  ['99', '1.290', '14,90']],
  ['how much does it cost',         ['99', '1,290', '1.290', '14.90', '14,90']],
  ['e caro',                        ['99', '14,90', '29,90', '1.290']],
  ['quanto tempo de caixa voces tem',['dezesseis', '16 meses', 'plano']],
  ['o que voces nao sabem ainda',   ['lacuna', 'nao confirmamos', 'nao foram', 'incerteza', 'dimensionad']],
  ['por que eu nao deveria investir',['risco', 'preco', 'pre-receita']],
  ['what is your runway',           ['sixteen', '16', 'dezesseis', 'plan']],
  ['is it secure',                  ['lgpd', 'sensitive', 'sensivel', 'controller', 'operador']],
  ['can I invest in you',           ['convertible', 'mutuo', '600', 'note']],
  ['quantas pessoas trabalham ai',  ['dois', 'duas', 'fundadores']],
  ['voces estao contratando',       ['dois', 'duas', 'fundadores', 'nao ha', 'nao esta']],
  ['o savi ja tem cliente',         ['piloto', 'nao ha', 'ainda nao']],
  ['isso e so um chatgpt com outra roupa', ['modelo', 'tarefa', 'raciocinio', 'ia']],
];

/* MEDIDO nos cabecalhos da propria Groq em 27/08/2026:
     x-ratelimit-limit-requests  1000  (por DIA, e restavam 999)
     x-ratelimit-limit-tokens    8000  (por MINUTO)
   Nunca foi teto diario. Cada pedido nosso leva ~2.000 fichas (5 trechos de 700
   caracteres + instrucao + fatos fixos), entao cabem 3 a 4 por minuto. As
   baterias corriam a 16 por minuto -- quatro vezes acima. 22s entre pedidos
   deixa a margem confortavel. */
const TENTATIVAS = 3;
const PAUSA = 22000;

async function pede(p, ctx, l) {
  const r = await fetch('https://api.3brain.com.br', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
    body: JSON.stringify({ pergunta: p, idioma: l, contexto: ctx, historico: [] }),
  });
  return { status: r.status, d: await r.json() };
}

let ok = 0, desistiu = 0;
const maus = [], custo = [];
for (const [p, querem] of CASOS) {
  const soc = M.ehSocial(p);
  if (soc) {   // conversa social nem sai da pagina
    ok++;
    console.log('  OK  ' + p.padEnd(38) + '[social:' + soc + ']');
    continue;
  }
  const l = /\b(what|how|who|why|where|is|are|do|does|can|the|your)\b/i.test(p) ? 'en' : 'pt';
  const ctx = M.paraOWorker(p, l);
  let d = null, n = 0;
  for (; n < TENTATIVAS; n++) {
    if (n) await espera(PAUSA);
    const r = await pede(p, ctx, l);
    if (r.status === 200 && r.d.texto) { d = r.d; break; }
  }
  if (!d) {
    desistiu++;
    maus.push([p, 'os motores nao atenderam em ' + TENTATIVAS + ' tentativas', '']);
    console.log('  --  ' + p.padEnd(38) + '[sem motor apos ' + TENTATIVAS + ']');
    await espera(PAUSA);
    continue;
  }
  custo.push(n + 1);
  const t = achata(d.texto);
  const bateu = querem.some(q => t.indexOf(achata(q)) >= 0);
  if (bateu) ok++; else maus.push([p, 'nao trouxe ' + querem.slice(0, 3).join('/'), d.texto.replace(/\s+/g, ' ').slice(0, 130)]);
  console.log((bateu ? '  OK  ' : '  X   ') + p.padEnd(38) +
              '[' + d.motor + ', ' + (n + 1) + (n ? ' tentativas]' : ' tentativa]'));
  await espera(PAUSA);
}

const tentadas = CASOS.length - desistiu;
console.log('');
console.log('PONTA A PONTA: ' + ok + '/' + CASOS.length +
            (desistiu ? '   (' + desistiu + ' sem motor, nao contam contra o chatbot)' : ''));
if (custo.length) {
  const med = custo.reduce((a, b) => a + b, 0) / custo.length;
  console.log('teimosia necessaria: ' + med.toFixed(1) + ' tentativas por pergunta em media, pior ' +
              Math.max(...custo));
}
maus.forEach(([p, d, t]) => {
  console.log('');
  console.log('  x ' + p + '  -> ' + d);
  if (t) console.log('    ' + t);
});
