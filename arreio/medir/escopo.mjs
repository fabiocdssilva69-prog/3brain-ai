/* O PORTAO DE ESCOPO, medido local e de graca. E a primeira linha de defesa:
   se paraOWorker devolve vazio, o modelo NAO recebe contexto e a pagina diz que
   nao tem o dado. Eu afrouxei este portao DUAS vezes hoje (de 2+ fichas para
   3+, e depois deixando ficha vazia cair no trigrama) e nunca medi o custo.

   Um portao frouxo nao e falha por si: o modelo ainda tem de recusar. Mas
   contexto de 60 entradas na frente de uma pergunta de outro assunto e material
   para florear -- e florear com fonte ao lado e o pior modo de errar desta
   pagina. */
import { M } from './peneira.mjs';

const FORA = [
  'qual a capital da mongolia', 'como faco lasanha a bolonhesa', 'quem ganhou a copa de 2022',
  'me escreve um poema sobre o mar', 'qual a raiz quadrada de 144', 'que horas sao em toquio',
  'receita de bolo de cenoura', 'qual o melhor carro eletrico', 'como trocar um pneu',
  'me conta uma piada', 'qual a previsao do tempo amanha', 'quem foi napoleao bonaparte',
  'traduz boa noite para alemao', 'qual o remedio para dor de cabeca',
  'what is the capital of france', 'write me a python script', 'who won the world cup',
  'how do I cook pasta',
];
const DENTRO = [
  'quanto custa', 'o que e o savi', 'voces ja tem cliente', 'e caro', 'e seguro',
  'onde voces ficam', 'what do you do', 'how much are you raising', 'qual o maior risco',
  'ja esta no ar', 'tem plano gratis', 'quantas pessoas trabalham ai',
];

let barrou = 0, passou = 0;
console.log('FORA DE ESCOPO -- o portao deve BARRAR (contexto vazio):');
for (const p of FORA) {
  const n = (M.paraOWorker(p, 'pt') || []).length;
  if (n === 0) barrou++;
  else console.log('   passou com ' + String(n).padStart(2) + ' candidatos: "' + p + '"');
}
console.log('   barrou ' + barrou + '/' + FORA.length);
console.log('');
console.log('DENTRO DE ESCOPO -- o portao NAO pode barrar:');
for (const p of DENTRO) {
  const soc = M.ehSocial(p);
  const n = soc ? -1 : (M.paraOWorker(p, 'pt') || []).length;
  if (n !== 0) passou++;
  else console.log('   BARROU indevidamente: "' + p + '"');
}
console.log('   passou ' + passou + '/' + DENTRO.length);
