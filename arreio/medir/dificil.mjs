/* BATERIA DURA. Escrita para EXPOR, nao para passar.
   As 36 de visitante eu escolhi sabendo o que a base tinha; estas vem das
   formas que um visitante real usa e que eu nao otimizei: ingles, erro de
   digitacao, parafrase longe do gatilho, pergunta composta e investidor
   hostil. Mede so a RECUPERACAO local -- gratis e instantanea. */
import { M } from './peneira.mjs';

export const GRUPOS = {
  'ingles': [
    ['how much does it cost',          ['precos-resumo']],
    ['who are the founders',           ['fundadores-quem']],
    ['do you have paying customers',   ['receita-hoje', 'quem-usa-savi', 'usuarios-barbergo']],
    ['how much are you raising',       ['rodada']],
    ['what is savi',                   ['o-que-e-savi']],
    ['is it secure',                   ['lgpd-savi', 'certificacao-sbis', 'onde-roda-a-ia']],
    ['where are you based',            ['onde-ficamos']],
    ['what is the biggest risk',       ['maior-risco']],
    ['do you have revenue',            ['receita-hoje']],
    ['how does the ai work',           ['savi-modelo-ia', 'onde-roda-a-ia', 'ia-no-barbergo']],
    ['what is barbergo',               ['o-que-e-barbergo']],
    ['can I invest in you',            ['rodada']],
    ['how many people work there',     ['tamanho-time']],
    ['is there a free plan',           ['precos-resumo', 'preco-barbergo']],
    ['who are your competitors',       ['concorrentes-savi', 'concorrentes-barbergo']],
    ['what is your business model',    ['modelo-receita-barbergo']],
    ['do you have a pilot',            ['savi-piloto', 'quem-usa-savi']],
    ['how do you acquire customers',   ['aquisicao-e-canal', 'custo-chegar-comprador']],
    ['what is the market size',        ['mercado-savi', 'metodo-tam']],
    ['are you profitable',             ['receita-hoje', 'break-even']],
  ],
  'erro de digitacao': [
    ['qto custa o savi',               ['preco-savi', 'precos-resumo']],
    ['vcs tem cnpj',                   ['situacao-juridica']],
    ['quanto custa o barbego',         ['preco-barbergo', 'precos-resumo']],
    ['pq portugal',                    ['por-que-portugal']],
    ['qm sao os fundadores',           ['fundadores-quem']],
    ['vcs ja faturam',                 ['receita-hoje']],
    ['o savi e seguro',                ['lgpd-savi', 'certificacao-sbis']],
    ['tem concorrente',                ['concorrentes-savi', 'concorrentes-barbergo',
                                        'concorrente-status-quo-barbergo']],
  ],
  'parafrase distante': [
    ['como voces ganham dinheiro',            ['modelo-receita-barbergo']],
    ['quem sao os clientes de voces',         ['quem-usa-savi', 'usuarios-barbergo', 'receita-hoje']],
    ['o que impede alguem de copiar isso',    ['risco-copia', 'fosso-savi', 'fosso-barbergo']],
    ['e se o google resolver fazer isso',     ['risco-copia', 'risco-plataforma']],
    ['quanto tempo de caixa voces tem',       ['tempo-de-caixa']],
    ['o que pode dar errado',                 ['maior-risco', 'ressalvas-publicas']],
    ['voces ja perderam cliente',             ['churn-barbergo', 'receita-hoje']],
    ['isso e so um chatgpt com outra roupa',  ['savi-modelo-ia', 'onde-roda-a-ia', 'stack-tecnica']],
    ['por que uma barbearia pagaria por isso',['problema-barbergo', 'barbergo-quem-paga',
                                               'concorrente-status-quo-barbergo']],
    ['quem decide a compra num hospital',     ['quem-paga-reembolso', 'savi-segmentos', 'para-quem-savi']],
    ['quanto custa conseguir um cliente novo',['custo-chegar-comprador', 'aquisicao-e-canal']],
    ['o dado do paciente sai da instituicao', ['lgpd-savi', 'onde-roda-a-ia']],
  ],
  'composta': [
    ['quanto custa e voces ja tem cliente',   ['precos-resumo', 'receita-hoje']],
    ['o que e o savi e quem paga por ele',    ['o-que-e-savi', 'quem-paga-reembolso', 'para-quem-savi']],
    ['voces sao quantos e ja faturam',        ['tamanho-time', 'receita-hoje']],
    ['qual o risco maior e o que voces fazem',['maior-risco']],
  ],
  'investidor hostil': [
    ['por que eu nao deveria investir',       ['maior-risco', 'ressalvas-publicas', 'o-que-nao-sabemos']],
    ['voces nao tem receita nenhuma',         ['receita-hoje']],
    ['isso nao e venture scale',              ['venture-scale-honesto', 'condicoes-venture']],
    ['a conta do barbergo nao fecha',         ['barbergo-conta-nao-fecha']],
    ['voces estao inflando os numeros',       ['como-verificar', 'metricas-que-nao-usamos']],
    ['o que voces nao sabem ainda',           ['o-que-nao-sabemos', 'ressalvas-publicas']],
    ['ja recusaram voces em algum lugar',     ['aceleradoras-investidor', 'macro-captacao']],
    ['o que nao funcionou ate agora',         ['o-que-nao-funciona', 'frente-candidato-encerrada']],
  ],
};

if (process.argv[1].endsWith('dificil.mjs')) {
  let tot = 0, um = 0, cinco = 0, nada = 0, vazio = 0;
  const ruins = [];
  for (const [grupo, casos] of Object.entries(GRUPOS)) {
    let gUm = 0, gCinco = 0;
    for (const [p, alvos] of casos) {
      tot++;
      const r = M.candidatos(p, 999) || [];
      const i = r.findIndex(e => alvos.indexOf(e.id) >= 0);
      if (!r.length) { vazio++; ruins.push([grupo, p, 'PENEIRA VAZIA']); }
      else if (i < 0) { nada++; ruins.push([grupo, p, 'alvo nem pontuou; topo=' + r[0].id]); }
      else if (i === 0) { um++; gUm++; cinco++; gCinco++; }
      else if (i < 5) { cinco++; gCinco++; gUm += 0; ruins.push([grupo, p, 'alvo em ' + (i+1) + 'o; topo=' + r[0].id]); }
      else { ruins.push([grupo, p, 'alvo em ' + (i+1) + 'o; topo=' + r[0].id]); }
    }
    console.log('  ' + grupo.padEnd(20) + String(gUm).padStart(2) + '/' + String(casos.length).padEnd(3) +
                ' em 1o   ' + String(gCinco).padStart(2) + '/' + casos.length + ' no top 5');
  }
  console.log('');
  console.log('TOTAL ' + tot + ': ' + um + ' em 1o lugar (' + (100*um/tot).toFixed(0) + '%), ' +
              cinco + ' no top 5 (' + (100*cinco/tot).toFixed(0) + '%), ' +
              nada + ' nem pontuaram, ' + vazio + ' peneira vazia');
  console.log('');
  for (const [g, p, d] of ruins) console.log('  x [' + g.slice(0,10).padEnd(10) + '] ' + p.padEnd(40) + d);
}
