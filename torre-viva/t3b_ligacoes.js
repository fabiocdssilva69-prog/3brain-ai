// t3b_ligacoes.js — QUE HOLOGRAMA REAGE A QUE FUNCIONARIO (obra 4, 04/10/2026). PURO (sem DOM): corre no browser
// (window.T3BLigacoes) e no node (sala/testes_t3b.js).
//
// A REGRA DELE (04/10 11:4x, palavra por palavra): "todos os hologramas que tem ai reagir conforme a atividade. Todos os
// hologramas, eles tem que reagir conforme a atividade de cada funcionario e cada setor correspondente."
// Aqui esta, por holograma: que andares (sectores) e que funcionarios (programas) ele representa, e que tipos de evento do
// /vivo.json o mexem. O t3b_holo.js so pergunta `reacoes(evento)` e anima o que vier. A pagina de prova
// (sala/prova_visual_04out.html) mostra esta mesma tabela - `tabela()`.
'use strict';
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.T3BLigacoes = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  // 04/10 (a meio desta obra o organograma ganhou um andar e os numeros de cima andaram uma casa): os sectores sao pela
  // ESPECIALIDADE do andar, nunca pelo numero. POR_ESP traz os numeros de 04/10 14:xx so como recurso (os testes do node usam-nos);
  // na pagina, definirAndares(estrutura.andares) troca-os pelos de agora a cada leitura do /estrutura.json.
  var POR_ESP = { macro: [8], celulas: [11, 12, 13, 14], cripto: [15, 16, 17], volume_fluxo: [18], preco_accao: [19], reversao_media: [20, 21, 22, 23, 24, 25],
    tendencia: [26, 27], manutencao: [30], recrutamento: [33], pessoal: [34], estatistica: [46], pnl: [47], mesa: [49], risco: [50],
    supervisores_operacoes: [55], gerentes_operacoes: [56], socios_directores: [57], conselho: [58], sr_stark: [59] };
  // os laboratorios (os andares com genes); a Mesa guarda os genes da carteira e conta para os eventos "genes"
  var ESP_LABS = ['macro', 'celulas', 'cripto', 'volume_fluxo', 'preco_accao', 'reversao_media', 'tendencia'];
  var LABS = [];
  var FORCA = { mudou: 1, falou: 0.85, escreveu: 0.6, recado: 0.75, visita: 0.9, batimento: 0.5, avaria: 1, consertou: 1, genes: 0.8, turno: 0.7, cotacao: 0.35 };
  var H = {
    velocimetro: { titulo: 'Velocímetro (o dia)', galeria: 'G18', onde: 'coluna da esquerda · P&L (and. 47)', esps: ['pnl'],
      programas: ['painel', 'realizado', 'papel_cripto', 'binance_real', 'fecho', 'resultados'],
      fonte: 'torre.json → reactor.medidor (o resultado do dia) e o livro da Binance ao segundo (reactor.js)',
      reage: 'cada escreveu/mudou/falou do P&L (and. 47) ou de quem escreve o resultado do dia: o arco acende e salta uma faísca da agulha' },
    trilho: { titulo: 'Trilho do dia', galeria: 'G10', onde: 'coluna da esquerda · P&L', esps: ['pnl'], programas: ['painel', 'realizado', 'fecho'],
      fonte: 'torre.json → reactor.medidor.serie (um ponto por minuto)', reage: 'cada evento do P&L: a ponta da linha lança um anel; o brilho da linha segue a actividade do P&L' },
    stark: { titulo: 'Sr. Stark (decisões + anel de agentes)', galeria: 'G19 + G2', onde: 'coluna da esquerda · ático (sócios, conselho, Sr. Stark)', esps: ['socios_directores', 'conselho', 'sr_stark'],
      programas: ['stark', 'sr_stark', 'alocador', 'capital', 'carteiro', 'barramento', 'cortex'], tipos: ['visita'],
      fonte: 'enxame.json → stark.parecer (as decisões dele) e shield.cargos (os agentes da S.H.I.E.L.D.)',
      reage: 'o parecer novo do Sr. Stark põe-no a andar com a decisão no balão; cada visita da S.H.I.E.L.D. acende o agente no anel e lança o cometa; os eventos do ático (57-59) fazem o núcleo piscar' },
    numeros: { titulo: 'Números (conta-quilómetros)', galeria: 'G7', onde: 'coluna da esquerda · Estatística', esps: ['estatistica'],
      programas: ['realizado', 'pulso', 'revisao', 'validacao_independente', 'conversa', 'dsr'],
      fonte: '/vivo.json → seq (todos os eventos reais desde que o servidor arrancou) e torre.json (operações, genes, gerações)',
      reage: 'o conta-quilómetros sobe com CADA evento da torre (é o contador); os eventos da Estatística (and. 46) fazem a fita andar e os dígitos acender' },
    mesa: { titulo: 'Mesa de operações (barras)', galeria: 'G9', onde: 'coluna da direita · Mesa de Operações', esps: ['mesa'],
      programas: ['papel_cripto', 'papel', 'binance_real', 'fabrica_execucao', 'execucao', 'papel_intradia', 'papel_swing', 'mesa'],
      fonte: 'torre.json → reactor.posicoes / aberto_total_usd e o livro da Binance ao segundo',
      reage: 'cada evento da Mesa (and. 49): a barra de ouro cresce e pisca; a altura das barras é o "em aberto"' },
    livro: { titulo: 'Livro de ofertas vivo', galeria: 'G24', onde: 'coluna perto da torre · Mesa de Operações', esps: ['mesa'],
      programas: ['papel_cripto', 'papel', 'binance_real', 'fabrica_execucao', 'execucao', 'papel_intradia', 'papel_swing'],
      fonte: 'Binance (profundidade do livro, 10 níveis, de 1 em 1 s, do símbolo com a maior posição aberta) + as execuções em papel (torre.json → movimentacoes)',
      reage: 'cada evento da Mesa: o nível mais perto do preço pisca e o evento entra na fita ao lado com o nome de quem o fez' },
    equalizador: { titulo: 'Equalizador dos andares', galeria: 'G28', onde: 'coluna perto da torre · Mesa (and. 49)', todos: true, porAndar: true,
      fonte: '/estrutura.json → censo e turnos de cada andar (a trabalhar agora / registados) + /vivo.json (eventos por andar)',
      reage: 'cada evento de um andar faz saltar a barra DESSE andar (e só essa); o pico fica marcado e desce devagar' },
    risco: { titulo: 'Risco (anéis)', galeria: 'G8', onde: 'coluna da direita · Risco', esps: ['risco'],
      programas: ['risco', 'trava_real', 'stop_do_dia', 'tecto_perda', 'stop_medir', 'concentracao', 'correlacao', 'hrp'],
      fonte: 'reactor.js → S.trava, S.limite, S.aloc (o que as travas usam de facto)', reage: 'cada evento do Risco (and. 50): os anéis acendem e o anel que mexeu dá um pulso' },
    turnos: { titulo: 'Relógio dos turnos', galeria: 'G27', onde: 'coluna perto da torre · Risco', esps: ['recrutamento', 'pessoal', 'risco'],
      programas: ['turnos', 'forca_trabalho', 'gerentes', 'trabalhador_frota', 'recrutamento', 'dim_sonnet'], tipos: ['turno'],
      fonte: 'enxame.json → pessoal.turnos.barra (obra 2) e /estrutura.json → turnos por andar',
      reage: 'cada evento do Pessoal/Recrutamento (and. 33-34) e do Risco (50): os pontos dos andares piscam; cada andar acende o SEU ponto quando lá alguém trabalha' },
    lab: { titulo: 'Laboratório (mapa de estrelas)', galeria: 'G3', onde: 'coluna da direita · Labs (Macro, Células, Cripto, Volume, Preço, Reversão, Tendência)', esps: ESP_LABS,
      programas: ['organismo', 'sombra_previa', 'revisao', 'fabrica_ideias', 'organismo_p7', 'mesa_de_agentes', 'prefiltro_vbt', 'vbt_trabalhador'], tipos: ['genes'],
      fonte: '/labs.json (os genes de cada lab: quais, robustos, demitidos) + /vivo.json → eventos "genes" (prévia da sombra, revisão, evolução, por lab e por minuto)',
      reage: 'cada estrela é um gene DESSE lab: acende quando o gene calcula, fica dourada quando é robusto, cinza quando a família foi demitida' },
    vortex: { titulo: 'Vortex (passagens)', galeria: 'G16', onde: 'coluna do lado (maior)', passagens: true, tipos: ['recado', 'visita'],
      fonte: '/vivo.json → recados do barramento (sector → sector), visitas da S.H.I.E.L.D. e respostas a perguntas',
      reage: 'cada passagem real entre funcionários lança um fio de partículas do andar de quem envia para o de quem recebe; a velocidade da espiral é o número de passagens do último minuto' },
    radar: { titulo: 'Radar da S.H.I.E.L.D.', galeria: 'G21', onde: 'coluna do lado · no lugar da S.H.I.E.L.D.', esps: ['supervisores_operacoes'], tipos: ['avaria', 'consertou', 'batimento', 'visita'],
      fonte: 'enxame.json → fora_do_verde (avarias por andar) + /vivo.json → avaria / consertou / batimento / visita',
      reage: 'cada avaria acende um ponto vermelho no ângulo do SEU andar; o conserto pinta-o de verde; cada volta do vigia é uma volta do feixe' },
    coracao: { titulo: 'Coração da torre', galeria: 'G22', onde: 'coluna do lado, entre o vortex e o chat', todos: true,
      fonte: '/vivo.json → todos os eventos reais (cada um é uma batida) e o batimento do vigia', reage: 'cada evento da torre é uma batida (a altura pela força do evento); o batimento do vigia é a batida forte; o número é batidas por minuto' },
    globo: { titulo: 'Globo dos mercados (3D)', galeria: 'G23', onde: 'objecto 3D ao pé da torre', esps: ['macro', 'mesa'],
      programas: ['binance_real', 'papel_cripto', 'papel', 'alpaca', 'cambio', 'juros_fed', 'liquidez', 'macro', 'noticias_cripto', 'noticias_eua', 'noticias_brasil', 'noticias_macro', 'noticias_mundo', 'fluxo_binance', 'precos_extra', 'fluxo_etf'],
      tipos: ['cotacao'], fonte: 'reactor.js → as cotações da Binance ao segundo + /vivo.json (ordens da Mesa, Macro e Mundo, antenas de mercado)',
      reage: 'cada ordem ou cotação nova acende um arco do seu mercado (Binance, Nova Iorque, São Paulo, Londres) até à torre' },
    ampulheta: { titulo: 'Ampulheta da cota', galeria: 'G31', onde: 'coluna perto da torre · ático', esps: [],
      programas: ['cota', 'regulador', 'cota_torre', 'regulador_cota', 'agente_claude', 'medidor_cota', 'dim_sonnet', 'arquiteto_andares'],
      fonte: 'torre.json → jarvis (sessão/semana) + /vivo.json → cota (modo e ritmo, dados/enxame/modo_cota.json)',
      reage: 'cada evento de quem gasta ou mede a cota faz cair um grão e acender o fio; a areia é o que resta da semana, a cor o modo' },
    fita: { titulo: 'Fita do P&L em 3D', galeria: 'G32', onde: 'dentro do escritório (objecto 3D)', esps: ['pnl'], programas: ['realizado', 'painel', 'fecho'],
      fonte: 'torre.json → reactor.ja_entrou.por_dia (o resultado de cada dia, acumulado)', reage: 'cada evento do P&L (and. 47) faz a ponta de hoje brilhar e a fita acender por onde passa' }
  };
  // os numeros dos andares de cada holograma, a partir das especialidades (POR_ESP)
  function recalcular() {
    LABS = []; ESP_LABS.concat(['mesa']).forEach(function (e) { (POR_ESP[e] || []).forEach(function (n) { if (LABS.indexOf(n) < 0) LABS.push(n); }); });
    Object.keys(H).forEach(function (k) { var h = H[k]; if (!h.esps) return; var a = []; h.esps.forEach(function (e) { (POR_ESP[e] || []).forEach(function (n) { if (a.indexOf(n) < 0) a.push(n); }); }); h.andares = a; });
  }
  // a pagina chama isto com o /estrutura.json: [{n, esp}, ...]. Sem especialidades conhecidas fica o que estava.
  function definirAndares(andares) {
    var m = {}, n = 0;
    (andares || []).forEach(function (a) { if (a && a.esp && a.n != null) { (m[a.esp] = m[a.esp] || []).push(Number(a.n)); n++; } });
    if (!n) return false;
    POR_ESP = m; recalcular(); return true;
  }
  function espDoAndar(n) { n = Number(n); for (var e in POR_ESP) if (POR_ESP[e].indexOf(n) >= 0) return e; return null; }
  recalcular();
  function casaPrograma(lista, id) {
    if (!lista || !id) return false;
    id = String(id);
    for (var i = 0; i < lista.length; i++) if (lista[i] === id) return true;
    return false;
  }
  // um evento -> a reaccao deste holograma (null = nao reage). PURA.
  function liga(nome, ev) {
    var h = H[nome]; if (!h || !ev || typeof ev !== 'object') return null;
    var k = ev.k;
    if (!k || k === 'numero') return null;                         // 'numero' = o ecra a creditar um numero; nao e um evento real
    var f = FORCA[k] != null ? FORCA[k] : 0.5;
    if (k === 'genes') f = Math.min(1, 0.35 + (Number(ev.n) || 1) / 20);
    if (h.todos) return k === 'cotacao' ? null : { forca: f, andar: ev.andar != null ? Number(ev.andar) : null, porque: 'toda a torre' };   // (uma cotacao da Binance e o mercado, nao um funcionario)
    if (h.passagens) {
      if (k === 'recado' || k === 'visita') return { forca: f, de: ev.de, para: ev.para, porque: 'passagem ' + k };
      // 05/10 (ele: "o vortex nao ta reagindo nem animando como deveria"): so havia recados e visitas, e no feed quase so ha escritas. Uma
      // escrita que alguem LE (o 'le' do registo) ou que o chefe reve e uma passagem real de trabalho: do andar de quem escreve ao de quem le
      if ((k === 'escreveu' || k === 'mudou') && ev.para != null) return { forca: f * 0.8, de: ev.andar, para: ev.para, porque: 'passagem de dados' };
      if (k === 'falou' && (ev.responde_a || ev.chat)) return { forca: f, de: ev.andar, para: null, porque: 'resposta' };
      return null;
    }
    if (h.tipos && h.tipos.indexOf(k) >= 0) {
      if (nome === 'lab' && k === 'genes' && LABS.indexOf(Number(ev.andar)) < 0) return null;   // genes de um andar que nao e lab
      return { forca: f, andar: ev.andar != null ? Number(ev.andar) : null, porque: 'tipo ' + k };
    }
    if (k === 'cotacao') return null;                                // as cotacoes so mexem quem as pede pelo tipo (o globo)
    if (casaPrograma(h.programas, ev.id)) return { forca: f, andar: ev.andar != null ? Number(ev.andar) : null, porque: 'funcionário ' + ev.id };
    var andares = h.andares || [];
    if (!andares.length) return null;
    if (k === 'recado') {
      if (andares.indexOf(Number(ev.de)) >= 0 || andares.indexOf(Number(ev.para)) >= 0) return { forca: f, andar: Number(andares.indexOf(Number(ev.para)) >= 0 ? ev.para : ev.de), porque: 'recado do/para o sector' };
      return null;
    }
    if (k === 'visita') return andares.indexOf(Number(ev.para)) >= 0 ? { forca: f, andar: Number(ev.para), porque: 'visita ao sector' } : null;
    if (k === 'batimento' || k === 'avaria' || k === 'consertou' || k === 'cotacao') return null;   // so os que os pedem pelo tipo
    if (ev.andar != null && andares.indexOf(Number(ev.andar)) >= 0) return { forca: f, andar: Number(ev.andar), porque: 'sector (and. ' + ev.andar + ')' };
    return null;
  }
  // todas as reaccoes de um evento: [[nome, reaccao], ...]
  function reacoes(ev) {
    var out = [];
    for (var nome in H) { var r = liga(nome, ev); if (r) out.push([nome, r]); }
    return out;
  }
  // a tabela para a prova: holograma -> onde -> fonte -> o que o faz reagir
  function tabela() {
    return Object.keys(H).map(function (nome) { var h = H[nome]; return { id: nome, titulo: h.titulo, galeria: h.galeria, onde: h.onde, fonte: h.fonte, reage: h.reage,
      andares: h.todos ? 'todos' : ((h.esps || []).join(', ') + (h.andares && h.andares.length ? ' (and. ' + h.andares.join(', ') + ')' : '')), programas: (h.programas || []).join(', '), tipos: (h.tipos || []).join(', ') + (h.passagens ? ' (passagens)' : '') }; });
  }
  // um evento sintetico "do sector certo" e um "de outro sector" para cada holograma (os testes e a pagina de prova)
  function provas(nome) {
    var h = H[nome]; if (!h) return null;
    if (h.todos) return { certo: { k: 'mudou', id: 'qualquer', andar: 12, txt: 'prova' }, outro: { k: 'numero', id: 'painel', andar: 47, txt: 'credito local' }, nota: 'representa a torre inteira: o "outro" é um não-evento (crédito local de um número)' };
    if (h.passagens) return { certo: { k: 'recado', id: 'sector:pnl', de: 47, para: 46, txt: 'prova' }, outro: { k: 'escreveu', id: 'arca', andar: 30, ficheiro: 'x' }, nota: 'só passagens entre funcionários' };
    if (nome === 'radar') return { certo: { k: 'avaria', id: 'arca', andar: 30, sev: 'vermelho' }, outro: { k: 'escreveu', id: 'arca', andar: 30 } };
    if (nome === 'lab') { var al = (POR_ESP.reversao_media || [20])[0], ae = (POR_ESP.estatistica || [46])[0]; return { certo: { k: 'genes', id: 'lab:' + al, andar: al, n: 12, chaves: ['g|a|h1'] }, outro: { k: 'genes', id: 'lab:' + ae, andar: ae, n: 3 } }; }
    if (nome === 'ampulheta') return { certo: { k: 'escreveu', id: 'cota_torre', andar: 30 }, outro: { k: 'escreveu', id: 'arca', andar: 30 } };
    var a = h.andares[0], outroAndar = (POR_ESP.manutencao || [30])[0];   // um andar que nenhum destes representa (Manutencao)
    if (h.andares.indexOf(outroAndar) >= 0) outroAndar = -1;
    return { certo: { k: 'mudou', id: 'prova_' + nome, andar: a, txt: 'prova' }, outro: { k: 'mudou', id: 'prova_outro', andar: outroAndar, txt: 'prova' } };
  }
  return { HOLOS: H, get LABS() { return LABS; }, liga: liga, reacoes: reacoes, tabela: tabela, provas: provas, definirAndares: definirAndares, espDoAndar: espDoAndar, porEsp: function () { return POR_ESP; } };
});
