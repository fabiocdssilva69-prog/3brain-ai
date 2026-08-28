import { M } from './peneira.mjs';

// pergunta -> ids que serviriam (o primeiro e o ideal)
const CASOS = [
  ['qual o email de contato',      ['contato']],
  ['quantas pessoas trabalham ai', ['tamanho-time']],
  ['o savi ja tem cliente',        ['quem-usa-savi', 'savi-piloto']],
  ['e caro',                       ['precos-resumo', 'preco-savi', 'preco-barbergo']],
  ['tem plano gratis',             ['precos-resumo', 'preco-barbergo-plano', 'preco-barbergo']],
  ['funciona no iphone',           ['onde-publicado']],
  ['preciso instalar alguma coisa',['onde-publicado']],
  ['voces atendem em portugal',    ['por-que-portugal', 'entrevistas-portugal']],
  ['voces estao contratando',      ['tamanho-time', 'quem-escreve-codigo']],
  ['posso investir em voces',      ['rodada']],
  ['por que eu deveria confiar',   ['como-verificar']],
  ['e seguro',                     ['lgpd-savi', 'certificacao-sbis']],
  ['onde voces ficam',             ['contato']],
  ['voces sao de que cidade',      ['contato']]
];

const larg = Math.max(...CASOS.map(c => c[0].length));
console.log('PERGUNTA'.padEnd(larg) + ' | fichas          | devolv | posto | dentro?');
console.log('-'.repeat(larg + 48));
let foraDe60 = 0, semLista = 0, dentro60 = 0;
for (const [p, alvos] of CASOS) {
  const todos = M.candidatos(p, 999) || [];
  let posto = -1, quem = '';
  for (let i = 0; i < todos.length; i++) {
    if (alvos.indexOf(todos[i].id) >= 0) { posto = i + 1; quem = todos[i].id; break; }
  }
  const fich = M.fichas(p).join(',');
  let veredito;
  if (todos.length === 0)      { veredito = 'LISTA VAZIA';   semLista++; }
  else if (posto < 0)          { veredito = 'nem pontuou';   foraDe60++; }
  else if (posto <= 60)        { veredito = 'nos 60 (' + quem + ')'; dentro60++; }
  else                         { veredito = 'FORA dos 60';   foraDe60++; }
  console.log(p.padEnd(larg) + ' | ' + fich.slice(0,15).padEnd(15) + ' | ' +
              String(todos.length).padStart(6) + ' | ' +
              (posto < 0 ? '  --' : String(posto).padStart(4)) + '  | ' + veredito);
}
console.log('');
console.log('lista vazia (portao): ' + semLista + '  | fora dos 60: ' + foraDe60 + '  | JA estava nos 60: ' + dentro60);
