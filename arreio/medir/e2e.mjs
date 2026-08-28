/* Ponta a ponta: percorre o MESMO caminho da pagina (ehSocial -> candidatos(60)
   -> Worker) e confere se a resposta contem o que ela TEM de conter.
   Comparacao sem acento: "Florianopolis" e "Florianópolis" sao a mesma prova. */
import { M } from './peneira.mjs';

/* 22s, MEDIDO nos cabecalhos da Groq: 8.000 fichas por MINUTO contra
   ~2.650 por conversa nossa da 3 a 4 pedidos por minuto. Os 3,6s que
   estavam aqui davam 16 por minuto -- quatro vezes acima do teto, e foi
   isso que fez as baterias de hoje devolverem 503 e eu diagnosticar
   "quota diaria esgotada" tres vezes seguidas, sempre errado. */
const PAUSA = 22000;
const espera = ms => new Promise(r => setTimeout(r, ms));
const achata = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CASOS = [
  ['oi',                            ['3brain']],
  ['obrigado',                      ['fonte', 'denominador']],
  ['onde voces ficam',              ['florianopolis', 'santa catarina']],
  ['voces sao de que cidade',       ['florianopolis', 'santa catarina']],
  ['qual o email de contato',       ['fabiocds.silva69@gmail.com', 'fabiocds.silva69brasil@gmail.com']],
  ['quantas pessoas trabalham ai',  ['dois', 'duas', 'fundadores']],
  ['o savi ja tem cliente',         ['piloto', 'nao ha', 'ainda nao']],
  ['e caro',                        ['99', '14,90', '1.290', '29,90']],
  ['tem plano gratis',              ['gratuito', 'gratis']],
  ['tem versao web',                ['plano', 'so aplicativo', 'app-only', 'aplicativo']],
  ['o savi e app ou web',           ['plano', 'previsto', 'aplicativo']],
  ['funciona no iphone',            ['app store', 'ios', 'lojas']],
  ['preciso instalar alguma coisa', ['google play', 'app store', 'loja']],
  ['voces atendem em portugal',     ['portugal']],
  ['voces estao contratando',       ['dois', 'duas', 'fundadores', 'funcionario']],
  ['posso investir em voces',       ['mutuo', '600', 'conversivel']],
  ['por que eu deveria confiar',    ['fonte', 'denominador', 'ressalva']],
  ['e seguro',                      ['lgpd', 'sensivel', 'controladora', 'operadora']],
  ['como funciona o savi',          ['savi']],
  ['quanto custa',                  ['99', '1.290', '14,90']],
];

let ok = 0;
const maus = [];
for (const [p, querem] of CASOS) {
  const soc = M.ehSocial(p);
  let txt, via;
  if (soc) {
    via = 'social:' + soc;
    txt = { saudacao: 'Oi! Eu respondo sobre a 3BRAIN com fonte',
            agradece: 'De nada. Se quiser ir fundo em algum numero, e so perguntar - cada um aqui tem fonte e denominador.',
            teste: 'Pode testar a vontade.' }[soc];
  } else {
    const ents = M.candidatos(p, 60) || [];
    if (!ents.length) { via = 'peneira-vazia'; txt = ''; }
    else {
      const r = await fetch('https://api.3brain.com.br', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://3brain.com.br' },
        body: JSON.stringify({ pergunta: p, idioma: 'pt',
          contexto: ents.map(e => ({ texto: (e.pt || '').slice(0, 700), fonte: e.fonte || '' })),
          historico: [] })
      });
      const d = await r.json();
      via = (d.motor || '?') + '/' + ents.length;
      txt = d.texto || d.erro || '';
    }
    await espera(PAUSA);
  }
  const a = achata(txt);
  const bateu = querem.some(q => a.indexOf(achata(q)) >= 0);
  if (bateu) ok++; else maus.push([p, via, txt.replace(/\s+/g, ' ').slice(0, 150)]);
  console.log((bateu ? '  OK  ' : '  X   ') + p.padEnd(30) + ' [' + via + ']');
}
console.log('');
console.log('PONTA A PONTA: ' + ok + '/' + CASOS.length);
if (maus.length) {
  console.log('');
  for (const [p, via, t] of maus) console.log('  X ' + p + '  [' + via + ']' + String.fromCharCode(10) + '      ' + t);
}
