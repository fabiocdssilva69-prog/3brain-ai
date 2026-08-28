import { M } from './peneira.mjs';
const DEVE = ['oi','ola','opa','bom dia','boa tarde','oi tudo bem','eae','hello','beleza',
              'obrigado','obrigada','valeu','vlw','muito obrigado','thanks','thank you',
              'testando','ping','so testando','to te testando','ta funcionando','nao funciona'];
const NAO_DEVE = ['funciona no iphone','isso ja funciona','como funciona o savi','o barbergo funciona mesmo',
  'como funciona a ia de voces','isso funciona de verdade','da pra testar de graca','quero testar o produto',
  'como funciona o preco','ja funciona em producao','como funciona a implantacao','oi quanto custa o savi',
  'bom dia quanto custa','quanto custa','o que e o savi','voces ja testaram com cliente real'];
let a = 0, b = 0;
console.log('DEVE ser social:');
for (const p of DEVE) { const s = M.ehSocial(p); if (s) a++; else console.log('  x FALHOU: "' + p + '"'); }
console.log('  ' + a + '/' + DEVE.length);
console.log('NAO deve ser social:');
for (const p of NAO_DEVE) { const s = M.ehSocial(p); if (!s) b++; else console.log('  x SEQUESTRADA: "' + p + '" -> ' + s); }
console.log('  ' + b + '/' + NAO_DEVE.length);
