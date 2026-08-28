/* MAPA DOS PONTOS FRACOS. Dimensoes que eu ainda nao medi NENHUMA vez, todas
   verificaveis sem modelo -- porque o que se mede aqui e se a entrada certa
   CHEGA, e isso e trabalho da pagina.

   Nao e para passar: e para expor. Cada grupo abaixo e uma forma de escrever
   que um visitante real usa e que eu nunca testei. */
import { M, ENTRADAS } from './peneira.mjs';

const GRUPOS = {
  'seguimento (pronome)': [
    // O visitante ja perguntou uma coisa e continua. A pergunta nova sozinha
    // nao tem assunto -- o assunto esta na anterior. A pagina manda historico,
    // mas a BUSCA olha so a pergunta nova.
    ['e o savi',                     ['o-que-e-savi', 'preco-savi', 'savi-segmentos']],
    ['e quanto custa esse',          ['precos-resumo', 'preco-savi', 'preco-barbergo']],
    ['e o outro produto',            ['o-que-a-3brain-faz', 'o-que-e-barbergo', 'o-que-e-savi']],
    ['e no barbergo',                ['o-que-e-barbergo', 'preco-barbergo', 'usuarios-barbergo']],
    ['por que',                      null],   // sozinho nao decide nada: espera-se vazio ou generico
    ['como assim',                   null],
  ],
  'maiuscula / sem acento / pontuacao': [
    ['QUANTO CUSTA O SAVI',          ['preco-savi', 'precos-resumo']],
    ['quanto custa o savi???',       ['preco-savi', 'precos-resumo']],
    ['Quanto custa o SAVI?',         ['preco-savi', 'precos-resumo']],
    ['qual e o maior risco',         ['maior-risco']],
    ['quem sao os fundadores!!!',    ['fundadores-quem']],
    ['voces ja tem cliente...',      ['receita-hoje', 'quem-usa-savi', 'usuarios-barbergo']],
  ],
  'numero na pergunta': [
    ['meu hospital tem 120 leitos quanto custa',  ['preco-savi', 'precos-resumo']],
    ['tenho 40 residentes quanto fica',           ['preco-savi', 'precos-resumo']],
    ['somos 3 barbearias qual o preco',           ['preco-barbergo', 'precos-resumo', 'preco-barbergo-plano']],
  ],
  'pergunta longa colada': [
    ['ola, sou investidor e estou avaliando a 3brain para uma possivel rodada. gostaria de entender qual o preco do savi por leito e se ja existe algum cliente pagante hoje',
     ['preco-savi', 'precos-resumo', 'receita-hoje']],
    ['vi a pagina de voces e fiquei com uma duvida sobre o modelo de negocio do barbergo, quem exatamente paga a assinatura no fim das contas',
     ['modelo-receita-barbergo', 'barbergo-quem-paga', 'preco-barbergo']],
  ],
  'entrada degenerada': [
    ['?????',                        null],
    ['aaaaaaa',                      null],
    ['...',                          null],
    ['1',                            null],
    ['savi',                         ['o-que-e-savi', 'savi-segmentos', 'savi-piloto']],
  ],
};

const idDe = (c, l) => (ENTRADAS.find(e => M.textoDeBusca(e, l) === c.busca) || {}).id;

for (const [grupo, casos] of Object.entries(GRUPOS)) {
  console.log('');
  console.log('== ' + grupo);
  for (const [p, alvos] of casos) {
    const soc = M.ehSocial(p);
    const l = 'pt';
    const ctx = soc ? [] : (M.paraOWorker(p, l) || []);
    const top3 = ctx.slice(0, 3).map(c => idDe(c, l)).filter(Boolean);
    let veredito;
    if (soc) veredito = 'social:' + soc;
    else if (!ctx.length) veredito = alvos ? 'X  VAZIO (o visitante ouve "nao sei")' : 'ok  vazio, como esperado';
    else if (!alvos) veredito = '~  manda ' + ctx.length + ' candidatos: ' + top3.slice(0, 2).join(', ');
    else {
      const i = ctx.findIndex(c => alvos.indexOf(idDe(c, l)) >= 0);
      veredito = i === 0 ? 'OK 1o' : i > 0 && i < 5 ? 'ok ' + (i + 1) + 'o'
               : i >= 0 ? 'X  ' + (i + 1) + 'o' : 'X  NAO CHEGA';
    }
    console.log('   ' + veredito.padEnd(38) + JSON.stringify(p).slice(0, 66));
    if (alvos && ctx.length && top3.length) console.log('      topo: ' + top3.join(', '));
  }
}
