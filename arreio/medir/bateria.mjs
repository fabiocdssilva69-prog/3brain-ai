import { M } from './peneira.mjs';
/* 22s, MEDIDO nos cabecalhos da Groq: 8.000 fichas por MINUTO contra
   ~2.650 por conversa nossa da 3 a 4 pedidos por minuto. Os 3,6s que
   estavam aqui davam 16 por minuto -- quatro vezes acima do teto, e foi
   isso que fez as baterias de hoje devolverem 503 e eu diagnosticar
   "quota diaria esgotada" tres vezes seguidas, sempre errado. */
const PAUSA = 22000;                       // limitador do Worker: 3 pedidos / 10s
const espera = ms => new Promise(r => setTimeout(r, ms));

const Q = process.argv.slice(2).length ? process.argv.slice(2) : [
  'onde voces ficam','voces sao de que cidade','qual o email de contato',
  'quantas pessoas trabalham ai','o savi ja tem cliente','e caro','tem plano gratis',
  'funciona no iphone','preciso instalar alguma coisa','voces atendem em portugal',
  'voces estao contratando','posso investir em voces','por que eu deveria confiar','e seguro'
];

for (const p of Q) {
  const ents = M.candidatos(p, 60) || [];
  const ctx = ents.map(e => ({ texto: (e.pt || '').slice(0, 700), fonte: e.fonte || '' }));
  let saida;
  if (!ctx.length) {
    saida = { motor: 'PENEIRA-VAZIA(a pagina nem chama o Worker)', texto: '(base local: nao sei)' };
  } else {
    const r = await fetch('https://api.3brain.com.br', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
      body: JSON.stringify({ pergunta: p, idioma: 'pt', contexto: ctx, historico: [] })
    });
    saida = await r.json();
  }
  console.log('### ' + p + '   [' + ctx.length + ' cand | ' + (saida.motor || '?') + ']');
  console.log((saida.texto || saida.erro || '').replace(/\s+/g, ' ').slice(0, 300));
  console.log('');
  await espera(PAUSA);
}
