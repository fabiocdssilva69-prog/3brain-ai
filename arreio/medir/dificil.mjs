/* BATERIA DURA. Escrita para EXPOR, nao para passar.
   As 36 de visitante eu escolhi sabendo o que a base tinha; estas vem das
   formas que um visitante real usa e que eu nao otimizei: ingles, erro de
   digitacao, parafrase longe do gatilho, pergunta composta e investidor
   hostil. Mede so a RECUPERACAO local -- gratis e instantanea.

   DUAS CAMADAS, e a distincao custou uma conclusao errada (29/08/2026).
   Ate hoje isto media SO `candidatos()`, que e a peneira lexical CRUA. Mas
   producao nao usa `candidatos()` -- usa `paraOWorker()`, que por cima dela
   divide pergunta composta, intercala as listas e junta o contexto da
   pergunta anterior. Medir a camada de baixo e concluir sobre a de cima e
   como testar o motor e falar do carro.

   O estrago concreto: "voces sao quantos e ja faturam" dava `receita-hoje` em
   15o em `candidatos()` e em 2o em `paraOWorker()` -- a intercalacao subia-o
   treze lugares. O numero "composta 2/4" saiu da camada SEM a peca, e dele
   nasceu a nota "provavelmente so um indice semantico resolve", que estava
   errada: a peca existe e funciona.

   Por isso agora mede as DUAS. A crua continua util para isolar (responde "o
   lexico sozinho acha?"); a de producao e a que decide o que o visitante ve. */
import { M, ENTRADAS } from './peneira.mjs';

/* paraOWorker devolve no formato do Worker -- {texto, fonte, busca}, sem id.
   Para saber QUEM voltou, casa-se o inicio do texto de volta com a base. */
const PORTEXTO = new Map();
for (const e of ENTRADAS) {
  for (const l of ['pt', 'en']) if (e[l]) PORTEXTO.set(String(e[l]).slice(0, 120), e.id);
}
export function idsDeProducao(pergunta, lingua) {
  const r = M.paraOWorker(pergunta, lingua || 'pt', null) || [];
  const lista = Array.isArray(r) ? r : (r.contexto || r.candidatos || []);
  return lista.map(c => PORTEXTO.get(String(c.texto || '').slice(0, 120)) || '?');
}

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
    ['quem decide a compra num hospital',     ['quem-paga-reembolso', 'savi-segmentos']],
    ['quanto custa conseguir um cliente novo',['custo-chegar-comprador', 'aquisicao-e-canal']],
    ['o dado do paciente sai da instituicao', ['lgpd-savi', 'onde-roda-a-ia']],
  ],
  'composta': [
    ['quanto custa e voces ja tem cliente',   ['precos-resumo', 'receita-hoje']],
    ['o que e o savi e quem paga por ele',    ['o-que-e-savi', 'quem-paga-reembolso', 'savi-segmentos']],
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
  let pUm = 0, pCinco = 0;                     // camada de PRODUCAO
  const ruins = [], soProducao = [];
  for (const [grupo, casos] of Object.entries(GRUPOS)) {
    let gUm = 0, gCinco = 0, gpUm = 0, gpCinco = 0;
    for (const [p, alvos] of casos) {
      tot++;
      // --- camada de PRODUCAO (o que o visitante realmente recebe) ---
      const lingua = /[a-z]/.test(p) && /\b(how|what|who|do|is|are|does|why|can)\b/.test(p) ? 'en' : 'pt';
      const pIds = idsDeProducao(p, lingua);
      const pi = pIds.findIndex(id => alvos.indexOf(id) >= 0);
      if (pi === 0) { pUm++; gpUm++; pCinco++; gpCinco++; }
      else if (pi > 0 && pi < 5) { pCinco++; gpCinco++; }
      // --- camada CRUA (isola o lexico) ---
      const r = M.candidatos(p, 999) || [];
      const i = r.findIndex(e => alvos.indexOf(e.id) >= 0);
      if (!r.length) { vazio++; ruins.push([grupo, p, 'PENEIRA VAZIA']); }
      else if (i < 0) { nada++; ruins.push([grupo, p, 'alvo nem pontuou; topo=' + r[0].id]); }
      else if (i === 0) { um++; gUm++; cinco++; gCinco++; }
      else if (i < 5) { cinco++; gCinco++; gUm += 0; ruins.push([grupo, p, 'alvo em ' + (i+1) + 'o; topo=' + r[0].id]); }
      else { ruins.push([grupo, p, 'alvo em ' + (i+1) + 'o; topo=' + r[0].id]); }
    }
    console.log('  ' + grupo.padEnd(20) + String(gUm).padStart(2) + '/' + String(casos.length).padEnd(3) +
                ' em 1o   ' + String(gCinco).padStart(2) + '/' + casos.length + ' no top 5' +
                '   |  producao: ' + String(gpUm).padStart(2) + '/' + String(casos.length).padEnd(3) +
                ' e ' + String(gpCinco).padStart(2) + '/' + casos.length);
    if (gpCinco > gCinco) soProducao.push(grupo + ' (+' + (gpCinco - gCinco) + ' no top 5)');
  }
  console.log('');
  console.log('TOTAL ' + tot + ' na camada CRUA: ' + um + ' em 1o (' + (100*um/tot).toFixed(0) + '%), ' +
              cinco + ' no top 5 (' + (100*cinco/tot).toFixed(0) + '%), ' +
              nada + ' nem pontuaram, ' + vazio + ' peneira vazia');
  console.log('TOTAL ' + tot + ' em PRODUCAO:    ' + pUm + ' em 1o (' + (100*pUm/tot).toFixed(0) + '%), ' +
              pCinco + ' no top 5 (' + (100*pCinco/tot).toFixed(0) + '%)   <- o que o visitante recebe');
  if (soProducao.length)
    console.log('  ganho da camada de producao em: ' + soProducao.join(', '));
  console.log('');
  for (const [g, p, d] of ruins) console.log('  x [' + g.slice(0,10).padEnd(10) + '] ' + p.padEnd(40) + d);
}
