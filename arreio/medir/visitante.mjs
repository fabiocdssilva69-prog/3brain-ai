import { M } from './peneira.mjs';
/* 36 perguntas de VISITANTE COMUM. O alvo e o id que deveria fundamentar. */
export const CASOS = [
  ['o que voces fazem',            ['o-que-a-3brain-faz']],
  ['o que e o savi',               ['o-que-e-savi']],
  ['o que e o barbergo',           ['o-que-e-barbergo']],
  ['pra que serve o savi',         ['o-que-e-savi','savi-segmentos']],
  ['isso ja funciona',             ['estagio-produtos']],
  ['onde eu baixo o app',          ['onde-publicado']],
  ['funciona no iphone',           ['onde-publicado']],
  ['preciso instalar alguma coisa',['onde-publicado']],
  ['tem versao web',               ['onde-publicado','stack-tecnica']],
  ['quanto custa',                 ['precos-resumo']],
  ['e caro',                       ['precos-resumo','preco-savi','preco-barbergo']],
  ['tem plano gratis',             ['precos-resumo','preco-barbergo-plano','preco-barbergo']],
  ['quanto custa o savi',          ['preco-savi','precos-resumo']],
  ['quanto custa o barbergo',      ['preco-barbergo','preco-barbergo-plano','precos-resumo']],
  ['da pra testar de graca',       ['precos-resumo','implantacao']],
  ['e seguro',                     ['lgpd-savi','certificacao-sbis','onde-roda-a-ia']],
  ['voces seguem a lgpd',          ['lgpd-savi','lgpd-email-frio']],
  ['meus dados ficam onde',        ['onde-roda-a-ia','lgpd-savi']],
  ['tem certificacao',             ['certificacao-sbis','anvisa-regulatorio']],
  ['por que eu deveria confiar',   ['como-verificar','ressalvas-publicas']],
  ['como sei que isso e verdade',  ['como-verificar']],
  ['quem sao voces',               ['fundadores-quem']],
  ['quantas pessoas trabalham ai', ['tamanho-time']],
  ['voces tem cnpj',               ['situacao-juridica']],
  ['onde voces ficam',             ['onde-ficamos']],
  ['de que cidade voces sao',      ['onde-ficamos']],
  ['como falo com voces',          ['contato']],
  ['qual o email de contato',      ['contato']],
  ['tem whatsapp',                 ['contato','whatsapp-porta']],
  ['posso investir em voces',      ['rodada']],
  ['quanto voces estao captando',  ['rodada']],
  ['ja tem investidor',            ['aceleradoras-investidor','macro-captacao','rodada']],
  ['qual o maior risco',           ['maior-risco']],
  ['voces ja tem cliente',         ['quem-usa-savi','receita-hoje','usuarios-barbergo']],
  ['voces ja faturam',             ['receita-hoje']],
  ['voces estao contratando',      ['tamanho-time','quem-escreve-codigo']]
];
if (process.argv[1].endsWith('visitante.mjs')) {
  let vazio = 0, um = 0, cinco = 0, sessenta = 0, nada = 0;
  const ruins = [];
  for (const [p, alvos] of CASOS) {
    const r = M.candidatos(p, 999) || [];
    const i = r.findIndex(e => alvos.indexOf(e.id) >= 0);
    if (!r.length)      { vazio++;    ruins.push([p, 'PENEIRA VAZIA']); }
    else if (i < 0)     { nada++;     ruins.push([p, 'alvo nem pontuou; topo=' + r[0].id]); }
    else if (i === 0)   { um++; cinco++; sessenta++; }
    else if (i < 5)     { cinco++; sessenta++; }
    else if (i < 60)    { sessenta++; ruins.push([p, 'alvo em ' + (i+1) + 'o; topo=' + r[0].id]); }
    else                { ruins.push([p, 'alvo em ' + (i+1) + 'o, FORA dos 60']); }
  }
  const n = CASOS.length;
  console.log('de ' + n + ' perguntas de visitante:');
  console.log('  alvo em 1o lugar local ..... ' + um);
  console.log('  alvo no top 5 .............. ' + cinco);
  console.log('  alvo dentro dos 60 ......... ' + sessenta + '  <- o que o reordenador chega a ver');
  console.log('  alvo nem pontuou ........... ' + nada);
  console.log('  peneira devolveu VAZIO ..... ' + vazio + '  <- a pagina nem chama o Worker');
  console.log('');
  ruins.forEach(([p, d]) => console.log('  x ' + p.padEnd(32) + ' ' + d));
}
