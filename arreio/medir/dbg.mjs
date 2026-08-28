import { M } from './peneira.mjs';

const S = M.SOCIAL;
console.log('--- controle: regex escrita aqui mesmo ---');
console.log('  /^(oi+)/.test("oi") =', /^(oi+)/.test('oi'));

console.log('--- a regex que veio do arquivo ---');
console.log('  source :', JSON.stringify(S.saudacao.source));
console.log('  test oi:', S.saudacao.test('oi'));
console.log('  test ola:', S.saudacao.test('ola'));

console.log('--- teste ---');
console.log('  source :', JSON.stringify(S.teste.source));
console.log('  funciona no iphone:', S.teste.test('funciona no iphone'));
console.log('  como funciona o savi:', S.teste.test('como funciona o savi'));
console.log('  quero testar:', S.teste.test('quero testar'));

console.log('--- ehSocial ---');
for (const p of ['oi', 'funciona no iphone', 'como funciona o savi', 'obrigado', 'quanto custa']) {
  console.log('  ' + JSON.stringify(p) + ' -> ' + JSON.stringify(M.ehSocial(p)));
}
