// predio.js — A TORRE STARK v4 (18/09/2026): de longe um DNA, de perto gente a trabalhar.
//
// O que ele disse as 07:50 (dados/prints_18set/O_QUE_ELE_QUER_v4.md e a especificacao e a regua): a torre,
// quanto mais de longe, tem de ler-se como um DNA; quanto mais perto, mais numeros individuais - o funcionario,
// o sector, o gerente, o andar; o Pointer JA E A BASE da torre; os 21 andares da pesquisa faltavam; um
// velocimetro vivo e o trilho do dia como hologramas; hologramas dos directores com os seus dados.
//
// A CENA: 100 andares por `ordem` (14 de hoje + 21 em obras + 65 reservados em silhueta), cada um rodado 3,6
// graus (100 andares = uma volta), duas fitas luminosas a enrolar-se na fachada (dados sobem em ciano,
// decisoes descem em ambar), a aresta da frente de cada laje com a cor do ESTADO, andares habitados em vidro
// escuro com o piso claro da v3 por dentro. Quatro NIVEIS pela regua de pixeis por andar (predio_geo.js):
// N0 torre (fitas, degraus, 5 marcos, hologramas em colunas) · N1 andar (35 nomes, pilula por laje, moradores
// como pontos) · N2 sector (secretarias, moradores, pilula com o numero em cada um) · N3 funcionario (cartao
// por morador). Seis hologramas (predio_holo.js) dimensionados em pixeis de ecra, como os rotulos.
//
// A REGRA QUE MANDA (mantida da v3): NADA SE MEXE SEM UM EVENTO REAL COM CARIMBO. Um pacote na fita e uma
// linha do feed; um numero a subir e uma leitura nova do JSON; a agulha anda porque `medidor.agora` mudou. A
// unica excepcao esta escrita na spec 8: o pulso do ponto actual do trilho, que se cala quando o dado
// envelhece (> 2 min). Sem Math.random a fazer de mercado, sem dados de exemplo, sem animacao decorativa.
//
// DUAS FONTES, UM SO MUNDO: sala/predio.json (quem trabalha aqui, 60 s) e sala/torre.json (o que esta a
// acontecer, 15 s). Esta pagina nao calcula nada que os .py ja calculem. Quando um numero falta, o ecra
// diz que falta.
//
// O que se reaproveita da v3 (e porque): a regua de pixeis dos rotulos (escalaDoRotulo/pixeisDoTexto), a
// arrumacao de etiquetas por construcao (arrumarEtiquetas), o portao "quem nao tem numero nao aparece"
// (numeroDoMorador + capitalExclusivo), o feed por identidade (predio_feed.js), o acorde, os cartoes de
// papel, e as tres animacoes da peca 16 (chafariz, onda, anel), agora dentro do grupo rodado de cada andar.
'use strict';
(function () {

  var PG = window.PredioGeo, PH = window.PredioHolo, PF = window.PredioFeed;
  var F_PREDIO = 'predio.json', F_TORRE = 'torre.json';
  // 19/09 (ordem dele: "deixa bem leve"): UM interruptor para a animacao continua que eu tinha metido e que
  // travava a pagina. Desligado, fica o que e barato: agulha viva, fita de cotacoes (CSS), balao do cartao,
  // batimento e onda de dados. Volta a ligar quando ele mostrar por video o que quer.
  var ANIMACAO_PESADA = false;
  var PERIODO_MS = 2000;      // 19/09: era 5 s. A pagina le de 2 em 2 s; o que limita a frescura e quem escreve.
  var MAX_PACOTES = 40, MAX_LEITURAS = 30, ARRANQUE_RAPIDO = 10;   // 19/09: 60 linhas eram ~2.000 nos de DOM
  var DUR_PACOTE_MS = 2600, PULSO_MS = 1500;
  var DUR_TWEEN_NUM_MS = 900, DUR_TWEEN_AGULHA_MS = 700, DUR_CAMARA_MS = 600;
  var MAX_TWEENS_LEMBRADAS = 20;

  // ---------------------------------------------------------------- a planta
  var ALTURA = 3.4;               // altura de cada andar (a v3 mediu: a 30 graus de elevacao ve-se para dentro)
  var LARG = 24, PROF = 11;       // a laje. Uniforme de proposito: um envelope constante e o que faz a torre
                                  // ler-se como uma so peca torcida; a importancia esta na ALTURA (ordem).
  var TORCAO = PG.TORCAO_GRAUS;   // 3,6 graus por andar
  var R_FITA = 1.22 * Math.sqrt((LARG / 2) * (LARG / 2) + (PROF / 2) * (PROF / 2));   // meia diagonal, com folga
  var FASE_A = Math.atan2(PROF / 2, LARG / 2), FASE_B = FASE_A + Math.PI;
  var GEO_FITA = { torcao: TORCAO, raio: R_FITA, altura: ALTURA, faseSobe: FASE_A, faseDesce: FASE_B };
  // quantos "andares" de ecra a LAJE acrescenta a altura da torre em isometrico: a extensao horizontal
  // (LARG+PROF)/raiz(2) projecta-se na vertical com cos(phi), e um andar vale ALTURA*sin(phi). Sem isto o topo
  // da torre nomeada saia 8 px acima do palco no N0 (medido na 1.a corrida de fumo).
  var EXTRA_ANDARES = ((LARG + PROF) * Math.SQRT1_2 * Math.cos(Math.PI / 3)) / (ALTURA * Math.sin(Math.PI / 3));
  var JANELA_ANDARES = 3;         // a N2/N3 so se constroem moradores dos andares a +-3 do alvo (culling)
  var MARGEM_VISTA_PX = 40;       // um andar conta como "em vista" ate 40 px fora do palco

  var COR = {
    ciano: 0x5ac8fa, ambar: 0xe8b04b, verde: 0x3ecf8e, vermelho: 0xff5a5f, azul: 0x0d63c8, cinza: 0x8a94a3,
    vidro: 0x0c1a2b, fundo: 0x070b12, reservado: 0x9aa6b4
  };
  var COR_ESTADO = { ok: COR.ciano, a_correr: 0x4aa3ff, atrasado: COR.ambar, erro: COR.vermelho, a_dormir: 0x5b6573, sem_tarefa: 0x5b6573, executivo: 0xffd479 };
  // 18/09 noite: o andar de um funcionario na TORRE DE 47 (organograma) quando o registo o da; senao o antigo.
  function andarTorreDe(f) { return f && f.andar_torre != null ? f.andar_torre : (f ? f.andar : null); }
  function andarAntigoParaTorre(n) { var m = D && D.andar_por_antigo; if (m && m[String(n)] != null) return m[String(n)]; return n; }
  var COR_MORADOR = { ok: 0x27384c, a_correr: 0x0d63c8, atrasado: 0xa25a00, erro: 0xb81d2e, a_dormir: 0x98a2b0, sem_tarefa: 0x616d7d };
  var PISO = { laje: 0xc9b99d, laje_rua: 0x2b3340, parede: 0xc09263, parede_alt: 0xa87f52, secretaria: 0xf7f8fa, montante: 0xb9a88a };
  var COR_PACOTE = { entrada: 0x3ecf8e, saida: 0xe8b04b, recusa: 0xff5a5f, ideia: 0x5ac8fa, ciclo: 0x9ad0ff, outro: 0x8a94a3 };

  // legibilidade como invariante (v3): tudo o que se le e dimensionado EM PIXEIS DE ECRA
  var ALVO_PX_ANDAR = 15, ALVO_PX_NUM = 13, MIN_PX_LEGIVEL = 11, ALVO_PX_MARCO = 13, ALVO_PX_PILULA_ANDAR = 11;
  var FOLGA_ETQ_PX = 3, DESL_ETQ_PX = 330, DESL_ETQ_PY = 64, PASSO_ETQ_PX = 7, GUIA_MIN_PX = 9;
  var MARGEM_CARTAO_PX = 4, LARG_MAIS_PX = 62;
  var PILULA = {
    up: { txt: '#4ade80', bd: 'rgba(74,222,128,.90)' }, dn: { txt: '#ff7b7f', bd: 'rgba(255,123,127,.90)' },
    zero: { txt: '#cbd5e1', bd: 'rgba(203,213,225,.55)' }, cap: { txt: '#7cd4ff', bd: 'rgba(124,212,255,.80)' },
    imp: { txt: '#ffd479', bd: 'rgba(255,212,121,.75)' }, hora: { txt: '#cfd7e2', bd: 'rgba(207,215,226,.42)' }
  };
  var CLASSE_DO_EXECUTOR = { papel_cripto: 'cripto', papel_swing: 'acoes', papel_intradia: 'acoes' };
  var MARCOS = ['Direccao', 'Risco', 'Mesa de Operacoes', 'Laboratorio', 'O Mercado'];
  var NOME_MARCO = { 'O Mercado': 'RUA', 'Direccao': 'SR. STARK' };

  // caminhos do feed (v3, medidos): tudo nasce na Mesa (9); os destinos sao factos. n de andar -> n de andar.
  var CAMINHOS = {
    entrada: [9, 0, 'entrada'], compra: [9, 0, 'entrada'], sonda: [9, 0, 'entrada'], ordem: [9, 0, 'entrada'],
    fill: [9, 0, 'entrada'], limite_enviada: [9, 0, 'entrada'],
    saida: [9, 0, 'saida'], venda: [9, 0, 'saida'], alvo: [9, 0, 'saida'], alvo_gtc: [9, 0, 'saida'],
    alvo_intra: [9, 0, 'saida'], alvo_preenchido: [9, 0, 'saida'], stop: [9, 0, 'saida'], vencimento: [9, 0, 'saida'],
    rotacao: [9, 0, 'saida'], libertar: [9, 0, 'saida'],
    sinapse: [9, 9, 'ciclo'], sinal: [9, 9, 'ciclo'], oportunidade: [9, 9, 'ciclo'],
    recusa: [10, 9, 'recusa'], recusada: [10, 9, 'recusa'], capital_esgotado: [10, 9, 'recusa'],
    mesma_familia_aberta: [10, 9, 'recusa'], risco_excessivo: [10, 9, 'recusa'], spread: [10, 9, 'recusa'],
    spread_alto: [10, 9, 'recusa'], drawdown: [10, 9, 'recusa'], perda_dia: [10, 9, 'recusa'],
    tecto_estrategia: [10, 9, 'recusa'], tecto_teria_cortado: [10, 9, 'recusa'], casa_limpa_teria_cortado: [10, 9, 'recusa'],
    quarentena: [10, 9, 'recusa'],
    evolucao: [7, 8, 'ideia'], geracao: [7, 8, 'ideia'], avaliacao: [7, 8, 'ideia'],
    doc: [6, 7, 'ideia'], professor: [6, 7, 'ideia'], aprendizado: [6, 7, 'ideia'], live: [6, 7, 'ideia'],
    batimento: null
  };
  var MOLDES = {
    capital_esgotado: function (e) { return 'sem capital para ' + (e.simbolo || 'a proxima entrada') + ': a mesa esta cheia'; },
    mesma_familia_aberta: function (e) { return (e.simbolo || 'entrada') + ' recusada: ja ha uma posicao desta mesma ideia'; },
    risco_excessivo: function (e) { return (e.simbolo || 'entrada') + ' recusada pelo tamanho: o risco pedia menos do que o minimo'; },
    spread: function (e) { return (e.simbolo || 'par') + ' fora por spread' + (e.valor != null ? ' de ' + num(e.valor, 1) + ' pb' : ''); },
    entrada: function (e) { return 'entrou ' + (e.simbolo || '') + (e.valor != null ? ' por ' + num(e.valor, 2) + ' US$' : ''); },
    saida: function (e) { return 'saiu de ' + (e.simbolo || '') + (e.valor != null ? ': ' + sinal(e.valor, 2) + ' US$' : ''); },
    alvo: function (e) { return (e.simbolo || 'posicao') + ' realizou no alvo' + (e.valor != null ? ': ' + sinal(e.valor, 2) + ' US$' : ''); },
    stop: function (e) { return (e.simbolo || 'posicao') + ' saiu no stop' + (e.valor != null ? ': ' + sinal(e.valor, 2) + ' US$' : ''); },
    sinapse: function (e) { return 'a mesa ' + (e.origem || '') + ' fechou a corrida e registou o ciclo de sinais'; },
    sinal: function (e) { return 'sinal registado pela mesa ' + (e.origem || '') + (e.simbolo ? ': ' + e.simbolo : ''); },
    batimento: function (e) { return 'batimento da mesa: ' + (e.valor != null ? num(e.valor, 2) + ' US$ em uso' : 'vivo'); },
    tecto_teria_cortado: function (e) { return (e.simbolo || 'uma estrategia') + ' teria sido cortada pelo tecto de perda (a trava esta desligada)'; },
    casa_limpa_teria_cortado: function (e) { return (e.simbolo || 'uma estrategia') + ' nao esta a entregar o que prometeu (a trava esta desligada)'; }
  };

  // ---------------------------------------------------------------- utilitarios
  var $ = function (id) { return document.getElementById(id); };
  function txt(el, s) { s = String(s == null ? '' : s); if (el && el.textContent !== s) el.textContent = s; }
  function num(v, c) { v = Number(v); return isFinite(v) ? v.toFixed(c == null ? 2 : c) : '—'; }
  function sinal(v, c) { v = Number(v); if (!isFinite(v)) return '—'; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(c == null ? 2 : c); }
  function lista(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !lista(x).length) ? x : (x || {}); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function hexCss(cor) { return '#' + ('000000' + Number(cor).toString(16)).slice(-6); }
  var calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var telemovel = !!(window.matchMedia && matchMedia('(max-width: 900px)').matches);

  // ---------------------------------------------------------------- estado
  var D = null, T = null;
  var projecto = null;            // PG.ordemDosAndares(...) -> a lista dos 100
  var andarPorOrdem = {};         // ordem -> {ordem, tipo, nome, n, dados, grupo, y, ang, estado, emVista}
  var andarPorN = {};             // n (dos habitados) -> o mesmo objecto
  var nivelActual = -1;           // 0..3
  var alvoOrdem = 11;             // o andar em foco a N2/N3 (por omissao a Mesa, ordem 11)
  var moradores = [];             // os construidos AGORA (janela)
  var comNumero = [];             // todos os funcionarios com numero (o portao), [{f, nu}]
  var semNumero = [];
  var semCaminho = 0, pacotesVivos = [], poolPacotes = [];
  var tweens = [], nTweens = 0, ultimasTweens = [];
  var holos = {};                 // nome -> {sprite, canvas, g, tex, W, H, sw, sh, hash, dados, angulo, ...}
  var rotulosPx = [];             // todos os sprites dimensionados em pixeis
  var nomesAndares = [], pilulasAndar = [], marcos = [], placas = [], cartoes3D = [];
  var obrasEscondidas = 0;        // 18/09: a N1, quando 47 andares nao cabem, os em obras ficam numa placa so
  var grupoGabinetes = null, gabinetes = [];   // v5: o gabinete do gerente do andar em foco (N2/N3)
  var MAX_VISTOS = 600, vistos = {}, ordemVistos = [], primeiraCarga = true;
  var painelAberto = null, fpsAmostras = [];
  var vistaW = 0, vistaH = 0, precisaEnquadrar = true, assinaturaEstrutura = '', assinaturaNumeros = '';
  var camTween = null, arrumarPendente = false, nGuias = 0, guias = null;
  var ultimoRedesenhoHolos = 0, separadorActivo = 'trilho';
  var cursorOrdem = null;         // o andar sob o cursor (para o zoom ir na direccao dele)
  // v6 (18/09 noite): o predio BATE como um coracao (52 bpm; a forca e a frescura do dado), uma ONDA DE DADOS sobe do
  // Atrio ao atico quando chega um torre.json novo, cada andar tem o seu material de arestas para acender, e a COROA
  // (penthouse em consola, letreiro STARK, reactor arc) vive acima do atico. O batimento actualiza a 20 Hz, nao a 60.
  var BPM = 52, PERIODO_BAT_MS = 60000 / BPM, PASSO_BAT_MS = 100;   // 19/09: era 50 (20 Hz); a 10 Hz le-se igual e custa metade
  var batimento = { amp: 0, fase: 0, w: 0, vivo: false, bpm: BPM }, ultimoBatimento = 0, vidroOpacidade = 0.32;
  var vidroMat = null, ondaDados = { v: null, t_iso: '' }, ondasDeDados = 0;
  var coroa = null, grupoCoroa = null;
  var ALTURA_COROA = 2.0 * ALTURA, COROA_ANDARES = ALTURA_COROA / ALTURA + 1.9;   // +1,9: a coroa mais o letreiro que fica por cima dela   // o que a coroa acrescenta ao enquadramento (com folga)
  var ultimaCorridaPorId = null;  // id -> ultima_corrida_brt da leitura anterior: a deteccao de corridas para TODOS os funcionarios
  var cartoesTopo = {};           // id -> {el, titulo, andares, dependentes, elegiveis, robustos, activos60, aCorrer} (os 10 de topo, vivos)
  var _corTmp = null, _branco = null;

  // ---------------------------------------------------------------- Three.js
  var cv = $('cena'), palco = $('palco');
  var renderer = null, cena = null, camara = null, raio = null, rato = new THREE.Vector2(-2, -2);
  var grupoTorre = null, grupoRotulos = null, grupoGuias = null, grupoFitas = null, grupoReserva = null, grupoObras = null;
  var instMoradores = null, instSecretarias = null, instPontos = null, instDegraus = null;
  var degrauInfo = [], ultimaFita = 0, faseFita = 0;   // a luz que corre pelas fitas (v6, 19/09)
  // v5e: o escritorio de perto - cabecas, cadeiras e encostos dos moradores (sentados) e os ESTAFETAS que andam
  var instCabecas = null, instCadeiras = null, instEncostos = null, instAndantes = null, instAndantesCab = null;
  // v5f (a print da invista.ja): cabelo, gravata, divisoria, monitor com grafico, pe do monitor, teclado; estafetas com
  // pernas e cabelo; vasos nos cantos. Uma malha instanciada por peca.
  var instCabelos = null, instGravatas = null, instDivisorias = null, instMonitores = null, instPesMonitor = null, instTeclados = null;
  var instPernaE = null, instPernaD = null, instAndantesCabelo = null, instVasos = null, instFolhas = null;
  var andantes = [], ultimoAndantes = 0, texMonitor = null;
  var PELES = [0xf1c9a5, 0xd9a679, 0xb97a56, 0x8d5a3b, 0xf6d7bf, 0x6b4128];
  var CABELOS = [0x1a1a1f, 0x3b2416, 0x7a4b2a, 0xc9922b, 0xd8d3c8, 0x5b2a1e, 0x2b2f55, 0xb5473a];
  var CAMISAS = [0xf4f6f8, 0xdbe7f3, 0x1d2126, 0x2e8b57, 0xb23a3a, 0xe9e2c8, 0x6b7f99];
  var GRAVATAS = [0xb01e2e, 0x1e4fb0, 0x2c7a4b, 0x222222, 0x8a2f9e, 0xd7a21a];
  var CALCAS = [0x1f2430, 0x2b3038, 0x3a3f4a, 0x14181f];
  var TODAS_AS_PECAS = function () { return [instMoradores, instSecretarias, instPontos, instCabecas, instCadeiras, instEncostos, instAndantes, instAndantesCab,
    instCabelos, instGravatas, instDivisorias, instMonitores, instPesMonitor, instTeclados, instPernaE, instPernaD, instAndantesCabelo, instVasos, instFolhas]; };
  var grupoV2 = null, v2Ligado = true, chafariz = null, imprensa = null, anel = null, particulasVivas = 0;
  var geracoesVistas = {}, ordemGeracoes = [], primeiraGeracao = true;
  var _eixoX = new THREE.Vector3(), _eixoY = new THREE.Vector3(), _eixoZ = new THREE.Vector3(), _v3 = new THREE.Vector3();
  // ISOMETRICO (v3): azimute 45, elevacao 30 (phi = 60 do polo). `meia` e o zoom; cx/cy sao o deslocamento
  // do centro EM ESPACO DE CAMARA; alvoY e o centro da torre nomeada, fixo depois de construir.
  var orbita = { theta: Math.PI / 4, phi: Math.PI / 3, dist: 400, meia: 60, cx: 0, cy: 0, alvoY: 17 * ALTURA, arrasta: false, x0: 0, y0: 0,
                 xi: 0, yi: 0, t0: 0, moved: false };   // v6: onde o botao desceu, quando, e se o rato andou desde entao

  function temWebGL() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  // 21/09 (ordem dele): NO TELEMOVEL O 3D NEM ARRANCA. Nao basta esconder o canvas: um WebGL escondido
  // continua a ser desenhado, e num telemovel isso sente-se na bateria e no calor, nao so nos fotogramas.
  // `ecraPequeno()` le a MESMA regra do CSS (max-width: 900px), para nunca haver desacordo entre os dois.
  function ecraPequeno() {
    try { return !!(window.matchMedia && matchMedia('(max-width: 900px)').matches); } catch (e) { return false; }
  }
  function iniciar3D() {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !telemovel, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(COR.fundo, 1);      // fundo escuro profundo; a vinheta e CSS por cima (nao entra no readPixels)
    cena = new THREE.Scene();                  // SEM NEVOEIRO: com camara ortografica pintaria a cena inteira (armadilha c)
    camara = new THREE.OrthographicCamera(-20, 20, 12, -12, 1, 1200);
    cena.add(new THREE.AmbientLight(0xffffff, 0.62));
    cena.add(new THREE.HemisphereLight(0xffffff, 0x6b5338, 0.55));
    var l1 = new THREE.DirectionalLight(0xfff3e0, 0.72); l1.position.set(26, 44, 24); cena.add(l1);
    var l2 = new THREE.DirectionalLight(0xbcd6ff, 0.28); l2.position.set(-28, 16, -20); cena.add(l2);
    grupoTorre = new THREE.Group(); cena.add(grupoTorre);
    grupoFitas = new THREE.Group(); cena.add(grupoFitas);
    grupoReserva = new THREE.Group(); cena.add(grupoReserva);
    grupoObras = new THREE.Group(); cena.add(grupoObras);
    grupoRotulos = new THREE.Group(); cena.add(grupoRotulos);
    grupoGuias = new THREE.Group(); cena.add(grupoGuias);
    grupoGabinetes = new THREE.Group(); cena.add(grupoGabinetes);   // v5: o gabinete de vidro do gerente do andar
    raio = new THREE.Raycaster();
    redimensionar();
    if (window.ResizeObserver) new ResizeObserver(redimensionar).observe(palco); else addEventListener('resize', redimensionar);
    ligarRato();
    ligarGavetaDoPointer();
  }

  var reenquadrando = false, precisaReenquadrarNivel = false, nivelPedido = -1;
  function redimensionar() {
    if (!renderer) return;
    var b = palco.getBoundingClientRect();
    var w = Math.max(240, Math.round(b.width)), h = Math.max(200, Math.round(b.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALIDADES[passoQ]));
    renderer.setSize(w, h, false);
    // 18/09 noite: depois de o palco crescer o compositor do Chrome ficava com o canvas PRETO (o buffer tinha
    // 66 mil pixeis desenhados e a captura nada). Tocar no estilo do canvas obriga-o a refrescar a camada.
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    vistaW = w; vistaH = h;
    telemovel = !!(window.matchMedia && matchMedia('(max-width: 900px)').matches);
    Object.keys(holos).forEach(function (k) { holos[k].hash = ''; });   // a resolucao do canvas muda com o palco
    if (nivelActual <= 0 || nivelActual === -1) precisaEnquadrar = true;
    // 🔴 22/09, DEFEITO ANTIGO QUE O CARTAO NOVO DESTAPOU: so o N0 se reenquadrava depois de o palco mudar de
    // tamanho. Nos niveis 1 a 3 a camara guardava o `meia` ANTIGO - que e uma medida do MUNDO - e os pixeis
    // por andar sao `vistaH / meia`: encolher o palco fazia-os cair SOZINHOS. Medido: a fila de cartoes ficou
    // mais alta, o palco perdeu ~80 px, e o "Andar" passou a mostrar 12,6 px/andar quando o minimo legivel e
    // 14,05 - ou seja, o botao N1 deixou de dar N1 sem ninguem lhe tocar. O nivel e um ALVO em pixeis: se o
    // palco muda, o alvo tem de ser recalculado, senao o nivel e uma etiqueta que deixou de descrever o ecra.
    // No quadro SEGUINTE, e com guarda: chamar irParaNivel() daqui dentro fazia recursao (visto em 18/09).
    // 🔴 e o nivel que conta aqui e o PEDIDO, nao o medido. `nivelActual` sai de `PG.nivelDe(px)`, ou seja do
    // que o ecra mostra AGORA - durante a viagem para o N1 ele ainda vale 0. A 1a versao disto lia `nivelActual`
    // e reenquadrava para o N0 a meio da viagem: o botao "Andar" deixou de chegar ao Andar (10,2 px/andar em
    // vez de 14,1) e os nomes nunca se construiam. Um alvo nao se le no sitio de onde se partiu.
    // E se a camara estiver a andar, nao se lhe toca: marca-se, e reenquadra-se quando ela parar.
    if (nivelPedido >= 1) {
      if (camTween) precisaReenquadrarNivel = true;
      else if (!reenquadrando) {
        reenquadrando = true;
        requestAnimationFrame(function () {
          reenquadrando = false;
          try { irParaNivel(nivelPedido, alvoOrdem, false); } catch (e) { }
        });
      }
    }
    var cxC = $('cartoes'); if (cxC && cxC.querySelector('.cartao.topo')) disporCartoes(cxC, cxC.querySelectorAll('.cartao.topo').length);   // v6
    aplicarVista();
  }

  // ---------------------------------------------------------------- resolucao adaptativa (19/09)
  // MEDIDO com o amostrador do V8: o JS ocupa 12% do tempo e a linha principal esta ociosa em 62% das
  // amostras - o peso esta na RASTERIZACAO, e quem manda nela e o numero de pixeis. A pagina mede o custo do
  // seu proprio desenho e escolhe a resolucao que a maquina aguenta. Nao ha valor fixo que sirva as duas
  // maquinas: um numero baixo estraga a nitidez de quem tem folga, e um alto trava quem nao tem.
  var QUALIDADES = [1.5, 1.25, 1, 0.85, 0.7];
  var passoQ = 0, custosDesenho = [], ultimaMudancaQ = 0, descidasQ = 0;
  function aplicarQualidade(i) {
    passoQ = Math.max(0, Math.min(QUALIDADES.length - 1, i));
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALIDADES[passoQ]));
    renderer.setSize(vistaW || 800, vistaH || 600, false);
    cv.style.width = (vistaW || 800) + 'px'; cv.style.height = (vistaH || 600) + 'px';
  }
  function medirDesenho(ms, agora) {
    custosDesenho.push(ms); if (custosDesenho.length > 90) custosDesenho.shift();
    if (custosDesenho.length < 45 || (agora - ultimaMudancaQ) < 3000) return;
    var v = custosDesenho.slice().sort(function (x, y) { return x - y; });
    var mediano = v[Math.floor(v.length / 2)];
    // orcamento: a 30 desenhos por segundo cada fotograma tem 33 ms; o desenho nao deve passar de metade.
    if (mediano > 16 && passoQ < QUALIDADES.length - 1) { aplicarQualidade(passoQ + 1); descidasQ++; }
    // so sobe se estiver FOLGADO e nunca volta ao passo que ja falhou duas vezes - senao oscila.
    else if (mediano < 7 && passoQ > 0 && descidasQ < 2) { aplicarQualidade(passoQ - 1); }
    else return;
    ultimaMudancaQ = agora; custosDesenho.length = 0;
  }

  function mundoPorPx() { return vistaH ? (2 * orbita.meia) / vistaH : 0.05; }
  function pxPorAndarAgora() { return PG.pxPorAndar(ALTURA, orbita.phi, mundoPorPx()); }

  function posicionarCamara() {
    var x = orbita.dist * Math.sin(orbita.phi) * Math.sin(orbita.theta);
    var z = orbita.dist * Math.sin(orbita.phi) * Math.cos(orbita.theta);
    var y = orbita.alvoY + orbita.dist * Math.cos(orbita.phi);
    camara.position.set(x, y, z);
    camara.lookAt(0, orbita.alvoY, 0);
    camara.updateMatrixWorld();
    camara.matrixWorld.extractBasis(_eixoX, _eixoY, _eixoZ);
  }

  function aplicarVista() {
    if (!camara || !vistaW) return;
    var asp = vistaW / vistaH;
    posicionarCamara();
    camara.top = orbita.cy + orbita.meia; camara.bottom = orbita.cy - orbita.meia;
    camara.left = orbita.cx - orbita.meia * asp; camara.right = orbita.cx + orbita.meia * asp;
    camara.updateProjectionMatrix();
    if (projecto) { actualizarNivel(); actualizarJanela(); dimensionarRotulos(); }
  }

  // ecra (px) <-> espaco de camara (unidades do mundo ao longo dos eixos da camara)
  function ecraParaCamara(px, py) { var m = mundoPorPx(); return { ox: orbita.cx + (px - vistaW / 2) * m, oy: orbita.cy + (vistaH / 2 - py) * m }; }
  function mundoDoEcra(px, py, alvo) {
    var c = ecraParaCamara(px, py);
    return (alvo || new THREE.Vector3()).set(0, orbita.alvoY, 0).addScaledVector(_eixoX, c.ox).addScaledVector(_eixoY, c.oy);
  }
  function ecraDoMundo(v, alvo) {
    _v3.copy(v).project(camara);
    var r = alvo || {};
    r.x = (_v3.x * 0.5 + 0.5) * vistaW; r.y = (-_v3.y * 0.5 + 0.5) * vistaH; r.dentro = _v3.z > -1 && _v3.z < 1;
    return r;
  }

  function ligarRato() {
    // v6: O CLIQUE SO ABRE O PAINEL SE O RATO NAO ANDOU (> 5 px) E O GESTO DUROU < 400 ms. Queixa dele: "todo lugar que
    // eu aperto no predio ja abre, nao consigo nem arrastar" - o `click` do browser dispara depois de QUALQUER arrasto
    // que comece e acabe no canvas, e a v5 abria o painel em todos. O arrasto continua a ser PAN; rodar e com Shift.
    cv.addEventListener('mousedown', function (e) {
      orbita.arrasta = true; orbita.x0 = orbita.xi = e.clientX; orbita.y0 = orbita.yi = e.clientY;
      orbita.t0 = performance.now(); orbita.moved = false;
    });
    addEventListener('mouseup', function () { orbita.arrasta = false; });
    addEventListener('mousemove', function (e) {
      apontarRato(e.clientX, e.clientY);
      if (orbita.arrasta) {
        if (!orbita.moved && (Math.abs(e.clientX - orbita.xi) > 5 || Math.abs(e.clientY - orbita.yi) > 5)) orbita.moved = true;
        arrastar(e.clientX, e.clientY, !!e.shiftKey);
      }
      apontar(e);
    });
    function apontarRato(cx0, cy0) {
      var b = cv.getBoundingClientRect();
      rato.x = ((cx0 - b.left) / b.width) * 2 - 1;
      rato.y = -((cy0 - b.top) / b.height) * 2 + 1;
    }
    function arrastar(cx0, cy0, roda) {
      // arrastar = PAN (o utilizador move o ecra); rodar e com Shift. A camara nunca roda sozinha.
      var m = mundoPorPx();
      if (roda) { orbita.theta -= (cx0 - orbita.x0) * 0.006; }
      else { orbita.cx -= (cx0 - orbita.x0) * m; orbita.cy += (cy0 - orbita.y0) * m; }
      orbita.x0 = cx0; orbita.y0 = cy0;
      camTween = null; aplicarVista();
    }
    // zoom EM DIRECCAO A UM PONTO DO ECRA (roda ou pinch): o ponto debaixo do cursor/dedos fica parado (espaco de camara)
    function zoomPara(px, py, f) {
      var m = mundoPorPx();
      var novaMeia = Math.max(2.5, Math.min(140, orbita.meia * f));
      f = novaMeia / orbita.meia;
      orbita.cx += (px - vistaW / 2) * m * (1 - f);
      orbita.cy += (vistaH / 2 - py) * m * (1 - f);
      orbita.meia = novaMeia;
      camTween = null; arrumarPendente = true; aplicarVista();
    }
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      var b = cv.getBoundingClientRect();
      zoomPara(e.clientX - b.left, e.clientY - b.top, e.deltaY > 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    cv.addEventListener('click', function (e) {
      if (orbita.moved) return;
      if (orbita.t0 && performance.now() - orbita.t0 > 400) return;
      // 19/09 (ordem dele): um clique EM CIMA DE UM PAINEL abre/fecha esse painel. So se o clique nao acertar em
      // nenhum e que vai ao andar. Os paineis tem rectangulo em pixeis (layoutHolos), logo isto e so geometria.
      var b2 = cv.getBoundingClientRect(), px = e.clientX - b2.left, py = e.clientY - b2.top;
      var alvo = null;
      NOMES_HOLO.forEach(function (nm) {
        var h = holos[nm], r = h && h.rect;
        if (!r || !h.sprite.visible) return;
        if (px >= r.esq && px <= r.dir && py >= r.topo && py <= r.fundo) alvo = h;
      });
      if (alvo) {
        alvo.min = !alvo.min;
        alvo.hash = ''; alvo.sw = 0; alvo.sh = 0;      // forca recriar a tela no tamanho novo
        disporHologramas(mundoPorPx()); desenharHolo(alvo, true);
        marcarMovimento();
        return;
      }
      apontarRato(e.clientX, e.clientY);
      var o = andarSobOCursor(); if (o != null) abrirPainelOrdem(o);
    });
    // TOQUE: 1 dedo = pan, 2 dedos = zoom por pinch (para o ponto medio). Um toque parado e um "click" do browser (os
    // eventos de rato de compatibilidade chegam a seguir ao touchend) e passa pelo MESMO portao do clique.
    var toque = { dedos: 0, x0: 0, y0: 0, d0: 0, meia0: 0 };
    function distDosDedos(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    function armarPinch(t) { toque.dedos = 2; toque.d0 = distDosDedos(t); toque.meia0 = orbita.meia; toque.x0 = (t[0].clientX + t[1].clientX) / 2; toque.y0 = (t[0].clientY + t[1].clientY) / 2; }
    cv.addEventListener('touchstart', function (e) {
      var t = e.touches;
      if (t.length === 1) { toque.dedos = 1; toque.x0 = t[0].clientX; toque.y0 = t[0].clientY; apontarRato(t[0].clientX, t[0].clientY); }
      else if (t.length >= 2) armarPinch(t);
    }, { passive: true });
    cv.addEventListener('touchmove', function (e) {
      var t = e.touches; if (!t.length) return;
      e.preventDefault();
      if (t.length === 1 && toque.dedos === 1) {
        var m = mundoPorPx();
        orbita.cx -= (t[0].clientX - toque.x0) * m; orbita.cy += (t[0].clientY - toque.y0) * m;
        toque.x0 = t[0].clientX; toque.y0 = t[0].clientY;
        camTween = null; aplicarVista();
      } else if (t.length >= 2) {
        if (toque.dedos < 2 || !(toque.d0 > 0)) { armarPinch(t); return; }
        var d = distDosDedos(t), b = cv.getBoundingClientRect();
        if (d > 0) zoomPara(toque.x0 - b.left, toque.y0 - b.top, (toque.meia0 * toque.d0 / d) / orbita.meia);
      }
    }, { passive: false });
    cv.addEventListener('touchend', function (e) {
      var t = e.touches; toque.dedos = t.length;
      if (t.length === 1) { toque.x0 = t[0].clientX; toque.y0 = t[0].clientY; }
      else if (t.length >= 2) armarPinch(t);
    }, { passive: true });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fecharPainel();
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key >= '0' && e.key <= '3') irParaNivel(Number(e.key), null, !calmo);
    });
    var nv = $('niveis');
    if (nv) nv.addEventListener('click', function (e) {
      var b = e.target; while (b && b !== this && !(b.dataset && b.dataset.k != null)) b = b.parentNode;
      if (b && b !== this) irParaNivel(Number(b.dataset.k), null, !calmo);
    });
    // 19/09 (ordem dele): o cartao abre e fecha AO CLIQUE - fechado e so o busto e o nome. So um fica aberto de
    // cada vez, senao volta o amontoado. Para ir ao ANDAR daquele cargo usa-se o proprio predio, que e onde o
    // andar existe; o cartao passou a servir para ler quem e e o que faz.
    $('cartoes').addEventListener('click', function (e) {
      var b = e.target;
      while (b && b !== this && String(b.className).indexOf('cartao') < 0) b = b.parentNode;
      if (!b || b === this) return;
      var jaAberto = b.classList.contains('aberto');
      Array.prototype.forEach.call(this.querySelectorAll('.cartao.aberto'), function (x) { x.classList.remove('aberto'); });
      if (!jaAberto) b.classList.add('aberto');
    });
    $('pn_fechar').addEventListener('click', fecharPainel);
    $('painel').addEventListener('click', function (e) { if (e.target === $('painel')) fecharPainel(); });
    var lt = $('lado_toggle');
    if (lt) lt.addEventListener('click', function () { document.body.classList.toggle('lado-fechado'); redimensionar(); });
    var sep = $('holo_sep');
    if (sep) sep.addEventListener('click', function (e) {
      var b = e.target; while (b && b !== this && !(b.dataset && b.dataset.holo)) b = b.parentNode;
      if (b && b !== this) { separadorActivo = b.dataset.holo; pintarSeparador(); }
    });
  }

  function andarSobOCursor() {
    if (!camara || !grupoTorre) return null;
    raio.setFromCamera(rato, camara);
    var hits = raio.intersectObjects(grupoTorre.children, true);
    for (var i = 0; i < hits.length; i++) { var o = hits[i].object; while (o && o.userData.ordem == null) o = o.parent; if (o && o.userData.ordem != null) return o.userData.ordem; }
    return null;
  }

  function apontar(e) {
    var o = andarSobOCursor(), el = $('etiq');
    cursorOrdem = o;
    if (o == null || !andarPorOrdem[o]) { el.hidden = true; cv.style.cursor = 'grab'; return; }
    var a = andarPorOrdem[o], d = obj(a.dados);
    cv.style.cursor = 'pointer'; el.hidden = false;
    var b = palco.getBoundingClientRect();
    el.style.left = Math.min(b.width - 290, Math.max(6, e.clientX - b.left + 14)) + 'px';
    el.style.top = Math.max(6, e.clientY - b.top + 14) + 'px';
    if (a.tipo === 'em_obras') el.innerHTML = '<u>ordem ' + escH(o) + ' · em obras · fase ' + escH(d.fase) + '</u><b>' + escH(a.nome) + '</b><br><em>' + escH(d.faz) + '</em>';
    else if (a.tipo === 'reservado') el.innerHTML = '<u>ordem ' + escH(o) + '</u><b>reservado</b><br><em>sem nome, sem alvará: silhueta do projecto de 100</em>';
    else el.innerHTML = '<u>andar ' + escH(a.n === -1 ? 'cave' : a.n) + ' · ordem ' + escH(o) + ' · ' + escH(d.cargo) + '</u><b>' + escH(a.nome) + '</b><br><em>' +
      escH(d.n_funcionarios) + ' funcionário(s) · importância ' + num(d.importancia, 1) + ' · ' + escH(d.estado) + '</em>';
  }

  // ================================================================ funcoes puras (da v3, provadas no arreio)
  // Estao expostas em window.__predio.puro e o arreio atira-lhes centenas de casos com semente.
  function escalaDoRotulo(alvoPx, cw, ch, ft, mundoPorPixel) {
    var a = Number(alvoPx), w = Number(cw), h = Number(ch), f = Number(ft), m = Number(mundoPorPixel);
    if (!isFinite(a) || a <= 0) a = 12;
    if (!isFinite(w) || w <= 0) w = 512;
    if (!isFinite(h) || h <= 0) h = 128;
    if (!isFinite(f) || f <= 0) f = 32;
    if (!isFinite(m) || m <= 0) m = 0.01;
    var y = a * (h / f) * m;
    return { x: y * (w / h), y: y };
  }
  function pixeisDoTexto(escalaY, ch, ft, mundoPorPixel) {
    var y = Number(escalaY), h = Number(ch), f = Number(ft), m = Number(mundoPorPixel);
    if (!isFinite(y) || !isFinite(h) || !isFinite(f) || !isFinite(m) || h <= 0 || f <= 0 || m <= 0 || y < 0) return 0;
    return (f / h) * y / m;
  }
  function alvoDoNomeDoAndar(pxPorAndar, tecto, minimo, bandaPorPx) {
    var p = Number(pxPorAndar), t = Number(tecto), m = Number(minimo), b = Number(bandaPorPx);
    if (!isFinite(t) || t <= 0) t = 15;
    if (!isFinite(m) || m <= 0) m = 11;
    if (!isFinite(b) || b <= 0) b = 1.5;
    if (t < m) t = m;
    if (!isFinite(p) || p <= 0) return m;
    return Math.max(m, Math.min(t, (p * 0.92) / b));
  }
  function alvoQueCabe(dispPx, cw, ft, minimo) {
    var d = Number(dispPx), w = Number(cw), f = Number(ft), m = Number(minimo);
    if (!isFinite(m) || m <= 0) m = 1;
    if (!isFinite(d) || d <= 0 || !isFinite(w) || w <= 0 || !isFinite(f) || f <= 0) return m;
    return Math.max(m, d * f / w);
  }
  function nomeQueCabe(nome, maxChars) {
    var t = String(nome == null ? '' : nome).replace(/\s+/g, ' ').replace(/^ | $/g, '');
    var m = Math.floor(Number(maxChars));
    if (!isFinite(m) || m < 1) m = 1;
    if (!t) return '—';
    if (t.length <= m) return t;
    var p = t.split(' ')[0];
    if (p.length <= m) return p;
    return m <= 1 ? t.slice(0, 1) : t.slice(0, m - 1) + '…';
  }
  function tocam(a, b, folga) {
    var g = Number(folga); if (!isFinite(g) || g < 0) g = 0;
    return (Math.min(a.dir, b.dir) - Math.max(a.esq, b.esq)) > -g && (Math.min(a.fundo, b.fundo) - Math.max(a.topo, b.topo)) > -g;
  }
  // ARRUMAR ETIQUETAS NO ECRA por construcao (v3, 18/09): uma de cada vez, no primeiro lugar livre de uma
  // grelha ordenada por custo; quem ja esta posto nao se mexe; quem nao tem lugar sai `preso` e conta-se.
  function arrumarEtiquetas(caixas, fixas, limite, folga) {
    var cs = lista(caixas), fx = lista(fixas), lim = obj(limite);
    var n = cs.length, saida = [];
    for (var z = 0; z < n; z++) saida.push({ dx: 0, dy: 0, preso: false });
    if (!n) return saida;
    var LX = Number(lim.dx), LY = Number(lim.dy), PS = Number(lim.passo), g = Number(folga);
    if (!isFinite(LX) || LX < 0) LX = 0;
    if (!isFinite(LY) || LY < 0) LY = 0;
    if (!isFinite(PS) || PS <= 0) PS = 8;
    if (!isFinite(g) || g < 0) g = 0;
    var W = Number(lim.larg), H = Number(lim.alt), temPalco = isFinite(W) && W > 0 && isFinite(H) && H > 0;
    var cand = [];
    for (var ix = 0; ix * PS <= LX; ix++) for (var iy = 0; iy * PS <= LY; iy++) {
      var sx = ix ? [-ix * PS, ix * PS] : [0], sy = iy ? [-iy * PS, iy * PS] : [0];
      for (var u = 0; u < sx.length; u++) for (var w2 = 0; w2 < sy.length; w2++)
        cand.push({ dx: sx[u], dy: sy[w2], c: Math.abs(sx[u]) + 3.4 * Math.abs(sy[w2]) });
    }
    cand.sort(function (a, b) { return (a.c - b.c) || (a.dx - b.dx) || (a.dy - b.dy); });
    var ordem = [];
    for (var q = 0; q < n; q++) ordem.push(q);
    ordem.sort(function (a, b) { var pa = Number(obj(cs[a]).peso) || 0, pb = Number(obj(cs[b]).peso) || 0; return (pb - pa) || (a - b); });
    var postas = [];
    for (var f2 = 0; f2 < fx.length; f2++) { var o = obj(fx[f2]); if (isFinite(o.esq) && isFinite(o.dir) && isFinite(o.topo) && isFinite(o.fundo)) postas.push(o); }
    for (var k = 0; k < ordem.length; k++) {
      var i = ordem[k], b3 = obj(cs[i]);
      var e0 = Number(b3.esq), d0 = Number(b3.dir), t0 = Number(b3.topo), u0 = Number(b3.fundo);
      if (!isFinite(e0) || !isFinite(d0) || !isFinite(t0) || !isFinite(u0)) continue;
      var achou = null;
      for (var c2 = 0; c2 < cand.length; c2++) {
        var r = { esq: e0 + cand[c2].dx, dir: d0 + cand[c2].dx, topo: t0 + cand[c2].dy, fundo: u0 + cand[c2].dy };
        if (temPalco && (r.esq < 1 || r.dir > W - 1 || r.topo < 1 || r.fundo > H - 1)) continue;
        var livre = true;
        for (var m2 = 0; m2 < postas.length; m2++) if (tocam(r, postas[m2], g)) { livre = false; break; }
        if (livre) { achou = { d: cand[c2], r: r }; break; }
      }
      if (achou) { saida[i] = { dx: achou.d.dx, dy: achou.d.dy, preso: false }; postas.push(achou.r); }
      else { saida[i] = { dx: 0, dy: 0, preso: true }; postas.push({ esq: e0, dir: d0, topo: t0, fundo: u0 }); }
    }
    return saida;
  }
  // QUE CAPITAL PODE SER PENDURADO NUM MORADOR (v3): nunca o mesmo dinheiro em dois, nunca o da casa.
  function capitalExclusivo(funcionarios, capitalDaCasa) {
    var fs = lista(funcionarios), casa = Number(capitalDaCasa), quantos = {}, ok = {}, porque = {};
    function chave(v) { return (Math.round(v * 100) / 100).toFixed(2); }
    fs.forEach(function (f) { var c = Number(obj(obj(f).importancia).capital_usd); if (!isFinite(c) || c <= 0) return; var k = chave(c); quantos[k] = (quantos[k] || 0) + 1; });
    fs.forEach(function (f) {
      var id = obj(f).id; if (id == null || id === '') return;
      var c = Number(obj(obj(f).importancia).capital_usd); if (!isFinite(c) || c <= 0) return;
      var k = chave(c);
      if (quantos[k] > 1) { porque[id] = 'o mesmo capital em ' + quantos[k] + ' moradores'; return; }
      if (isFinite(casa) && casa > 0 && Math.abs(c - casa) <= 0.005) { porque[id] = 'e o capital da casa, ja esta no topo'; return; }
      ok[id] = true;
    });
    return { ok: ok, porque: porque };
  }
  function cartoesQueCabem(largura, largCartao, gap, total) {
    var W = Number(largura), C = Number(largCartao), G = Number(gap), N = Math.floor(Number(total));
    if (!isFinite(N) || N < 0) N = 0;
    if (!isFinite(W) || W <= 0 || !isFinite(C) || C <= 0) return 0;
    if (!isFinite(G) || G < 0) G = 0;
    return Math.max(0, Math.min(N, Math.floor((W + G) / (C + G))));
  }
  var PALAVRAS_VAZIAS = { DE: 1, DA: 1, DO: 1, DAS: 1, DOS: 1, E: 1, O: 1, A: 1 };
  function curto4(nome) {
    var bruto = String(nome == null ? '' : nome).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
    var ps = bruto.split(' ').filter(function (p) { return p && !PALAVRAS_VAZIAS[p]; });
    var p = ps.length ? ps[0] : bruto.replace(/ /g, '');
    return p ? p.slice(0, 4) : '--';
  }
  function lugarNoCirculo(i, n, raio) {
    var k = Number(i), m = Number(n), r = Number(raio);
    if (!isFinite(m) || m < 1) m = 1;
    if (!isFinite(k)) k = 0;
    if (!isFinite(r) || r < 0) r = 0;
    var a = (k / m) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, ang: a };
  }
  function acordeDoGrafo(ligacoes, andarDe) {
    var mapa = obj(andarDe), pares = {}, grau = {}, dentro = 0, fora = 0, tot = 0;
    lista(ligacoes).forEach(function (l) {
      l = obj(l);
      var a = mapa[l.de], b = mapa[l.para];
      if (a == null || b == null) { fora++; return; }
      tot++; grau[a] = (grau[a] || 0) + 1; if (b !== a) grau[b] = (grau[b] || 0) + 1;
      if (a === b) { dentro++; return; }
      var ch = a + '>' + b, p = pares[ch] || (pares[ch] = { de: a, para: b, n: 0, ficheiro: 0, hierarquia: 0 });
      p.n++; if (l.tipo === 'hierarquia') p.hierarquia++; else p.ficheiro++;
    });
    var nos = Object.keys(grau).map(function (k) { return { andar: Number(k), grau: grau[k] }; });
    nos.sort(function (x, y) { return y.andar - x.andar; });
    var arcos = Object.keys(pares).map(function (k) { return pares[k]; });
    arcos.sort(function (x, y) { return y.n - x.n; });
    return { nos: nos, arcos: arcos, dentro: dentro, sem_andar: fora, total: tot };
  }
  function particulasDaGeracao(avaliados, robustos, monoPct, espaco) {
    function conta(v) { var x = Math.floor(Number(v)); return isFinite(x) ? Math.max(0, Math.min(1e9, x)) : 0; }
    var av = conta(avaliados), rb = Math.min(av, conta(robustos));
    var mono = Number(monoPct); mono = isFinite(mono) ? Math.max(0, Math.min(100, mono)) : 0;
    var esp = conta(espaco), n = Math.min(av, esp);
    var rob = av > 0 ? Math.round(n * rb / av) : 0; if (rob > n) rob = n;
    var mortos = n - rob;
    return { n: n, robustos: rob, mortos: mortos, robustos_mono: Math.min(rob, Math.round(rob * mono / 100)),
             mortos_mono: Math.min(mortos, Math.round(mortos * mono / 100)), avaliados: av, truncado: n < av };
  }
  function alturaDaBarra(realizado, maxAbs, alturaMax, minimo) {
    var v = Number(realizado); if (!isFinite(v)) v = 0;
    var M = Number(maxAbs); if (!isFinite(M) || M <= 0) M = 1;
    var A = Number(alturaMax); if (!isFinite(A) || A <= 0) A = 1;
    var m = Number(minimo); if (!isFinite(m) || m < 0) m = 0;
    var h = Math.min(1, Math.abs(v) / M) * A; if (h < m) h = m;
    return v < 0 ? -h : h;
  }
  function raioDoNo(cred, maxCred, rMin, rMax) {
    var mn = Number(rMin); if (!isFinite(mn) || mn <= 0) mn = 0.1;
    var mx = Number(rMax); if (!isFinite(mx) || mx < mn) mx = mn;
    if (cred == null) return mn;
    var c = Number(cred); if (!isFinite(c) || c <= 0) return mn;
    var M = Number(maxCred); if (!isFinite(M) || M <= 0) return mn;
    return mn + (mx - mn) * Math.sqrt(Math.min(1, c / M));
  }
  // O PORTAO (v3): quem nao tem numero nao mora no piso. estrategia -> realizado da mesa; executor -> capital
  // em uso (se exclusivo); os outros -> importancia; em ultimo a hora da ultima corrida.
  function numeroDoMorador(f, mesaPorClasse, capOk) {
    f = obj(f);
    var imp = obj(f.importancia), mp = obj(mesaPorClasse), classe = CLASSE_DO_EXECUTOR[f.id];
    if (classe && mp[classe] != null && isFinite(Number(mp[classe]))) {
      var v = Number(mp[classe]);
      return { tem: true, valor: v, texto: sinal(v, 2), fonte: 'mesa', classe: v > 0 ? 'up' : (v < 0 ? 'dn' : 'zero'), diz: 'realizado da mesa, US$', casas: 2, comSinal: true };
    }
    var cap = Number(imp.capital_usd);
    var podeCap = !capOk || !obj(capOk).ok || obj(obj(capOk).ok)[f.id] === true;
    if (isFinite(cap) && cap > 0 && podeCap) return { tem: true, valor: cap, texto: num(cap, 2), fonte: 'capital', classe: 'cap', diz: 'capital em uso, US$', casas: 2, comSinal: false };
    var sc = Number(imp.score);
    if (isFinite(sc) && sc > 0) return { tem: true, valor: sc, texto: num(sc, 1), fonte: 'importancia', classe: 'imp', diz: 'importancia', casas: 1, comSinal: false };
    var h = String(f.ultima_corrida_brt == null ? '' : f.ultima_corrida_brt);
    if (h.length >= 4) return { tem: true, valor: null, texto: h.slice(-5), fonte: 'corrida', classe: 'hora', diz: 'ultima corrida', casas: 0, comSinal: false };
    return { tem: false, valor: null, texto: '', fonte: 'nenhuma', classe: 'hora', porque: f.estado === 'sem_tarefa' ? 'sem tarefa no agendador' : 'sem capital, sem importancia e sem corrida' };
  }
  function formatarNumero(nu, v) { return nu.fonte === 'mesa' ? sinal(v, 2) : num(v, nu.casas == null ? 2 : nu.casas); }

  function capitalDaCasa() { if (!T) return 0; var c = Number(obj(obj(T.reactor).conta).capital_escala); return isFinite(c) ? c : 0; }
  function quemMostraCapital() { return capitalExclusivo(D ? lista(D.funcionarios) : [], capitalDaCasa()); }
  function realizadoPorClasseExclusiva() {
    if (!D || !T) return {};
    var vivos = {}; lista(D.funcionarios).forEach(function (f) { vivos[f.id] = 1; });
    var quantos = {};
    Object.keys(CLASSE_DO_EXECUTOR).forEach(function (id) { if (!vivos[id]) return; var c = CLASSE_DO_EXECUTOR[id]; quantos[c] = (quantos[c] || 0) + 1; });
    var p = obj(T.pepper), soma = {};
    lista(p.linhas).concat(lista(p.controlo)).forEach(function (l) { var c = l && l.classe; if (!c) return; soma[c] = (soma[c] || 0) + (Number(l.realizado) || 0); });
    var fora = {};
    Object.keys(soma).forEach(function (c) { if (quantos[c] === 1) fora[c] = soma[c]; });
    return fora;
  }
  // a lista de quem tem numero (o portao), recalculada quando os dados mudam
  function recalcularNumeros() {
    comNumero = []; semNumero = [];
    if (!D) return;
    var mesa = realizadoPorClasseExclusiva(), cap = quemMostraCapital();
    lista(D.funcionarios).forEach(function (f) {
      var nu = numeroDoMorador(f, mesa, cap);
      nu.peso = Number(obj(f.importancia).score) || 0;
      if (nu.tem) comNumero.push({ f: f, nu: nu });
      else semNumero.push({ id: f.id, andar: f.andar, sector: f.sector, cargo: f.cargo, dono_da_falha: f.dono_da_falha, porque: nu.porque });
    });
  }

  // ================================================================ rotulos em PIXEIS DE ECRA (a regua da v3)
  // Um sprite com textura de canvas, cujo tamanho no MUNDO se calcula a partir dos pixeis pedidos e do zoom
  // actual (escalaDoRotulo). O que se le nunca e dimensionado em unidades do mundo (armadilha g: 3 px).
  var FONTE_MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';
  var FONTE_SANS = '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
  function cantoRedondo(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function novoSprite(c, ordemDesenho) {
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    sp.renderOrder = ordemDesenho || 10;
    sp.userData.canvas = c; sp.userData.tex = tex;
    return sp;
  }
  function registarRotulo(sp, cw, ch, ft, alvoPx, ancora, linhas, tipo) {
    sp.userData.px = { cw: cw, ch: ch, ft: ft, alvo: alvoPx, ancora: ancora, linhas: lista(linhas).length ? lista(linhas) : [ft],
                       tipo: tipo || 'rotulo', dx: 0, dy: 0, preso: false, movel: false };
    rotulosPx.push(sp);
    return sp;
  }
  function desregistarRotulo(sp) { for (var i = 0; i < rotulosPx.length; i++) if (rotulosPx[i] === sp) { rotulosPx.splice(i, 1); return; } }
  function largarSprite(sp) {
    if (!sp) return;
    if (sp.parent) sp.parent.remove(sp);
    desregistarRotulo(sp);
    if (sp.material) { if (sp.material.map) sp.material.map.dispose(); sp.material.dispose(); }
  }
  var _larguraChar = 0;
  function larguraDeUmChar() {
    if (_larguraChar) return _larguraChar;
    var med = document.createElement('canvas').getContext('2d');
    med.font = '700 100px ' + FONTE_MONO;
    _larguraChar = med.measureText('0000000000').width / 1000;
    if (!isFinite(_larguraChar) || _larguraChar <= 0) _larguraChar = 0.6;
    return _larguraChar;
  }

  // Um rotulo de texto (nome de andar, marco, placa, pilula de laje). `opts`: cor (int), peso, halo, pilula
  // (fundo escuro com borda), tipo, movel, alvo (px), alinhado ('direita' | 'esquerda' | 'centro').
  function rotuloTexto(texto, ancora, opts) {
    opts = obj(opts);
    var CH = 96, FT = 78, t = String(texto);
    if (opts.maiusculas !== false) t = t.toUpperCase();
    var med = document.createElement('canvas').getContext('2d');
    var peso = opts.peso || 700;
    med.font = peso + ' ' + FT + 'px ' + FONTE_MONO;
    var larg = Math.ceil(med.measureText(t).width);
    var pad = opts.pilula ? 40 : 18;
    var CW = Math.max(60, larg + pad);
    var c = document.createElement('canvas'); c.width = CW; c.height = CH;
    var g = c.getContext('2d');
    g.clearRect(0, 0, CW, CH);
    if (opts.pilula) {
      g.fillStyle = 'rgba(7,11,17,.90)'; g.strokeStyle = opts.borda || 'rgba(90,200,250,.55)'; g.lineWidth = 4;
      cantoRedondo(g, 3, 10, CW - 6, CH - 20, 16); g.fill(); g.stroke();
    }
    g.font = peso + ' ' + FT + 'px ' + FONTE_MONO;
    g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    var xt = CW - pad / 2;
    if (opts.halo !== false && !opts.pilula) { g.lineWidth = 9; g.strokeStyle = 'rgba(6,9,14,.92)'; g.lineJoin = 'round'; g.strokeText(t, xt, FT + 6); }
    g.fillStyle = hexCss(opts.cor == null ? 0xeef2f7 : opts.cor);
    g.fillText(t, xt, FT + 6);
    var sp = novoSprite(c, opts.ordem || 200);
    registarRotulo(sp, CW, CH, FT, opts.alvo || ALVO_PX_ANDAR, ancora, [FT], opts.tipo || 'rotulo');
    var p = sp.userData.px;
    p.nome = t; p.topo = 6 / CH; p.fundo = (FT + 6) / CH; p.banda = (CH / FT) * (p.fundo - p.topo);
    p.movel = !!opts.movel; p.peso = Number(opts.peso_arrumacao) || 0; p.min = opts.min || MIN_PX_LEGIVEL;
    p.tecto = opts.tecto || (opts.alvo || ALVO_PX_ANDAR); p.porAndar = opts.porAndar !== false;
    return sp;
  }

  // A PILULA DO MORADOR (v3): escura com texto de cor; pintada num canvas que se REPINTA durante a tween.
  function pintarPilula(c, g, CW, CH, FT, texto, classe, flash) {
    var p = PILULA[classe] || PILULA.hora;
    g.clearRect(0, 0, CW, CH);
    if (flash && flash.forca > 0) {
      g.strokeStyle = flash.cor; g.lineWidth = 10; g.globalAlpha = Math.max(0, Math.min(1, flash.forca));
      cantoRedondo(g, 6, 20, CW - 12, CH - 48, 14); g.stroke(); g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(7,11,17,.93)'; g.strokeStyle = p.bd; g.lineWidth = 5;
    cantoRedondo(g, 4, 18, CW - 8, CH - 44, 14); g.fill(); g.stroke();
    g.font = '700 ' + FT + 'px ' + FONTE_MONO; g.fillStyle = p.txt; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(texto), CW / 2, 18 + (CH - 44) / 2 + 1);
  }
  function alvoDaEtiqueta() { return vistaW < 700 ? Math.max(MIN_PX_LEGIVEL, ALVO_PX_NUM - 2) : ALVO_PX_NUM; }
  function etiquetaNumero(nu, ancora, textoLargura) {
    var CH = 108, FT = 54;
    var med = document.createElement('canvas').getContext('2d');
    med.font = '700 ' + FT + 'px ' + FONTE_MONO;
    var CW = Math.ceil(med.measureText(String(textoLargura || nu.texto)).width) + 46;
    var c = document.createElement('canvas'); c.width = CW; c.height = CH;
    var g = c.getContext('2d');
    pintarPilula(c, g, CW, CH, FT, nu.texto, nu.classe, null);
    var sp = novoSprite(c, 10);
    sp.userData.nu = nu; sp.userData.g = g;
    registarRotulo(sp, CW, CH, FT, alvoDaEtiqueta(), ancora, [FT], 'etiqueta');
    var p = sp.userData.px; p.movel = true; p.peso = Number(nu.peso) || 0; p.texto = String(nu.texto); p.etiqueta = true;
    return sp;
  }

  // O CARTAO DO FUNCIONARIO (N3): nome, cargo, dono da falha, numero grande, ultima corrida e estado. Sem
  // sparkline: nao ha serie por morador em nenhum dos dois ficheiros, e nao se inventa uma.
  // 22/09, pergunta dele: "os andares dizem 200+ funcionarios e tu dizes 154 - o que puseste na torre?".
  // Ele tinha razao. O numero do andar somava genes REJEITADOS (medidos uma vez e postos de lado) com quem
  // trabalha. A partir daqui o ecra mostra SEMPRE os dois, porque um numero que so se pode acreditar depois
  // de o desmontar nao serve para decidir nada. Quem separa e organograma.peao_activo.
  function etiquetaDoQuadro(d) {
    var act = d && d.n_activos, hist = d && d.n_historico;
    if (act == null) return String((d && d.n_funcionarios) || 0) + ' func';
    return String(act) + ' no quadro' + (hist ? ' · ' + String(hist) + ' hist.' : '');
  }

  function cartaoMorador(f, nu, ancora) {
    var K = 2, CW = 168 * K, CH = 98 * K;
    var c = document.createElement('canvas'); c.width = CW; c.height = CH;
    var g = c.getContext('2d');
    var p = PILULA[nu.classe] || PILULA.hora;
    g.clearRect(0, 0, CW, CH);
    g.fillStyle = 'rgba(8,12,18,.94)'; g.strokeStyle = 'rgba(90,200,250,.55)'; g.lineWidth = 1.5 * K;
    cantoRedondo(g, 1.5 * K, 1.5 * K, CW - 3 * K, CH - 3 * K, 6 * K); g.fill(); g.stroke();
    g.fillStyle = p.bd; g.fillRect(1.5 * K, 1.5 * K, 3 * K, CH - 3 * K);
    var x = 10 * K;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = '700 ' + (11 * K) + 'px ' + FONTE_MONO; g.fillStyle = '#e6edf6';
    // v5 (ordem dele): o nome que se le e o do PERSONAGEM ("HULK · SUPERVISOR BANNER"); o id do modulo fica por baixo
    var el = obj(f.elenco);
    var nome = String(el.titulo_curto || el.titulo || f.id).toUpperCase(); while (nome.length > 1 && g.measureText(nome).width > CW - 20 * K) nome = nome.slice(0, -1);
    g.fillText(nome, x, 15 * K);
    g.font = '500 ' + (7.5 * K) + 'px ' + FONTE_SANS; g.fillStyle = '#8fb3c9';
    var cargo = String((el.heroi ? el.heroi + ' · ' : '') + f.id).toUpperCase(); while (cargo.length > 1 && g.measureText(cargo).width > CW - 20 * K) cargo = cargo.slice(0, -1);
    g.fillText(cargo, x, 25 * K);
    g.font = '400 ' + (7.5 * K) + 'px ' + FONTE_SANS; g.fillStyle = '#9aa6b4';
    var falha = 'dono da falha: ' + String(f.dono_da_falha || 'sem falha declarada');
    var linhas = [], resto = falha.split(' '), linha = '';
    while (resto.length && linhas.length < 2) {
      var w = resto.shift(), tent = linha ? linha + ' ' + w : w;
      if (g.measureText(tent).width > CW - 20 * K && linha) { linhas.push(linha); linha = w; } else linha = tent;
    }
    if (linha && linhas.length < 2) linhas.push(linha);
    if (resto.length && linhas.length === 2) linhas[1] = linhas[1].slice(0, Math.max(1, linhas[1].length - 2)) + '…';
    linhas.forEach(function (l, i) { g.fillText(l, x, (36 + i * 9.5) * K); });
    g.font = '700 ' + (18 * K) + 'px ' + FONTE_MONO; g.fillStyle = p.txt;
    g.fillText(String(nu.texto), x, 74 * K);
    g.font = '500 ' + (7 * K) + 'px ' + FONTE_SANS; g.fillStyle = '#6f7d8c';
    // a linha de MOVIMENTO (ordem dele: "numeracao que indique se esta parado ou a trabalhar"): ha quanto tempo
    // correu e quanto falta para a proxima, dos minutos que o registo da; sem tarefa, diz-se
    var mov = f.minutos_desde_ultima != null ? ('há ' + Math.round(f.minutos_desde_ultima) + ' min' + (f.minutos_para_proxima != null ? ' · próxima em ' + Math.round(f.minutos_para_proxima) : '')) : (f.estado === 'sem_tarefa' ? 'sem tarefa própria' : String(f.estado || ''));
    g.fillText((String(nu.diz || '') + '  ·  ' + mov).toUpperCase(), x, 84 * K);
    g.textAlign = 'right'; g.font = '500 ' + (7.5 * K) + 'px ' + FONTE_MONO;
    g.fillStyle = f.estado === 'erro' ? '#ff7b7f' : (f.estado === 'a_correr' ? '#7cd4ff' : '#8a94a3');
    g.fillText(String(f.estado || '').replace('_', ' '), CW - 8 * K, 84 * K);
    g.fillStyle = '#8a94a3'; g.fillText(String(f.ultima_corrida_brt || 'sem corrida').slice(-11), CW - 8 * K, 74 * K);
    var sp = novoSprite(c, 12);
    // o cartao pede 96 px de altura no ecra: o texto de 11*K no canvas de 98*K da 10,8 px de nome
    registarRotulo(sp, CW, CH, CH, 96, ancora, [11 * K, 7.5 * K], 'cartao');
    var q = sp.userData.px; q.movel = true; q.peso = Number(nu.peso) || 0; q.id = f.id; q.texto = String(nu.texto);
    return sp;
  }

  // ---------------------------------------------------------------- medir no ecra
  function caixaNoEcra(sp, e, mpp) {
    if (!camara || !vistaW || !mpp) return null;
    _v3.copy(sp.position).project(camara);
    var w = e.x / mpp, h = e.y / mpp, cx = (_v3.x * 0.5 + 0.5) * vistaW, cy = (-_v3.y * 0.5 + 0.5) * vistaH;
    return { esq: cx - w / 2, dir: cx + w / 2, topo: cy - h / 2, fundo: cy + h / 2 };
  }
  function caixasDoHUD() {
    var out = [];
    if (!cv) return out;
    var base = cv.getBoundingClientRect();
    ['contadores', 'niveis'].forEach(function (id) {
      var el = $(id); if (!el || el.hidden) return;
      var b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
      out.push({ esq: b.left - base.left - 4, dir: b.right - base.left + 4, topo: b.top - base.top - 4, fundo: b.bottom - base.top + 4, id: id });
    });
    return out;
  }
  function limiteEsquerdo() {
    // ate onde um nome pode crescer para a esquerda: a beira do palco ou a coluna de hologramas da esquerda
    var x = 3;
    Object.keys(holos).forEach(function (k) { var h = holos[k]; if (h.sprite.visible && h.coluna === 'esq' && h.rect) x = Math.max(x, h.rect.dir + 6); });
    return x;
  }

  // Devolve a cada rotulo o MESMO tamanho de leitura seja qual for o zoom, poe cada um na sua ancora (pelos
  // EIXOS DA CAMARA, armadilha d), dispoe os hologramas, e so depois - com tudo medido - arruma os moveis.
  function dimensionarRotulos(forcarArrumacao) {
    if (!camara || !vistaW || !projecto) return;
    var mpp = mundoPorPx(), pxA = pxPorAndarAgora();
    var etqs = [], fixas = caixasDoHUD();
    disporHologramas(mpp);
    var limEsq = limiteEsquerdo();   // DEPOIS de dispor: o limite e a coluna de hologramas DESTE nivel
    Object.keys(holos).forEach(function (k) { var h = holos[k]; if (h.sprite.visible && h.rect) fixas.push({ esq: h.rect.esq - 3, dir: h.rect.dir + 3, topo: h.rect.topo - 3, fundo: h.rect.fundo + 3 }); });
    var lr = letreiroRect(); if (lr) fixas.push({ esq: lr.esq - 3, dir: lr.dir + 3, topo: lr.topo - 3, fundo: lr.fundo + 3 });   // v6: a coroa e fixa
    // uma COPIA: encurtar um nome substitui o sprite (splice + push) e a iteracao directa saltava o seguinte -
    // medido na 1.a corrida de fumo, um nome sim um nome nao a sair "MA..."
    var fila = rotulosPx.slice();
    for (var i = 0; i < fila.length; i++) {
      var sp = fila[i], p = sp.userData.px;
      if (!p || !sp.visible || !sp.parent) continue;
      var a = p.ancora, alvo;
      if (p.tipo === 'etiqueta') alvo = alvoDaEtiqueta();
      else if (p.tipo === 'cartao') alvo = p.alvo;
      else alvo = p.porAndar ? alvoDoNomeDoAndar(pxA, p.tecto, p.min, p.banda) : p.alvo;
      // a ancora no mundo, deslocada ao longo do eixo da DIREITA da camara (recuo em unidades do mundo)
      sp.position.set(a.x, a.y, a.z);
      if (a.lado) sp.position.addScaledVector(_eixoX, a.lado * (a.recuo || 0));
      if (a.modo === 'direita') {
        var esp = ecraDoMundo(sp.position).x - limEsq;
        alvo = Math.min(alvo, alvoQueCabe(esp, p.cw, p.ft, p.min || MIN_PX_LEGIVEL));
        // e se nem ao minimo cabe, encurta-se o nome (uma vez por orcamento; o inteiro fica no directorio)
        if (p.inteiro != null && p.encurta) {
          var orc = Math.max(3, Math.floor(esp / ((p.min || MIN_PX_LEGIVEL) * larguraDeUmChar())));
          if (orc !== p.orcamento) {
            var novo = p.encurta(orc);
            if (!novo) continue;
            sp = novo; p = sp.userData.px; p.orcamento = orc;
            sp.position.set(a.x, a.y, a.z); if (a.lado) sp.position.addScaledVector(_eixoX, a.lado * (a.recuo || 0));
            alvo = Math.min(p.porAndar ? alvoDoNomeDoAndar(pxA, p.tecto, p.min, p.banda) : p.alvo, alvoQueCabe(esp, p.cw, p.ft, p.min || MIN_PX_LEGIVEL));
          }
        }
      }
      p.usado = alvo;
      var e = escalaDoRotulo(alvo, p.cw, p.ch, p.ft, mpp);
      sp.scale.set(e.x, e.y, 1);
      if (a.modo === 'direita') sp.position.addScaledVector(_eixoX, -e.x / 2);
      else if (a.modo === 'esquerda') sp.position.addScaledVector(_eixoX, e.x / 2);
      if (a.acima) sp.position.addScaledVector(_eixoY, e.y / 2 + (a.acima * mpp));
      p.dx = 0; p.dy = 0; p.preso = false;
      var cx = caixaNoEcra(sp, e, mpp);
      if (!cx) continue;
      p.caixa = cx;
      // 21/09: A COROA E UM CANTILEVER e o seu canto ESQUERDO fica a esquerda da coluna dos nomes (medido a
      // 1400x900 no N1: coroa[412..558], nomes a acabarem em 421 - 9 px por baixo do penthouse). Os nomes dos
      // andares nao sao `movel`, logo o arrumador NUNCA os tirava dali por muito que a coroa estivesse nas
      // caixas fixas: uma caixa fixa so afasta quem se pode mexer. Aqui empurra-se o nome para a esquerda o
      // EXACTO que falta, medido no ecra - nao um recuo adivinhado, que voltaria a falhar quando a torre crescer.
      if (lr && !p.movel && a.modo === 'direita' && cx.dir > lr.esq - FOLGA_ETQ_PX && cx.esq < lr.dir + FOLGA_ETQ_PX
          && cx.fundo > lr.topo - FOLGA_ETQ_PX && cx.topo < lr.fundo + FOLGA_ETQ_PX) {
        var fuga = cx.dir - (lr.esq - FOLGA_ETQ_PX);
        if (fuga > 0 && cx.esq - fuga >= 0) {
          sp.position.addScaledVector(_eixoX, -fuga * mpp);
          cx = { esq: cx.esq - fuga, dir: cx.dir - fuga, topo: cx.topo, fundo: cx.fundo };
          p.caixa = cx;
        }
      }
      if (p.movel && (cx.fundo < 0 || cx.topo > vistaH || cx.dir < 0 || cx.esq > vistaW)) { sp.visible = false; continue; }
      if (p.movel) etqs.push({ sp: sp, caixa: cx, peso: p.peso || 0 });
      else fixas.push({ esq: cx.esq, dir: cx.dir, topo: cx.topo + (p.topo || 0) * (cx.fundo - cx.topo), fundo: cx.topo + (p.fundo || 1) * (cx.fundo - cx.topo) });
    }
    if (etqs.length && (forcarArrumacao || !camTween)) {
      var arr = arrumarEtiquetas(etqs.map(function (x) { return { esq: x.caixa.esq, dir: x.caixa.dir, topo: x.caixa.topo, fundo: x.caixa.fundo, peso: x.peso }; }), fixas,
        { dx: Math.min(DESL_ETQ_PX, vistaW * 0.9), dy: Math.min(200, Math.max(DESL_ETQ_PY, vistaH * 0.42)), passo: PASSO_ETQ_PX, larg: vistaW, alt: vistaH }, FOLGA_ETQ_PX);
      for (var k = 0; k < etqs.length; k++) {
        var d = arr[k], q = etqs[k].sp.userData.px;
        q.dx = d.dx; q.dy = d.dy; q.preso = d.preso;
        etqs[k].sp.position.addScaledVector(_eixoX, d.dx * mpp).addScaledVector(_eixoY, -d.dy * mpp);
        q.caixa = { esq: q.caixa.esq + d.dx, dir: q.caixa.dir + d.dx, topo: q.caixa.topo + d.dy, fundo: q.caixa.fundo + d.dy };
      }
      arrumarPendente = false;
    } else if (etqs.length) arrumarPendente = true;
    ordenarPorProfundidade(etqs);
    desenharGuias(etqs, mpp);
  }
  function ordenarPorProfundidade(etqs) {
    var ord = etqs.slice();
    ord.sort(function (a, b) { return a.sp.position.dot(_eixoZ) - b.sp.position.dot(_eixoZ); });
    for (var i = 0; i < ord.length; i++) ord[i].sp.renderOrder = 10 + i;
  }
  // AS GUIAS: uma etiqueta afastada do dono leva um fio; um holograma em coluna leva um fio ate ao seu andar;
  // as placas levam o seu suporte. Tudo num so LineSegments, refeito a cada vista.
  function desenharGuias(etqs, mpp) {
    if (!grupoGuias) return;
    var pts = [], cores = [];
    function seg(a, b, cor, alfa) {
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      var c = new THREE.Color(cor); for (var i = 0; i < 2; i++) cores.push(c.r * alfa, c.g * alfa, c.b * alfa);
    }
    etqs.forEach(function (x) {
      var p = x.sp.userData.px, a = p.ancora;
      if (Math.abs(p.dx) + Math.abs(p.dy) < GUIA_MIN_PX) return;
      var w = new THREE.Vector3(a.x, a.y, a.z); if (a.lado) w.addScaledVector(_eixoX, a.lado * (a.recuo || 0));
      seg(w, x.sp.position, 0xa7bcd2, 0.62);
    });
    Object.keys(holos).forEach(function (k) {
      var h = holos[k]; if (!h.sprite.visible || !h.guia) return;
      seg(h.guia.de, h.guia.para, COR.ciano, 0.38);
    });
    placas.forEach(function (pl) {
      if (!pl.sp.visible || !pl.suporte) return;
      var s = pl.suporte, lado = s.lado, r = s.recuo;
      var a = new THREE.Vector3(0, s.y0, 0).addScaledVector(_eixoX, lado * r), b = new THREE.Vector3(0, s.y1, 0).addScaledVector(_eixoX, lado * r);
      seg(a, b, COR.ciano, 0.55);
      seg(a, new THREE.Vector3().copy(a).addScaledVector(_eixoX, -lado * 0.9), COR.ciano, 0.55);
      seg(b, new THREE.Vector3().copy(b).addScaledVector(_eixoX, -lado * 0.9), COR.ciano, 0.55);
    });
    if (guias) { grupoGuias.remove(guias); guias.geometry.dispose(); guias.material.dispose(); guias = null; }
    nGuias = etqs.filter(function (x) { var p = x.sp.userData.px; return Math.abs(p.dx) + Math.abs(p.dy) >= GUIA_MIN_PX; }).length;
    if (!pts.length) return;
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cores), 3));
    guias = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
    guias.renderOrder = 4;
    grupoGuias.add(guias);
  }

  // ================================================================ construir a torre (100 andares por ordem)
  function rodar(x, z, ang) { var c = Math.cos(ang), s = Math.sin(ang); return { x: x * c + z * s, z: -x * s + z * c }; }
  // as 12 arestas de uma caixa (w x h x d) assente em y0, rodada `ang` a volta do eixo: segmentos no MUNDO
  function arestasDaCaixa(w, h, d, y0, ang) {
    var c = [], xs = [-w / 2, w / 2], zs = [-d / 2, d / 2], ys = [y0, y0 + h];
    function P(x, y, z) { var r = rodar(x, z, ang); return [r.x, y, r.z]; }
    ys.forEach(function (y) { c.push([P(xs[0], y, zs[0]), P(xs[1], y, zs[0])], [P(xs[1], y, zs[0]), P(xs[1], y, zs[1])], [P(xs[1], y, zs[1]), P(xs[0], y, zs[1])], [P(xs[0], y, zs[1]), P(xs[0], y, zs[0])]); });
    xs.forEach(function (x) { zs.forEach(function (z) { c.push([P(x, ys[0], z), P(x, ys[1], z)]); }); });
    return c;
  }
  function tracejar(segs, tra, vao) {
    var out = [];
    segs.forEach(function (s) {
      var a = s[0], b = s[1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!(L > 0)) return;
      for (var t = 0; t < L; t += tra + vao) {
        var t1 = Math.min(L, t + tra), u0 = t / L, u1 = t1 / L;
        out.push([a[0] + dx * u0, a[1] + dy * u0, a[2] + dz * u0], [a[0] + dx * u1, a[1] + dy * u1, a[2] + dz * u1]);
      }
    });
    return out;
  }
  function linhasDe(pontos, cor, opacidade, cores) {
    var g = new THREE.BufferGeometry(), arr = new Float32Array(pontos.length * 3);
    for (var i = 0; i < pontos.length; i++) { arr[i * 3] = pontos[i][0]; arr[i * 3 + 1] = pontos[i][1]; arr[i * 3 + 2] = pontos[i][2]; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    var mat;
    if (cores) { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cores), 3)); mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); }
    else mat = new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: opacidade, depthWrite: false });
    return new THREE.LineSegments(g, mat);
  }
  function largarGrupo(g) {
    if (!g) return;
    var filhos = g.children.slice();
    filhos.forEach(function (o) {
      o.traverse(function (m) { if (m.geometry) m.geometry.dispose(); if (m.material) { if (m.material.map && typeof m.material.map.dispose === 'function') m.material.map.dispose(); if (lista(m.material).length) m.material.forEach(function (x) { x.dispose(); }); else m.material.dispose(); } });
      g.remove(o);
    });
  }

  function construirTorre() {
    if (!D || !renderer) return;
    largarGrupo(grupoTorre); largarGrupo(grupoFitas); largarGrupo(grupoReserva); largarGrupo(grupoObras);
    largarMoradores(); largarCartoes();
    nomesAndares.concat(pilulasAndar, marcos, placas).forEach(function (it) { largarSprite(it.sp); if (it.sp2) largarSprite(it.sp2); });
    nomesAndares = []; pilulasAndar = []; marcos = []; placas = [];
    andarPorOrdem = {}; andarPorN = {};
    // a torre de 47 (organograma) quando o predio.json a traz; senao os 14 andares do registo, como na v4
    projecto = PG.ordemDosAndares(lista(D.andares_torre && D.andares_torre.length ? D.andares_torre : D.andares),
                                  lista(D.andares_torre && D.andares_torre.length ? D.andares_planeados_torre : D.andares_planeados),
                                  obj(D.projecto).andares_alvo || 100);
    var alturaLaje = ALTURA - 0.18;
    var degraus = [], obrasTracos = [], obrasMont = [], reservaPts = [], reservaCor = [], nObras = 0;
    vidroMat = new THREE.MeshBasicMaterial({ color: COR.vidro, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.FrontSide });
    // 🔴 19/09, MEDIDO: a caixa de vidro tinha SEIS materiais (quatro lados + topo e fundo invisiveis) e uma
    // caixa com seis materiais custa SEIS CHAMADAS DE DESENHO. Com 49 andares eram ~294 chamadas so no vidro,
    // de 376 no total ao nivel 0 - o grosso do peso que ele sentia. Agora o vidro e uma geometria com AS QUATRO
    // PAREDES E MAIS NADA (8 vertices, 8 triangulos, um material): UMA chamada por andar.
    var semTopo = new THREE.MeshBasicMaterial({ visible: false });
    var vidroMats = [vidroMat, vidroMat, semTopo, semTopo, vidroMat, vidroMat];   // (mantido: ninguem o usa)
    var arestasMat = new THREE.LineBasicMaterial({ color: COR.ciano, transparent: true, opacity: 0.72, depthWrite: false });
    var lajeMat = new THREE.MeshLambertMaterial({ color: PISO.laje }), ruaMat = new THREE.MeshLambertMaterial({ color: PISO.laje_rua });
    var paredeMat = new THREE.MeshLambertMaterial({ color: PISO.parede }), rodapeMat = new THREE.MeshLambertMaterial({ color: PISO.parede_alt });
    var montanteMat = new THREE.MeshLambertMaterial({ color: PISO.montante });
    var geoLaje = new THREE.BoxGeometry(LARG, 0.30, PROF), geoVidro = new THREE.BoxGeometry(LARG, alturaLaje, PROF);
    var geoParedes = (function (lx, ly, lz) {                 // so as 4 paredes: sem topo nem fundo, um material
      var x = lx / 2, y = ly / 2, z = lz / 2, g = new THREE.BufferGeometry();
      var p = [], n2 = [], faces = [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
                                    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
                                    [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
                                    [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]]];
      faces.forEach(function (f) {
        var a1 = f[0], b1 = f[1], c1 = f[2], d1 = f[3], nn = f[4];
        [a1, b1, c1, a1, c1, d1].forEach(function (v) { p.push(v[0], v[1], v[2]); n2.push(nn[0], nn[1], nn[2]); });
      });
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(n2, 3));
      return g;
    })(LARG, alturaLaje, PROF);
    var geoArestas = new THREE.EdgesGeometry(geoVidro);
    var geoParede = new THREE.BoxGeometry(LARG, ALTURA - 0.45, 0.16), geoRodape = new THREE.BoxGeometry(LARG, 0.34, 0.06);
    var geoMont = new THREE.BoxGeometry(0.22, ALTURA - 0.5, 0.22);

    projecto.lista.forEach(function (it) {
      var y = it.ordem * ALTURA, ang = it.ordem * TORCAO * Math.PI / 180;
      it.y = y; it.ang = ang; it.emVista = true;
      andarPorOrdem[it.ordem] = it;
      if (it.n != null && it.tipo !== 'reservado' && it.tipo !== 'em_obras') andarPorN[it.n] = it;
      it.estado = it.tipo === 'em_obras' ? 'em_obras' : (it.tipo === 'reservado' ? 'reservado' : String(obj(it.dados).estado || 'ok'));
      if (it.tipo === 'reservado') {
        // silhueta: contorno a 0,08, a desvanecer com a altura (sai do ecra a esmorecer)
        var f = 0.10 * Math.max(0.15, 1 - (it.ordem - (projecto.nomeados)) / Math.max(1, projecto.total - projecto.nomeados));
        arestasDaCaixa(LARG, alturaLaje, PROF, y, ang).forEach(function (s, k) {
          var brilho = k < 4 && k === 0 ? f * 1.6 : f;   // a aresta da frente em baixo um pouco mais viva: o degrau
          reservaPts.push(s[0], s[1]);
          var c = new THREE.Color(COR.reservado);
          for (var q = 0; q < 2; q++) reservaCor.push(c.r * brilho, c.g * brilho, c.b * brilho);
        });
        return;
      }
      var grupo = new THREE.Group();
      grupo.rotation.y = ang; grupo.position.y = y; grupo.userData.ordem = it.ordem;
      grupoTorre.add(grupo);
      it.grupo = grupo;
      if (it.tipo === 'em_obras') {
        nObras++;
        obrasTracos = obrasTracos.concat(tracejar(arestasDaCaixa(LARG, alturaLaje, PROF, y, ang), 0.9, 1.1));
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
          var r = rodar(c[0] * (LARG / 2 - 0.4), c[1] * (PROF / 2 - 0.4), ang);
          obrasMont.push([r.x, y, r.z], [r.x, y + alturaLaje, r.z]);
        });
        var plano = new THREE.Mesh(new THREE.PlaneGeometry(LARG, PROF), new THREE.MeshBasicMaterial({ color: COR.ambar, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
        plano.rotation.x = -Math.PI / 2; plano.position.y = 0.05; plano.userData.ordem = it.ordem;
        grupo.add(plano);
        degraus.push({ it: it, cor: COR.ambar });
        return;
      }
      var ehRua = it.tipo === 'rua';
      var laje = new THREE.Mesh(geoLaje, ehRua ? ruaMat : lajeMat);
      laje.position.set(0, 0.15, 0); laje.userData.ordem = it.ordem; laje.userData.andarN = it.n;
      grupo.add(laje);
      if (!ehRua) {
        var parede = new THREE.Mesh(geoParede, paredeMat); parede.position.set(0, (ALTURA - 0.45) / 2 + 0.15, -PROF / 2 + 0.1); grupo.add(parede);
        var rodape = new THREE.Mesh(geoRodape, rodapeMat); rodape.position.set(0, 0.34, -PROF / 2 + 0.2); grupo.add(rodape);
        [-1, 1].forEach(function (s) { var mt = new THREE.Mesh(geoMont, montanteMat); mt.position.set(s * (LARG / 2 - 0.3), (ALTURA - 0.5) / 2 + 0.15, -PROF / 2 + 0.35); grupo.add(mt); });
        var vidro = new THREE.Mesh(geoParedes, vidroMat); vidro.position.set(0, alturaLaje / 2, 0); vidro.userData.ordem = it.ordem; vidro.renderOrder = 2; grupo.add(vidro);
        // v6: um material de arestas POR ANDAR - e assim que a onda de dados e a corrida de um funcionario acendem um so andar
        var am = arestasMat.clone(); it.arestasMat = am;
        var ar = new THREE.LineSegments(geoArestas, am); ar.position.set(0, alturaLaje / 2, 0); grupo.add(ar);
      }
      degraus.push({ it: it, cor: COR_ESTADO[it.estado] != null ? COR_ESTADO[it.estado] : COR.cinza });
    });
    // OS DEGRAUS: a aresta da frente de cada laje, com a cor do estado (instanciados: 35 num so desenho)
    degrauInfo = [];
    instDegraus = new THREE.InstancedMesh(new THREE.BoxGeometry(LARG, 0.30, 0.30), new THREE.MeshBasicMaterial({}), Math.max(1, degraus.length));
    var m = new THREE.Matrix4(), c = new THREE.Color();
    degraus.forEach(function (d, i) {
      m.makeRotationY(d.it.ang);
      var r = rodar(0, PROF / 2, d.it.ang);
      m.setPosition(r.x, d.it.y + 0.2, r.z);
      instDegraus.setMatrixAt(i, m); c.setHex(d.cor); instDegraus.setColorAt(i, c);
      degrauInfo.push({ cor: d.cor, u: degraus.length > 1 ? i / (degraus.length - 1) : 0, lado: d.lado == null ? (i % 2) : d.lado });
      d.it.degrauIdx = i; d.it.corDegrau = d.cor;   // v6: a onda de dados acende o degrau de cada andar (obras incluidas)
    });
    instDegraus.count = degraus.length; instDegraus.instanceMatrix.needsUpdate = true;
    if (instDegraus.instanceColor) instDegraus.instanceColor.needsUpdate = true;
    grupoTorre.add(instDegraus);
    if (obrasTracos.length) { var lo = linhasDe(obrasTracos, COR.ambar, 0.42); grupoObras.add(lo); }
    if (obrasMont.length) { var lm = linhasDe(obrasMont, COR.ambar, 0.16); grupoObras.add(lm); }
    if (reservaPts.length) grupoReserva.add(linhasDe(reservaPts, 0, 0, reservaCor));
    alvoOrdem = ordemDaMesa();      // 18/09: a Mesa e o andar 21 na torre de 47, nao a ordem 11 de sempre
    construirFitas();
    construirRotulosDaTorre();
    construirCoroa();
    orbita.alvoY = (projecto.nomeados * ALTURA + ALTURA_COROA) / 2;   // v6: o centro do que se ve, coroa incluida
    construirV2();
    recalcularNumeros();
    assinaturaNumeros = comNumero.map(function (d) { return d.f.id; }).join(',');
    precisaEnquadrar = true;
    nivelActual = -1;
    enquadrarN0();
    aplicarVista();
    pintarDirectorio();
  }

  // AS DUAS FITAS: helices ao longo dos cantos da torre torcida. Dados sobem (ciano), decisoes descem (ambar).
  // Aditivas, 0,55 no troco nomeado e 0,12 no reservado - de longe, duas fitas + degraus coloridos = o DNA.
  function construirFitas() {
    // THREE.Curve no r128 e uma CLASSE: chamada sem `new` rebenta ("Class constructor cannot be invoked") e
    // levava consigo tudo o que se construia a seguir (fitas, nomes, marcos, v2) - apanhado na 1.a corrida de fumo.
    class Helice extends THREE.Curve {
      constructor(o0, o1, fase) { super(); this.o0 = o0; this.o1 = o1; this.fase = fase; }
      getPoint(t, alvo) {
        var p = PG.helice(this.o0 + (this.o1 - this.o0) * t, TORCAO, R_FITA, ALTURA, this.fase);
        return (alvo || new THREE.Vector3()).set(p.x, p.y + 0.4, p.z);
      }
    }
    var nom = projecto.nomeados - 0.5, fim = projecto.total - 0.5;
    [[FASE_A, COR.ciano, 'dados'], [FASE_B, COR.ambar, 'decisoes']].forEach(function (f) {
      var t1 = new THREE.Mesh(new THREE.TubeGeometry(new Helice(-0.3, nom, f[0]), Math.max(40, Math.round(nom * 5)), 0.50, 7, false),
        new THREE.MeshBasicMaterial({ color: f[1], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      t1.userData.fita = f[2]; t1.renderOrder = 3; grupoFitas.add(t1);
      var t2 = new THREE.Mesh(new THREE.TubeGeometry(new Helice(nom, fim, f[0]), Math.max(40, Math.round((fim - nom) * 3)), 0.42, 5, false),
        new THREE.MeshBasicMaterial({ color: f[1], transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      t2.userData.fita = f[2] + '_reservado'; t2.renderOrder = 3; grupoFitas.add(t2);
    });
  }

  // nomes (N1+), pilulas por laje (N1+), os 5 marcos (N0) e as placas (N0/N1)
  function construirRotulosDaTorre() {
    var recuo = R_FITA + 1.0;
    // 14,2 px por andar e o minimo do N1 (PX_MIN_N1 em predio_geo.js): 47 nomeados x 14,2 = 667 px num palco de
    // ~537 px nao cabem. Nesse caso os em obras (vazios) nao levam nome nem pilula a N1 - uma placa diz quantos
    // sao e de que andar a que andar - e voltam a ter nome quando se aproxima (N2 desenha por janela).
    var cabemTodos = (Math.max(1, vistaH || 900) * 0.96 / (projecto.nomeados + COROA_ANDARES + EXTRA_ANDARES)) >= 16;   // 16 px: um nome de 11 px com folga
    obrasEscondidas = 0;
    projecto.lista.forEach(function (it) {
      if (it.tipo === 'reservado') return;
      if (it.tipo === 'em_obras' && !cabemTodos) { obrasEscondidas++; return; }
      var d = obj(it.dados);
      var cor = it.tipo === 'em_obras' ? COR.ambar : (it.estado === 'erro' ? COR.vermelho : (it.estado === 'atrasado' ? COR.ambar : (it.tipo === 'rua' ? COR.cinza : 0xeef2f7)));
      var item = { ordem: it.ordem, nome: it.nome, cor: cor, sp: null, sp2: null, tipo: it.tipo,
                   ancora: { modo: 'direita', x: 0, y: it.y + 0.95, z: 0, lado: -1, recuo: recuo } };
      var faz = function (orc) {
        if (item.sp) largarSprite(item.sp);
        item.sp = rotuloTexto(nomeQueCabe(item.nome, orc), item.ancora, { cor: item.cor, tipo: 'nome', tecto: ALVO_PX_ANDAR, ordem: 200 });
        item.sp.userData.px.inteiro = String(item.nome).toUpperCase(); item.sp.userData.px.orcamento = orc; item.sp.userData.px.encurta = faz;
        item.sp.userData.px.ordemAndar = item.ordem; item.sp.visible = nivelActual >= 1 && it.emVista;
        grupoRotulos.add(item.sp);
        return item.sp;
      };
      faz(40);
      if (it.tipo === 'em_obras') {
        item.sp2 = rotuloTexto('em obras · fase ' + String(d.fase == null ? '?' : d.fase) + ' · alvará ' + String(d.alvara || 'pendente'),
          { modo: 'direita', x: 0, y: it.y + 0.15, z: 0, lado: -1, recuo: recuo }, { cor: COR.ambar, tipo: 'nome2', alvo: 10, tecto: 10, min: 9, peso: 500, porAndar: false, ordem: 199 });
        item.sp2.visible = false; grupoRotulos.add(item.sp2);
      }
      nomesAndares.push(item);
      // a pilula da laje: n gerentes · n propriedades · capital (habitados) | fase · alvara (obras)
      var texto = it.tipo === 'em_obras' ? ('obras · fase ' + String(d.fase == null ? '?' : d.fase) + ' · ' + String(d.de_onde || '').split(' ')[0])
        : d.n_funcionarios != null && it.tipo !== 'rua' ? (etiquetaDoQuadro(d) + ' · ' + String(d.n_sectores || 0) + ' sect' + (d.abaixo_do_minimo ? ' · contratar ' + d.abaixo_do_minimo : ''))
        : it.tipo === 'rua' ? 'a rua · o mercado'
        : (String(d.n_gerentes || 0) + ' ger · ' + String(d.n_propriedades || 0) + ' prop' + (Number(d.capital_usd) > 0 ? ' · ' + num(d.capital_usd, 0) + ' US$' : ''));
      var pil = { ordem: it.ordem, sp: rotuloTexto(texto, { modo: 'esquerda', x: 0, y: it.y + 0.95, z: 0, lado: 1, recuo: recuo },
        { cor: it.tipo === 'em_obras' ? COR.ambar : 0xcfe3f2, pilula: true, borda: it.tipo === 'em_obras' ? 'rgba(232,176,75,.6)' : 'rgba(90,200,250,.5)',
          alvo: ALVO_PX_PILULA_ANDAR, tecto: ALVO_PX_PILULA_ANDAR, min: 9, peso: 600, tipo: 'pilula_andar', maiusculas: false, ordem: 150 }) };
      pil.sp.visible = false; grupoRotulos.add(pil.sp); pilulasAndar.push(pil);
    });
    if (obrasEscondidas) {
      var os_ = projecto.lista.filter(function (x) { return x.tipo === 'em_obras'; });
      var o0 = os_[0].ordem, o1 = os_[os_.length - 1].ordem;
      placas.push({ sp: rotuloTexto(obrasEscondidas + ' EM OBRAS · ANDARES ' + (o0 + 1) + '–' + (o1 + 1), { modo: 'direita', x: 0, y: ((o0 + o1) / 2) * ALTURA + 0.6, z: 0, lado: -1, recuo: R_FITA + 3.2 },
        { cor: COR.ambar, tipo: 'placa', alvo: 11, tecto: 11, min: 10, porAndar: false, ordem: 205 }), suporte: { y0: o0 * ALTURA - 0.2, y1: o1 * ALTURA + ALTURA - 0.2, lado: -1, recuo: R_FITA + 2.6 } });
    }
    // os 5 marcos do N0: rotulos grandes, moveis, com guia (um andar por marco, encontrado por andarDoMarco)
    var usadosMarco = {};
    MARCOS.forEach(function (nomeM) {
      var it = andarDoMarco(nomeM);
      if (!it || usadosMarco[it.ordem]) return;
      usadosMarco[it.ordem] = 1;
      var sp = rotuloTexto(NOME_MARCO[nomeM] || nomeM, { modo: 'direita', x: 0, y: it.y + 0.6, z: 0, lado: -1, recuo: R_FITA + 1.6 },
        { cor: 0xdfeefb, tipo: 'marco', alvo: ALVO_PX_MARCO, tecto: ALVO_PX_MARCO, min: MIN_PX_LEGIVEL, porAndar: false, movel: true, peso_arrumacao: it.ordem, ordem: 210 });
      grupoRotulos.add(sp); marcos.push({ ordem: it.ordem, nome: nomeM, sp: sp });
    });
    // as placas
    var topo = (projecto.nomeados - 1) * ALTURA, podio = projecto.lista.filter(function (x) { return x.tipo !== 'em_obras' && x.tipo !== 'reservado'; });
    var topoPodio = Math.max.apply(null, podio.filter(function (x) { return x.ordem < projecto.nomeados - 1; }).map(function (x) { return x.ordem; }).concat([0]));
    // v6: a placa diz so "A BASE" (o nome do instrumento saiu do ecra: ficam os numeros), a placa "SR. STARK · COBERTURA"
    // deu lugar ao LETREIRO da coroa, e a dos reservados sobe para cima da coroa.
    placas.push({ sp: rotuloTexto('A BASE', { modo: 'direita', x: 0, y: (topoPodio / 2) * ALTURA + 0.6, z: 0, lado: -1, recuo: R_FITA + 3.2 },
      { cor: COR.ciano, tipo: 'placa', alvo: 11, tecto: 11, min: 10, porAndar: false, ordem: 205 }), suporte: { y0: -0.4, y1: topoPodio * ALTURA + ALTURA - 0.2, lado: -1, recuo: R_FITA + 2.6 } });
    // a placa dos reservados fica A ESQUERDA da coroa, a meia altura dela: por cima pisava o tecto do penthouse (a face de
    // cima do penthouse projecta-se 7 unidades acima da sua aresta da frente; medido no recorte 3x da sonda)
    placas.push({ sp: rotuloTexto('+' + projecto.reservados + ' RESERVADOS ↑', { modo: 'direita', x: 0, y: topo + ALTURA + ALTURA_COROA * 0.55, z: 0, lado: -1, recuo: R_FITA + 3.2 },
      { cor: 0x7d8896, tipo: 'placa', alvo: 10, tecto: 10, min: 9, porAndar: false, peso: 500, ordem: 205 }) });
    placas.forEach(function (p) { grupoRotulos.add(p.sp); });
  }

  // ---------------------------------------------------------------- moradores (por nivel, com culling)
  function largarMoradores() {
    largarPeoes();
    moradores.forEach(function (mo) { if (mo.etq) largarSprite(mo.etq); });
    moradores = [];
    TODAS_AS_PECAS().forEach(function (o) { if (o) { cena.remove(o); o.geometry.dispose(); o.material.dispose(); } });
    instMoradores = instSecretarias = instPontos = instCabecas = instCadeiras = instEncostos = instAndantes = instAndantesCab = null;
    instCabelos = instGravatas = instDivisorias = instMonitores = instPesMonitor = instTeclados = instPernaE = instPernaD = instAndantesCabelo = instVasos = instFolhas = null;
    andantes = [];
  }
  function largarCartoes() { cartoes3D.forEach(function (c) { largarSprite(c.sp); }); cartoes3D = []; }
  // as posicoes de um andar (v3): duas filas na metade da FRENTE (a banda que a laje de cima nao tapa)
  // v6: A FILA DE TRAS JA NAO SAI DA LAJE. Com 4 ou 6 moradores a fila 1 tinha tantos lugares como a fila 0 e o desvio
  // de meio passo punha o ultimo a x = util/2 + passo/2 (medido pela sonda dos andares: 4 moradores = 1 a x = 21,0 com a
  // laje a acabar em 12). Agora a fila 1 com MENOS lugares fica nos meios dos intervalos da fila 0 (cabe sempre) e com
  // os MESMOS lugares alinha-se com ela; o desvio vertical da pilula (col par/impar) continua a separar as etiquetas.
  // E com POUCOS moradores as secretarias juntam-se ao centro (passo maximo 5,0): a N3 (78 px por unidade) so o meio da
  // laje cabe no ecra, e 4 secretarias espalhadas pelos 21 de largura ficavam TODAS fora do palco, sem um cartao a vista.
  function posicoesDoAndar(meus) {
    var util = LARG - 3.0, n = meus.length, n0 = Math.ceil(n / 2) || 1, n1 = n - n0, out = [];
    var passo0 = n0 > 1 ? Math.min(5.0, util / (n0 - 1)) : 0, larg0 = passo0 * (n0 - 1);
    meus.forEach(function (d, i) {
      var fila = i < n0 ? 0 : 1, col = fila === 0 ? i : i - n0, x;
      if (n0 <= 1) x = 0;
      else if (fila === 1 && n1 < n0) x = -larg0 / 2 + (col + 0.5) * passo0;
      else x = -larg0 / 2 + col * passo0;
      if (Math.abs(x) < 1.5) x += (x < 0 ? -1.5 : (x > 0 ? 1.5 : (fila === 1 ? -1.5 : 1.5)));
      out.push({ x: x, z: fila === 0 ? 0.8 : 3.2, col: col, fila: fila });
    });
    return out;
  }
  function janelaDeOrdens() {
    var out = {};
    for (var o = alvoOrdem - JANELA_ANDARES; o <= alvoOrdem + JANELA_ANDARES; o++) if (andarPorOrdem[o] && andarPorOrdem[o].n != null) out[o] = true;
    return out;
  }
  // modo 'pontos' (N1): todos os com numero como pontos instanciados, sem etiqueta.
  // modo 'completo' (N2/N3): so a janela; secretarias, moradores e a pilula com o numero em cada um; a N3 o
  // andar em foco leva cartoes em vez de pilulas.
  // v5 (ordem dele: "outros num escritorio separado por conta de hierarquias"): o GERENTE do andar em foco tem um
  // gabinete de vidro ao fundo, com o nome do personagem e o cargo. So no andar em foco, a N2/N3; e um FACTO do
  // organograma (torre_30.andares[].gerente_nome), nao um enfeite.
  function construirGabinete() {
    // v6: as caixas antigas saem do grupo do andar (a v5 deixava-as la a acumular a cada janela nova)
    gabinetes.forEach(function (gb) { largarSprite(gb.sp); lista(gb.malhas).forEach(function (m) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); }); });
    gabinetes = [];
    if (grupoGabinetes) while (grupoGabinetes.children.length) grupoGabinetes.remove(grupoGabinetes.children[0]);
    var it = andarPorOrdem[alvoOrdem]; if (!it || !it.grupo || nivelActual < 2) return;
    var d = obj(it.dados); if (!d.gerente_nome) return;
    // v6: a 2,6/1,7 com 2,8 de fundo a parede de fora saia do limite util da laje em x E em z (medido pela sonda dos andares)
    var lx = -LARG / 2 + 3.2, lz = -PROF / 2 + 1.8, prof = 2.4;
    var caixa = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.3, prof), new THREE.MeshBasicMaterial({ color: COR.ciano, transparent: true, opacity: 0.16, depthWrite: false }));
    caixa.position.set(lx, 1.15 + 0.3, lz); caixa.userData.ordem = it.ordem; it.grupo.add(caixa);
    var ar = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.6, 2.3, prof)), new THREE.LineBasicMaterial({ color: COR.ciano, transparent: true, opacity: 0.7 }));
    ar.position.copy(caixa.position); it.grupo.add(ar);
    var r = rodar(lx, lz, it.ang);
    var sp = rotuloTexto('GABINETE · ' + String(d.gerente_nome).toUpperCase() + (d.cargo_banco ? ' · ' + d.cargo_banco : ' · GERENTE DO ANDAR'),
      { modo: 'centro', x: r.x, y: it.y + 2.9, z: r.z, lado: 0, recuo: 0 },
      { cor: COR.ciano, tipo: 'placa', alvo: 11, tecto: 11, min: 10, porAndar: false, ordem: 207 });
    grupoRotulos.add(sp); gabinetes.push({ sp: sp, ordem: it.ordem, malhas: [caixa, ar] });
  }
  // v5f: O ESCRITORIO (referencia: a print da invista.ja, ordem dele 21:25 - "cada um dos nossos vai ser assim").
  // Cada morador do REGISTO e uma FIGURA sentada: tronco (camisa = cor do ESTADO, que e informacao e nao decoracao),
  // cabeca com pele e cabelo pela semente do id, gravata, cadeira com encosto, secretaria com monitor a mostrar um
  // grafico, teclado e divisoria. A N1 ('pontos') as figuras FICAM - "quando for ficando distante vai deixando no mesmo
  // nivel de 3D" - so as etiquetas mudam por nivel. Tudo InstancedMesh: uma malha por peca, uma matriz por figura.
  function malhaInst(geo, mat, n) { return new THREE.InstancedMesh(geo, mat, Math.max(1, n)); }
  function texturaDoMonitor() {
    if (texMonitor) return texMonitor;
    var cv = document.createElement('canvas'); cv.width = 96; cv.height = 60; var g = cv.getContext('2d');
    g.fillStyle = '#0b1016'; g.fillRect(0, 0, 96, 60);
    g.strokeStyle = 'rgba(90,200,250,.12)'; g.lineWidth = 1;
    for (var y = 10; y < 60; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(96, y); g.stroke(); }
    var h = semente('monitor'), v = 34;
    for (var i = 0; i < 12; i++) { h = (h * 1103515245 + 12345) >>> 0; var up = (h >> 16) & 1, hh = 4 + ((h >> 8) % 10); g.fillStyle = up ? 'rgba(62,207,142,.85)' : 'rgba(255,90,95,.85)'; g.fillRect(4 + i * 7.5, 50 - hh, 4, hh); }
    g.strokeStyle = '#3ecf8e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, v);
    for (var x = 4; x <= 96; x += 4) { h = (h * 1103515245 + 12345) >>> 0; v += ((h >> 16) % 9) - 4; v = Math.max(8, Math.min(52, v)); g.lineTo(x, v); }
    g.stroke();
    texMonitor = new THREE.CanvasTexture(cv); texMonitor.minFilter = THREE.LinearFilter;
    return texMonitor;
  }
  function construirMoradores(modo) {
    largarMoradores(); largarCartoes();
    construirGabinete();
    if (!D || !comNumero.length) return;
    var janela = modo === 'completo' ? janelaDeOrdens() : null;
    var porAndar = {};
    comNumero.forEach(function (d) { var it = andarPorN[andarTorreDe(d.f)]; if (!it) return; if (janela && !janela[it.ordem]) return; (porAndar[it.ordem] = porAndar[it.ordem] || []).push(d); });
    var total = 0; Object.keys(porAndar).forEach(function (k) { total += porAndar[k].length; });
    if (!total) return;
    var m = new THREE.Matrix4(), c = new THREE.Color(), k = 0;
    instMoradores = malhaInst(new THREE.BoxGeometry(0.58, 0.60, 0.34), new THREE.MeshLambertMaterial({}), total);        // o tronco: a camisa e a cor do estado
    instCabecas = malhaInst(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshLambertMaterial({}), total);
    instCabelos = malhaInst(new THREE.SphereGeometry(0.265, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.46), new THREE.MeshLambertMaterial({}), total);
    instGravatas = malhaInst(new THREE.BoxGeometry(0.09, 0.34, 0.03), new THREE.MeshLambertMaterial({}), total);
    instCadeiras = malhaInst(new THREE.BoxGeometry(0.66, 0.09, 0.62), new THREE.MeshLambertMaterial({ color: 0x1c222b }), total);
    instEncostos = malhaInst(new THREE.BoxGeometry(0.62, 0.72, 0.08), new THREE.MeshLambertMaterial({ color: 0x1c222b }), total);
    instSecretarias = malhaInst(new THREE.BoxGeometry(1.30, 0.08, 0.80), new THREE.MeshLambertMaterial({ color: PISO.secretaria }), total);
    instDivisorias = malhaInst(new THREE.BoxGeometry(1.30, 0.42, 0.04), new THREE.MeshLambertMaterial({ color: 0x9aa3ad }), total);
    instMonitores = malhaInst(new THREE.BoxGeometry(0.86, 0.52, 0.05), new THREE.MeshBasicMaterial({ map: texturaDoMonitor() }), total);
    instPesMonitor = malhaInst(new THREE.BoxGeometry(0.12, 0.16, 0.10), new THREE.MeshLambertMaterial({ color: 0x2a2f38 }), total);
    instTeclados = malhaInst(new THREE.BoxGeometry(0.42, 0.03, 0.16), new THREE.MeshLambertMaterial({ color: 0x2a2f38 }), total);
    Object.keys(porAndar).forEach(function (chave) {
      var it = andarPorOrdem[Number(chave)], meus = porAndar[chave].slice();
      meus.sort(function (x, y) { return (obj(y.f.importancia).score || 0) - (obj(x.f.importancia).score || 0); });
      var pos = posicoesDoAndar(meus);
      function poe(inst, lx, lz, y, cor) {
        var q = rodar(lx, lz, it.ang); m.makeRotationY(it.ang); m.setPosition(q.x, y, q.z); inst.setMatrixAt(k, m);
        if (cor != null) { c.setHex(cor); inst.setColorAt(k, c); }
      }
      meus.forEach(function (d, i) {
        var f = d.f, p = pos[i], r = rodar(p.x, p.z, it.ang), wy = it.y + 0.62;   // sentado: o tronco a altura da cadeira
        var h = semente(f.id);
        var mo = { i: k, id: f.id, ordem: it.ordem, andar: andarTorreDe(f), x: r.x, y: wy, z: r.z, ang: it.ang, lx: p.x, lz: p.z,
                   ultima: f.ultima_corrida_brt, pulso: 0, etq: null, texto: d.nu.texto, cls: d.nu.classe, fonte: d.nu.fonte, valor: d.nu.valor, nu: d.nu, estado: f.estado };
        poe(instMoradores, p.x, p.z, wy, COR_MORADOR[f.estado] != null ? COR_MORADOR[f.estado] : COR_MORADOR.sem_tarefa);
        poe(instCabecas, p.x, p.z, wy + 0.58, PELES[h % PELES.length]);
        poe(instCabelos, p.x, p.z, wy + 0.62, CABELOS[(h >> 3) % CABELOS.length]);
        poe(instGravatas, p.x, p.z + 0.185, wy + 0.06, GRAVATAS[(h >> 6) % GRAVATAS.length]);
        poe(instCadeiras, p.x, p.z, it.y + 0.30);
        poe(instEncostos, p.x, p.z - 0.33, it.y + 0.66);
        poe(instSecretarias, p.x, p.z + 0.72, it.y + 0.62);
        poe(instDivisorias, p.x, p.z + 1.10, it.y + 0.85);
        poe(instPesMonitor, p.x, p.z + 0.88, it.y + 0.74);
        poe(instMonitores, p.x, p.z + 0.88, it.y + 1.08);
        poe(instTeclados, p.x, p.z + 0.46, it.y + 0.68);
        if (modo !== 'pontos') {
          if (nivelActual === 3 && it.ordem === alvoOrdem) {
            var ca = cartaoMorador(f, d.nu, { modo: 'centro', x: r.x, y: it.y + 2.3, z: r.z, lado: 0, recuo: 0, acima: 0 });
            ca.userData.px.ordemAndar = it.ordem; grupoRotulos.add(ca); cartoes3D.push({ sp: ca, id: f.id, ordem: it.ordem }); mo.cartao = ca;
          } else {
            mo.etq = etiquetaNumero(d.nu, { modo: 'centro', x: r.x, y: it.y + 1.78 + (p.col % 2 ? 0.52 : 0), z: r.z, lado: 0, recuo: 0 });   // acima da cabeca
            mo.etq.userData.px.ordemAndar = it.ordem; mo.etq.visible = !!it.emVista;
            grupoRotulos.add(mo.etq);
          }
        }
        moradores.push(mo); k++;
      });
    });
    [instMoradores, instSecretarias, instCabecas, instCabelos, instGravatas, instCadeiras, instEncostos, instDivisorias, instMonitores, instPesMonitor, instTeclados].forEach(function (o) {
      if (!o) return; o.count = k; o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; cena.add(o);
    });
    construirAndantes(porAndar, c);
    construirVasos(porAndar, c);
    construirPeoes(modo);
  }
  // os vasos de planta nos quatro cantos de cada andar da janela (a print tem-nos; sao o que diz "escritorio" e nao "laje")
  function construirVasos(porAndar, c) {
    var ordens = Object.keys(porAndar); if (!ordens.length) return;
    instVasos = malhaInst(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 10), new THREE.MeshLambertMaterial({ color: 0x7a5230 }), ordens.length * 4);
    instFolhas = malhaInst(new THREE.SphereGeometry(0.36, 8, 6), new THREE.MeshLambertMaterial({}), ordens.length * 4);
    var m = new THREE.Matrix4(), kv = 0, cantos = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    ordens.forEach(function (ch) {
      var it = andarPorOrdem[Number(ch)];
      cantos.forEach(function (cn, q) {
        var r = rodar(cn[0] * (LARG / 2 - 1.3), cn[1] * (PROF / 2 - 1.0), it.ang);
        // v6: o vaso assenta no TOPO da laje (0,30): a 0,28 o fundo ficava 0,20 dentro do chao (medido pela sonda dos andares)
        m.makeRotationY(it.ang); m.setPosition(r.x, it.y + 0.48, r.z); instVasos.setMatrixAt(kv, m);
        m.makeRotationY(it.ang); m.setPosition(r.x, it.y + 0.92, r.z); instFolhas.setMatrixAt(kv, m);
        c.setHex([0x2f7d4a, 0x3a9a5b, 0x27663e, 0x4caf6e][(semente('vaso ' + it.ordem + ':' + q) >> 2) % 4]); instFolhas.setColorAt(kv, c);
        kv++;
      });
    });
    instVasos.count = kv; instFolhas.count = kv; instVasos.instanceMatrix.needsUpdate = true; instFolhas.instanceMatrix.needsUpdate = true;
    if (instFolhas.instanceColor) instFolhas.instanceColor.needsUpdate = true;
    cena.add(instVasos); cena.add(instFolhas);
  }
  // 🔴 19/09, MEDIDO com a sonda: a torre desenhava 56 figuras em 14 andares e o organograma tem 2.957 peoes
  // em 28 andares (o Lab. Reversao a Media sozinho tem 246). Faltava desenhar os PEOES - os genes, regras e
  // scripts que enchem cada andar e que nao tem tarefa propria no agendador. Sao malha instanciada, um corpo
  // por peao, e a densidade desce com a distancia: de longe bastam alguns para o andar parecer habitado.
  var instPeoes = null, instPeoesCab = null;
  function largarPeoes() {
    [instPeoes, instPeoesCab].forEach(function (o) { if (o) { cena.remove(o); o.geometry.dispose(); o.material.dispose(); } });
    instPeoes = instPeoesCab = null;
  }
  function construirPeoes(modo) {
    largarPeoes();
    if (!projecto) return;
    var perto = modo === 'completo';
    var janela = perto ? janelaDeOrdens() : null;
    var lote = [];
    projecto.lista.forEach(function (it) {
      if (it.tipo === 'reservado' || it.tipo === 'em_obras') return;
      var d = obj(it.dados), n = Number(d.n_funcionarios) || 0;
      if (n <= 0) return;
      var noFoco = janela && janela[it.ordem];
      // 19/09: os tectos sairam de uma MEDICAO - com 300 por andar na janela e 10% ao longe, o arreio acusou
      // que as animacoes passaram a custar 49,6% dos fotogramas (o limite e 25%). Menos gente, mesma leitura:
      // ao perto ve-se o andar cheio na mesma, ao longe basta uma amostra para o andar parecer habitado.
      var quantos = perto ? (noFoco ? Math.min(n, 120) : 0) : Math.min(n, Math.max(4, Math.round(n * 0.07)));
      if (quantos <= 0) return;
      lote.push({ it: it, n: n, q: quantos });
    });
    var total = lote.reduce(function (s, x) { return s + x.q; }, 0);
    if (!total) return;
    var alt = perto ? 0.9 : 1.0, raio = perto ? 0.17 : 0.22;
    instPeoes = new THREE.InstancedMesh(new THREE.CylinderGeometry(raio, raio * 1.25, alt, 5), new THREE.MeshLambertMaterial({}), total);
    if (perto) instPeoesCab = new THREE.InstancedMesh(new THREE.SphereGeometry(raio * 1.25, 6, 5), new THREE.MeshLambertMaterial({}), total);
    var m = new THREE.Matrix4(), c = new THREE.Color(), k = 0;
    var utilX = LARG - 2.4, utilZ = PROF - 2.2;
    lote.forEach(function (x) {
      var it = x.it, cols = Math.max(4, Math.ceil(Math.sqrt(x.q * (utilX / utilZ))));
      var linhas = Math.max(1, Math.ceil(x.q / cols));
      var px = cols > 1 ? utilX / (cols - 1) : 0, pz = linhas > 1 ? utilZ / (linhas - 1) : 0;
      var corBase = COR_MORADOR[it.estado] != null ? COR_MORADOR[it.estado] : COR_MORADOR.ok;
      for (var i = 0; i < x.q; i++) {
        var col = i % cols, lin = Math.floor(i / cols);
        var lx = cols > 1 ? (-utilX / 2 + col * px) : 0, lz = linhas > 1 ? (-utilZ / 2 + lin * pz) : 0;
        var r = rodar(lx, lz, it.ang);
        m.makeRotationY(it.ang); m.setPosition(r.x, it.y + 0.30 + alt / 2, r.z); instPeoes.setMatrixAt(k, m);
        c.setHex(corBase).lerp(_brancoPeao, ((semente(it.ordem + ':' + i) % 100) / 100) * 0.35);
        instPeoes.setColorAt(k, c);
        if (instPeoesCab) {
          m.makeRotationY(it.ang); m.setPosition(r.x, it.y + 0.30 + alt + raio, r.z); instPeoesCab.setMatrixAt(k, m);
          c.setHex(PELES[semente('p' + it.ordem + ':' + i) % PELES.length]); instPeoesCab.setColorAt(k, c);
        }
        k++;
      }
    });
    [instPeoes, instPeoesCab].forEach(function (o) {
      if (!o) return; o.count = k; o.instanceMatrix.needsUpdate = true;
      if (o.instanceColor) o.instanceColor.needsUpdate = true; cena.add(o);
    });
  }
  var _brancoPeao = new THREE.Color(0xdfe7f0);

  // v5e/v5f: os ESTAFETAS - figurantes que andam nos dois corredores de cada andar da janela (15% dos moradores, 2 a 6
  // por andar), com pernas que balancam, param a falar com alguem e voltam. Sem numero nem etiqueta: nao sao do REGISTO,
  // sao a vida do escritorio. Deterministicos pela semente (andar, indice).
  function construirAndantes(porAndar, c) {
    var util = LARG - 3.0, ka = 0, nAnd = 0;
    function quantos(n) { return Math.max(2, Math.min(6, Math.round(n * 0.15))); }
    Object.keys(porAndar).forEach(function (ch) { nAnd += quantos(porAndar[ch].length); });
    if (!nAnd) return;
    instAndantes = malhaInst(new THREE.BoxGeometry(0.56, 0.60, 0.34), new THREE.MeshLambertMaterial({}), nAnd);
    instAndantesCab = malhaInst(new THREE.SphereGeometry(0.23, 10, 8), new THREE.MeshLambertMaterial({}), nAnd);
    instAndantesCabelo = malhaInst(new THREE.SphereGeometry(0.255, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.46), new THREE.MeshLambertMaterial({}), nAnd);
    instPernaE = malhaInst(new THREE.BoxGeometry(0.20, 0.55, 0.22), new THREE.MeshLambertMaterial({}), nAnd);
    instPernaD = malhaInst(new THREE.BoxGeometry(0.20, 0.55, 0.22), new THREE.MeshLambertMaterial({}), nAnd);
    Object.keys(porAndar).forEach(function (ch) {
      var it = andarPorOrdem[Number(ch)], nA = quantos(porAndar[ch].length);
      for (var q = 0; q < nA; q++) {
        var h = semente('estafeta ' + it.ordem + ':' + q);
        // v6: a anca fica a y-0,30 e a perna mede 0,55: com y+0,86 os pes ficavam a 0,01, enterrados 0,29 na laje (topo a 0,30)
        andantes.push({ i: ka, ordem: it.ordem, ang: it.ang, y: it.y + 1.15, lx: -util / 2 + (h % 1000) / 1000 * util, lz: (q % 2) ? 2.4 : -2.2,
                        dir: (h & 1) ? 1 : -1, vel: 0.9 + ((h >> 4) % 70) / 100, pausaAte: 0, util: util, fase: (h % 628) / 100 });
        c.setHex(CAMISAS[(h >> 12) % CAMISAS.length]); instAndantes.setColorAt(ka, c);
        c.setHex(PELES[(h >> 8) % PELES.length]); instAndantesCab.setColorAt(ka, c);
        c.setHex(CABELOS[(h >> 16) % CABELOS.length]); instAndantesCabelo.setColorAt(ka, c);
        c.setHex(CALCAS[(h >> 20) % CALCAS.length]); instPernaE.setColorAt(ka, c); instPernaD.setColorAt(ka, c);
        ka++;
      }
    });
    [instAndantes, instAndantesCab, instAndantesCabelo, instPernaE, instPernaD].forEach(function (o) { o.count = ka; if (o.instanceColor) o.instanceColor.needsUpdate = true; cena.add(o); });
    ultimoAndantes = 0; animarAndantes(performance.now());
  }
  function animarAndantes(agora) {
    if (!instAndantes || !andantes.length) return;
    if (ultimoAndantes && agora - ultimoAndantes < 80) return;   // 19/09: 12 passos por segundo chegam para andar
    var dt = ultimoAndantes ? Math.min(160, agora - ultimoAndantes) : 0; ultimoAndantes = agora;
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YZX'), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), v = new THREE.Vector3();
    andantes.forEach(function (a) {
      var h = semente(a.i + ':' + Math.floor(agora / 700));
      var parado = a.pausaAte > agora;
      if (!parado) {
        if ((h % 1000) < 60 && dt) a.pausaAte = agora + 800 + (h % 1800);   // para a falar com alguem, 0,8 a 2,6 s
        a.lx += a.dir * a.vel * dt / 1000;
        if (a.lx > a.util / 2) { a.lx = a.util / 2; a.dir = -1; if (h & 2) a.lz = a.lz > 0 ? -2.2 : 2.4; }
        if (a.lx < -a.util / 2) { a.lx = -a.util / 2; a.dir = 1; if (h & 2) a.lz = a.lz > 0 ? -2.2 : 2.4; }
      }
      var r = rodar(a.lx, a.lz, a.ang), passo = parado ? 0 : Math.sin(agora / 140 + a.fase), bob = parado ? 0 : 0.04 * Math.abs(passo);
      var yaw = a.ang + (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      e.set(0, yaw, 0); q.setFromEuler(e);
      p.set(r.x, a.y + bob, r.z); m.compose(p, q, s1); instAndantes.setMatrixAt(a.i, m);
      p.set(r.x, a.y + 0.58 + bob, r.z); m.compose(p, q, s1); instAndantesCab.setMatrixAt(a.i, m);
      p.set(r.x, a.y + 0.62 + bob, r.z); m.compose(p, q, s1); instAndantesCabelo.setMatrixAt(a.i, m);
      // as pernas: lado a lado (perpendicular ao andar), a rodar na anca em fases opostas
      [[instPernaE, 0.12, 1], [instPernaD, -0.12, -1]].forEach(function (pe) {
        var rp = rodar(a.lx, a.lz + pe[1], a.ang), anca = a.y - 0.30 + bob;
        e.set(0, yaw, pe[2] * 0.45 * passo); q.setFromEuler(e);
        v.set(0, -0.275, 0).applyQuaternion(q); p.set(rp.x + v.x, anca + v.y, rp.z + v.z);
        m.compose(p, q, s1); pe[0].setMatrixAt(a.i, m);
      });
    });
    [instAndantes, instAndantesCab, instAndantesCabelo, instPernaE, instPernaD].forEach(function (o) { o.instanceMatrix.needsUpdate = true; });
  }

  // ---------------------------------------------------------------- o que esta em vista, e o andar em foco
  function andaresEmVista() {
    var out = [];
    if (!projecto || !camara) return out;
    var p = new THREE.Vector3(), r = {};
    projecto.lista.forEach(function (it) {
      p.set(0, it.y + ALTURA / 2, 0); ecraDoMundo(p, r);
      it.emVista = r.y > -MARGEM_VISTA_PX && r.y < vistaH + MARGEM_VISTA_PX;
      it.ecraY = r.y;
      if (it.emVista) out.push(it);
    });
    return out;
  }
  function ordemSobOCentro() {
    var melhor = null, d = Infinity;
    projecto.lista.forEach(function (it) { if (it.tipo === 'reservado') return; var dd = Math.abs((it.ecraY == null ? 1e9 : it.ecraY) - vistaH / 2); if (dd < d) { d = dd; melhor = it.ordem; } });
    return melhor;
  }
  function actualizarJanela() {
    var vista = andaresEmVista();
    if (nivelActual >= 2) {
      var o = ordemSobOCentro();
      if (o != null && andarPorOrdem[o] && o !== alvoOrdem) {
        // o alvo so muda para um andar HABITADO (os em obras nao tem moradores; um zoom sobre um deles
        // mantem a janela anterior em vez de a esvaziar)
        if (andarPorOrdem[o].n != null || Math.abs(o - alvoOrdem) > JANELA_ANDARES) { alvoOrdem = o; construirMoradores('completo'); }
      }
    }
    nomesAndares.forEach(function (it) {
      var a = andarPorOrdem[it.ordem]; var vis = nivelActual >= 1 && !!(a && a.emVista);
      it.sp.visible = vis; if (it.sp2) it.sp2.visible = vis && nivelActual >= 2;
    });
    pilulasAndar.forEach(function (it) { var a = andarPorOrdem[it.ordem]; it.sp.visible = nivelActual >= 1 && !!(a && a.emVista); });
    moradores.forEach(function (mo) { var a = andarPorOrdem[mo.ordem], vis = !!(a && a.emVista); if (mo.etq) mo.etq.visible = vis; if (mo.cartao) mo.cartao.visible = vis; });
    marcos.forEach(function (it) { it.sp.visible = nivelActual === 0; });
    placas.forEach(function (it) { it.sp.visible = nivelActual <= 1; });
    txt($('c_andar'), andarPorOrdem[alvoOrdem] ? (andarPorOrdem[alvoOrdem].nome || ('ordem ' + alvoOrdem)) : '—');
  }

  // ================================================================ os NIVEIS e a camara
  function actualizarNivel() {
    var k = PG.nivelDe(pxPorAndarAgora());
    if (k !== nivelActual) mudarNivel(k);
  }
  function mudarNivel(k) {
    // 18/09 noite: a partir do N1 o palco precisa de altura - com 47 andares os nomes nao cabem em 537 px. As filas
    // dos numeros da casa e dos cartoes e a barra de baixo escondem-se (voltam no N0) e o palco cresce ~250 px.
    var antes = nivelActual;
    nivelActual = k;
    if (k === 0) { largarMoradores(); largarCartoes(); }
    else if (k === 1) construirMoradores('pontos');
    else if (k >= 2 && (antes < 2 || antes === 3 || k === 3)) construirMoradores('completo');
    // v6: de perto (N2/N3) as fitas esbatem-se a 30% - com 37 px de espessura cruzavam o escritorio por cima das secretarias
    if (grupoFitas) grupoFitas.children.forEach(function (t) { if (t.userData.op0 == null) t.userData.op0 = t.material.opacity; t.material.opacity = k >= 2 ? t.userData.op0 * 0.3 : t.userData.op0; });
    var nv = $('niveis');
    if (nv) Array.prototype.forEach.call(nv.querySelectorAll('button'), function (b) { b.classList.toggle('on', Number(b.dataset.k) === k); });
    txt($('c_nivel'), k + ' · ' + PG.NOMES_NIVEL[k]);
    Object.keys(holos).forEach(function (n) { holos[n].hash = ''; });   // o tamanho muda com o nivel: redesenha
    actualizarJanela();
  }
  function ordemDaMesa() {
    var m = null;
    if (projecto) projecto.lista.forEach(function (it) { if (m == null && it.tipo !== 'reservado' && String(it.nome).indexOf('Mesa de Operacoes') === 0) m = it.ordem; });   // 'Mesa de Operacoes (livro)' desde 18/09
    return m == null ? 11 : m;
  }
  // as caixas dos hologramas decidem onde a torre fica: centrada na banda livre entre as colunas
  function bandaLivre(k) {
    var L = layoutHolos(k);
    return { esq: L.bandaEsq, dir: L.bandaDir };
  }
  function enquadrarN0() {
    if (!projecto || !vistaW) return;
    var px = PG.pxN0(vistaH, projecto.nomeados + COROA_ANDARES, PG.MARGEM_N0, PG.TECTO_PX_N0, EXTRA_ANDARES);   // v6: a coroa cabe
    orbita.meia = PG.mundoPorPxPara(px, ALTURA, orbita.phi) * vistaH / 2;
    orbita.theta = Math.PI / 4;
    var b = bandaLivre(0), bc = (isFinite(b.esq) && isFinite(b.dir)) ? (b.esq + b.dir) / 2 : vistaW / 2;
    orbita.cx = (vistaW / 2 - bc) * mundoPorPx();
    orbita.cy = 0.0;
    precisaEnquadrar = false;
  }
  // "Torre · Andar · Sector · Funcionario" (600 ms) - teclas 0-3; o arreio chama nivel(k) sem animacao
  function irParaNivel(k, ordem, animar) {
    marcarMovimento();
    // 18/09 noite: o palco cresce ANTES de se calcular o zoom do nivel (sincrono; mudarNivel so muda a classe,
    // porque redimensionar -> aplicarVista -> mudarNivel e o ciclo que estourou a pilha as 18:40)
    if (document.body) {
      var alto = k >= 1;
      if (document.body.classList.contains('nivel-alto') !== alto) {
        document.body.classList.toggle('nivel-alto', alto);
        if (renderer && projecto) {
          redimensionar(); enquadrarN0();
          // o nivel aplica-se no fotograma SEGUINTE: o compositor ainda tem o canvas do tamanho antigo e a
          // captura saia preta (medido 18/09 18:20: o buffer tinha 66 mil pixeis desenhados e o ecra nada)
          var _k = k, _o = ordem, _a = animar;
          requestAnimationFrame(function () { irParaNivel(_k, _o, _a); });
          return;
        }
      }
    }
    if (!projecto || !vistaW) return;
    k = Math.max(0, Math.min(3, Math.floor(Number(k) || 0)));
    nivelPedido = k;                 // para onde a camara vai; `nivelActual` so diz onde ela ja esta
    var px = PG.alvoDoNivel(k, vistaH, projecto.nomeados + COROA_ANDARES, EXTRA_ANDARES);
    var meia = PG.mundoPorPxPara(px, ALTURA, orbita.phi) * vistaH / 2;
    var o = ordem;
    if (o == null || !andarPorOrdem[o]) o = (cursorOrdem != null && andarPorOrdem[cursorOrdem] && andarPorOrdem[cursorOrdem].n != null) ? cursorOrdem
      : ((andarPorOrdem[alvoOrdem] && andarPorOrdem[alvoOrdem].n != null) ? alvoOrdem : ordemDaMesa());
    if (k >= 2) alvoOrdem = o;
    var mppAlvo = 2 * meia / vistaH, b = bandaLivre(k), bc = (isFinite(b.esq) && isFinite(b.dir)) ? (b.esq + b.dir) / 2 : vistaW / 2;   // 18/09: banda NaN logo apos o palco crescer -> camara NaN -> N1 preto
    var para = { meia: meia, theta: k >= 2 ? Math.PI / 4 + andarPorOrdem[o].ang : Math.PI / 4,
                 cx: k >= 2 ? 0 : (vistaW / 2 - bc) * mppAlvo,
                 cy: k === 0 ? 0 : (andarPorOrdem[o].y + ALTURA * 0.45 - orbita.alvoY) * _eixoY.y };
    // N1: se os 35 nomes cabem no palco, centra-se a TORRE (os nomes vao da ordem 0 a 34); senao o andar alvo
    if (k === 1 && (projecto.nomeados + COROA_ANDARES) * px <= vistaH * 0.97) para.cy = 0.95 * _eixoY.y;
    if (!animar) { orbita.meia = para.meia; orbita.theta = para.theta; orbita.cx = para.cx; orbita.cy = para.cy; camTween = null; aplicarVista(); enquadrarACoroa(); dimensionarRotulos(true); return; }
    camTween = { t0: performance.now(), dur: DUR_CAMARA_MS, de: { meia: orbita.meia, theta: orbita.theta, cx: orbita.cx, cy: orbita.cy }, para: para };
    registarTween('camara->N' + k, 0, 1, DUR_CAMARA_MS, null, null);
  }
  // 21/09: O ENQUADRAMENTO DO TOPO DEIXA DE SER UM NUMERO AFINADO A MAO. O `para.cy = 0.95` do N1 foi acertado
  // quando a torre tinha 35 andares nomeados; hoje tem 51, a torre e mais alta e a coroa saia 10 px ACIMA do
  // palco. Uma constante afinada a olho envelhece em silencio a cada andar que se contrata - e ninguem repara
  // ate alguem olhar para uma captura. Aqui MEDE-SE a caixa da coroa depois de a camara parar e corrige-se o
  // que falta, uma vez so (nao no laco: um ajuste por fotograma oscila). Se descer a coroa cortasse a base,
  // nao se desce - mais vale a coroa espreitada do que a torre sem chao.
  var MARGEM_COROA_PX = 8;
  function enquadrarACoroa() {
    if (!coroa || !camara || !vistaH || nivelActual >= 2) return;
    // ate 4 passos: o factor entre pixel de ecra e `cy` nao e exacto (a projeccao isometrica mistura os eixos),
    // e uma correccao MEDIDA que se repete converge onde uma formula fechada erraria por alguns pixeis.
    // A REGRA: reparte-se a FOLGA que sobra igualmente por cima e por baixo. Nao e uma margem fixa - a 14,05 px
    // por andar (o minimo legivel do N1) 51 andares + coroa medem 782 px num palco de 798, e uma margem fixa de
    // 8 px em cima nao cabe com 8 em baixo. Centrar o que ha resolve os dois casos: sobra folga, divide-se;
    // nao sobra, a coroa fica encostada ao topo (e a coroa que identifica a torre, o chao nao).
    for (var passo = 0; passo < 4; passo++) {
      var lr = letreiroRect(); if (!lr) return;
      var base = baseNoEcra(); if (base == null) return;
      var alto = base - lr.topo;                      // quanto mede a torre inteira no ecra, coroa incluida
      var querTopo = Math.max(0, (vistaH - alto) / 2);
      var falta = querTopo - lr.topo;
      if (Math.abs(falta) <= 0.5) return;
      orbita.cy += falta * mundoPorPx() * _eixoY.y;
      aplicarVista();
    }
  }
  // o y de ecra do CHAO da torre (ordem 0), para saber se ainda ha espaco para descer a vista
  function baseNoEcra() {
    try { return ecraDoMundo(new THREE.Vector3(0, -0.2, 0)).y; } catch (e) { return null; }
  }
  function animarCamara(agora) {
    if (!camTween) return;
    var t = (agora - camTween.t0) / camTween.dur, d = camTween.de, p = camTween.para;
    orbita.meia = PG.tween(d.meia, p.meia, t); orbita.theta = PG.tween(d.theta, p.theta, t);
    orbita.cx = PG.tween(d.cx, p.cx, t); orbita.cy = PG.tween(d.cy, p.cy, t);
    if (t >= 1) {
      camTween = null; aplicarVista(); enquadrarACoroa(); dimensionarRotulos(true);
      // o palco mudou de tamanho enquanto a camara andava: agora que ela parou, refaz-se o alvo
      if (precisaReenquadrarNivel) { precisaReenquadrarNivel = false; try { irParaNivel(nivelPedido, alvoOrdem, false); } catch (e) { } }
      return;
    }
    aplicarVista();
  }

  // ================================================================ os HOLOGRAMAS
  var NOMES_HOLO = ['velocimetro', 'trilho', 'sr_stark', 'risco', 'mesa', 'laboratorio', 'numeros'];
  var DIRECTORES = ['sr_stark', 'risco', 'mesa', 'laboratorio'];
  function criarHologramas() {
    NOMES_HOLO.forEach(function (nome) {
      var c = document.createElement('canvas'); c.width = 4; c.height = 4;
      var sp = novoSprite(c, 300); sp.visible = false;
      grupoRotulos.add(sp);
      holos[nome] = { nome: nome, canvas: c, g: c.getContext('2d'), tex: sp.userData.tex, sprite: sp, hash: '', dados: null, sw: 0, sh: 0,
                      rect: null, guia: null, coluna: null, angulo: 0, anguloAlvo: 0, primeira: true, andar: PH.ANDAR_DO_HOLO[nome], pulsaAte: 0, valores: {}, alvos: {}, mudou: {}, vivo: false,
                      // 19/09: nasce MINIMIZADO - so a barra do titulo. O velocimetro fica aberto: e o numero do dia.
                      // 20/09: o NUMEROS nasce aberto com o velocimetro - e o cartao do saldo na torre, e foi
                      // por ter ficado minimizado ontem que ele disse que 'agora nao tem mais'.
                      min: (nome !== 'velocimetro' && nome !== 'numeros') };
    });
  }
  // 18/09 noite: na torre de 47 os marcos e os hologramas encontram o andar pela ESPECIALIDADE ou pelo prefixo do
  // nome, nao pelo nome exacto dos 14 andares antigos ("Laboratorio" e agora "Laboratorio: Tendencia I", a
  // "Direccao" e o atico do Sr. Stark, a rua e o Atrio).
  function andarDoMarco(nomeM) {
    if (!projecto) return null;
    var L = projecto.lista, achado = null;
    function esp(it) { return String(obj(it.dados).especialidade || ''); }
    L.forEach(function (it) { if (!achado && it.tipo !== 'reservado' && it.nome === nomeM) achado = it; });
    if (achado) return achado;
    if (nomeM === 'Direccao') L.forEach(function (it) { if (!achado && (esp(it) === 'sr_stark' || esp(it) === 'direccao')) achado = it; });
    else if (nomeM === 'O Mercado') L.forEach(function (it) { if (!achado && it.tipo !== 'reservado' && it.tipo !== 'em_obras' && it.ordem === 0) achado = it; });
    else L.forEach(function (it) { if (!achado && it.tipo !== 'reservado' && (String(it.nome).indexOf(nomeM) === 0 || (nomeM === 'Laboratorio' && String(it.nome).indexOf('Lab.') === 0))) achado = it; });
    return achado;
  }
  function andarDoHolo(h) { return andarDoMarco(h.andar); }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // O LAYOUT: onde cada holograma vive, por nivel e por ecra. Devolve tambem a banda livre para a torre.
  function layoutHolos(k) {
    var W = vistaW, H = vistaH, L = { rects: {}, bandaEsq: 0, bandaDir: W };
    if (telemovel) {
      var hv = Math.min(clamp(0.26 * H, 180, 340), (0.55 * W) / 1.45);
      if (k >= 2) hv = 100;
      var wv = 1.45 * hv;
      L.rects.velocimetro = { esq: W - 8 - wv, topo: 8, dir: W - 8, fundo: 8 + hv, coluna: 'dir' };
      L.bandaEsq = 4; L.bandaDir = k >= 2 ? W : W - 8 - wv - 6;
      return L;
    }
    var topoFita = 26;                                      // a fita flutua no topo do palco: a coluna comeca abaixo dela
    var hvel = k >= 2 ? 120 : clamp(0.26 * H - topoFita, 150, 340);   // 19/09: o chao era 180 e, com a fita no topo, o painel dos numeros deixava de caber
    var wvel = Math.min(1.45 * hvel, 0.30 * W); hvel = wvel / 1.45;
    var ht = Math.round(hvel * 0.62);
    L.rects.velocimetro = { esq: W - 12 - wvel, topo: topoFita, dir: W - 12, fundo: topoFita + hvel, coluna: 'dir' };
    L.rects.trilho = { esq: W - 12 - wvel, topo: topoFita + hvel + 8, dir: W - 12, fundo: topoFita + hvel + 8 + ht, coluna: 'dir' };
    L.bandaDir = W - 12 - wvel - 8;
    // v5d: os NUMEROS do Pointer por baixo do trilho, ate a linha dos contadores; sem 96 px de altura nao se desenha
    var tN = topoFita + hvel + 8 + ht + 8, fN = Math.min(H - 34, tN + Math.round(wvel * 0.95));   // tecto: medido em N3 a ocupar meio ecra
    // 19/09: o minimo era 96 px; com a fita no topo o painel dos numeros deixava de caber e desaparecia.
    // 🔴 E ATENCAO: o comentario que estava AQUI ficou no MEIO da instrucao e comeu-lhe a atribuicao - a
    // linha passou a ser so uma expressao, o painel nunca recebeu rectangulo, e o arreio acusou '6 de 7
    // hologramas'. Um // a meio de uma linha apaga o resto dela sem erro nenhum.
    if (fN - tN >= 72) L.rects.numeros = { esq: W - 12 - wvel, topo: tN, dir: W - 12, fundo: fN, coluna: 'dir' };
    if (k === 0) {
      var wD = clamp(0.20 * W, 160, 236), hD = Math.min((H - 24 - 8 - 30) / 2, 0.78 * wD);
      DIRECTORES.forEach(function (n, i) {
        var col = i % 2, lin = Math.floor(i / 2);
        var x = 12 + col * (wD + 8), y = 12 + lin * (hD + 8);
        L.rects[n] = { esq: x, topo: y, dir: x + wD, fundo: y + hD, coluna: 'esq' };
      });
      L.bandaEsq = 12 + 2 * wD + 8 + 8;
    } else if (k === 1) {
      var wD1 = clamp(0.19 * W, 150, 212), hD1 = Math.min((H - 24 - 18 - 30) / 4, 0.62 * wD1);   // -30: a linha dos contadores em baixo
      DIRECTORES.forEach(function (n, i) { L.rects[n] = { esq: 12, topo: 12 + i * (hD1 + 6), dir: 12 + wD1, fundo: 12 + i * (hD1 + 6) + hD1, coluna: 'esq' }; });
      L.bandaEsq = 12 + wD1 + 8;
    } else {
      // ao lado da laje: so os cujo andar esta em vista, a esquerda da torre, empilhados sem se tocarem
      var wD2 = clamp(0.19 * W, 170, 230), hD2 = Math.min(0.30 * H, 0.72 * wD2), caixas = [], nomes = [];
      DIRECTORES.forEach(function (n) {
        var it = andarDoHolo(holos[n]); if (!it || !it.emVista) return;
        var p = new THREE.Vector3(0, it.y + ALTURA / 2, 0).addScaledVector(_eixoX, -(R_FITA + 1.6)), e = ecraDoMundo(p);
        var xd = Math.max(12 + wD2, e.x - 26);
        caixas.push({ topo: e.y - hD2 / 2, fundo: e.y + hD2 / 2, xd: xd }); nomes.push(n);
      });
      var emp = PG.empilhar(caixas, 6, H - 8);
      nomes.forEach(function (n, i) { var c = caixas[i]; L.rects[n] = { esq: c.xd - wD2, topo: c.topo + emp[i].dy, dir: c.xd, fundo: c.fundo + emp[i].dy, coluna: 'esq' }; });
      // v6: nenhum holograma tapa a ZONA OCUPADA (as secretarias) do andar em foco - recua para a esquerda e, se for
      // preciso, estreita ate 140 px (medido pela sonda: a Mesa e o Risco tapavam 4-5% da zona na Mesa e no P&L)
      // A regra: nenhum holograma de director tapa o POLIGONO. Procura-se, a partir da altura natural e para cima e para
      // baixo em passos de 24 px, o lugar mais perto onde cabe INTEIRO a esquerda do poligono (sem pisar outro holograma
      // nem os contadores/niveis do HUD); se nao houver, o mais perto onde cabe com >= 140 px; se nem isso, fica onde estava.
      var zo = zonaOcupadaRect(alvoOrdem), postos = caixasDoHUD().map(function (b) { return { topo: b.topo, fundo: b.fundo }; });
      if (zo && zo.poly && zo.poly.length >= 3) nomes.forEach(function (n) {
        var r = L.rects[n], h = r.fundo - r.topo, xm0 = limiteEsqDoPoligono(zo.poly, r.topo, r.fundo);
        function larguraEm(topo) {
          if (topo < 8 || topo + h > H - 8) return 0;
          for (var q = 0; q < postos.length; q++) if (Math.min(topo + h, postos[q].fundo) - Math.max(topo, postos[q].topo) > -6) return 0;
          var xm = limiteEsqDoPoligono(zo.poly, topo, topo + h);
          return xm == null ? wD2 : Math.min(wD2, xm - 8 - 12);
        }
        // fica onde esta so se nao toca no poligono NEM num holograma ja posto (um que se mexeu pode ter vindo parar aqui:
        // medido na captura N2 do arreio, a Mesa por cima do Risco depois de o Risco ter descido)
        var pisaPosto = postos.some(function (p) { return Math.min(r.fundo, p.fundo) - Math.max(r.topo, p.topo) > -6; });
        if (!(xm0 == null || r.dir <= xm0 - 8) || pisaPosto) {
          var melhor = null;
          [wD2, 140].some(function (minimo) {
            for (var passo = 0; passo <= H && !melhor; passo += 24) {
              var c1 = larguraEm(r.topo - passo), c2 = passo ? larguraEm(r.topo + passo) : 0;
              if (c1 >= minimo && c1 >= c2) melhor = { topo: r.topo - passo, w: c1 };
              else if (c2 >= minimo) melhor = { topo: r.topo + passo, w: c2 };
            }
            return !!melhor;
          });
          if (melhor) { r.topo = melhor.topo; r.fundo = melhor.topo + h; r.esq = 12; r.dir = 12 + melhor.w; }
        }
        postos.push({ topo: r.topo, fundo: r.fundo });
      });
      L.bandaEsq = 0; L.bandaDir = W;
    }
    return L;
  }
  function disporHologramas(mpp) {
    if (!vistaW) return;
    var L = layoutHolos(nivelActual < 0 ? 0 : nivelActual);
    // 19/09: os painéis MINIMIZADOS empilham-se em coluna. Cada um nascia no sitio do seu andar e, nos andares
    // altos, o sitio fica ACIMA do palco - duas barras apareciam cortadas por cima do teletipo. Empilhados, ficam
    // dentro do palco, pela ordem do andar, sem se taparem; a guia continua a apontar ao andar de cada um, que e
    // o que liga a barra ao sitio.
    var ALT_MIN = 26, minPos = {};
    (function () {
      var porCol = { esq: [], dir: [] };
      NOMES_HOLO.forEach(function (nome) {
        var h = holos[nome], r = L.rects[nome];
        if (!h || !h.min || !r) return;
        porCol[r.coluna === 'esq' ? 'esq' : 'dir'].push({ nome: nome, r: r });
      });
      Object.keys(porCol).forEach(function (c) {
        var y = 34;                                  // por baixo do teletipo de precos, que se sobrepoe ao palco
        porCol[c].sort(function (x, z) { return x.r.topo - z.r.topo; }).forEach(function (x) {
          var t = Math.max(y, Math.min(x.r.topo, Math.max(34, vistaH - ALT_MIN - 8)));
          minPos[x.nome] = { esq: x.r.esq, dir: x.r.dir, topo: t, fundo: t + ALT_MIN, coluna: x.r.coluna };
          y = t + ALT_MIN + 6;
        });
      });
    })();
    NOMES_HOLO.forEach(function (nome) {
      var h = holos[nome], r = L.rects[nome];
      if (!r) { h.sprite.visible = false; h.rect = null; h.guia = null; return; }
      var it = andarDoHolo(h);
      if (nivelActual === 1 && !telemovel && DIRECTORES.indexOf(nome) >= 0 && it && !it.emVista) { h.sprite.visible = false; h.rect = null; h.guia = null; return; }
      if (h.min) r = minPos[nome] || { esq: r.esq, dir: r.dir, topo: r.topo, fundo: r.topo + ALT_MIN, coluna: r.coluna };
      h.sprite.visible = true; h.rect = r; h.coluna = r.coluna;
      var sw = Math.round(r.dir - r.esq), sh = Math.round(r.fundo - r.topo);
      if (sw !== h.sw || sh !== h.sh) {
        // mudar a largura de um canvas LIMPA-O: sem redesenhar aqui, o holograma ficava vazio ate ao ciclo
        // seguinte (5 s) - medido na 1.a corrida de fumo (opacos 0 em cinco dos seis)
        h.sw = sw; h.sh = sh; h.canvas.width = Math.min(1100, sw * 2); h.canvas.height = Math.round(h.canvas.width * sh / sw); h.hash = '';
        if (T) desenharHolo(h, true);
      }
      h.sprite.scale.set(sw * mpp, sh * mpp, 1);
      mundoDoEcra((r.esq + r.dir) / 2, (r.topo + r.fundo) / 2, h.sprite.position);
      // a guia ate ao andar (so nas colunas; ao lado da laje a proximidade ja o diz)
      if (it && nivelActual <= 1) {
        var lado = r.coluna === 'esq' ? 1 : -1;
        var de = mundoDoEcra(lado > 0 ? r.dir : r.esq, (r.topo + r.fundo) / 2);
        var para = new THREE.Vector3(0, it.y + ALTURA * 0.5, 0).addScaledVector(_eixoX, -lado * (R_FITA + 0.6));
        h.guia = { de: de, para: para };
      } else h.guia = null;
    });
    var sep = $('holo_sep'); if (sep) sep.hidden = !telemovel;
  }

  // 🔴 19/09, queixa dele: "o velocimetro e os numeros estao parados, o pointer actualiza ao segundo".
  // A CAUSA: a torre lia SO o ficheiro (torre.json: 15 s em casa, 1-3 min no site), enquanto o instrumento do
  // Pointer - que vive DENTRO desta pagina, na gaveta "Dados", desenhado pelo reactor.js - ja busca os precos
  // directamente a Binance e recalcula o dia AO SEGUNDO. Estava tudo ca, sem ninguem a ligar as duas pontas.
  // `window.__md.S.real` e o resultado do dia com precos vivos; `S.fech` e a parte ja fechada (facto, do
  // ficheiro); a diferenca e o aberto. `window.__mdVivo` so fica true quando a ancora da Binance esta de pe.
  function vivoDoInstrumento() {
    try {
      // enquanto o arreio injecta dados (pausarCiclo), manda o FICHEIRO: a prova da agulha alimenta um `agora`
      // fabricado, e o preco vivo - que continua a chegar - passava-lhe a frente e a prova caia. Fora da prova
      // esta condicao nunca e verdadeira.
      if (cicloPausadoAte > Date.now()) return null;
      if (!window.__mdVivo || !window.__md || !window.__md.S) return null;
      var S = window.__md.S, r = Number(S.real), fe = Number(S.fech);
      if (!isFinite(r)) return null;
      return { agora: r, fechado: isFinite(fe) ? fe : null, aberto: isFinite(fe) ? r - fe : null };
    } catch (e) { return null; }
  }
  function desenharHolo(h, forcar) {
    if (!h.sprite.visible || !h.canvas.width) return;
    var f = PH.fatia(h.nome, T, D);
    var idade = PG.idadeEmMinutos(T && T.t_iso, Date.now());
    if (h.min) {                                     // so a barra do titulo; o corpo nao se desenha
      var chaveMin = 'min|' + f.hash;
      if (chaveMin === h.hash && !forcar) return;
      h.hash = chaveMin; h.dados = f.dados;
      PH.moldura(h.g, h.canvas.width, h.canvas.height, Math.max(1, h.canvas.width / 260),
                 PH.TITULOS[h.nome] + '  +', f.dados.t_brt, idade);
      h.tex.needsUpdate = true;
      return;
    }
    if (h.nome === 'velocimetro') {
      var d = f.dados, vv = vivoDoInstrumento();
      if (vv) {                                   // o ficheiro manda no que ja fechou; o preco vivo manda no aberto
        d.agora = vv.agora;
        if (vv.fechado != null) d.realizado = vv.fechado;
        if (vv.aberto != null) d.aberto = vv.aberto;
        f.hash += '|vivo' + vv.agora.toFixed(4);  // entra no hash: so se redesenha quando o numero MUDA mesmo
      }
      var esc = PG.escalaDoVelocimetro([d.agora, d.pico, d.vale, d.esperado, d.stop]);
      var alvo = PG.anguloDaAgulha(d.agora, esc);
      h.esc = esc;
      if (h.primeira) { h.angulo = alvo; h.anguloAlvo = alvo; h.primeira = false; }
      else if (Math.abs(alvo - h.anguloAlvo) > 1e-9) {
        // A AGULHA ANDA PORQUE `medidor.agora` MUDOU: uma tween entre leituras, registada
        h.anguloAlvo = alvo;
        registarTween('agulha ' + num(d.agora, 2), h.angulo, alvo, DUR_TWEEN_AGULHA_MS, function (v) { h.angulo = v; h.redesenha = true; }, function () { h.angulo = alvo; h.redesenha = true; });
      }
      if (f.hash === h.hash && !forcar && !h.redesenha) return;
      h.hash = f.hash; h.redesenha = false; h.dados = d;
      PH.DESENHOS.velocimetro(h.g, h.canvas.width, h.canvas.height, d, { esc: esc, angulo: h.angulo, idadeMin: idade });
    } else if (h.nome === 'trilho') {
      var vivo = PG.pulsa(T && T.t_iso, Date.now());
      var pulso = vivo ? ((performance.now() % 1400) / 1400) : null;
      if (f.hash === h.hash && !forcar && !vivo) return;
      h.hash = f.hash; h.dados = f.dados; h.vivo = vivo;
      PH.DESENHOS.trilho(h.g, h.canvas.width, h.canvas.height, f.dados, { pulso: pulso, idadeMin: idade });
    } else if (h.nome === 'numeros') {
      // v5d: CADA NUMERO ANDA quando muda (tween registada, o arreio conta-a) e o ladrilho brilha 2,6 s; na primeira
      // leitura contam de zero ate ao valor. O varrimento lento so corre enquanto o dado tem menos de 2 min.
      var dn = f.dados, vvN = vivoDoInstrumento();
      if (vvN) {
        if (vvN.aberto != null) dn.volatil = vvN.aberto;
        if (vvN.fechado != null) dn.saldo_dia = vvN.fechado;
        f.hash += '|vivo' + vvN.agora.toFixed(4);
      }
      var agoraMs = performance.now(), ks = Object.keys(dn), brilho = {}, algum = false;
      ks.forEach(function (kk) {
        var v = dn[kk]; if (typeof v !== 'number' || !isFinite(v)) return;
        var primeira = !(kk in h.valores);
        if (!primeira && (h.alvos[kk] === v || Math.abs(h.valores[kk] - v) < 1e-9)) return;
        var de = primeira ? 0 : h.valores[kk]; h.valores[kk] = de; h.alvos[kk] = v; h.mudou[kk] = agoraMs;
        registarTween('numero ' + kk + ' ' + num(v, 2), de, v, primeira ? 900 : DUR_TWEEN_AGULHA_MS,
          function (x) { h.valores[kk] = x; h.redesenha = true; }, function () { h.valores[kk] = v; h.redesenha = true; });
      });
      ks.forEach(function (kk) { var t0 = h.mudou[kk]; if (t0 != null) { var b = 1 - (agoraMs - t0) / 2600; if (b > 0) { brilho[kk] = b; algum = true; } else delete h.mudou[kk]; } });
      var vivoN = PG.pulsa(T && T.t_iso, Date.now());
      h.vivo = vivoN || algum;
      if (f.hash === h.hash && !forcar && !h.redesenha && !h.vivo) return;
      h.hash = f.hash; h.redesenha = false; h.dados = dn;
      PH.DESENHOS.numeros(h.g, h.canvas.width, h.canvas.height, dn, { valores: h.valores, brilho: brilho, pulso: vivoN ? ((agoraMs % 2400) / 2400) : null, idadeMin: idade });
    } else if (h.nome === 'laboratorio') {
      // a MALHA DAS FAMILIAS roda sempre: uma volta em ~57 s. E o objecto que continua vivo quando nenhum
      // numero mudou - o que o canal faz com a 'strategy lattice'. Quem manda na cadencia e o laco.
      h.hash = f.hash; h.dados = f.dados;
      PH.DESENHOS.laboratorio(h.g, h.canvas.width, h.canvas.height, f.dados, { idadeMin: idade, angulo: performance.now() / 9000 });
    } else if (h.nome === 'mesa') {
      // a FITA desliza quando entra uma linha nova (o evento empurra as outras para baixo, 520 ms)
      var topo = lista(f.dados.fita)[0], chave = topo ? (topo.t + '|' + topo.tipo + '|' + topo.simbolo) : '';
      if (h.topoFita === undefined) h.topoFita = chave;
      else if (chave !== h.topoFita) { h.topoFita = chave; h.deslT0 = performance.now(); }
      var dtF = h.deslT0 ? (performance.now() - h.deslT0) : 1e9, desl = dtF < 520 ? (1 - dtF / 520) : 0;
      if (f.hash === h.hash && !forcar && desl === 0) return;
      h.hash = f.hash; h.dados = f.dados;
      PH.DESENHOS.mesa(h.g, h.canvas.width, h.canvas.height, f.dados, { idadeMin: idade, desl: desl });
    } else {
      if (f.hash === h.hash && !forcar) return;
      h.hash = f.hash; h.dados = f.dados;
      PH.DESENHOS[h.nome](h.g, h.canvas.width, h.canvas.height, f.dados, { idadeMin: idade });
    }
    h.tex.needsUpdate = true;
  }
  function actualizarHologramas(forcar) { NOMES_HOLO.forEach(function (n) { desenharHolo(holos[n], forcar); }); pintarSeparador(); }
  var ultimoTrilho = 0, ultimoNumeros = 0, ultimoVivo = 0, ultimoLab = 0, ultimoMesa = 0, ultimoVarre = 0;
  var cicloPausadoAte = 0;   // v6: o arreio pausa o ciclo enquanto injecta dados (senao o ficheiro real pisa a prova a meio)
  // 🔴 19/09, ordem dele repetida tres vezes: "o predio tem de mudar de segundo em segundo". Entre eventos a
  // torre estava imovel - so o batimento, que e subtil. Agora as duas fitas tem uma BANDA DE LUZ que nunca
  // para: sobe na dos dados, desce na das decisoes. Nao inventa dado: e a mesma fita, com o brilho a andar.
  // A VELOCIDADE diz a verdade - com dado fresco (ou com a ancora da Binance de pe) corre ao dobro.
  var _corFita = new THREE.Color(), _brancoFita = new THREE.Color(0xffffff);
  function correrFitas(agora) {
    if (!instDegraus || !degrauInfo.length) return;
    if (!ANIMACAO_PESADA) return;                              // 19/09: a luz das fitas custava 18 passagens por segundo por TODOS os degraus
    if (agora - ultimaFita < 55) return;
    var dt = ultimaFita ? Math.min(200, agora - ultimaFita) : 16;
    ultimaFita = agora;
    var vivo = (T && PG.pulsa(T.t_iso, Date.now())) || !!window.__mdVivo;
    faseFita = (faseFita + dt / (vivo ? 2600 : 5200)) % 1;
    var i, n = degrauInfo.length, mexeu = false;
    for (i = 0; i < n; i++) {
      var g = degrauInfo[i];
      var u = g.lado ? (1 - g.u) : g.u;                        // um lado sobe, o outro desce
      var d = Math.abs(((u - faseFita) % 1 + 1) % 1);
      var f = d < 0.20 ? (1 - d / 0.20) : 0;                   // a banda tem 20% da fita (medido: a 12% quase nao se via)
      _corFita.setHex(g.cor).lerp(_brancoFita, 0.92 * f);
      instDegraus.setColorAt(i, _corFita); mexeu = true;
    }
    if (mexeu && instDegraus.instanceColor) instDegraus.instanceColor.needsUpdate = true;
  }
  function animarHolos(agora) {
    if (!T) return;
    var v = holos.velocimetro; if (v && v.redesenha) desenharHolo(v, false);
    var t = holos.trilho;
    if (t && t.sprite.visible && agora - ultimoTrilho > 80) { ultimoTrilho = agora; desenharHolo(t, false); }
    var nm = holos.numeros;
    if (nm && nm.sprite.visible && (nm.redesenha || nm.vivo) && agora - ultimoNumeros > 90) { ultimoNumeros = agora; desenharHolo(nm, false); }
    // com a ancora da Binance de pe, o numero muda ao segundo: sem este toque so se redesenhava de 2 em 2 s (o
    // ciclo do ficheiro). O hash ja trava o desenho quando o valor nao mexeu, logo isto nao custa fotogramas.
    correrFitas(agora);
    // 19/09: o varrimento anda e TODOS os hologramas se redesenham a ~6 por segundo. E o que o canal faz: os
    // paineis nunca estao parados. O custo e 7 telas pequenas por 6 vezes por segundo - medido no arreio.
    if (ANIMACAO_PESADA && agora - ultimoVarre > 160) {
      ultimoVarre = agora;
      PH.fase(agora / 1600);
      NOMES_HOLO.forEach(function (nm2) { var hh = holos[nm2]; if (hh && hh.sprite.visible) desenharHolo(hh, true); });
    }
    var lb = holos.laboratorio;
    if (lb && lb.sprite.visible && agora - ultimoLab > (ANIMACAO_PESADA ? 110 : 2000)) { ultimoLab = agora; desenharHolo(lb, true); }
    var ms = holos.mesa;
    if (ms && ms.sprite.visible && ms.deslT0 && agora - ms.deslT0 < 620 && agora - ultimoMesa > 60) { ultimoMesa = agora; desenharHolo(ms, true); }
    if (window.__mdVivo && agora - ultimoVivo > 330) {
      ultimoVivo = agora;
      if (v && v.sprite.visible) desenharHolo(v, false);
      if (nm && nm.sprite.visible) desenharHolo(nm, false);
    }
    if (agora - ultimoRedesenhoHolos > 60000) { ultimoRedesenhoHolos = agora; actualizarHologramas(true); }   // a idade do dado
  }
  // o separador do telemovel: os hologramas que nao cabem ao lado da torre, num canvas plano, um de cada vez
  function pintarSeparador() {
    var sep = $('holo_sep'), cvs = $('holo_cv');
    if (!sep || !cvs || sep.hidden || !telemovel) return;
    Array.prototype.forEach.call(sep.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.holo === separadorActivo); });
    var w = Math.max(200, cvs.clientWidth || 340), hh = Math.round(w * 0.62);
    if (cvs.width !== w * 2 || cvs.height !== hh * 2) { cvs.width = w * 2; cvs.height = hh * 2; cvs.style.height = hh + 'px'; }
    var f = PH.fatia(separadorActivo, T, D), g = cvs.getContext('2d');
    var idade = PG.idadeEmMinutos(T && T.t_iso, Date.now()), extra = { idadeMin: idade };
    if (separadorActivo === 'velocimetro') { var esc = PG.escalaDoVelocimetro([f.dados.agora, f.dados.pico, f.dados.vale, f.dados.esperado, f.dados.stop]); extra.esc = esc; extra.angulo = PG.anguloDaAgulha(f.dados.agora, esc); }
    if (PH.DESENHOS[separadorActivo]) PH.DESENHOS[separadorActivo](g, cvs.width, cvs.height, f.dados, extra);
  }

  // ================================================================ tweens (registadas: o arreio conta-as)
  function registarTween(nome, de, para, dur, aoPasso, aoFim) {
    var tw = { nome: String(nome), de: de, para: para, t0: performance.now(), dur: dur, aoPasso: aoPasso, aoFim: aoFim };
    tweens.push(tw); nTweens++;
    ultimasTweens.push(tw.nome); while (ultimasTweens.length > MAX_TWEENS_LEMBRADAS) ultimasTweens.shift();
    return tw;
  }
  function animarTweens(agora) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i], t = (agora - tw.t0) / tw.dur;
      if (calmo) t = 1;
      var v = PG.tween(tw.de, tw.para, t);
      if (tw.aoPasso) tw.aoPasso(v, Math.min(1, t));
      if (t >= 1) { tweens.splice(i, 1); if (tw.aoFim) tw.aoFim(); }
    }
  }
  // NUMEROS A SUBIR E A DESCER: quando o numero de um morador muda entre duas leituras do JSON, a pilula anima
  // do valor antigo para o novo em 900 ms com um flash verde/vermelho. E so isto - nao ha tick falso.
  function tweenDeNumero(mo, nu) {
    var sp = mo.etq;
    if (!sp || mo.valor == null || nu.valor == null || !isFinite(mo.valor) || !isFinite(nu.valor) || mo.fonte !== nu.fonte) { trocarPilula(mo, nu); return; }
    var de = mo.valor, para = nu.valor, sobe = para > de, cor = sobe ? '#3ecf8e' : '#ff5a5f';
    // a pilula precisa de caber o texto mais largo dos dois: refaz-se com essa largura e repinta-se por passo
    var largo = String(mo.texto).length >= String(nu.texto).length ? mo.texto : nu.texto;
    var anc = sp.userData.px.ancora; largarSprite(sp);
    mo.etq = etiquetaNumero(nu, anc, largo); grupoRotulos.add(mo.etq);
    var q = mo.etq.userData.px, g = mo.etq.userData.g, c = mo.etq.userData.canvas;
    pintarPilula(c, g, c.width, c.height, q.ft, mo.texto, mo.cls, { cor: cor, forca: 1 }); mo.etq.userData.tex.needsUpdate = true;
    var m = mo;
    registarTween('numero ' + mo.id + ' ' + mo.texto + '->' + nu.texto, de, para, DUR_TWEEN_NUM_MS,
      function (v, t) { pintarPilula(c, g, c.width, c.height, q.ft, formatarNumero(nu, v), nu.classe, { cor: cor, forca: 1 - t }); m.etq.userData.tex.needsUpdate = true; },
      function () { trocarPilula(m, nu); });
    mo.valor = para; mo.texto = nu.texto; mo.cls = nu.classe; mo.fonte = nu.fonte; mo.nu = nu;
    q.texto = String(nu.texto);
  }
  function trocarPilula(mo, nu) {
    mo.valor = nu.valor; mo.texto = nu.texto; mo.cls = nu.classe; mo.fonte = nu.fonte; mo.nu = nu;
    if (mo.etq) { var anc = mo.etq.userData.px.ancora; largarSprite(mo.etq); mo.etq = etiquetaNumero(nu, anc); grupoRotulos.add(mo.etq); dimensionarRotulos(true); }
    if (mo.cartao) { var a2 = mo.cartao.userData.px.ancora, f = null; lista(D && D.funcionarios).forEach(function (x) { if (x.id === mo.id) f = x; });
      if (f) { largarSprite(mo.cartao); cartoes3D = cartoes3D.filter(function (c) { return c.id !== mo.id; }); mo.cartao = cartaoMorador(f, nu, a2); grupoRotulos.add(mo.cartao); cartoes3D.push({ sp: mo.cartao, id: f.id, ordem: mo.ordem }); dimensionarRotulos(true); } }
  }

  // Os moradores construidos reagem aos dados NOVOS: numero que mudou (tween), corrida nova (pulso + pacote
  // ao chefe + onda da Imprensa + leitura), estado novo (cor). Quem ganhou/perdeu numero reconstroi o nivel.
  function actualizarMoradores() {
    if (!D) return;
    recalcularNumeros();
    var ass = comNumero.map(function (d) { return d.f.id; }).join(',');
    if (ass !== assinaturaNumeros) { assinaturaNumeros = ass; if (nivelActual >= 1) construirMoradores(nivelActual === 1 ? 'pontos' : 'completo'); dimensionarRotulos(true); }
    var porId = {}; lista(D.funcionarios).forEach(function (f) { porId[f.id] = f; });
    var nuPorId = {}; comNumero.forEach(function (d) { nuPorId[d.f.id] = d.nu; });
    var c = new THREE.Color(), agora = performance.now();
    moradores.forEach(function (mo) {
      var f = porId[mo.id], nu = nuPorId[mo.id];
      if (!f || !nu) return;
      if (f.ultima_corrida_brt && f.ultima_corrida_brt !== mo.ultima) {
        mo.ultima = f.ultima_corrida_brt; mo.pulso = agora;
        var chefe = f.chefe ? porId[f.chefe] : null;
        if (chefe && chefe.andar !== f.andar) lancarPacote(f.andar, chefe.andar, 'ideia');
        // 19/09 (queixa dele: "os cards nao estao reagindo"): ate aqui o cartao so acendia com uma mensagem
        // da conversa - poucas por hora. Agora acende sempre que alguem dos seus andares CORRE, que e o que
        // acontece a cada ciclo. E a mesma reaccao do canal: o agente age, o cartao dele acende.
        try { acenderCartao(cartaoDoAndar(andarTorreDe(f))); } catch (e) { }   // (a deteccao principal e a do dado, acima)
        if (f.andar === 6) ondaDaFonte(f.id);
        escreverLeituraDeCorrida(f);
      }
      if (nu.texto !== mo.texto || nu.classe !== mo.cls) tweenDeNumero(mo, nu);
      mo.estado = f.estado;
      c.setHex(COR_MORADOR[f.estado] != null ? COR_MORADOR[f.estado] : COR_MORADOR.sem_tarefa);
      if (instMoradores) instMoradores.setColorAt(mo.i, c);
      if (instPontos) instPontos.setColorAt(mo.i, c);
    });
    if (instMoradores && instMoradores.instanceColor) instMoradores.instanceColor.needsUpdate = true;
    if (instPontos && instPontos.instanceColor) instPontos.instanceColor.needsUpdate = true;
    pintarCartoes();
  }
  // o pulso de uma corrida (evento com carimbo) e a oscilacao de quem esta A CORRER agora (estado do agendador)
  function animarPulsos(agora) {
    if (!instMoradores) return;
    var m = new THREE.Matrix4(), mexeu = false;
    moradores.forEach(function (mo) {
      var s = 1, corre = mo.estado === 'a_correr';
      if (mo.pulso) { var t = (agora - mo.pulso) / PULSO_MS; if (t >= 1) mo.pulso = 0; else s = 1 + 1.1 * Math.sin(t * Math.PI); }
      else if (corre) s = 1 + 0.18 * Math.sin(agora / 160);
      else if (!mo.aRepor) return;
      mo.aRepor = (s !== 1); mo.escalaY = s;
      m.makeRotationY(mo.ang); m.setPosition(mo.x, mo.y + (s - 1) * 0.5, mo.z);
      m.scale(new THREE.Vector3(1, s, 1));
      instMoradores.setMatrixAt(mo.i, m); mexeu = true;
      if (instCabecas) { m.makeTranslation(mo.x, mo.y + 0.58 + (s - 1) * 0.65, mo.z); instCabecas.setMatrixAt(mo.i, m); }   // v5e: a cabeca sobe com o pulso
      if (instCabelos) { m.makeTranslation(mo.x, mo.y + 0.62 + (s - 1) * 0.65, mo.z); instCabelos.setMatrixAt(mo.i, m); }
    });
    if (mexeu) { instMoradores.instanceMatrix.needsUpdate = true; if (instCabecas) instCabecas.instanceMatrix.needsUpdate = true; if (instCabelos) instCabelos.instanceMatrix.needsUpdate = true; }
  }

  // ---------------------------------------------------------------- aplicar dados (o ciclo e a costura de teste)
  function assinaturaDaEstrutura(p) {
    return lista(p.andares).map(function (a) { return a.ordem + ':' + a.nome + ':' + a.estado; }).join('|') + '#' +
      lista(p.andares_planeados).map(function (a) { return a.ordem + ':' + a.nome; }).join('|') + '#' + lista(p.funcionarios).length + '#' + obj(p.projecto).andares_alvo;
  }
  // v6: quem correu desde a leitura anterior - TODOS os funcionarios do registo, nao so os moradores construidos (a N0 nao
  // ha moradores e o andar e o cartao do cargo tem de acender na mesma). Um evento com carimbo: ultima_corrida_brt mudou.
  function corridasNovas(novo) {
    var out = [], mapa = {};
    lista(novo && novo.funcionarios).forEach(function (f) {
      var u = String(f.ultima_corrida_brt || ''); mapa[f.id] = u;
      if (ultimaCorridaPorId && u && ultimaCorridaPorId[f.id] != null && ultimaCorridaPorId[f.id] !== u) out.push(f);
    });
    ultimaCorridaPorId = mapa;
    return out;
  }
  function aplicarDados(novoPredio, novaTorre) {
    marcarMovimento();
    if (novoPredio) {
      lidoEm = performance.now();   // a idade do trabalho conta-se a partir DESTA leitura, nao do arranque
      var ass = assinaturaDaEstrutura(novoPredio);
      var corridas = corridasNovas(novoPredio);
      D = novoPredio;
      if (ass !== assinaturaEstrutura) { assinaturaEstrutura = ass; construirTorre(); } else actualizarMoradores();
      // 20/09 (queixa dele: "nao estao acendendo/reagindo"): `corridasNovas` ja dizia quem correu, mas o cartao
      // so levava um `pulsa` discreto. Passa a ACENDER com a mesma animacao do resto - e e a unica coisa que o
      // cartao diz, porque o texto do que aconteceu ficou no chat, por ordem dele.
      try { refazerFilaViva(); } catch (e) { }
      corridas.forEach(function (f) {
        var n = andarTorreDe(f);
        acenderAndar(andarPorN[n]); pulsarCartaoDoAndar(n);
        corridasVistas++;
        try { acenderCartao(cartaoDoAndar(n)); } catch (e) { }
        try { acenderNoVivo(f); } catch (e) { }   // 21/09: e este funcionario, com nome, que acende na fila
      });
    }
    if (novaTorre) {
      var tIsoNovo = String(novaTorre.t_iso || ''), chegou = !!tIsoNovo && (!T || String(T.t_iso || '') !== tIsoNovo);
      T = novaTorre;
      if (chegou) lancarOndaDeDados(tIsoNovo);   // v6: um torre.json NOVO (t_iso novo) e uma onda do Atrio ao atico
      if (!novoPredio && D) actualizarMoradores();   // o realizado da mesa vem do torre.json
      processarFeed(); chafarizDoTorre(); actualizarAnel();
      actualizarHologramas(false);
    }
    pintarHUD();
    if (painelAberto != null) $('pn_corpo').innerHTML = corpoDoPainel(painelAberto);
  }

  // ================================================================ o feed e os pacotes (agora AO LONGO DAS FITAS)
  function marcarVisto(chave) { if (vistos[chave]) return; vistos[chave] = 1; ordemVistos.push(chave); while (ordemVistos.length > MAX_VISTOS) delete vistos[ordemVistos.shift()]; }
  function andarDaOrigem(origem) { return (origem === 'cripto' || origem === 'swing' || origem === 'intradia') ? 9 : null; }
  function refDoFeed() {
    var seg = PF.segundosDoDia(T && T.t_brt);
    if (seg == null) { var d = new Date(); seg = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }
    return seg;
  }
  function processarFeed() {
    var feed = lista(T && T.feed);
    if (!feed.length) return;
    var preparados = PF.preparar(feed, refDoFeed(), Date.now() / 1000);
    if (primeiraCarga) { preparados.slice(0, Math.max(0, preparados.length - ARRANQUE_RAPIDO)).forEach(function (p) { marcarVisto(p.chave); }); primeiraCarga = false; }
    var novos = PF.novos(preparados, vistos);
    if (!novos.length) return;
    novos.forEach(function (p, idx) {
      var ev = p.ev; marcarVisto(p.chave);
      var tipo = String(ev.tipo || ''), rota = CAMINHOS.hasOwnProperty(tipo) ? CAMINHOS[tipo] : undefined;
      if (rota === null) { var na = andarDaOrigem(ev.origem) || 9; pulsarAndar(na);
        try { acenderCartao(cartaoDoAndar(andarAntigoParaTorre(na))); corridasVistas++; } catch (e) { }
        escreverLeitura(ev); return; }
      if (rota === undefined) { var n = andarDaOrigem(ev.origem); if (n != null) lancarPacote(0, n, 'outro', idx < 3); semCaminho++; escreverLeitura(ev); return; }
      lancarPacote(rota[0], rota[1], rota[2], idx < 3);
      // 20/09 (queixa dele: os cartoes reagem pouco): o FEED e a batida rapida - chega no torre.json de 2 em 2 s,
      // enquanto o predio.json so se reescreve ao minuto. Cada evento novo acende o cartao do cargo que manda no
      // andar de DESTINO do evento. E a mesma reaccao, alimentada pela fonte que mexe mais.
      try { acenderCartao(cartaoDoAndar(andarAntigoParaTorre(rota[1]))); corridasVistas++; } catch (e) { }
      if (tipo === 'doc' || tipo === 'professor' || tipo === 'aprendizado' || tipo === 'live') ondaDaFonte(ev.origem);
      if (tipo === 'evolucao' || tipo === 'geracao' || tipo === 'avaliacao') pulsarAndar(7);
      escreverLeitura(ev);
    });
  }
  function pulsarAndar(n) {
    // v6: os caminhos do feed falam nos n ANTIGOS (9 = Mesa, 7 = Laboratorio); os moradores moram no andar da TORRE
    var agora = performance.now(), nt = andarAntigoParaTorre(n);
    moradores.forEach(function (mo) { if ((mo.andar === nt || mo.andar === n) && !mo.pulso) mo.pulso = agora; });
    acenderAndar(andarPorN[nt] || andarPorN[n]); pulsarCartaoDoAndar(nt);
  }
  function escreverNaColuna(el) {
    var cx = $('leituras'); cx.insertBefore(el, cx.firstChild);
    while (cx.children.length > MAX_LEITURAS) cx.removeChild(cx.lastChild);
    txt($('lei_kn'), cx.children.length + ' evento(s)');
  }
  function escreverLeitura(ev) {
    var molde = MOLDES[ev.tipo], frase = molde ? molde(ev) : (ev.texto_curto || ev.tipo || 'evento');
    if (ev.motivo) frase += ' — ' + ev.motivo;
    var classe = 'pred-lin nova';
    if (ev.tipo === 'entrada' || ev.tipo === 'alvo') classe += ' up';
    else if (ev.tipo === 'stop' || String(ev.tipo).indexOf('recusa') === 0 || String(ev.tipo).indexOf('tecto') === 0) classe += ' dn';
    else if (String(ev.tipo).indexOf('spread') === 0 || ev.tipo === 'capital_esgotado') classe += ' am';
    var el = document.createElement('div'); el.className = classe;
    el.innerHTML = '<i>' + escH(String(ev.t_brt || '').slice(0, 5)) + '</i><b>' + escH(String(ev.origem || '').toUpperCase()) + '</b> ' + escH(frase);
    escreverNaColuna(el);
  }
  function escreverLeituraDeCorrida(f) {
    var el = document.createElement('div'); el.className = 'pred-lin nova' + (f.estado === 'erro' ? ' dn' : '');
    el.innerHTML = '<i>' + escH(String(f.ultima_corrida_brt || '').slice(-5)) + '</i><b>' + escH(String(f.id).toUpperCase()) + '</b> correu' +
      (f.chefe ? ' e entregou a ' + escH(f.chefe) : '') + (f.estado === 'erro' ? ' — e devolveu erro' : '');
    escreverNaColuna(el);
  }
  // Um pacote sobe pela fita dos dados (ciano) ou desce pela das decisoes (ambar); no mesmo andar atravessa a
  // laje. Os CAMINHOS nao mudaram (n de andar): so a geometria do trajecto.
  function lancarPacote(deN, paraN, especie, rapido) {
    if (pacotesVivos.length >= MAX_PACOTES) return false;
    // v6: os CAMINHOS falam nos n antigos (9 = Mesa, 0 = a rua); na torre de 47 e o andar mapeado (medido: sem isto
    // andarPorN[0] nao existia e nenhum pacote chegava a sair)
    var a = andarPorN[andarAntigoParaTorre(deN)] || andarPorN[deN], b = andarPorN[andarAntigoParaTorre(paraN)] || andarPorN[paraN];
    if (!a || !b) return false;
    var malha = poolPacotes.pop();
    if (!malha) malha = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    malha.material.color.setHex(COR_PACOTE[especie] != null ? COR_PACOTE[especie] : COR_PACOTE.outro);
    malha.visible = true; cena.add(malha);
    var pk = { malha: malha, de: a.ordem, para: b.ordem, t0: performance.now(), dur: rapido ? 700 : DUR_PACOTE_MS };
    if (a.ordem === b.ordem) { var p0 = rodar(-LARG / 2 + 1, PROF / 2 - 0.6, a.ang), p1 = rodar(LARG / 2 - 1, PROF / 2 - 0.6, a.ang); pk.p0 = new THREE.Vector3(p0.x, a.y + 1.0, p0.z); pk.p1 = new THREE.Vector3(p1.x, a.y + 1.0, p1.z); }
    pacotesVivos.push(pk);
    return true;
  }
  function animarPacotes(agora) {
    for (var i = pacotesVivos.length - 1; i >= 0; i--) {
      var p = pacotesVivos[i], t = (agora - p.t0) / p.dur;
      if (t >= 1) { cena.remove(p.malha); p.malha.visible = false; poolPacotes.push(p.malha); pacotesVivos.splice(i, 1); continue; }
      if (p.p0) p.malha.position.lerpVectors(p.p0, p.p1, t);
      else { var q = PG.pontoNaFita(p.de, p.para, t, GEO_FITA); if (q) p.malha.position.set(q.x, q.y + 0.4, q.z); }
      var s = 1 + 0.5 * Math.sin(t * Math.PI); p.malha.scale.set(s, s, s);
    }
  }

  // ================================================================ v2 (peca 16): chafariz, onda e anel, dentro dos andares
  // As mesmas tres animacoes, agora em coordenadas LOCAIS do grupo rodado de cada andar. A regra e a mesma:
  // o chafariz so jorra com geracao nova, a onda so passa quando a fonte entrega, o anel so muda com a mesa.
  var MAX_PARTICULAS = 3000, DUR_PARTICULA_MS = 3400, ARRANQUE_CHAFARIZ = 1, MAX_GERACOES_VISTAS = 400;
  var MAX_ONDAS = 6, DUR_ONDA_MS = 1700, DUR_ANEL_MS = 900, MAX_BARRAS = 48, ALT_BARRA_MAX = 1.5, ALT_BARRA_MIN = 0.12;
  var VY_ROBUSTO = 3.7, GRAV_ROBUSTO = 1.1, VY_MORTO = 1.8, GRAV_MORTO = 2.2;
  var COR_PART = { robusto_mono: [0.44, 0.60, 0.34], robusto_outra: [0.24, 0.81, 0.56], morto_mono: [0.55, 0.31, 0.32], morto_outra: [1.00, 0.35, 0.37] };
  var v2Grupos = [];
  function rotuloCurto(texto, cor, largura) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 64;
    var g = c.getContext('2d'); g.font = '600 26px ' + FONTE_MONO; g.fillStyle = hexCss(cor); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(texto), 128, 34);
    var tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(largura || 3.0, (largura || 3.0) / 4, 1);
    return sp;
  }
  function grupoNoAndar(n) {
    // v6: n e o andar ANTIGO (6 Imprensa, 7 Laboratorio, 9 Mesa); na torre de 47 mora no andar mapeado pelo registo
    var it = andarPorN[andarAntigoParaTorre(n)] || andarPorN[n]; if (!it || !it.grupo) return null;
    var g = new THREE.Group(); it.grupo.add(g); v2Grupos.push(g); return g;
  }
  function construirV2() {
    v2Grupos.forEach(function (g) { if (g.parent) g.parent.remove(g); g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); });
    v2Grupos = []; chafariz = null; imprensa = null; anel = null; particulasVivas = 0;
    construirChafariz(); construirImprensa(); construirAnel(); actualizarAnel();
    v2Grupos.forEach(function (g) { g.visible = v2Ligado; });
  }
  function construirChafariz() {
    var g = grupoNoAndar(7); if (!g) return;
    var geo = new THREE.BufferGeometry(), pos = new Float32Array(MAX_PARTICULAS * 3), cor = new Float32Array(MAX_PARTICULAS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(cor, 3).setUsage(THREE.DynamicDrawUsage));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.24, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; geo.setDrawRange(0, 0); g.add(pts);
    var livres = []; for (var i = MAX_PARTICULAS - 1; i >= 0; i--) livres.push(i);
    chafariz = { pontos: pts, pos: pos, cor: cor, activas: [], livres: livres, desenhadas: 0, x: LARG * 0.30, y: 0.55, z: 3.2, ultima: null };
    var boca = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.60, 0.08, 18), new THREE.MeshBasicMaterial({ color: 0x1d3a4a }));
    boca.position.set(chafariz.x, chafariz.y - 0.22, chafariz.z); g.add(boca);
  }
  function emitirParticula(especie, t0) {
    var i = chafariz.livres.pop(); if (i == null) return false;
    var robusto = especie.indexOf('robusto') === 0, ang = Math.random() * Math.PI * 2, r = Math.random() * 0.40;   // a dispersao e desenho, nao dado
    chafariz.activas.push({ i: i, t0: t0 + Math.random() * 380, x: chafariz.x + Math.cos(ang) * r, y: chafariz.y, z: chafariz.z + Math.sin(ang) * r,
      vx: Math.cos(ang) * (robusto ? 0.20 : 0.60), vz: Math.sin(ang) * (robusto ? 0.20 : 0.60), vy: (robusto ? VY_ROBUSTO : VY_MORTO) * (0.85 + Math.random() * 0.30),
      g: robusto ? GRAV_ROBUSTO : GRAV_MORTO, c: COR_PART[especie] });
    particulasVivas++; return true;
  }
  function jorrarGeracao(g) {
    if (!chafariz) return null;
    var plano = particulasDaGeracao(g && g.avaliados, g && g.robustos, g && g.monocultura_pct, chafariz.livres.length), especies = [], i;
    for (i = 0; i < plano.robustos; i++) especies.push(i < plano.robustos_mono ? 'robusto_mono' : 'robusto_outra');
    for (i = 0; i < plano.mortos; i++) especies.push(i < plano.mortos_mono ? 'morto_mono' : 'morto_outra');
    for (i = especies.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = especies[i]; especies[i] = especies[j]; especies[j] = t; }
    var agora = performance.now();
    especies.forEach(function (e) { emitirParticula(e, agora); });
    chafariz.ultima = { g: g, plano: plano, quando: agora };
    return plano;
  }
  function animarChafariz(agora) {
    if (!chafariz) return;
    if (!chafariz.activas.length) { if (chafariz.desenhadas) { chafariz.pontos.geometry.setDrawRange(0, 0); chafariz.desenhadas = 0; } return; }
    var pos = chafariz.pos, cor = chafariz.cor, A = chafariz.activas, topo = 0;
    for (var k = A.length - 1; k >= 0; k--) {
      var p = A[k], ms = agora - p.t0; if (p.i + 1 > topo) topo = p.i + 1;
      var i3 = p.i * 3;
      if (ms < 0) { cor[i3] = cor[i3 + 1] = cor[i3 + 2] = 0; continue; }
      var u = ms / DUR_PARTICULA_MS;
      if (u >= 1) { cor[i3] = cor[i3 + 1] = cor[i3 + 2] = 0; chafariz.livres.push(p.i); A.splice(k, 1); particulasVivas--; continue; }
      var t = ms / 1000;
      pos[i3] = p.x + p.vx * t; pos[i3 + 1] = p.y + p.vy * t - 0.5 * p.g * t * t; pos[i3 + 2] = p.z + p.vz * t;
      var f = Math.pow(1 - u, 0.7); cor[i3] = p.c[0] * f; cor[i3 + 1] = p.c[1] * f; cor[i3 + 2] = p.c[2] * f;
    }
    if (topo !== chafariz.desenhadas) { chafariz.pontos.geometry.setDrawRange(0, topo); chafariz.desenhadas = topo; }
    chafariz.pontos.geometry.attributes.position.needsUpdate = true; chafariz.pontos.geometry.attributes.color.needsUpdate = true;
  }
  function horaDe(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return ''; return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function chafarizDoTorre() {
    if (!chafariz || !T) return;
    var gs = lista(obj(T.extremis).geracoes).filter(function (g) { return g && g.geracao != null; }).slice().sort(function (a, b) { return a.geracao - b.geracao; });
    if (!gs.length) return;
    var novas = gs.filter(function (g) { return !geracoesVistas[g.geracao]; });
    if (primeiraGeracao) { primeiraGeracao = false; novas.slice(0, Math.max(0, novas.length - ARRANQUE_CHAFARIZ)).forEach(marcarGeracao); novas = novas.slice(Math.max(0, novas.length - ARRANQUE_CHAFARIZ)); }
    novas.forEach(function (g) { marcarGeracao(g); var plano = jorrarGeracao(g); escreverLeituraGeracao(g, plano); });
  }
  function marcarGeracao(g) { if (geracoesVistas[g.geracao]) return; geracoesVistas[g.geracao] = 1; ordemGeracoes.push(g.geracao); while (ordemGeracoes.length > MAX_GERACOES_VISTAS) delete geracoesVistas[ordemGeracoes.shift()]; }
  function escreverLeituraGeracao(g, plano) {
    var pct = g.avaliados ? Math.round(100 * (g.robustos || 0) / g.avaliados) : 0;
    var frase = 'MARK ' + g.geracao + ' · ' + (g.avaliados || 0) + ' avaliações, ' + (g.robustos || 0) + ' sobreviveram (' + pct + '%) · ' + num(g.monocultura_pct, 0) + '% da família ' + (g.familia_maior || '—');
    if (plano && plano.truncado) frase += ' — no chafariz só cabem ' + plano.n;
    var el = document.createElement('div'); el.className = 'pred-lin nova' + ((g.monocultura_pct || 0) > 80 ? ' am' : '');
    el.innerHTML = '<i>' + escH(horaDe(g.quando)) + '</i><b>LABORATÓRIO</b> ' + escH(frase);
    escreverNaColuna(el);
  }
  function construirImprensa() {
    var g = grupoNoAndar(6); if (!g || !D) return;
    var fontes = lista(D.funcionarios).filter(function (f) { return f.andar === 6; }); if (!fontes.length) return;
    var maxCred = 0; fontes.forEach(function (f) { var c = obj(f.importancia).credibilidade; if (c != null && isFinite(c)) maxCred = Math.max(maxCred, c); });
    var hubF = fontes.filter(function (f) { return f.id === 'professores'; })[0] || fontes[0], raios = fontes.filter(function (f) { return f !== hubF; });
    var cx = -LARG * 0.22, cy = 2.05, cz = 3.5, R = 1.95;
    imprensa = { hubId: hubF.id, nos: {}, ordem: [], ondas: [], pool: [], x: cx, y: cy, z: cz, grupo: g };
    function no(f, x, y, z) {
      var cred = obj(f.importancia).credibilidade, semPlacar = (cred == null), r = raioDoNo(cred, maxCred, 0.10, 0.30);
      var m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), semPlacar ? new THREE.MeshBasicMaterial({ color: 0x4a5462, wireframe: true }) : new THREE.MeshBasicMaterial({ color: 0x5ac8fa }));
      m.position.set(x, y, z); g.add(m);
      if (!semPlacar) { var et = rotuloCurto(String(f.id).slice(0, 14), 0x9ad0ff, 1.9); et.position.set(x, y + r + 0.30, z); g.add(et); }
      imprensa.nos[f.id] = { x: x, y: y, z: z, r: r, cred: (cred == null ? null : Number(cred)), sem_placar: semPlacar, malha: m, raio: null, aceso: 0, ultima: f.ultima_corrida_brt };
      imprensa.ordem.push(f.id);
    }
    no(hubF, cx, cy, cz); imprensa.nos[hubF.id].malha.material.color.setHex(0xe6e9ee);
    raios.forEach(function (f, i) {
      var ang = -Math.PI / 2 + (i / raios.length) * Math.PI * 2, x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R * 0.55;
      no(f, x, y, cz);
      var ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, cy, cz), new THREE.Vector3(x, y, cz)]), new THREE.LineBasicMaterial({ color: 0x1e3a4a }));
      g.add(ln); imprensa.nos[f.id].raio = ln;
    });
  }
  function ondaDaFonte(id) {
    if (!imprensa) return false;
    var no = imprensa.nos[id] || imprensa.nos[imprensa.hubId];
    if (!no || imprensa.ondas.length >= MAX_ONDAS) return false;
    var m = imprensa.pool.pop();
    if (!m) m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 28), new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(no.x, no.y, no.z); m.scale.set(0.2, 0.2, 0.2); m.material.opacity = 0.9; m.visible = true;
    imprensa.grupo.add(m); imprensa.ondas.push({ malha: m, t0: performance.now() }); no.aceso = performance.now();
    return true;
  }
  function animarOndas(agora) {
    if (!imprensa) return;
    var O = imprensa.ondas;
    for (var i = O.length - 1; i >= 0; i--) {
      var o = O[i], u = (agora - o.t0) / DUR_ONDA_MS;
      if (u >= 1) { imprensa.grupo.remove(o.malha); o.malha.visible = false; imprensa.pool.push(o.malha); O.splice(i, 1); continue; }
      var s = 0.2 + u * 2.4; o.malha.scale.set(s, s, s); o.malha.material.opacity = 0.9 * (1 - u);
    }
    imprensa.ordem.forEach(function (id) {
      var no = imprensa.nos[id]; if (!no.aceso || !no.raio) return;
      var u = (agora - no.aceso) / DUR_ONDA_MS;
      if (u >= 1) { no.aceso = 0; no.raio.material.color.setHex(0x1e3a4a); return; }
      no.raio.material.color.setRGB(0.12 + 0.24 * (1 - u), 0.23 + 0.55 * (1 - u), 0.29 + 0.69 * (1 - u));
    });
  }
  function construirAnel() {
    var g = grupoNoAndar(9); if (!g) return;
    var cx = 0, cz = 0, R = Math.min(3.3, Math.max(1.8, LARG * 0.16)), cy = 1.35;
    var inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 1, 0.44), new THREE.MeshBasicMaterial({}), MAX_BARRAS);
    inst.count = 0; inst.frustumCulled = false; g.add(inst);
    var base = new THREE.Mesh(new THREE.RingGeometry(R - 0.06, R + 0.06, 56), new THREE.MeshBasicMaterial({ color: 0x24404f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    base.rotation.x = -Math.PI / 2; base.position.set(cx, cy, cz); g.add(base);
    anel = { inst: inst, barras: [], assinatura: '', x: cx, y: cy, z: cz, R: R, etiqueta: null, t0: 0, grupo: g };
  }
  function actualizarAnel() {
    if (!anel || !T) return;
    var p = obj(T.pepper), todas = lista(p.linhas).concat(lista(p.controlo));
    if (!todas.length) return;
    var ass = String(obj(p.cabecalho).gerado || '') + '|' + todas.length + '|' + todas.map(function (l) { return num(l.realizado, 4); }).join(',');
    if (ass === anel.assinatura) return;
    anel.assinatura = ass;
    var maxAbs = 0; todas.forEach(function (l) { var v = Math.abs(Number(l.realizado) || 0); if (v > maxAbs) maxAbs = v; });
    var n = Math.min(todas.length, MAX_BARRAS), melhor = -Infinity, iMelhor = -1, antigas = {};
    anel.barras.forEach(function (b) { antigas[b.chave] = b.h; });
    anel.barras = [];
    for (var i = 0; i < n; i++) {
      var l = todas[i], controlo = (l.nivel === 'controlo'), h = alturaDaBarra(l.realizado, maxAbs, ALT_BARRA_MAX, ALT_BARRA_MIN), v = Number(l.realizado) || 0;
      if (!controlo && v > melhor) { melhor = v; iMelhor = i; }
      var ang = (i / n) * Math.PI * 2;
      anel.barras.push({ chave: l.chave || ('#' + i), nome: l.nome_curto || l.chave || ('#' + i), controlo: controlo, realizado: v, alvo: h,
        h: (antigas[l.chave] != null ? antigas[l.chave] : 0), x: anel.x + Math.cos(ang) * anel.R, z: anel.z + Math.sin(ang) * anel.R,
        cor: controlo ? 0x8a94a3 : (v > 0 ? 0x3ecf8e : (v < 0 ? 0xff5a5f : 0x4a5462)) });
    }
    anel.inst.count = anel.barras.length; anel.t0 = performance.now();
    if (anel.etiqueta) { anel.grupo.remove(anel.etiqueta); anel.etiqueta.material.map.dispose(); anel.etiqueta.material.dispose(); anel.etiqueta = null; }
    if (iMelhor >= 0 && melhor > 0) { var b = anel.barras[iMelhor]; anel.etiqueta = rotuloCurto(b.nome + '  ' + sinal(b.realizado, 2), 0x3ecf8e, 3.4); anel.etiqueta.position.set(b.x, anel.y + Math.abs(b.alvo) + 0.42, b.z); anel.grupo.add(anel.etiqueta); }
    pintarBarras(0);
  }
  function pintarBarras(f) {
    if (!anel) return;
    var m = new THREE.Matrix4(), c = new THREE.Color();
    anel.barras.forEach(function (b, i) {
      b.h = b.h + (b.alvo - b.h) * f;
      var alt = Math.max(0.02, Math.abs(b.h));
      m.makeScale(1, alt, 1); m.setPosition(b.x, anel.y + (b.h < 0 ? -alt / 2 : alt / 2), b.z);
      anel.inst.setMatrixAt(i, m); c.setHex(b.cor); anel.inst.setColorAt(i, c);
    });
    anel.inst.instanceMatrix.needsUpdate = true; if (anel.inst.instanceColor) anel.inst.instanceColor.needsUpdate = true;
  }
  function animarAnel(agora) {
    if (!anel || !anel.t0) return;
    var u = (agora - anel.t0) / DUR_ANEL_MS;
    if (u >= 1) { anel.t0 = 0; pintarBarras(1); return; }
    pintarBarras(0.14);
  }

  // ================================================================ o lado e os cartoes (o que fica da v3)
  var MAX_CARTOES = 14;
  function pintarAcorde() {
    var el = $('acorde'); if (!el || !D) return;
    // dobrado nao se pinta: esconder um canvas e continuar a desenha-lo e pagar o custo sem ver o resultado.
    if (el.closest && el.closest('.lado-bl') && el.closest('.lado-bl').classList.contains('dobrado')) return;
    var andarDe = {}; lista(D.funcionarios).forEach(function (f) { andarDe[f.id] = andarTorreDe(f); });
    var nomeDe = {}; lista(D.andares_torre && D.andares_torre.length ? D.andares_torre : D.andares).forEach(function (a) { nomeDe[a.n] = a.nome; });
    var ac = acordeDoGrafo(D.ligacoes, andarDe);
    var W = Math.max(200, Math.round(el.clientWidth || 300)), H = 230;
    var ass = W + '|' + ac.total + '|' + ac.arcos.length + '|' + ac.dentro + '|' + ac.sem_andar;
    if (el.dataset.ass === ass) return;
    el.dataset.ass = ass;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); el.style.height = H + 'px';
    var g = el.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2 - 2, R = Math.min(W, H) / 2 - 38, n = ac.nos.length, pos = {};
    ac.nos.forEach(function (no, i) { var p = lugarNoCirculo(i, n, R); pos[no.andar] = { x: cx + p.x, y: cy + p.y, ang: p.ang, grau: no.grau }; });
    var maxN = 1; ac.arcos.forEach(function (a) { maxN = Math.max(maxN, a.n); });
    g.lineCap = 'round';
    ac.arcos.forEach(function (a) {
      var p1 = pos[a.de], p2 = pos[a.para]; if (!p1 || !p2) return;
      var domHier = a.hierarquia > a.ficheiro;
      g.strokeStyle = (domHier ? 'rgba(232,176,75,' : 'rgba(90,200,250,') + (0.22 + 0.5 * a.n / maxN).toFixed(3) + ')';
      g.lineWidth = 0.7 + 3.1 * (a.n / maxN);
      g.beginPath(); g.moveTo(p1.x, p1.y); g.quadraticCurveTo(cx + (cx - (p1.x + p2.x) / 2) * 0.10, cy + (cy - (p1.y + p2.y) / 2) * 0.10, p2.x, p2.y); g.stroke();
    });
    var maxG = 1; ac.nos.forEach(function (no) { maxG = Math.max(maxG, no.grau); });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ac.nos.forEach(function (no) {
      var p = pos[no.andar], r = 2.6 + 3.4 * Math.sqrt(no.grau / maxG);
      g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fillStyle = '#e6edf6'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(90,200,250,.8)'; g.stroke();
      var lx = cx + Math.cos(p.ang) * (R + 17), ly = cy + Math.sin(p.ang) * (R + 15);
      g.font = '700 10px ' + FONTE_MONO; g.fillStyle = '#dfe6ef'; g.fillText(curto4(nomeDe[no.andar]), lx, ly - 4);
      g.font = '500 8.5px ' + FONTE_MONO; g.fillStyle = '#7b8695'; g.fillText(no.andar === -1 ? 'cave' : String(no.andar), lx, ly + 6);
    });
    txt($('ac_kn'), ac.total + ' ligação(ões)');
    var top = ac.arcos.slice(0, 3).map(function (a) { return '<b>' + escH(curto4(nomeDe[a.de])) + '→' + escH(curto4(nomeDe[a.para])) + '</b> ' + a.n; }).join(' · ');
    $('ac_leg').innerHTML = '<span class="fi">ficheiro ' + ac.arcos.reduce(function (t, a) { return t + a.ficheiro; }, 0) + '</span>' +
      '<span class="hi">hierarquia ' + ac.arcos.reduce(function (t, a) { return t + a.hierarquia; }, 0) + '</span>' +
      '<span>no mesmo andar ' + ac.dentro + '</span>' + (ac.sem_andar ? '<span class="hi">sem andar ' + ac.sem_andar + '</span>' : '') + (top ? '<span>' + top + '</span>' : '');
  }
  // v5: a gaveta do Pointer - abre a pagina antiga (index.html) ao vivo, dentro da torre; carrega so a primeira vez
  function ligarGavetaDoPointer() {
    var bt = $('btn_pointer'), gv = $('pointer_dados'), fx = $('pg_fechar');
    if (!bt || !gv) return;
    bt.addEventListener('click', function () { gv.hidden = false; bt.classList.add('on'); });
    if (fx) fx.addEventListener('click', function () { gv.hidden = true; bt.classList.remove('on'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gv.hidden) { gv.hidden = true; bt.classList.remove('on'); } });
  }
  function iniciais(nome) { var ps = String(nome || '').split(/\s+/).filter(Boolean); return ((ps[0] || '?')[0] + (ps.length > 1 ? ps[ps.length - 1][0] : '')).toUpperCase(); }
  function corDoAndar(n) { var h = ((Number(n) || 0) * 47) % 360; return 'hsl(' + h + ', 62%, 62%)'; }
  function semente(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  // v5 (ordem dele: "avatares mais sofisticados, como o atsmatrix"): um BUSTO desenhado a partir do nome - pele,
  // cabelo, casaco da divisao, viseira e auricular - com o brilho do HUD. Deterministico: o mesmo nome da sempre a
  // mesma cara. Sem imagens do MCU (direitos): e uma ilustracao nossa.
  function avatarSVG(nome, corDivisao, feminino) {
    var h = semente(nome), peles = ['#f1c9a5', '#d9a679', '#b97a56', '#8d5a3b', '#f6d7bf', '#6b4128'];
    var cabelos = ['#1a1a1f', '#3b2416', '#7a4b2a', '#c9922b', '#d8d3c8', '#5b2a1e', '#2b2f55'];
    var pele = peles[h % peles.length], cab = cabelos[(h >> 3) % cabelos.length], estilo = (h >> 6) % 4;
    var cor = corDivisao || '#5ac8fa';
    var cabelo = feminino ? '<path d="M14 30 C12 12 52 12 50 30 L50 44 C46 40 44 34 42 26 C36 30 26 30 22 24 C20 32 18 40 14 44 Z" fill="' + cab + '"/>'
      : (estilo === 0 ? '<path d="M17 27 C18 14 46 14 47 27 L45 24 C38 19 26 19 19 24 Z" fill="' + cab + '"/>'
      : estilo === 1 ? '<path d="M16 29 C16 12 48 12 48 29 L44 22 C36 16 28 16 20 22 Z" fill="' + cab + '"/>'
      : estilo === 2 ? '<path d="M18 26 C22 12 42 12 46 26 L42 21 L36 17 L28 17 L22 21 Z" fill="' + cab + '"/>'
      : '<path d="M17 28 C17 15 47 15 47 28 L46 30 L18 30 Z" fill="' + cab + '"/>');
    return '<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">' +
      '<defs><radialGradient id="g' + h + '" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#1c2a3a"/><stop offset="1" stop-color="#0a0f16"/></radialGradient></defs>' +
      '<rect x="1" y="1" width="62" height="62" rx="10" fill="url(#g' + h + ')" stroke="' + cor + '" stroke-opacity=".7" stroke-width="1.5"/>' +
      '<path d="M8 64 C8 50 20 46 32 46 C44 46 56 50 56 64 Z" fill="' + cor + '" fill-opacity=".85"/>' +
      '<path d="M22 47 L32 56 L42 47 L42 64 L22 64 Z" fill="#0b1018" fill-opacity=".45"/>' +
      '<ellipse cx="32" cy="30" rx="12" ry="14" fill="' + pele + '"/>' + cabelo +
      '<rect x="20" y="27" width="24" height="5" rx="2.5" fill="' + cor + '" fill-opacity=".9"/>' +
      '<rect x="18" y="28" width="3" height="8" rx="1.5" fill="#cfe3f2"/><rect x="43" y="28" width="3" height="8" rx="1.5" fill="#cfe3f2"/>' +
      '<path d="M27 38 Q32 41 37 38" stroke="#5a3a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }
  function barraMetrica(rotulo, v, max) {
    var pct = max > 0 ? Math.max(0, Math.min(100, Math.round(100 * (Number(v) || 0) / max))) : 0;
    return '<span class="mtr" data-k="' + escH(rotulo) + '"><u>' + escH(rotulo === 'elegiveis' ? 'elegíveis' : rotulo) + '</u><i><b style="width:' + pct + '%"></b></i><em>' + escH(String(v == null ? '—' : v)) + '</em></span>';
  }
  // v5 (ordem dele): a fila de cartoes sao OS 10 MAIS IMPORTANTES DE TODA A CADEIA (torre_30.cargos_de_topo), nao
  // um por andar: Sr. Stark, directores, gerentes de operacoes, supervisores de operacoes, gerentes de andar.
  // O que se le em grande e "GERENTE ROGERS · SUPERVISORA ROMANOFF" (cargo + apelido); o heroi fica por baixo.
  // ---------------------------------------------------------------- v6 (19/09): o cartao reage ao agente
  // Visto quadro a quadro no canal: o agente que age ganha um BALAO por cima com a frase do que fez, e
  // acende. Aqui a frase vem da conversa do predio (conversa.json) e o cartao e o do cargo que manda no
  // andar de quem falou. Guarda-se o ultimo topo para saber que cargo cuida de que andar.
  var topoActual = [], balaoAte = {};
  // 20/09: quantas corridas de funcionarios este ecra ja viu desde que abriu. NAO se declara aqui o mapa das
  // horas: ele ja existe (`ultimaCorridaPorId`, usado por corridasNovas) e declarar outro com o mesmo nome foi
  // o que matou a minha primeira tentativa - a corridasNovas substitui o mapa INTEIRO antes, logo a comparacao
  // seguinte dava sempre igual e nao disparava nunca.
  var corridasVistas = 0;
  function cartaoDoAndar(andar) {
    if (andar == null) return null;
    var achado = null;
    topoActual.forEach(function (c) {
      if (achado) return;
      var ns = lista(c.andares);
      if ((ns.length && ns.indexOf(Number(andar)) >= 0) || Number(c.andar) === Number(andar)) achado = c;
    });
    return achado;
  }
  // 20/09 (ordem dele): "a informacao do chat fica so no chat, no cartao e somente reagir/acender". O balao
  // com o texto do que aconteceu SAIU - dizia duas vezes a mesma coisa e tapava o cartao do lado.
  function acenderCartao(c) {
    if (!c) return;
    var el = document.querySelector('.cartao.topo[data-id="' + String(c.id).replace(/"/g, '') + '"]');
    if (!el) return;
    el.classList.remove('acende');
    void el.offsetWidth;                       // reinicia a animacao mesmo que ja estivesse a correr
    el.classList.add('acende');
  }
  // 19/09: o tamanho dos cartoes a pedido dele, guardado no browser. Mudar a classe do body muda duas
  // variaveis CSS e mais nada - nao ha redesenho, so escala.
  function aplicarTamanhoCartoes(t) {
    t = (t === 's' || t === 'g') ? t : 'm';
    document.body.classList.remove('cart-s', 'cart-g');
    if (t !== 'm') document.body.classList.add('cart-' + t);
    var cx = $('ct_tam');
    if (cx) Array.prototype.forEach.call(cx.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.dataset.tam === t); });
    try { localStorage.setItem('torre_cartao_tam', t); } catch (e) { }
    if (typeof disporCartoes === 'function') { var c = $('cartoes'); if (c && topoActual.length) pintarCartoesDaCadeia(c, topoActual); }
  }
  (function () {
    var cx = $('ct_tam');
    if (!cx) return;
    cx.addEventListener('click', function (e) {
      var b = e.target; while (b && b !== this && !(b.dataset && b.dataset.tam)) b = b.parentNode;
      if (b && b !== this) aplicarTamanhoCartoes(b.dataset.tam);
    });
    var t = 'm';
    try { t = localStorage.getItem('torre_cartao_tam') || 'm'; } catch (e) { }
    aplicarTamanhoCartoes(t);
  })();
  // 19/09 (ordem dele): as seccoes da coluna dobram-se ao clique no titulo. Nascem fechadas menos as Leituras.
  (function () {
    var lado = $('lado'); if (!lado) return;
    var blocos = lado.querySelectorAll('.lado-bl');
    // 21/09: A MEMORIA DO DOBRADO PASSA A SER POR NOME, NAO POR POSICAO. Era um array indexado pela ordem das
    // seccoes - e bastou inserir as Pendencias no meio para cada seccao herdar o estado da vizinha. Estado
    // guardado por posicao quebra em silencio no dia em que a lista muda, e a lista muda sempre.
    var guardado = null;
    try { guardado = JSON.parse(localStorage.getItem('torre_lado_dobrado_v2') || 'null'); } catch (e) { }
    var ABERTAS = { bl_leituras: 1, bl_pend: 1 };   // as Pendencias nascem ABERTAS: ele pediu para nao as esquecer
    Array.prototype.forEach.call(blocos, function (s, i) {
      var chave = s.id || ('bl' + i);
      var fecha = (guardado && guardado[chave] != null) ? !!guardado[chave] : !ABERTAS[chave];
      s.classList.toggle('dobrado', fecha);
      var bh = s.querySelector('.bh'); if (!bh) return;
      bh.addEventListener('click', function (e) {
        if (e.target && e.target.closest && e.target.closest('button')) return;   // o recolher da coluna e outro botao
        s.classList.toggle('dobrado');
        var est = {}; Array.prototype.forEach.call(blocos, function (x, j) { est[x.id || ('bl' + j)] = x.classList.contains('dobrado') ? 1 : 0; });
        try { localStorage.setItem('torre_lado_dobrado_v2', JSON.stringify(est)); } catch (e2) { }
        if (!s.classList.contains('dobrado')) { try { pintarAcorde(); } catch (e3) { } }
      });
    });
  })();
  addEventListener('torre:mensagem', function (ev) {
    var m = obj(ev && ev.detail), a = obj(m.autor);
    var c = cartaoDoAndar(a.andar);
    if (!c) return;
    acenderCartao(c);                      // so acende; o texto da mensagem fica no chat
  });
  setInterval(function () {
    var agora = Date.now();
    Object.keys(balaoAte).forEach(function (id) {
      if (balaoAte[id] > agora) return;
      delete balaoAte[id];
      var el = document.querySelector('.cartao.topo[data-id="' + id.replace(/"/g, '') + '"]');
      var b = el && el.querySelector('.balao');
      if (b) b.hidden = true;
    });
  }, 700);
  function pintarCartoesDaCadeia(cx, topo) {
    topoActual = lista(topo);
    var modo = disporCartoes(cx, topo.length);
    var maxDep = Math.max.apply(null, topo.map(function (c) { return num0(c.dependentes); }).concat([1]));
    var maxEle = Math.max.apply(null, topo.map(function (c) { return num0(c.elegiveis); }).concat([1]));
    var maxRob = Math.max.apply(null, topo.map(function (c) { return num0(c.robustos); }).concat([1]));
    var corDiv = { Negociacao: '#3ecf8e', Controlo: '#e8b04b', Dados: '#5ac8fa' };
    // a ESTRUTURA (quem sao os 10) refaz-se; os VALORES andam por tween registada e a actividade e recontada a cada leitura
    var ass = topo.map(function (c) { return c.id + ':' + c.titulo; }).join('|');
    if (cx.dataset.ass !== ass) {
      cx.dataset.ass = ass; cartoesTopo = {};
      cx.innerHTML = topo.map(function (c) {
        var onde = c.andar != null ? ('andar ' + c.andar) : '';
        if (c.andares && c.andares.length) onde += (onde ? ' · ' : '') + 'cuida de ' + c.andares.length + ' andar(es)';
        var cor = corDiv[c.divisao] || '#ffd479';
        var activo = num0(c.dependentes) > 0;
        return '<button type="button" class="cartao topo ' + (activo ? 'ok' : 'zero') + '" data-id="' + escH(c.id) + '" data-andar="' + escH(c.andar == null ? '' : c.andar) + '" title="' + escH((c.titulo_completo || c.titulo || '') + ' — ' + (c.criterio || '')) + '">' +
          '<span class="balao" hidden></span>' +
          '<span class="cab"><span class="avatar">' + avatarSVG(c.personagem || c.heroi, cor, !!c.feminino) + '</span>' +
          '<span class="ident"><u>' + ('0' + (c.posicao || 0)).slice(-2) + ' / ' + escH(String(c.cargo_banco || c.cargo || '').toUpperCase()) + '</u>' +
          '<b>' + escH(String(c.titulo || c.heroi || '').toUpperCase()) + '</b>' +
          '<em>' + escH(String(c.heroi || '') + (c.divisao ? ' · ' + c.divisao : '')) + '</em>' +
          '<s class="selo" style="border-color:' + cor + ';color:' + cor + '">' + (activo ? 'ACTIVO' : 'SEM EQUIPA') + '</s></span></span>' +
          '<span class="falha">' + escH(onde || c.divisao || 'toda a torre') + '</span>' +
          '<span class="act"><i></i><span>—</span></span>' +
          '<span class="metricas">' + barraMetrica('dependentes', c.dependentes, maxDep) + barraMetrica('elegiveis', c.elegiveis, maxEle) + barraMetrica('robustos', c.robustos, maxRob) + '</span>' +
          '<span class="num">' + escH(String(c.dependentes == null ? '—' : c.dependentes)) + '</span><span class="fonte">dependentes</span></button>';
      }).join('');
      Array.prototype.forEach.call(cx.querySelectorAll('.cartao.topo'), function (el, i) {
        var c = topo[i];
        cartoesTopo[c.id] = { el: el, id: c.id, titulo: String(c.titulo || c.heroi || ''), andares: andaresDoCargo(c), dependentes: num0(c.dependentes), elegiveis: num0(c.elegiveis), robustos: num0(c.robustos),
                              activos60: null, n5: 0, aCorrer: null, total: null, pulsos: 0, tempo: null };
      });
    }
    topo.forEach(function (c) {
      var ct = cartoesTopo[c.id]; if (!ct) return;
      [['dependentes', maxDep], ['elegiveis', maxEle], ['robustos', maxRob]].forEach(function (par) {
        var k = par[0], mx = par[1], v = num0(c[k]);
        if (ct[k] !== v) {
          // O VALOR MUDOU ENTRE DUAS LEITURAS: a barra e o numero andam do antigo para o novo (tween registada)
          var de = ct[k]; ct[k] = v;
          registarTween('cartao ' + c.id + ' ' + k + ' ' + de + '->' + v, de, v, DUR_TWEEN_NUM_MS, function (x) { pintarMetricaDoCartao(ct, k, x, mx); }, function () { pintarMetricaDoCartao(ct, k, v, mx); });
        } else pintarMetricaDoCartao(ct, k, v, mx);   // o maximo da fila pode ter mudado
      });
      var act = actividadeDoCargo(ct.andares);
      if (act.activos60 !== ct.activos60 || act.aCorrer !== ct.aCorrer || act.total !== ct.total || act.n5 !== ct.n5) {
        ct.activos60 = act.activos60; ct.n5 = act.n5; ct.aCorrer = act.aCorrer; ct.total = act.total; pintarSeloDoCartao(ct);
      }
    });
    var t30 = obj(D.torre_30), tt = obj(t30.totais), tot = (tt.lideres || 0) + (tt.gerentes_andar || 0) + (tt.supervisores_operacoes || 0) + (tt.gerentes_operacoes || 0) + (tt.directores || 0) + 1;
    txt($('ct_kn'), topo.length + ' de ' + tot + ' cargos · toda a cadeia · ' + (modo === 'duas-filas' ? 'duas filas' : 'faixa'));
  }
  // ================================================================ 21/09: A FILA AO VIVO
  // ORDEM DELE: "no modo de visualizacao dos cards so esta os 10 mais importantes; quero que apareca TODOS os
  // que forem activados da Torre Stark. Cada funcionario vai ter um card, vai aparecer e vai sumir para dar
  // espaco a outro. Isso e para eu ver quem esta a trabalhar em tempo real."
  //
  // A REGRA, e e so uma: esta na fila quem CORREU HA MENOS DE `JANELA_VIVO_MIN` MINUTOS. Nada de amostra,
  // nada de ordenacao por importancia, nada de animacao decorativa - `minutos_desde_ultima` vem do registo do
  // predio, medido contra o agendador ou contra o ficheiro que o funcionario escreve, e e o mesmo numero que
  // faz o andar acender. Um cartao aqui significa exactamente uma coisa: este funcionario trabalhou agora.
  //
  // PORQUE E UMA JANELA E NAO UM CONTADOR DESDE QUE A PAGINA ABRIU: a primeira versao so punha um cartao
  // quando via o carimbo MUDAR em directo, e quem abrisse a pagina olhava para uma fila vazia ate ao ciclo
  // seguinte. Pior, a barra de vida media o tempo desde que o CARTAO nasceu no ecra - dois funcionarios com
  // trabalhos de horas diferentes tinham a mesma barra. Agora a barra mede o que diz que mede.
  // 22/09: 60 min em vez de 20. Com as 20 tarefas novas de hoje, muitos funcionarios correm UMA VEZ POR DIA
  // - numa janela de 20 min nunca apareceriam, e ele quer ver TODOS. Medido: 34 dos 156 cabiam em 20 min.
  // A janela e a definicao de "reagiu ha pouco"; alarga-la mostra mais gente sem inventar actividade nenhuma.
  var JANELA_VIVO_MIN = 60;
  // 22/09: o tecto sobe para 80 e passa a ser DITO na legenda quando morde. Cada cartao sao ~25 nos de DOM,
  // e ele tambem se queixou de a torre travar - um tecto tem de existir. O que nao pode existir e um tecto
  // MUDO: esconder cartoes sem o dizer foi exactamente a queixa dele sobre o "+N".
  var TETO_VIVOS = 80;
  var vivos = [];                    // [{id, el, ms, repetiu}] - o mais recente primeiro
  var vivosVistos = {}, vivosTotal = 0, lidoEm = 0;

  var modoCartoes = 'vivo';
  function lerModoCartoes() {
    try { var m = localStorage.getItem('torre_cartao_modo'); if (m === 'cadeia' || m === 'vivo') return m; } catch (e) { }
    return 'vivo';
  }
  function haQuanto(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? ('ha ' + s + ' s') : ('ha ' + Math.floor(s / 60) + ' min');
  }
  function numeroDe(id) {
    var achado = null;
    comNumero.forEach(function (d) { if (!achado && d.f.id === id) achado = d.nu; });
    return achado;
  }
  // a idade REAL do trabalho: o que o registo mediu, mais o tempo de relogio desde que se leu o registo
  function idadeDoTrabalho(f) {
    var m = Number(f && f.minutos_desde_ultima);
    if (!isFinite(m) || m < 0) return null;
    return m * 60000 + Math.max(0, performance.now() - lidoEm);
  }
  function corHex(n) { return '#' + ('000000' + (Number(n) >>> 0).toString(16)).slice(-6); }
  // a cor do cartao E o estado do funcionario - a mesma que a figura dele tem dentro da torre
  var COR_ESTADO_CSS = { ok: '#5ac8fa', a_correr: '#3ecf8e', atrasado: '#e8b04b', erro: '#ff5a5f',
                         a_dormir: '#98a2b0', sem_tarefa: '#7b8695' };
  function corDoFuncionario(f) { return COR_ESTADO_CSS[f && f.estado] || '#5ac8fa'; }
  function quandoCorreu(f) {
    var m = Number(f && f.minutos_desde_ultima);
    if (!isFinite(m)) return 'sem carimbo de corrida';
    var s = m < 1 ? 'agora mesmo' : (m < 60 ? 'há ' + Math.round(m) + ' min' : 'há ' + (m / 60).toFixed(1) + ' h');
    var p = Number(f.minutos_para_proxima);
    if (isFinite(p) && p >= 0) s += ' · volta em ' + (p < 60 ? Math.round(p) + ' min' : (p / 60).toFixed(1) + ' h');
    return s;
  }
  function seloDoFuncionario(f) {
    var m = Number(f && f.minutos_desde_ultima);
    if (isFinite(m) && m <= 5) return 'A CORRER';
    return String((f && f.estado) || 'sem estado').replace(/_/g, ' ').toUpperCase();
  }
  // 22/09: o cartao ao vivo E um `.cartao.topo` - a MESMA classe dos 10, nao uma imitacao. Quem imita diverge
  // no dia em que alguem corrigir o original; quem herda a classe herda tambem as correccoes.
  function cartaoVivoEl(f, nu, andar) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'cartao topo vivo ' + escH((nu && nu.classe) || 'hora');
    el.dataset.id = f.id; el.dataset.andar = (andar == null ? '' : andar);
    el.title = f.id + ' — ' + (f.dono_da_falha || 'sem falha declarada');
    el.innerHTML = corpoDoCartaoVivo(f, nu, andar);
    return el;
  }
  function corpoDoCartaoVivo(f, nu, andar) {
    var el_ = obj(f.elenco), cor = corDoFuncionario(f), eq = obj(f.equipa);
    var nProp = num0(eq.n_propriedades), nCasos = num0(eq.n_casos), nTar = lista(f.tarefas).length;
    // 🔴 22/09, queixa dele: "so ta a mostrar os gerentes e diretores, quando eu quero TODOS os funcionarios -
    // auditoria, cerebro, pesquisa, rh e todo o resto". MEDIDO: o carrossel ja cobria 13 dos 15 sectores. O
    // problema era o que eu tinha escrito NO CARTAO: o nome grande era o do PERSONAGEM (`Gerente Barnes`,
    // `Director Rhodes`) e a funcao real (`risco`, `cortex`, `auditoria`) ia em letra pequena - e o cartao
    // fechado nem mostra a letra pequena. Ele lia GERENTE em todos e concluia, com razao, que so havia
    // gerentes. **O cartao mostrava o disfarce e escondia o funcionario.**
    // Agora: em cima o SECTOR (o que ele quer ver), em grande o FUNCIONARIO, e o personagem por baixo.
    // 🔴 22/09, ele outra vez, e tem razao nas duas: "os cartoes dos funcionarios nao estao com nomes,
    // lembra que eu falei que os importantes teriam nomes dos personagens, e quanto menor o cargo o nome
    // seria de FIGURANTE". De manha eu tinha trocado o nome do personagem pelo id cru (`sentinela`,
    // `conversa`, `cartoes`) para resolver a queixa de que so se viam "Gerente" e "Supervisor" - e resolvi
    // essa estragando outra. **A queixa dele nunca foi o NOME: era nao ver o SECTOR.** O sector ja esta na
    // linha de cima desde entao; o nome volta a ser o do elenco.
    // Usa-se o APELIDO e nao o titulo completo: "KARPOV" cabe no cartao, "Gerente Karpov" nao - e era o
    // "Gerente" repetido em todos que lhe dava a impressao de so haver gerentes.
    var nome = String(el_.apelido || el_.personagem || el_.heroi || f.nome || f.id);
    var persona = String(el_.titulo_curto || el_.heroi || '');
    return '<span class="cab"><span class="avatar">' + avatarSVG(el_.personagem || el_.heroi || f.id, cor, !!el_.feminino) + '</span>' +
      '<span class="ident"><u>' + escH(String(f.sector || 'torre').toUpperCase() + (andar == null ? '' : ' · ' + andar)) + '</u>' +
      '<b>' + escH(nome.toUpperCase()) + '</b>' +
      '<em>' + escH((f.cargo || '') + (persona ? ' · ' + persona : '')) + '</em>' +
      '<s class="selo" style="border-color:' + cor + ';color:' + cor + '">' + escH(seloDoFuncionario(f)) + '</s></span></span>' +
      '<span class="falha">' + escH(f.dono_da_falha || 'sem falha declarada') + '</span>' +
      '<span class="act"><i></i><span>' + escH(quandoCorreu(f) + ' · ' + (f.fonte_do_relogio || 'sem prova')) + '</span></span>' +
      '<span class="metricas">' +
        barraMetrica('propriedades', nProp, Math.max(1, maxVivo('prop'))) +
        barraMetrica('casos', nCasos, Math.max(1, maxVivo('casos'))) +
        barraMetrica('tarefas', nTar, Math.max(1, maxVivo('tarefas'))) + '</span>' +
      '<span class="num">' + escH((nu && nu.texto) || '—') + '</span>' +
      '<span class="fonte">' + escH((nu && nu.fonte) || f.fonte_do_relogio || '') + ' <span class="quando">agora</span></span>' +
      '<span class="vida"></span>';
  }
  // o maximo de cada barra e o maximo DA FILA, nao um numero inventado: a barra compara quem esta ao lado
  var maximosVivos = { prop: 1, casos: 1, tarefas: 1 };
  function maxVivo(k) { return maximosVivos[k] || 1; }
  function recalcularMaximosVivos() {
    var m = { prop: 1, casos: 1, tarefas: 1 };
    vivos.forEach(function (v) {
      var eq = obj(v.f && v.f.equipa);
      m.prop = Math.max(m.prop, num0(eq.n_propriedades));
      m.casos = Math.max(m.casos, num0(eq.n_casos));
      m.tarefas = Math.max(m.tarefas, lista(v.f && v.f.tarefas).length);
    });
    maximosVivos = m;
  }

  // ---------------------------------------------------------------- AS CADEIRAS (o desenho dele, 22/09)
  // Um numero FIXO de lugares. Quem reage acende no seu lugar; quem chega com os lugares cheios senta-se no
  // do MAIS ANTIGO. A fila e o TEMPO e nao o espaco - por isso nao ha rolagem nem "+N": nunca ha mais
  // cartoes do que lugares.
  // 22/09: quantos lugares cabem MEDE-SE, nao se supoe. Ele quer 13/14; num ecra de 1400 o cartao fechado
  // mede ~140 px e so cabem 7 - o numero de lugares e o que a largura DELE der, ate 14. Uma constante fixa
  // ou mentia (cartoes cortados) ou desperdicava metade da linha.
  var MAX_CADEIRAS = 14;
  function quantasCadeiras(cx) {
    if (!cx) return 8;
    var largura = cx.clientWidth || 1000, gap = 7;
    var est = window.getComputedStyle ? window.getComputedStyle(cx) : null;
    if (est && est.gap) { var g = parseFloat(est.gap); if (isFinite(g)) gap = g; }
    // 22/09: `offsetWidth` e nao `getBoundingClientRect().width`. O segundo inclui a ESCALA da animacao de
    // entrada (`scale(.94)`), logo um cartao a entrar media 6% menos, cabiam 12 em vez de 11, e o numero de
    // lugares oscilava entre leituras - com cartoes a ser deitados fora a cada oscilacao. **Medir uma coisa
    // a meio de uma animacao e medir a animacao.**
    var prim = cx.querySelector('.cartao.vivo');
    var larg = (prim && prim.offsetWidth) || 132;
    return Math.max(4, Math.min(MAX_CADEIRAS, Math.floor((largura + gap) / (larg + gap))));
  }
  // `vivos` passa a ser AS CADEIRAS, por ordem de ecra. Cada uma: {id, el, f, aceso_em}
  function sentar(f) {
    if (!f || !f.id) return null;
    var cx = $('cartoes'); if (!cx) return null;
    var n = quantasCadeiras(cx);
    var ja = null; vivos.forEach(function (v) { if (v.id === f.id) ja = v; });
    if (ja) {                                   // ja esta sentado: acende e actualiza
      ja.f = f; ja.aceso_em = performance.now();
      actualizarCadeira(ja);
      acenderCadeira(ja);
      return ja;
    }
    if (!vivosVistos[f.id]) { vivosVistos[f.id] = true; vivosTotal++; }
    if (vivos.length < n) {                     // ha lugar livre
      var el = cartaoVivoEl(f, numeroDe(f.id), andarTorreDe(f));
      var v = { id: f.id, el: el, f: f, aceso_em: performance.now() };
      vivos.push(v);
      if (modoCartoes === 'vivo') cx.appendChild(el);
      acenderCadeira(v);
      return v;
    }
    // lugares cheios: senta-se no do MAIS ANTIGO (ordem dele: "vao aparecendo em cima dos que ja apareceram")
    var velho = vivos[0];
    vivos.forEach(function (v) { if (v.aceso_em < velho.aceso_em) velho = v; });
    velho.id = f.id; velho.f = f; velho.aceso_em = performance.now(); velho.ass = null;
    velho.el.dataset.id = f.id;
    velho.el.innerHTML = corpoDoCartaoVivo(f, numeroDe(f.id), andarTorreDe(f));
    velho.el.classList.remove('reentra'); void velho.el.offsetWidth; velho.el.classList.add('reentra');
    acenderCadeira(velho);
    return velho;
  }
  function acenderCadeira(v) {
    v.el.classList.remove('acende'); void v.el.offsetWidth; v.el.classList.add('acende');
  }
  // so o TEXTO muda: refazer o HTML de um cartao a cada leitura foi a fuga de nos que se corrigiu hoje
  function actualizarCadeira(v) {
    var ass = JSON.stringify([v.f.estado, v.f.minutos_desde_ultima, v.f.minutos_para_proxima,
                              (numeroDe(v.id) || {}).texto, maximosVivos]);
    if (v.ass === ass) return;
    v.ass = ass;
    var nu2 = numeroDe(v.id) || {};
    txt(v.el.querySelector('.num'), nu2.texto || '\u2014');
    txt(v.el.querySelector('.act > span'), quandoCorreu(v.f) + ' \u00b7 ' + (v.f.fonte_do_relogio || 'sem prova'));
    var selo = v.el.querySelector('.selo');
    if (selo) { txt(selo, seloDoFuncionario(v.f)); var c2 = corDoFuncionario(v.f); selo.style.borderColor = c2; selo.style.color = c2; }
    var eq2 = obj(v.f.equipa);
    pintarMetricaDoCartao({ el: v.el }, 'propriedades', num0(eq2.n_propriedades), Math.max(1, maxVivo('prop')));
    pintarMetricaDoCartao({ el: v.el }, 'casos', num0(eq2.n_casos), Math.max(1, maxVivo('casos')));
    pintarMetricaDoCartao({ el: v.el }, 'tarefas', lista(v.f.tarefas).length, Math.max(1, maxVivo('tarefas')));
  }
  // a cada leitura: quem correu senta-se. Nao se "refaz a fila" - a fila e o historico dos lugares.
  //
  // 🔴 22/09, REGRESSAO MINHA, apanhada por ele em minutos: ao passar para lugares fixos, o UNICO caminho
  // para alguem se sentar ficou a ser `corridasNovas` - uma corrida detectada ENTRE DUAS LEITURAS. Ao abrir
  // a pagina nao ha "entre duas leituras": a primeira leitura so estabelece a base. Resultado: **a fila
  // aparecia VAZIA e so enchia ao fim de minutos**, um funcionario de cada vez. Os cartoes "sumiram".
  // A versao anterior enchia a fila a partir da JANELA e por isso nunca teve este problema; ao trocar o
  // desenho, deitei fora a parte que o desenho novo tambem precisava.
  // Agora: os lugares LIVRES enchem-se com quem correu mais recentemente na janela. O lugar so se DISPUTA
  // quando estao todos ocupados - e ai vale a regra dele, entra por cima do mais antigo.
  function encherLugaresLivres() {
    var cx = $('cartoes'); if (!cx || !D) return;
    var n = quantasCadeiras(cx);
    if (vivos.length >= n) return;
    var sentados = {}; vivos.forEach(function (v) { sentados[v.id] = true; });
    var candidatos = [];
    lista(D.funcionarios).forEach(function (f) {
      if (!f.ultima_corrida_brt || sentados[f.id]) return;
      var idade = idadeDoTrabalho(f);
      if (idade == null || idade > JANELA_VIVO_MIN * 60000) return;
      candidatos.push({ f: f, idade: idade });
    });
    candidatos.sort(function (a, b) { return a.idade - b.idade; });   // o mais recente primeiro
    for (var i = 0; i < candidatos.length && vivos.length < n; i++) sentar(candidatos[i].f);
  }
  function refazerFilaViva() {
    if (!D) return;
    recalcularMaximosVivos();
    var cx = $('cartoes');
    // encolher se a janela ficou estreita (nunca ha mais cartoes do que lugares)
    if (cx) {
      var n = quantasCadeiras(cx);
      while (vivos.length > n) {
        var fora = vivos.pop();
        if (fora.el.parentNode) fora.el.parentNode.removeChild(fora.el);
      }
    }
    vivos.forEach(actualizarCadeira);
    encherLugaresLivres();
    tiquesDaFilaViva();
  }
  function acenderNoVivo(f) { try { sentar(f); } catch (e) { } }

  function tiquesDaFilaViva() {
    var cx = $('cartoes');
    vivos.forEach(function (v) {
      var idade = idadeDoTrabalho(v.f); if (idade == null) return;
      var resta = Math.max(0, Math.min(1, 1 - idade / (JANELA_VIVO_MIN * 60000)));
      var barra = v.el.querySelector('.vida'); if (barra) barra.style.transform = 'scaleX(' + resta.toFixed(3) + ')';
      var q = v.el.querySelector('.quando'); if (q) txt(q, haQuanto(idade));
    });
    if (modoCartoes !== 'vivo' || !cx) return;
    var mais = cx.querySelector('.cartao-mais');
    if (mais && mais.parentNode) mais.parentNode.removeChild(mais);   // nunca ha "+N": os lugares sao fixos
    var tot = D ? lista(D.funcionarios).length : 0;
    txt($('ct_kn'), vivos.length
      ? (vivos.length + ' lugares \u00b7 ' + vivosTotal + ' funcion\u00e1rios j\u00e1 passaram por aqui \u00b7 ' + tot + ' na torre')
      : ('\u00e0 espera da primeira rea\u00e7\u00e3o \u00b7 ' + tot + ' na torre'));
  }

  function aplicarModoCartoes(m, guardar) {
    modoCartoes = (m === 'cadeia') ? 'cadeia' : 'vivo';
    if (guardar !== false) { try { localStorage.setItem('torre_cartao_modo', modoCartoes); } catch (e) { } }
    var bx = $('ct_modo');
    if (bx) Array.prototype.forEach.call(bx.querySelectorAll('button'), function (x) { x.classList.toggle('on', x.dataset.modo === modoCartoes); });
    var cx = $('cartoes'); if (!cx) return;
    while (cx.firstChild) cx.removeChild(cx.firstChild);
    cx.dataset.ass = '';
    if (modoCartoes === 'vivo') { vivos.forEach(function (v) { cx.appendChild(v.el); }); refazerFilaViva(); }
    else pintarCartoes();
  }
  (function () {
    var bx = $('ct_modo');
    if (bx) bx.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button[data-modo]') : null;
      if (b) aplicarModoCartoes(b.dataset.modo, true);
    });
    // aqui, e nao mais acima: neste ponto `vivos` e `modoCartoes` ja foram ATRIBUIDOS. O `var` ica a
    // declaracao mas nao o valor, e chamar isto antes dava `vivos.forEach de undefined` - a pagina morria
    // antes de `window.__predio` nascer.
    aplicarModoCartoes(lerModoCartoes(), false);
  })();
  setInterval(tiquesDaFilaViva, 250);

  function pintarCartoes() {
    if (modoCartoes === 'vivo') {
      // o `topoActual` tem de continuar a existir mesmo sem cartoes de cadeia no ecra: e ele que diz que CARGO
      // cuida de que andar, e disso depende o acender do andar. Sai-se cedo do DESENHO, nao do que se sabe.
      if (D) topoActual = lista(obj(D.torre_30).cargos_de_topo);
      return;
    }
    var cx = $('cartoes'); if (!cx || !D) return;
    var topo = lista(obj(D.torre_30).cargos_de_topo);
    if (topo.length) return pintarCartoesDaCadeia(cx, topo);
    var todos = comNumero.slice().sort(function (a, b) { return (obj(b.f.importancia).score || 0) - (obj(a.f.importancia).score || 0); });
    var lote = todos.slice(0, MAX_CARTOES);
    var ass = lote.map(function (d) { return d.f.id + ':' + d.nu.texto + ':' + d.f.estado; }).join('|') + '|' + cx.clientWidth;
    if (cx.dataset.ass === ass) return;
    cx.dataset.ass = ass;
    cx.innerHTML = lote.map(function (d, i) {
      var f = d.f;
      return '<button type="button" class="cartao ' + escH(d.nu.classe) + '" data-andar="' + escH(andarTorreDe(f)) + '" title="' + escH(f.id + ' — ' + (f.dono_da_falha || '')) + '">' +
        '<u>' + ('0' + (i + 1)).slice(-2) + '</u><b>' + escH(String(f.id).toUpperCase()) + '</b><em>' + escH(f.cargo || f.sector || '') + '</em>' +
        '<span class="falha">' + escH(f.dono_da_falha || 'sem falha declarada') + '</span><span class="num">' + escH(d.nu.texto) + '</span>' +
        '<span class="fonte">' + escH(d.nu.diz || '') + '</span></button>';
    }).join('');
    aparaCartoes(cx, lote.length);
    txt($('ct_kn'), cx.querySelectorAll('.cartao').length + ' de ' + todos.length + ' com número');
  }
  function aparaCartoes(cx, quantos) {
    var prim = cx.querySelector('.cartao'); if (!prim) return;
    var larg = prim.getBoundingClientRect().width, gap = 7;
    var est = window.getComputedStyle ? window.getComputedStyle(cx) : null;
    if (est && est.gap) { var g = parseFloat(est.gap); if (isFinite(g)) gap = g; }
    var disp = cx.clientWidth - MARGEM_CARTAO_PX, n = cartoesQueCabem(disp, larg, gap, quantos);
    if (n < quantos) n = cartoesQueCabem(disp - LARG_MAIS_PX - gap, larg, gap, quantos);
    n = Math.max(1, n);
    while (cx.children.length > n) cx.removeChild(cx.lastChild);
    if (quantos > n) { var mais = document.createElement('span'); mais.className = 'cartao-mais'; mais.textContent = '+' + (quantos - n); mais.title = (quantos - n) + ' cartão(oes) com número que não cabem nesta largura'; cx.appendChild(mais); }
  }
  function pintarSemNumero() {
    var cx = $('semnumero'); if (!cx) return;
    var ass = semNumero.map(function (x) { return x.id; }).join(',');
    if (cx.dataset.ass === ass) return;
    cx.dataset.ass = ass;
    cx.innerHTML = semNumero.map(function (x) { return '<span title="' + escH((x.dono_da_falha || '') + ' — ' + (x.porque || '')) + '"><u>' + escH(x.andar === -1 ? 'cave' : x.andar) + '</u>' + escH(x.id) + '</span>'; }).join('');
    var tot = D ? lista(D.funcionarios).length : 0;
    txt($('sn_kn'), semNumero.length + ' de ' + tot + ' · ' + (tot - semNumero.length) + ' moram');
  }
  function pintarNumerosDaCasa() {
    if (!D) return;
    var t = obj(D.totais);
    txt($('k_pas'), String((t.ligacoes_ficheiro || 0) + (t.ligacoes_hierarquia || 0)));
    txt($('k_pas_s'), (t.ligacoes_ficheiro || 0) + ' de ficheiro · ' + (t.ligacoes_hierarquia || 0) + ' de hierarquia');
    if (!T) return;
    var r = obj(T.reactor), c = obj(r.conta), gn = obj(r.ganho), p = obj(T.pepper), est = obj(obj(p.totais).estrategias), org = obj(T.orgaos);
    txt($('k_cap'), num(c.capital_escala, 2) + ' US$'); txt($('k_cap_s'), 'acumulado em papel ' + sinal(c.acumulado_papel, 2) + ' US$');
    var d = Number(gn.realizado_usd);
    txt($('k_dia'), sinal(d, 2) + ' US$'); $('k_dia').className = isFinite(d) && d > 0 ? 'up' : (isFinite(d) && d < 0 ? 'dn' : '');
    txt($('k_dia_s'), (gn.n_entrou_hoje || 0) + ' entrada(s) · ' + (gn.n_saiu_hoje || 0) + ' saída(s)');
    var m = Number(est.realizado);
    txt($('k_mesa'), sinal(m, 2) + ' US$'); $('k_mesa').className = isFinite(m) && m > 0 ? 'up' : (isFinite(m) && m < 0 ? 'dn' : '');
    txt($('k_mesa_s'), (est.n_linhas || 0) + ' estratégias · ' + (est.n || 0) + ' operações');
    txt($('k_org'), (org.total_ready != null ? org.total_ready : '—') + ' / ' + (org.total != null ? org.total : '—'));
    txt($('k_org_s'), lista(org.com_erro).length + ' com erro · ' + lista(org.atrasados).length + ' atrasado(s)');
  }
  function pintarHUD() {
    if (!D) return;
    var t = obj(D.totais), pj = obj(D.projecto);
    txt($('b_andares'), (projecto ? projecto.total : (t.andares || 0)) + ' · ' + (pj.habitados || 0) + ' hab · ' + (pj.em_obras || 0) + ' obras');
    txt($('b_func'), String(t.funcionarios || 0));
    txt($('c_sem'), String(semCaminho)); $('c_sem').className = semCaminho > 0 ? 'mau' : '';
    txt($('c_pac'), String(pacotesVivos.length)); txt($('c_idade'), String(D.t_brt || '—').slice(11));
    var maus = lista(D.funcionarios).filter(function (f) { return f.estado === 'erro'; }), atras = lista(D.funcionarios).filter(function (f) { return f.estado === 'atrasado'; });
    $('b_led').className = 'led ' + (maus.length ? 'mau' : (atras.length ? 'at' : 'ok'));
    estadoBase = maus.length ? (maus.length + ' em erro: ' + maus.map(function (f) { return f.id; }).slice(0, 2).join(', ')) : (atras.length ? (atras.length + ' atrasado(s)') : 'torre de pé · a base · ' + (pj.habitados || 0) + ' habitados');
    txt($('b_estado'), estadoBase);
    if (T) {
      txt($('b_fase'), String(T.fase || '—'));   // BRT e NY sao RELOGIOS: andam ao segundo em relogio(), nao no ciclo
      var org = obj(T.orgaos), prox = obj(org.proximo);
      txt($('b_prox'), prox.nome ? (String(prox.nome).replace('Tesouraria-', '') + ' em ' + num(prox.em_min, 0) + ' min') : '—');
      var j = obj(T.jarvis); txt($('b_portao'), j.portao ? String(j.portao) : '—');
      barra('jb_ses', 'jt_ses', j.sessao_pct); barra('jb_sem', 'jt_sem', j.semana_pct);
    }
    pintarDirectorio(); pintarNumerosDaCasa(); pintarAcorde(); pintarCartoes(); pintarSemNumero();
  }
  function barra(idBarra, idTexto, pct) {
    var el = $(idBarra), b = $(idTexto); if (!el || pct == null) return;
    var i = el.firstChild; if (i) i.style.width = Math.max(0, Math.min(100, pct)) + '%';
    txt(b, num(pct, 0) + '%');
  }
  function torreActiva() { return !!(D && D.andares_torre && D.andares_torre.length); }
  function pintarDirectorio() {
    var cx = $('directorio'); if (!cx || !D) return;
    // v6: os andares DA TORRE (quando o registo os da), abertos pela ORDEM - o n antigo abria o andar errado
    var ands = lista(torreActiva() ? D.andares_torre : D.andares);
    var chaves = ands.map(function (a) { return a.ordem + ':' + a.n + ':' + a.estado + ':' + a.n_funcionarios; }).join('|') + '|' + (projecto ? projecto.em_obras + ':' + projecto.reservados : '');
    if (cx.dataset.chaves === chaves) return;
    cx.dataset.chaves = chaves; cx.innerHTML = '';
    ands.slice().sort(function (a, b) { return (b.ordem || 0) - (a.ordem || 0); }).forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'pred-and ' + a.estado;
      b.innerHTML = '<u>' + escH(a.ordem + 1) + '</u>' + escH(a.nome) + ' <u>' + escH(a.n_funcionarios) + '</u>';
      b.addEventListener('click', function () { if (a.ordem != null && andarPorOrdem[a.ordem]) abrirPainelOrdem(a.ordem); else abrirPainel(a.n); }); cx.appendChild(b);
    });
    if (projecto) {
      var obras = projecto.lista.filter(function (x) { return x.tipo === 'em_obras'; });
      var o = document.createElement('button'); o.type = 'button'; o.className = 'pred-and obras';
      o.innerHTML = '<u>' + (obras.length ? (obras[0].ordem + 1) + '–' + (obras[obras.length - 1].ordem + 1) : '—') + '</u>' + projecto.em_obras + ' em obras <u>fase 1–3</u>';
      o.addEventListener('click', function () { if (obras[0]) abrirPainelOrdem(obras[0].ordem); });
      cx.appendChild(o);
      var r = document.createElement('span'); r.className = 'pred-and reservado'; r.innerHTML = '<u>' + escH(projecto.nomeados) + '–' + escH(projecto.total - 1) + '</u>' + escH(projecto.reservados) + ' reservados';
      cx.appendChild(r);
    }
  }

  // ---------------------------------------------------------------- painel de andar
  function abrirPainel(n) { var it = andarPorN[n]; if (it) abrirPainelOrdem(it.ordem); }
  function abrirPainelOrdem(o) {
    var it = andarPorOrdem[o]; if (!it || !D) return;
    painelAberto = o;
    var d = obj(it.dados);
    if (it.tipo === 'em_obras') { txt($('pn_tit'), 'Ordem ' + o + ' · ' + it.nome + ' · em obras'); txt($('pn_kn'), 'fase ' + String(d.fase) + ' · alvará ' + String(d.alvara || 'pendente') + ' · ' + String(d.de_onde || '')); }
    else if (it.tipo === 'reservado') { txt($('pn_tit'), 'Ordem ' + o + ' · reservado'); txt($('pn_kn'), 'sem nome, sem alvará'); }
    else { txt($('pn_tit'), (it.n === -1 ? 'Cave' : 'Andar ' + it.n) + ' · ' + it.nome + ' · ordem ' + o); txt($('pn_kn'), d.n_funcionarios + ' funcionário(s) · importância ' + num(d.importancia, 1) + ' · ' + d.estado); }
    $('pn_corpo').innerHTML = corpoDoPainel(o);
    $('painel').classList.add('aberto'); $('painel').setAttribute('aria-hidden', 'false');
  }
  function fecharPainel() { painelAberto = null; $('painel').classList.remove('aberto'); $('painel').setAttribute('aria-hidden', 'true'); }
  function cel(r, v, c) { return '<span><u>' + escH(r) + '</u><b' + (c ? ' class="' + c + '"' : '') + '>' + escH(v) + '</b></span>'; }
  function linha(a, b) { return '<tr><td>' + escH(a) + '</td><td class="n">' + escH(b) + '</td></tr>'; }
  function corpoDoPainel(o) {
    var it = andarPorOrdem[o]; if (!it) return '';
    var d = obj(it.dados), html = '';
    if (it.tipo === 'reservado') return '<div class="diag">Um dos ' + escH(projecto.reservados) + ' andares reservados do projecto de ' + escH(projecto.total) + '. Sem nome, sem alvará: é silhueta. O alvará de um andar novo está na PLANTA_PREDIO.md (§9): datável, placebo, DSR, correlação abaixo de 0,3 com cada andar, custo conhecido, dono da falha.</div>';
    if (it.tipo === 'em_obras') {
      html += '<div class="and-cartao">' + cel('faz', d.faz || '—') + cel('porquê', d.porque || '—') + cel('de onde', d.de_onde || '—') + cel('fase', 'fase ' + String(d.fase) + ' · alvará ' + String(d.alvara || 'pendente'), 'pt-atrasado') + '</div>';
      var sect = lista(d.sectores);
      html += '<div class="diag">' + (sect.length ? 'Sectores planeados: <b>' + sect.map(escH).join('</b> · <b>') + '</b>. ' : '') + 'Declarado em ' + escH(d.declarado_em || '—') + '. Sem funcionários, sem propriedades, sem capital: os contadores estão a zero porque o andar ainda não existe — e um ecrã que lhe desse números seria um ecrã a mentir.</div>';
      return html;
    }
    // v6: na torre de 47 quem mora no andar e quem tem andar_torre = n (o f.andar e o antigo); os blocos escolhem-se
    // pela ESPECIALIDADE e nao pelo numero antigo (11 era a Direccao; na torre 11 e a Reversao a Media IV)
    var n = it.n, torre = torreActiva(), meus = lista(D.funcionarios).filter(function (f) { return moraNoAndar(f, it); });
    var comN = comNumero.filter(function (x) { return moraNoAndar(x.f, it); }).length;
    var ult = meus.map(function (f) { return String(f.ultima_corrida_brt || ''); }).filter(Boolean).sort();
    var esp = String(d.especialidade || '');
    html += '<div class="and-cartao">' + cel(n === -1 ? 'cave' : 'andar ' + n, it.nome) + cel('cargo', d.cargo || d.gerente_nome || '—') + cel('capital em uso', d.capital_usd ? num(d.capital_usd, 2) + ' US$' : '—') +
      cel('importância', num(d.importancia, 2)) + cel('moradores com número', comN + ' de ' + meus.length) + cel(torre ? 'peões · sectores' : 'propriedades · casos', torre ? ((d.n_funcionarios || 0) + ' · ' + (d.n_sectores || 0)) : ((d.n_propriedades || 0) + ' · ' + (d.n_casos || 0))) +
      (torre && d.n_activos != null ? cel('no quadro · histórico', d.n_activos + ' · ' + (d.n_historico || 0)) : '') +
      cel('última corrida', ult.length ? ult[ult.length - 1] : '—') + cel('estado', String(d.estado || '—'), 'pt-' + d.estado) + '</div>';
    if (T && (torre ? (esp === 'sr_stark' || esp === 'conselho' || esp === 'socios_directores') : n === 11)) html += blocoDireccao();
    if (T && (torre ? esp === 'risco' : n === 10)) html += blocoRisco();
    if (T && (torre ? esp === 'mesa' : n === 9)) html += blocoMesa();
    if (T && (torre ? /^(celulas|cripto|volume_fluxo|preco_accao|reversao_media|tendencia)$/.test(esp) : n === 7)) html += blocoLaboratorio();
    html += tabelaFuncionarios(it);
    return html;
  }
  function moraNoAndar(f, it) { return torreActiva() ? andarTorreDe(f) === it.n : f.andar === it.n; }
  function blocoDireccao() {
    var r = obj(T.reactor), c = obj(r.conta), g = obj(r.ganho);
    return '<table class="pred-tab"><tbody>' + linha('Resultado de hoje', sinal(c.pnl_hoje, 2) + ' US$') + linha('Conta', num(c.equity, 2) + ' US$') + linha('Realizado hoje', sinal(g.realizado_usd, 2) + ' US$') +
      linha('Aberto agora', num(g.aberto_usd, 2) + ' US$') + linha('Acumulado em papel', sinal(c.acumulado_papel, 2) + ' US$') + '</tbody></table>';
  }
  function blocoRisco() {
    var v = obj(T.vingadores), k = obj(T.killian), sp = obj(k.spread_pb), linhas = '';
    Object.keys(sp).forEach(function (par) { linhas += linha('spread ' + par, num(sp[par], 1) + ' pb'); });
    return '<table class="pred-tab"><tbody>' + linha('Apostas independentes (N efectivo)', num(v.n_ef, 2)) + linha('Posições abertas', String(v.n_posicoes || 0)) + linha('Rotações recusadas hoje', String(k.rotacoes_recusadas || 0)) + linhas + '</tbody></table>';
  }
  function blocoMesa() {
    var p = obj(T.pepper), h = '<table class="pred-tab"><thead><tr><th>estratégia</th><th>família</th><th>n</th><th>acerto</th><th>realizado</th><th>aberto</th></tr></thead><tbody>';
    lista(p.linhas).concat(lista(p.controlo)).forEach(function (l) {
      h += '<tr><td class="n">' + escH(l.nome_curto || l.chave) + '</td><td>' + escH(l.familia || '') + '</td><td>' + (l.n == null ? '—' : escH(l.n)) + '</td><td>' + (l.acerto == null ? '—' : num(l.acerto * 100, 0) + '%') + '</td>' +
        '<td class="' + (Number(l.realizado) >= 0 ? 'pt-ok' : 'pt-erro') + '">' + sinal(l.realizado, 2) + '</td><td>' + (l.aberto == null ? '—' : sinal(l.aberto, 2)) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function blocoLaboratorio() {
    var e = obj(T.extremis), h = '<table class="pred-tab"><tbody>' + linha('Geração actual', String(e.geracao_actual || '—')) + linha('Genes na memória', String(e.n_genes || '—')) + linha('Famílias', String(e.n_familias || '—')) + '</tbody></table>' +
      '<table class="pred-tab"><thead><tr><th>geração</th><th>avaliados</th><th>robustos</th><th>família maior</th><th>monocultura</th></tr></thead><tbody>';
    lista(e.geracoes).slice(-8).forEach(function (g) { h += '<tr><td class="n">' + escH(g.geracao) + '</td><td>' + escH(g.avaliados || 0) + '</td><td>' + escH(g.robustos || 0) + '</td><td>' + escH(g.familia_maior || '') + '</td><td class="' + ((g.monocultura_pct || 0) > 80 ? 'pt-erro' : '') + '">' + num(g.monocultura_pct, 0) + '%</td></tr>'; });
    return h + '</tbody></table>';
  }
  function tabelaFuncionarios(it) {
    var func = lista(D.funcionarios).filter(function (f) { return moraNoAndar(f, it); }), d = obj(it.dados);
    if (!func.length) return '<div class="diag">' + (it.tipo === 'rua' ? 'Este andar não tem funcionários — é a rua, onde está o mercado.'
      : ('Este andar não tem funcionários do registo do agendador' + (d.n_funcionarios ? ' — os seus ' + escH(d.n_funcionarios) + ' peões são do organograma (genes, regras, scripts) e vivem no organograma.json.' : '.'))) + '</div>';
    var h = '<table class="pred-tab"><thead><tr><th>funcionário</th><th>cargo</th><th>responde a</th><th>é dono da falha</th><th>estado</th><th>última corrida</th><th>importância</th></tr></thead><tbody>';
    func.forEach(function (f) { h += '<tr><td class="n">' + escH(f.id) + '</td><td>' + escH(f.cargo) + '</td><td>' + escH(f.chefe || '—') + '</td><td>' + escH(f.dono_da_falha) + '</td><td class="pt-' + escH(f.estado) + '">' + escH(String(f.estado || '').replace('_', ' ')) + '</td><td>' + escH(f.ultima_corrida_brt || '—') + '</td><td>' + num(obj(f.importancia).score, 2) + '</td></tr>'; });
    return h + '</tbody></table>';
  }

  // ================================================================ v6 (18/09 noite): O PREDIO BATE COMO UM CORACAO
  // Um batimento global a 52 bpm modula a opacidade do vidro (0,32 +- 0,05), das arestas (0,72 +- 0,15) e o brilho do
  // letreiro. A FORCA e a frescura do dado: torre.json com < 2 min (PG.pulsa) = amplitude cheia; mais velho = 30%. A
  // forma e um "lub-dub" (duas senoides) e nunca fica plana - por isso duas leituras a 130 ms de distancia diferem.
  // A regra da casa mantem-se: e um sinal de VIDA do dado, como o pulso do trilho; com prefers-reduced-motion nao bate.
  function formaCardiaca(p) { return Math.sin(2 * Math.PI * p) * 0.78 + Math.sin(4 * Math.PI * p + 1.05) * 0.36; }
  var NORMA_BAT = (function () { var m = 0; for (var i = 0; i < 720; i++) m = Math.max(m, Math.abs(formaCardiaca(i / 720))); return m || 1; })();
  function ondaCardiaca(p) { return formaCardiaca(p) / NORMA_BAT; }
  function animarBatimento(agora) {
    if (!renderer || !projecto) return;
    if (agora - ultimoBatimento < PASSO_BAT_MS) return;     // 20 Hz chegam: e uma respiracao, nao um contador
    ultimoBatimento = agora;
    if (!_corTmp) { _corTmp = new THREE.Color(); _branco = new THREE.Color(0xffffff); }
    var vivo = PG.pulsa(T && T.t_iso, Date.now()) || !!window.__mdVivo;   // com precos vivos, a torre bate com forca toda
    var amp = calmo ? 0 : (vivo ? 1 : 0.3);
    var fase = (agora % PERIODO_BAT_MS) / PERIODO_BAT_MS, w = ondaCardiaca(fase);
    batimento.amp = amp; batimento.fase = fase; batimento.w = w; batimento.vivo = vivo;
    vidroOpacidade = 0.32 + 0.05 * amp * w;
    if (vidroMat) vidroMat.opacity = vidroOpacidade;
    // a ONDA DE DADOS: uma banda de ~2 andares que sobe do Atrio (ordem 0) ao atico em 1,4 s; e o FLASH de um andar
    // cujo funcionario correu (1,2 s a apagar). Cada um acende as suas arestas (material proprio) e o seu degrau.
    var base = 0.72 + 0.15 * amp * w, topo = projecto.nomeados - 1;
    var pos = ondaDados.v == null ? null : -1.5 + ondaDados.v * (topo + 3.5), mexeuDegraus = false, c = _corTmp;
    projecto.lista.forEach(function (it) {
      if (it.tipo === 'reservado') return;
      var f = 0;
      if (pos != null) f = Math.max(0, 1 - Math.abs(pos - it.ordem) / 2.2);
      if (it.acesoT0) { var u = (agora - it.acesoT0) / 1200; if (u >= 1) it.acesoT0 = 0; else f = Math.max(f, 1 - u); }
      if (f > 0 || it.flashAplicado) {
        if (it.arestasMat) { it.arestasMat.opacity = base + (1 - base) * f; it.arestasMat.color.setHex(COR.ciano).lerp(_branco, f * 0.85); }
        if (instDegraus && it.degrauIdx != null) { c.setHex(it.corDegrau).lerp(_branco, f * 0.8); instDegraus.setColorAt(it.degrauIdx, c); mexeuDegraus = true; }
        it.flashAplicado = f > 0;
      } else if (it.arestasMat) it.arestasMat.opacity = base;
    });
    if (mexeuDegraus && instDegraus && instDegraus.instanceColor) instDegraus.instanceColor.needsUpdate = true;
    if (coroa) {
      coroa.arestasMat.opacity = 0.78 + 0.2 * amp * w;
      var b = 0.86 + 0.14 * amp * w; coroa.brilho = b;
      coroa.letreiroMats.forEach(function (mt) { mt.opacity = b; });
      var e = 1 + 0.06 * amp * w;
      coroa.halos.forEach(function (s) { s.material.opacity = 0.40 + 0.32 * amp * (0.5 + 0.5 * w); s.scale.set(coroa.haloEscala[0] * e, coroa.haloEscala[1] * e, 1); });
      coroa.reactor.material.opacity = 0.55 + 0.40 * amp * (0.5 + 0.5 * w);
      var sr = coroa.reactorEscala * (1 + 0.10 * amp * w); coroa.reactor.scale.set(sr, sr, 1);
    }
  }
  function lancarOndaDeDados(tIso) {
    if (!projecto) return null;
    ondasDeDados++;
    ondaDados.t_iso = String(tIso);
    return registarTween('onda de dados ' + String(tIso).slice(11, 19), 0, 1, 1400, function (v) { ondaDados.v = v; }, function () { ondaDados.v = null; });
  }
  function acenderAndar(it) { if (it) it.acesoT0 = performance.now(); }

  // ================================================================ v6: A COROA DA TORRE STARK (Os Vingadores, 2012)
  // Acima do atico: um PENTHOUSE EM CONSOLA (laje 1,35x mais larga, deslocada para +x a sair da planta, vidro escuro,
  // arestas ciano), a PLATAFORMA DE ATERRAGEM estreita a sair do outro lado, o LETREIRO "STARK" aceso nas duas faces
  // compridas (CanvasTexture num plano de 1,6 andares de altura, com halo) e o brilho do REACTOR ARC no centro. Tudo
  // pulsa com o batimento. Substitui a placa "SR. STARK · COBERTURA". Nao e clicavel (nao mora em grupoTorre): a
  // contagem de lajes do arreio continua a ser uma por andar nomeado.
  function texturaLetreiro() {
    var W = 1280, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.clearRect(0, 0, W, H);
    var t = 'STARK', ft = 220;
    var fonte = function (px) { return '900 ' + px + 'px "Segoe UI Black", "Arial Black", Impact, "Segoe UI", sans-serif'; };
    g.font = fonte(ft);
    if ('letterSpacing' in g) g.letterSpacing = '34px';
    var larg = g.measureText(t).width; if (larg > W - 70) { ft = Math.floor(ft * (W - 70) / larg); g.font = fonte(ft); }
    g.textBaseline = 'middle'; g.textAlign = 'center';
    var x = W / 2 + (('letterSpacing' in g) ? 17 : 0), y = H / 2 + ft * 0.05;
    g.shadowColor = 'rgba(90,200,250,.95)'; g.shadowBlur = 44; g.fillStyle = '#7fd4ff';
    g.fillText(t, x, y); g.fillText(t, x, y); g.fillText(t, x, y);
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    var grad = g.createLinearGradient(0, H * 0.18, 0, H * 0.82); grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#bfe6ff');
    g.fillStyle = grad; g.fillText(t, x, y);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    var tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
    return { tex: tex, canvas: c, g: g, W: W, H: H };
  }
  function texturaRadial(tam) {
    var c = document.createElement('canvas'); c.width = c.height = tam || 128; var g = c.getContext('2d');
    var r = c.width / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(236,250,255,1)'); gr.addColorStop(0.16, 'rgba(150,224,255,.88)'); gr.addColorStop(0.45, 'rgba(90,200,250,.30)'); gr.addColorStop(1, 'rgba(90,200,250,0)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    var tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; return tex;
  }
  function spriteRadial(escX, escY, opacidade, ordem) {
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaRadial(128), transparent: true, opacity: opacidade, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    sp.scale.set(escX, escY, 1); sp.renderOrder = ordem || 5; return sp;
  }
  function construirCoroa() {
    if (grupoCoroa) { largarGrupo(grupoCoroa); cena.remove(grupoCoroa); }
    grupoCoroa = new THREE.Group(); cena.add(grupoCoroa); coroa = null;
    if (!projecto || !renderer) return;
    var oC = projecto.nomeados, yC = oC * ALTURA, angC = oC * TORCAO * Math.PI / 180;
    var largC = 1.35 * LARG, profC = 0.86 * PROF, altC = ALTURA_COROA, dx = 0.20 * LARG;   // a consola sai para +x
    var g = new THREE.Group(); g.rotation.y = angC; g.position.y = yC; grupoCoroa.add(g);
    var esc = new THREE.MeshLambertMaterial({ color: 0x1b2330 });
    var lajeC = new THREE.Mesh(new THREE.BoxGeometry(largC, 0.5, profC), esc); lajeC.position.set(dx, 0.25, 0); g.add(lajeC);
    var alturaVidro = altC - 0.5 - 0.3, yVidro = 0.5 + alturaVidro / 2;
    var vidroC = new THREE.Mesh(new THREE.BoxGeometry(largC, alturaVidro, profC), new THREE.MeshBasicMaterial({ color: 0x0a1624, transparent: true, opacity: 0.55, depthWrite: false }));
    vidroC.position.set(dx, yVidro, 0); vidroC.renderOrder = 2; g.add(vidroC);
    var arestasC = new THREE.LineBasicMaterial({ color: COR.ciano, transparent: true, opacity: 0.9, depthWrite: false });
    var arC = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(largC, alturaVidro, profC)), arestasC); arC.position.copy(vidroC.position); g.add(arC);
    var tectoC = new THREE.Mesh(new THREE.BoxGeometry(largC + 0.6, 0.3, profC + 0.6), esc); tectoC.position.set(dx, altC - 0.15, 0); g.add(tectoC);
    // a plataforma de aterragem: estreita, a sair do lado oposto (-x), com a aresta acesa
    var largP = 0.58 * LARG, xP = (dx - largC / 2) - largP / 2 + 1.2;
    var plat = new THREE.Mesh(new THREE.BoxGeometry(largP, 0.22, 2.6), new THREE.MeshLambertMaterial({ color: 0x2a3442 })); plat.position.set(xP, 0.61, profC * 0.12); g.add(plat);
    var arP = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(largP, 0.22, 2.6)), arestasC); arP.position.copy(plat.position); g.add(arP);
    // O LETREIRO: 1,6 andares de altura, nas duas faces compridas (so a face virada para a camara se ve: FrontSide)
    // 🔴 19/09, VISTO no recorte 3x: em planos colados as faces do penthouse, e com a torre torcida 3,6 graus por
    // andar (no 49.o andar sao ~176 graus), o letreiro aparecia DEITADO, a ler-se como tinta no telhado. Passa a ser
    // um SPRITE em cima da cobertura: um sprite esta sempre de frente para quem olha, logo le-se "STARK" de qualquer
    // angulo e de qualquer nivel de zoom - que e como o letreiro aparece no filme, de pe na coroa.
    var tl = texturaLetreiro(), hL = 1.15 * ALTURA, wL = hL * tl.W / tl.H, planos = [], mats = [], halos = [];
    var haloEsc = [wL * 1.22, hL * 1.8], yLetreiro = altC + hL * 0.62;
    var mtL = new THREE.SpriteMaterial({ map: tl.tex, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false });
    var spL = new THREE.Sprite(mtL); spL.scale.set(wL, hL, 1); spL.position.set(dx, yLetreiro, 0); spL.renderOrder = 7; g.add(spL);
    var haloL = spriteRadial(haloEsc[0], haloEsc[1], 0.5, 6); haloL.position.set(dx, yLetreiro, 0); g.add(haloL);
    planos.push(spL); mats.push(mtL); halos.push(haloL);
    // o reactor arc: o brilho azul no centro da coroa
    var reactorEscala = PROF * 0.9, reactor = spriteRadial(reactorEscala, reactorEscala, 0.8, 6); reactor.position.set(dx * 0.35, yVidro, 0); g.add(reactor);
    coroa = { grupo: g, yC: yC, angC: angC, largC: largC, profC: profC, altC: altC, dx: dx, arestasMat: arestasC, planos: planos, letreiroMats: mats,
              halos: halos, haloEscala: haloEsc, reactor: reactor, reactorEscala: reactorEscala, canvas: tl.canvas, g2d: tl.g, wL: wL, hL: hL, brilho: 0.9 };
  }
  // a caixa da coroa no ecra (os 8 cantos do penthouse projectados): e uma caixa FIXA para a arrumacao dos rotulos
  function letreiroRect() {
    if (!coroa || !camara || !vistaW) return null;
    var pts = [], y0 = coroa.yC, y1 = coroa.yC + coroa.altC;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (cn) {
      var r = rodar(coroa.dx + cn[0] * coroa.largC / 2, cn[1] * coroa.profC / 2, coroa.angC);
      pts.push(new THREE.Vector3(r.x, y0, r.z), new THREE.Vector3(r.x, y1, r.z));
    });
    var cx = caixaProjectada(pts);
    cx.dentro = cx.esq >= 0 && cx.dir <= vistaW && cx.topo >= 0 && cx.fundo <= vistaH;
    return cx;
  }

  // ================================================================ v6: OS CARTOES DOS 10 DE TOPO, VIVOS
  function num0(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function andaresDoCargo(c) {
    var m = {}; lista(c.andares).forEach(function (n) { m[n] = true; });
    if (!lista(c.andares).length && c.andar != null) m[c.andar] = true;
    return m;
  }
  // ACTIVIDADE REAL: quantos funcionarios do REGISTO nos andares do cargo correram nos ultimos 60 min (o registo da os
  // minutos), e se algum correu ha <= 5 min ("A CORRER"). Sem serie historica inventada: e uma contagem do predio.json.
  function actividadeDoCargo(mapa) {
    var n60 = 0, n5 = 0, tot = 0;
    lista(D && D.funcionarios).forEach(function (f) {
      if (!mapa[andarTorreDe(f)]) return;
      tot++;
      var m = Number(f.minutos_desde_ultima); if (!isFinite(m)) return;
      if (m <= 60) n60++;
      if (m <= 5) n5++;
    });
    return { activos60: n60, n5: n5, aCorrer: n5 > 0, total: tot };
  }
  // duas filas de 5 quando o palco tem >= 1200 px; senao uma faixa com scroll horizontal e snap (todos os 10 presentes)
  function disporCartoes(cx, n) {
    var duas = cx.clientWidth >= 1200 && n > 5;
    cx.classList.toggle('duas-filas', duas); cx.classList.toggle('faixa', !duas);
    return duas ? 'duas-filas' : 'faixa';
  }
  function pintarMetricaDoCartao(ct, k, x, max) {
    var el = ct.el.querySelector('.mtr[data-k="' + k + '"]'); if (!el) return;
    var pct = max > 0 ? Math.max(0, Math.min(100, Math.round(100 * x / max))) : 0;
    var b = el.querySelector('i > b'), em = el.querySelector('em');
    if (b) b.style.width = pct + '%';
    txt(em, String(Math.round(x)));
    if (k === 'dependentes') txt(ct.el.querySelector('.num'), String(Math.round(x)));
  }
  function pintarSeloDoCartao(ct) {
    var selo = ct.el.querySelector('.selo'), act = ct.el.querySelector('.act > span');
    var activo = ct.dependentes > 0;
    txt(selo, ct.aCorrer ? 'A CORRER' : (activo ? 'ACTIVO' : 'SEM EQUIPA'));
    if (selo) selo.classList.toggle('corre', !!ct.aCorrer);
    ct.el.classList.toggle('corre', !!ct.aCorrer);
    ct.el.classList.toggle('ok', activo); ct.el.classList.toggle('zero', !activo);
    txt(act, ct.total ? (ct.activos60 + ' de ' + ct.total + ' correram · 60 min' + (ct.n5 ? ' · ' + ct.n5 + ' há ≤ 5 min' : '')) : 'sem funcionários do registo nestes andares');
  }
  function pulsarCartaoDoAndar(n) {
    if (n == null) return 0;
    var k = 0;
    Object.keys(cartoesTopo).forEach(function (id) {
      var ct = cartoesTopo[id]; if (!ct.el || !ct.andares[n]) return;
      ct.el.classList.remove('pulsa'); void ct.el.offsetWidth; ct.el.classList.add('pulsa'); ct.pulsos++; k++;
      clearTimeout(ct.tempo); ct.tempo = setTimeout(function () { ct.el.classList.remove('pulsa'); }, 1250);
    });
    return k;
  }

  // ---------------------------------------------------------------- laco
  var ultimoQuadro = 0, ultimoHUD = 0, escondido = false;
  document.addEventListener('visibilitychange', function () { escondido = document.hidden; });
  // 🔴 22/09, a reproducao QUE ELE ME DEU: "o travamento e com o instrumento aberto e os cartoes a reagir".
  // MEDIDO: 40% de ocupacao da linha principal com a gaveta aberta contra 18% fechada - **mais do dobro**.
  // A causa e a mesma especie que eu corrigi para o telemovel e nao apliquei aqui: com a gaveta aberta a
  // TORRE 3D CONTINUA A SER DESENHADA por tras dela, tapada a 100%. Trinta desenhos por segundo de uma cena
  // que ninguem ve, a disputar a linha principal com o instrumento que ele esta mesmo a olhar.
  // Uma cena tapada nao se desenha. O batimento, as tweens e os dados continuam a andar - so o DESENHO para,
  // e volta no fotograma seguinte a fechar a gaveta.
  // ⚠️ Perguntar-lhe O QUE estava a fazer valeu mais do que tres rondas de medicoes minhas no caso comodo.
  var _gavetaEl = null;
  function gavetaAberta() {
    if (!_gavetaEl) _gavetaEl = $('pointer_dados');
    return !!(_gavetaEl && !_gavetaEl.hidden && _gavetaEl.offsetParent !== null);
  }
  // 19/09, MEDIDO com o CDP: 83% da linha principal ocupada em regime (16,6 s de tarefa em 20 s). O laco
  // desenhava a cada fotograma do ecra - 50 a 60 por segundo - e o desenho e o item mais caro. Um painel de dados
  // le-se igual a 30. TECTO DE 30 DESENHOS POR SEGUNDO: corta metade do trabalho sem o olho notar.
  // 19/09: 30 desenhos por segundo ENQUANTO ALGO MEXE; parado, 10 - que e a cadencia do batimento, a unica coisa
  // que continua a mudar com a torre quieta. Corta dois tercos do desenho em repouso, e e em repouso que ela passa
  // a maior parte do tempo (os dados chegam ao minuto).
  var MS_ACTIVO = 1000 / 30, MS_PARADO = 1000 / 10, ultimoDesenho = 0, ultimoMexeu = 0, cadenciaActual = 'parado';
  function marcarMovimento() { ultimoMexeu = performance.now(); }
  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (escondido || !renderer || modoNumeros || gavetaAberta()) return;   // telemovel ou gaveta aberta: existe, nao se pinta
    var mexe = !!camTween || tweens.length > 0 || pacotesVivos.length > 0 || (agora - ultimoMexeu) < 1500;
    cadenciaActual = mexe ? 'activo' : 'parado';   // 20/09: a prova precisa de saber em que regime esta a medir
    if (agora - ultimoDesenho < (mexe ? MS_ACTIVO : MS_PARADO) - 1) return;
    ultimoDesenho = agora;
    if (ultimoQuadro) { var dt = agora - ultimoQuadro; fpsAmostras.push(1000 / dt); if (fpsAmostras.length > 120) fpsAmostras.shift(); }
    ultimoQuadro = agora;
    if (precisaEnquadrar && projecto) { enquadrarN0(); aplicarVista(); }
    animarCamara(agora);          // a camara so anda quando ELE pede um nivel (600 ms)
    animarTweens(agora);          // agulha, numeros: so entre leituras diferentes do JSON
    animarPacotes(agora); animarPulsos(agora); animarAndantes(agora);
    if (v2Ligado) { animarChafariz(agora); animarOndas(agora); animarAnel(agora); }
    animarHolos(agora);
    animarBatimento(agora);       // v6: 20 Hz - o vidro, as arestas, o letreiro e a onda de dados
    if (arrumarPendente && !camTween) dimensionarRotulos(true);
    var t0d = performance.now();
    renderer.render(cena, camara);
    medirDesenho(performance.now() - t0d, agora);
    if (agora - ultimoHUD > 500) { ultimoHUD = agora; txt($('c_pac'), String(pacotesVivos.length)); txt($('c_part'), String(particulasVivas)); txt($('c_fps'), fpsAmostras.length ? String(Math.round(fps())) : '-'); }
  }
  function fps() { if (!fpsAmostras.length) return 0; var v = fpsAmostras.slice().sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; }

  // ---------------------------------------------------------------- dados
  function buscar(ficheiro) { return fetch(ficheiro + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }); }
  var estadoBase = '';        // o texto do estado sem a idade do dado (o relogio junta-lha ao segundo)
  // 🔴 19/09, MEDIDO: a pagina buscava e interpretava o `predio.json` - 330 KB - DE 2 EM 2 SEGUNDOS, quando esse
  // ficheiro so e reescrito de minuto a minuto pelo servico. Eram ~165 KB de JSON por segundo a serem lidos e
  // comparados para nada, e e essa a causa mais provavel do travamento de que ele se queixa. O `torre.json` (55 KB)
  // e que traz os numeros que mudam ao segundo, e esse continua de 2 em 2 s.
  var CADENCIA_PREDIO_MS = 20000;
  var ultimoPredio = 0;
  // 21/09: AS PENDENCIAS. Le-se uma vez por minuto (mudam de sessao em sessao, nao de segundo em segundo) e
  // pinta-se nos DOIS sitios: a coluna do lado no computador, e um bloco proprio no telemovel - onde a coluna
  // nao existe. Se o ficheiro nao estiver la, o bloco desaparece em vez de mostrar uma lista vazia com ar de
  // "nao ha nada pendente", que seria a mentira mais cara desta pagina.
  var PEND = null, ultimaPend = 0;
  function pintarPendencias() {
    var itens = lista(PEND && PEND.itens);
    var html = itens.map(function (p) {
      var dele = String(p.quem || '') === 'ele';
      return '<div class="pd-it ' + escH(p.peso || 'media') + '">' +
        '<i class="' + (dele ? 'dele' : '') + '">' + escH(p.peso || '') + ' \u00b7 ' + (dele ? 'depende dele' : (p.quem === 'eu' ? 'e comigo' : 'dos dois')) + '</i>' +
        '<b>' + escH(p.titulo || '') + '</b>' +
        (p.porque ? '<em>' + escH(p.porque) + '</em>' : '') +
        (p.falta ? '<s>' + escH(p.falta) + '</s>' : '') + '</div>';
    }).join('');
    // 22/09: NO TELEMOVEL SO AS PESADAS. A lista cresceu de 7 para 10 e a pagina passou de 3.168 para 3.337 px
    // - acima do tecto de tres ecras que ele pediu. Um lembrete que empurra os NUMEROS para fora da vista
    // deixa de ser um lembrete e passa a ser um estorvo. Ficam as de peso maxima e alta, e diz-se quantas
    // faltam; a lista inteira esta no computador e no PENDENCIAS.md.
    // 22/09: no telemovel so as QUATRO mais pesadas. A lista cresceu para 16 e a pagina passou dos 3 ecras
    // outra vez - um lembrete que empurra os numeros para fora da vista deixa de ser um lembrete. As que
    // ficam de fora sao contadas na ultima linha, nunca escondidas em silencio.
    var pesadas = itens.filter(function (p) { return p.peso === 'maxima' || p.peso === 'alta'; }).slice(0, 4);
    var htmlTel = pesadas.map(function (p) {
      var dele = String(p.quem || '') === 'ele';
      return '<div class="pd-it ' + escH(p.peso || 'media') + '">' +
        '<i class="' + (dele ? 'dele' : '') + '">' + escH(p.peso || '') + ' · ' + (dele ? 'depende dele' : (p.quem === 'eu' ? 'e comigo' : 'dos dois')) + '</i>' +
        '<b>' + escH(p.titulo || '') + '</b></div>';
    }).join('') + (itens.length > pesadas.length
      ? '<div class="pd-it media"><i>e mais ' + (itens.length - pesadas.length) + ' de peso médio</i><b>no computador e no PENDENCIAS.md</b></div>'
      : '');
    [['pendencias', 'bl_pend', html], ['pendencias_tel', 'card_pendencias', htmlTel]].forEach(function (par) {
      var cx = $(par[0]), bl = $(par[1]);
      if (cx) cx.innerHTML = par[2];
      if (bl) bl.hidden = !itens.length;
    });
    var dele = itens.filter(function (p) { return p.quem === 'ele'; }).length;
    txt($('pd_kn'), itens.length ? (itens.length + ' em aberto \u00b7 ' + dele + ' dependem dele') : '');
  }
  function buscarPendencias() {
    var agora = Date.now();
    if (agora - ultimaPend < 60000) return;
    ultimaPend = agora;
    // o ficheiro vive em `sala/` e nao em `dados/` por uma razao mecanica: o servidor serve a pasta `sala` e
    // recusa subir um nivel (e bem). Fonte unica na pasta servida vale mais do que fonte "certa" e inalcancavel.
    buscar('pendencias.json').then(function (p) { PEND = p; pintarPendencias(); }).catch(function () { });
  }
  function ciclo() {
    buscarPendencias();
    if (cicloPausadoAte > Date.now()) return;
    var agora = Date.now();
    var querPredio = !D || (agora - ultimoPredio) >= CADENCIA_PREDIO_MS;
    if (querPredio) ultimoPredio = agora;
    Promise.all([querPredio ? buscar(F_PREDIO).catch(function () { return null; }) : Promise.resolve(null),
                 buscar(F_TORRE).catch(function () { return null; })])
      .then(function (r) { aplicarDados(r[0], r[1]); })
      .catch(function (e) { if (window.console) console.warn('predio', String(e).slice(0, 120)); });
  }

  // ---------------------------------------------------------------- arranque
  // 21/09: em ECRA PEQUENO o 3D nao arranca (ordem dele), mas o RESTO arranca na mesma - o ciclo de dados, o
  // instrumento e os cartoes dos numeros. Na primeira tentativa o `return` do iniciar3D() abortou a pagina
  // inteira e o telemovel ficou em BRANCO: nao chega nao desenhar a torre, e preciso deixar viver o que fica.
  // 🔴 21/09, PARTIDO E CORRIGIDO NO MESMO DIA: esta decisao era tomada UMA VEZ no arranque. Se a janela
  // nascesse estreita e crescesse depois (o arreio faz exactamente isso, e um telemovel a rodar tambem), a
  // torre nunca arrancava - o arreio apanhou-a com `telemovel: true` num ecra de 1400 px. Uma decisao que
  // depende do tamanho da janela tem de ser REAVALIADA quando a janela muda.
  // 🔴 21/09, DUAS TENTATIVAS FALHADAS ANTES DESTA, e a licao vale mais que o codigo: eu tentei NAO ARRANCAR o
  // 3D em ecra pequeno. Parti o desktop duas vezes - o arreio apanhou `telemovel: true` num ecra de 1400 px,
  // porque a decisao era tomada UMA VEZ no arranque e a janela muda depois (o arreio testa a 390 e a 1400 na
  // mesma pagina; um telemovel a rodar faz o mesmo).
  // O SIMPLES FUNCIONA: a torre arranca sempre, e o que se decide a cada fotograma e se ela se DESENHA. A
  // poupanca de bateria e a mesma - o custo esta em pintar, nao em existir - e nao ha estado que possa ficar
  // dessincronizado da largura da janela.
  var modoNumeros = false;
  function aplicarModo() {
    var pequeno = ecraPequeno();
    if (pequeno === modoNumeros) return;
    modoNumeros = pequeno;
    document.body.classList.toggle('so-numeros', pequeno);
    var gav = $('pointer_dados');
    if (gav && pequeno) gav.hidden = false;      // no telemovel a gaveta E a pagina
  }
  aplicarModo();
  addEventListener('resize', aplicarModo);
  if (!temWebGL()) { $('aviso_webgl').hidden = false; }
  else { iniciar3D(); criarHologramas(); requestAnimationFrame(quadro); }
  // 🔴 19/09, queixa dele: "os numeros nao estao em tempo real a cada segundo". Metade disso era o ecra: os campos
  // BRT e NY sao RELOGIOS e mostravam a hora do FICHEIRO, logo ficavam parados entre leituras e a pagina parecia
  // morta. Passam a andar ao segundo, e ao lado do estado passa a contar-se A IDADE DO DADO - que e honesto: diz
  // quando a ultima leitura chegou em vez de fingir que chegou agora.
  // A FITA DE COTACOES: as posicoes abertas com o preco VIVO (window.__md.S.cr traz o ultimo preco da Binance
  // ancorado ao da corretora). Reescreve-se ao segundo; a translacao e do CSS e nunca para.
  var fitaAss = '';
  function pintarFita() {
    var el = document.getElementById('fita_mov'); if (!el) return;
    var pos = lista(obj(obj(T).reactor).posicoes), vivos = {};
    try { if (window.__md && window.__md.S && window.__md.S.cr) vivos = window.__md.S.cr; } catch (e) { }
    var pecas = pos.map(function (p) {
      var s = String(p.simbolo || ''), c = obj(vivos[s]);
      var preco = (c.bin != null && c.basis != null) ? (c.bin + c.basis) : Number(p.agora);
      var pnl = Number(p.pnl_aberto_usd), pct = Number(p.pnl_aberto_pct);
      var cls = !isFinite(pnl) ? '' : (pnl > 0 ? 'up' : (pnl < 0 ? 'dn' : ''));
      return '<span><u>' + escH(s) + '</u><b>' + (isFinite(preco) ? num(preco, preco > 100 ? 2 : 4) : '—') + '</b>' +
             '<i class="' + cls + '">' + (isFinite(pct) ? sinal(pct, 2) + '%' : '') + '</i>' +
             '<i class="' + cls + '">' + (isFinite(pnl) ? sinal(pnl, 2) + ' US$' : '') + '</i></span>';
    });
    if (!pecas.length) pecas = ['<span><u>sem posições abertas</u></span>'];
    var html = pecas.join('') + pecas.join('');   // duas voltas: a translacao de -50% fecha o ciclo sem salto
    if (html === fitaAss) return;
    fitaAss = html; el.innerHTML = html;
  }
  function relogio() {
    pintarFita();
    var a = new Date(), hora = function (tz) { try { return a.toLocaleTimeString('pt-PT', { timeZone: tz, hour12: false }); } catch (e) { return '—'; } };
    txt($('b_brt'), hora('America/Sao_Paulo'));
    txt($('b_ny'), hora('America/New_York'));
    if (!estadoBase) return;
    var iso = T && T.t_iso, s = null;
    if (iso) { var ms = Date.parse(iso); if (isFinite(ms)) s = Math.max(0, Math.round((Date.now() - ms) / 1000)); }
    txt($('b_estado'), estadoBase + (s == null ? '' : ' · dado há ' + (s < 90 ? s + ' s' : Math.round(s / 60) + ' min')));
  }
  ciclo();
  relogio();
  setInterval(relogio, 1000);
  setInterval(ciclo, PERIODO_MS);

  // ================================================================ o contrato com o arreio (sala/prova_predio.js)
  // A aceitacao e MEDIDA, nao afirmada: o arreio le daqui o que esta mesmo desenhado.
  // A ZONA OCUPADA de um andar: a faixa das duas filas de secretarias (x = +-11,2 · z = 0,4..4,32 · y = 0,3..2,3) projectada
  // no ecra - a caixa E o poligono (casco convexo dos 8 cantos). A caixa sobrestima nos cantos: e contra o POLIGONO que os
  // hologramas se desviam e que a sonda mede.
  function cascoConvexo(pts) {
    var P = pts.slice().sort(function (a, b) { return (a[0] - b[0]) || (a[1] - b[1]); }), n = P.length;
    if (n < 3) return P;
    function cruz(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var inf = [], sup = [], i, p;
    for (i = 0; i < n; i++) { p = P[i]; while (inf.length >= 2 && cruz(inf[inf.length - 2], inf[inf.length - 1], p) <= 0) inf.pop(); inf.push(p); }
    for (i = n - 1; i >= 0; i--) { p = P[i]; while (sup.length >= 2 && cruz(sup[sup.length - 2], sup[sup.length - 1], p) <= 0) sup.pop(); sup.push(p); }
    inf.pop(); sup.pop();
    return inf.concat(sup);
  }
  // o x mais a esquerda do poligono dentro da banda vertical [topo, fundo]; null se o poligono nao entra na banda
  function limiteEsqDoPoligono(poly, topo, fundo) {
    var m = null;
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length], y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      if (y1 < topo || y0 > fundo) continue;
      [a, b].forEach(function (p) { if (p[1] >= topo && p[1] <= fundo && (m == null || p[0] < m)) m = p[0]; });
      [topo, fundo].forEach(function (y) {
        if (y >= y0 && y <= y1 && y1 > y0) { var t = (y - a[1]) / (b[1] - a[1]), x = a[0] + (b[0] - a[0]) * t; if (m == null || x < m) m = x; }
      });
    }
    return m;
  }
  function zonaOcupadaRect(o) {
    var it = andarPorOrdem[Number(o)]; if (!it || !camara || !vistaW) return null;
    var util = LARG - 3.0, pts = [], e = {}, poly = [];
    [[-util / 2 - 0.7, 0.4], [util / 2 + 0.7, 0.4], [util / 2 + 0.7, 4.32], [-util / 2 - 0.7, 4.32]].forEach(function (c) {
      var r = rodar(c[0], c[1], it.ang); pts.push(new THREE.Vector3(r.x, it.y + 0.3, r.z), new THREE.Vector3(r.x, it.y + 2.3, r.z));
    });
    pts.forEach(function (p) { ecraDoMundo(p, e); poly.push([e.x, e.y]); });
    var cx = caixaProjectada(pts); cx.poly = cascoConvexo(poly);
    return cx;
  }
  function caixaProjectada(pontos) {
    var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, r = {};
    pontos.forEach(function (p) { ecraDoMundo(p, r); minx = Math.min(minx, r.x); maxx = Math.max(maxx, r.x); miny = Math.min(miny, r.y); maxy = Math.max(maxy, r.y); });
    return { esq: minx, dir: maxx, topo: miny, fundo: maxy, larg: vistaW, alt: vistaH };
  }
  function rectDoSprite(sp) {
    var p = sp.userData.px, mpp = mundoPorPx();
    var cx = caixaNoEcra(sp, { x: sp.scale.x, y: sp.scale.y }, mpp) || { esq: 0, dir: 0, topo: 0, fundo: 0 };
    var px = p ? pixeisDoTexto(sp.scale.y, p.ch, p.ft, mpp) : 0;
    return { esq: cx.esq, dir: cx.dir, topo: p ? cx.topo + (p.topo || 0) * (cx.fundo - cx.topo) : cx.topo, fundo: p ? cx.topo + (p.fundo || 1) * (cx.fundo - cx.topo) : cx.fundo,
             x: cx.esq, px: px, linhasPx: p ? lista(p.linhas).map(function (f) { return px * f / p.ft; }) : [], dx: p ? p.dx : 0, dy: p ? p.dy : 0, preso: !!(p && p.preso),
             dentro: cx.esq >= 0 && cx.dir <= vistaW && cx.topo >= 0 && cx.fundo <= vistaH, visivel: !!sp.visible };
  }
  window.__predio = {
    contagem: function () {
      var pj = projecto || {};
      return {
        andares: pj.total || 0, nomeados: pj.nomeados || 0, habitados: pj.habitados || 0, rua: pj.rua || 0, em_obras: pj.em_obras || 0, reservados: pj.reservados || 0, conflitos: pj.conflitos || 0,
        fitas: grupoFitas ? grupoFitas.children.filter(function (o) { return o.userData.fita && o.userData.fita.indexOf('reservado') < 0; }).length : 0,
        lajes: grupoTorre ? grupoTorre.children.filter(function (o) { return o.userData.ordem != null; }).length : 0,
        nivel: nivelActual, pxPorAndar: pxPorAndarAgora(), alvoOrdem: alvoOrdem,
        nomesRegistados: nomesAndares.length, pilulasRegistadas: pilulasAndar.length, obrasEscondidasN1: obrasEscondidas,
        moradoresComNumero: comNumero.length, semNumero: semNumero.length, moradoresConstruidos: moradores.length,
        pilulas: moradores.filter(function (m) { return m.etq && m.etq.parent && m.etq.visible; }).length,
        cartoes3D: cartoes3D.length, hologramas: Object.keys(holos).filter(function (k) { return holos[k].sprite.visible; }).length,
        pacotesVivos: pacotesVivos.length, semCaminho: semCaminho, particulas: particulasVivas,
        ondas: imprensa ? imprensa.ondas.length : 0, nos: imprensa ? imprensa.ordem.length : 0, barras: anel ? anel.barras.length : 0, geracoes: ordemGeracoes.length,
        tweens: nTweens, tweensActivas: tweens.length, guias: nGuias, presas: rotulosPx.filter(function (sp) { return sp.visible && sp.userData.px && sp.userData.px.preso; }).length,
        cartoes: $('cartoes') ? $('cartoes').children.length : 0, maxCartoes: MAX_CARTOES,
        pendencias: (PEND && lista(PEND.itens).length) || 0, cartoesVivos: vivos.length, cartoesVivosVisiveis: vivos.filter(function (v) { return v.el.style.display !== 'none'; }).length,
        cartoesVivosTotal: vivosTotal, modoCartoes: modoCartoes, leituras: $('leituras').children.length, vistos: ordemVistos.length,
        ortografica: !!(camara && camara.isOrthographicCamera), fps: Math.round(fps()), temD: !!D, temT: !!T, telemovel: telemovel,
        cadencia: cadenciaActual,   // 'activo' = 30 desenhos/s porque algo mexe; 'parado' = 10/s de proposito
        // 20/09: quantas corridas de funcionarios o ecra JA VIU desde que abriu, e quantos cartoes
        // acenderam. Sem isto, "os cartoes nao reagem" nao se distingue de "ninguem correu".
        corridasVistas: corridasVistas, acesos: document.querySelectorAll('.cartao.topo.acende').length,
        // 19/09: o custo do 3D mede-se em CHAMADAS DE DESENHO, nao em objectos. Sem este numero nao se sabe
        // o que aliviar - e foi por medi-lo que se percebeu onde estava o peso.
        // 19/09: o inventario por tipo, para se saber O QUE faz as chamadas de desenho (e nao so quantas sao)
        inventario: (function () { var c = {}; if (cena) cena.traverse(function (o) { if (o.visible) c[o.type] = (c[o.type] || 0) + 1; }); return c; })(),
        qualidade: { passo: passoQ, escala: QUALIDADES[passoQ], descidas: descidasQ,
                     custo_mediano_ms: custosDesenho.length ? Number(custosDesenho.slice().sort(function (x, y) { return x - y; })[Math.floor(custosDesenho.length / 2)].toFixed(2)) : null },
        desenho: renderer ? { chamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles,
                              geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures,
                              objectos: cena ? cena.children.length : 0 } : null,
        // v6: o batimento, a onda de dados, a coroa e a disposicao dos cartoes
        batimento: { amp: batimento.amp, fase: batimento.fase, w: batimento.w, vivo: batimento.vivo, bpm: batimento.bpm }, vidroOpacidade: vidroOpacidade,
        ondasDeDados: ondasDeDados, ondaActiva: ondaDados.v != null, letreiro: !!(coroa && coroa.planos.length >= 1 && grupoCoroa && grupoCoroa.visible),   // v6b: era '=== 2' (os dois planos das faces); o facto e HAVER letreiro, nao como esta feito
        andaresAcesos: projecto ? projecto.lista.filter(function (it) { return !!it.acesoT0; }).length : 0,
        cartoesModo: $('cartoes') ? ($('cartoes').classList.contains('duas-filas') ? 'duas-filas' : ($('cartoes').classList.contains('faixa') ? 'faixa' : '')) : ''
      };
    },
    nivel: function (k, ordem) { irParaNivel(k, ordem, false); return nivelActual; },
    // v6: centra a camara num andar (a N2, ou no nivel actual se ja for N2/N3) e constroi a janela de moradores dele
    irAoAndar: function (o) {
      o = Number(o); if (!andarPorOrdem[o]) return null;
      var k = Math.max(2, nivelActual), antes = nivelActual, mudou = alvoOrdem !== o;
      irParaNivel(k, o, false);
      if (mudou && nivelActual === antes && nivelActual >= 2) { construirMoradores('completo'); dimensionarRotulos(true); }
      return { ordem: alvoOrdem, nivel: nivelActual, moradores: moradores.length };
    },
    // o ponto do ecra (e da pagina) onde esta o meio de um andar - para o arreio clicar e arrastar de verdade
    ecraDoAndar: function (o) {
      var it = andarPorOrdem[Number(o)]; if (!it || !cv) return null;
      var r = ecraDoMundo(new THREE.Vector3(0, it.y + 0.6, 0)), b = cv.getBoundingClientRect();
      return { x: r.x, y: r.y, cx: b.left + r.x, cy: b.top + r.y, dentro: r.x >= 0 && r.x <= vistaW && r.y >= 0 && r.y <= vistaH };
    },
    painelAberto: function () { return painelAberto; },
    letreiro: function () {
      if (!coroa) return { visivel: false, rect: null, opacos: 0, brilho: 0 };
      var op = 0; try { op = PH.fraccaoOpaca(coroa.g2d.getImageData(0, 0, coroa.canvas.width, coroa.canvas.height)); } catch (e) { op = -1; }
      var r = letreiroRect();
      return { visivel: !!(grupoCoroa && grupoCoroa.visible), rect: r, dentro: !!(r && r.dentro), opacos: op, brilho: coroa.brilho, halo: coroa.halos[0].material.opacity, reactor: coroa.reactor.material.opacity, altura: coroa.hL, largura: coroa.wL };
    },
    // as PECAS do andar em foco em coordenadas locais da laje, com o que sai do limite util e o que esta enterrado
    pecas: function () {
      var it = andarPorOrdem[alvoOrdem]; if (!it) return null;
      var limX = LARG / 2 - 0.8, limZ = PROF / 2 - 0.5, topoLaje = 0.30, out = { ordem: alvoOrdem, limites: { x: limX, z: limZ, topoLaje: topoLaje }, moradores: [], andantes: [], vasos: [], gabinete: null, fora: [], enterrados: [] };
      moradores.forEach(function (mo) {
        if (mo.ordem !== alvoOrdem) return;
        var m = { id: mo.id, lx: mo.lx, lz: mo.lz, zSecretaria: mo.lz + 1.12, fundoCadeira: 0.30 - 0.045 }; out.moradores.push(m);
        if (Math.abs(mo.lx) > limX || Math.abs(mo.lz) > limZ) out.fora.push('morador ' + mo.id);
        if (Math.abs(m.zSecretaria) > limZ) out.fora.push('secretaria ' + mo.id);
      });
      andantes.forEach(function (a) {
        if (a.ordem !== alvoOrdem) return;
        var pes = a.y - it.y - 0.30 - 0.55, m = { i: a.i, lx: a.lx, lz: a.lz, pes: pes }; out.andantes.push(m);
        if (Math.abs(a.lx) > limX || Math.abs(a.lz) > limZ) out.fora.push('estafeta ' + a.i);
        if (pes < topoLaje - 0.05) out.enterrados.push('estafeta ' + a.i + ' pes a ' + pes.toFixed(2));
      });
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (cn, q) {
        var v = { lx: cn[0] * (LARG / 2 - 1.3), lz: cn[1] * (PROF / 2 - 1.0), fundo: instVasos ? 0.48 - 0.18 : null }; out.vasos.push(v);
        if (Math.abs(v.lx) > limX || Math.abs(v.lz) > limZ) out.fora.push('vaso ' + q);
        if (v.fundo != null && v.fundo < topoLaje - 0.05) out.enterrados.push('vaso ' + q + ' fundo a ' + v.fundo.toFixed(2));
      });
      if (gabinetes.length && gabinetes[0].ordem === alvoOrdem) {
        var gx = -LARG / 2 + 3.2, gz = -PROF / 2 + 1.8, gb = { lx: gx, lz: gz, x0: gx - 2.3, x1: gx + 2.3, z0: gz - 1.2, z1: gz + 1.2 }; out.gabinete = gb;
        if (Math.abs(gb.x0) > limX || Math.abs(gb.x1) > limX || Math.abs(gb.z0) > limZ || Math.abs(gb.z1) > limZ) out.fora.push('gabinete');
      }
      return out;
    },
    // a ZONA OCUPADA de um andar (a faixa das duas filas de secretarias, ate a altura das cabecas) projectada no ecra:
    // e contra ela que a sonda mede se um holograma tapa o andar em foco
    zonaOcupada: function (o) { return zonaOcupadaRect(o); },
    layout: function (k) { return layoutHolos(k == null ? Math.max(0, nivelActual) : Number(k)); },
    dados: function () { return D; },
    avatarSVG: avatarSVG,
    pausarCiclo: function (ms) { cicloPausadoAte = Date.now() + Math.max(0, Number(ms) || 0); return cicloPausadoAte; },
    alimentar: function (p, t) { aplicarDados(p || null, t || null); return window.__predio.contagem(); },   // costura de teste: os MESMOS caminhos do ciclo()
    simularTorre: function (t) { aplicarDados(null, t); return { pacotesVivos: pacotesVivos.length, leituras: $('leituras').children.length, vistos: ordemVistos.length, particulas: particulasVivas, ondas: imprensa ? imprensa.ondas.length : 0, assinatura: anel ? anel.assinatura : '' }; },
    simularPredio: function (d) { aplicarDados(d, null); return { ondas: imprensa ? imprensa.ondas.length : 0, particulas: particulasVivas }; },
    tweens: function () { return { registadas: nTweens, activas: tweens.length, ultimas: ultimasTweens.slice() }; },
    holograma: function (nome) {
      var h = holos[nome]; if (!h) return null;
      var g = h.g, W = h.canvas.width, H = h.canvas.height, op = 0;
      try { op = W > 4 ? PH.fraccaoOpaca(g.getImageData(0, 0, W, H)) : 0; } catch (e) { op = -1; }
      return { nome: nome, visivel: !!h.sprite.visible, rect: h.rect, sw: h.sw, sh: h.sh, canvasW: W, canvasH: H, opacos: op, hash: h.hash.length, angulo: h.angulo, anguloAlvo: h.anguloAlvo, esc: h.esc, vivo: !!h.vivo, coluna: h.coluna, guia: !!h.guia };
    },
    hologramas: function () { return NOMES_HOLO.map(function (n) { return window.__predio.holograma(n); }); },
    amostrasDaFita: function (n) {
      n = Math.max(2, Math.floor(Number(n) || 40)); var out = [], r = {};
      if (!projecto) return out;
      [['dados', FASE_A], ['decisoes', FASE_B]].forEach(function (f) {
        for (var i = 0; i < n; i++) { var o = (projecto.nomeados - 1) * i / (n - 1), p = PG.helice(o, TORCAO, R_FITA, ALTURA, f[1]); ecraDoMundo(new THREE.Vector3(p.x, p.y + 0.4, p.z), r); out.push({ fita: f[0], ordem: o, x: r.x, y: r.y }); }
      });
      return out;
    },
    caixaDaTorre: function (soNomeados) {
      if (!projecto) return null;
      var pts = [], topo = (soNomeados === false ? projecto.total : projecto.nomeados) - 1;
      [0, topo].forEach(function (o) { var y = o * ALTURA; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) { var r = rodar(c[0] * LARG / 2, c[1] * PROF / 2, o * TORCAO * Math.PI / 180); pts.push(new THREE.Vector3(r.x, y, r.z), new THREE.Vector3(r.x, y + ALTURA, r.z)); }); });
      var cx = caixaProjectada(pts); cx.bandaEsq = bandaLivre(Math.max(0, nivelActual)).esq; cx.bandaDir = bandaLivre(Math.max(0, nivelActual)).dir; return cx;
    },
    rotulosDosAndares: function () { return nomesAndares.filter(function (it) { return it.sp.visible; }).map(function (it) { var r = rectDoSprite(it.sp); r.nome = it.sp.userData.px.nome; r.inteiro = it.sp.userData.px.inteiro; r.ordem = it.ordem; r.tipo = it.tipo; return r; }); },
    marcos: function () { return marcos.filter(function (m) { return m.sp.visible; }).map(function (m) { var r = rectDoSprite(m.sp); r.nome = m.sp.userData.px.nome; r.ordem = m.ordem; return r; }); },
    pilulasDeAndar: function () { return pilulasAndar.filter(function (m) { return m.sp.visible; }).map(function (m) { var r = rectDoSprite(m.sp); r.nome = m.sp.userData.px.nome; r.ordem = m.ordem; return r; }); },
    placas: function () { return placas.filter(function (p) { return p.sp.visible; }).map(function (p) { var r = rectDoSprite(p.sp); r.nome = p.sp.userData.px.nome; return r; }); },
    etiquetas: function () {
      return moradores.map(function (m) {
        var sp = m.etq, r = sp ? rectDoSprite(sp) : null;
        return { id: m.id, andar: m.andar, ordem: m.ordem, texto: m.texto, classe: m.cls, fonte: m.fonte, valor: m.valor, tem: !!(sp && sp.parent && m.texto), cartao: !!m.cartao,
                 visivel: !!(sp && sp.visible), andarEmVista: !!(andarPorOrdem[m.ordem] && andarPorOrdem[m.ordem].emVista), escalaY: m.escalaY == null ? 1 : m.escalaY,
                 px: r ? r.px : 0, dx: r ? r.dx : 0, dy: r ? r.dy : 0, preso: !!(r && r.preso), esq: r ? r.esq : 0, dir: r ? r.dir : 0, topo: r ? r.topo : 0, fundo: r ? r.fundo : 0, estado: m.estado };
      });
    },
    cartoes3D: function () { return cartoes3D.map(function (c) { var r = rectDoSprite(c.sp); r.id = c.id; r.ordem = c.ordem; r.texto = c.sp.userData.px.texto; return r; }); },
    moradoresPorAndar: function (o) { return comNumero.filter(function (d) { var it = andarPorN[andarTorreDe(d.f)]; return it && it.ordem === o; }).map(function (d) { return d.f.id; }); },
    aCorrer: function () { return moradores.filter(function (m) { return m.estado === 'a_correr'; }).map(function (m) { return { id: m.id, escalaY: m.escalaY == null ? 1 : m.escalaY }; }); },
    semNumero: function () { return semNumero.slice(); },
    capital: function () { var c = capitalExclusivo(D ? lista(D.funcionarios) : [], capitalDaCasa()); return { casa: capitalDaCasa(), ok: Object.keys(c.ok), porque: c.porque }; },
    // 21/09: a fila ao vivo, para o arreio poder prova-la e trocar de modo sem clicar
    modoCartoes: function (m) { if (m) aplicarModoCartoes(m, false); return modoCartoes; },
    vivos: function () {
      return vivos.map(function (v) {
        var r = v.el.getBoundingClientRect();
        return { id: v.id, nome: (v.el.querySelector('b') || {}).textContent || '',
                 numero: (v.el.querySelector('.num') || {}).textContent || '',
                 falha: (v.el.querySelector('.falha') || {}).textContent || '',
                 quando: (v.el.querySelector('.quando') || {}).textContent || '',
                 vida: (function () { var x = v.el.querySelector('.vida'); return x ? x.style.transform : ''; })(),
                 minutos: Number(v.f && v.f.minutos_desde_ultima),
                 visivel: v.el.style.display !== 'none' && r.width > 0 };
      });
    },
    janelaViva: function () { return JANELA_VIVO_MIN; },
    // 22/09: a RODA (que escondia e rodava) deu lugar ao CARROSSEL (que mostra todos e passeia). A API
    // descreve o que existe agora: onde vai a linha, quanto mede, e quantos cartoes estao la.
    carrossel: function (andar) {
      var cx = $('cartoes'); if (!cx) return null;
      if (andar) { cx.scrollLeft = Math.max(0, cx.scrollLeft + Number(andar)); }
      return { scrollLeft: Math.round(cx.scrollLeft), scrollWidth: cx.scrollWidth, clientWidth: cx.clientWidth,
               // quem esta A SAIR ja nao pertence a fila: saiu da janela e o elemento so fica no DOM os
               // 400 ms da animacao. Conta-lo era contar um cartao que ja nao representa ninguem.
               cartoes: cx.querySelectorAll('.cartao.vivo:not(.a-sair)').length,
               a_sair: cx.querySelectorAll('.cartao.vivo.a-sair').length,
               escondidos: Array.prototype.filter.call(cx.querySelectorAll('.cartao.vivo'), function (e) { return e.style.display === 'none'; }).length,
               mais: !!cx.querySelector('.cartao-mais'),
               // 22/09: o passeio deixou de existir (o desenho dele passou a lugares FIXOS). Estes campos
               // ficam a dizer a verdade nova em vez de desaparecerem: quem le o arreio ve que nao ha rolagem.
               lugares: quantasCadeiras(cx), rola: cx.scrollWidth > cx.clientWidth + 1,
               velocidade: 0, pausado: false, pausa_resta_ms: 0 };
    },
    cartoes: function () {
      var cx = $('cartoes'); if (!cx) return [];
      return Array.prototype.slice.call(cx.querySelectorAll('.cartao')).map(function (b) {
        var ct = b.dataset.id != null ? cartoesTopo[b.dataset.id] : null, nome = (b.querySelector('b') || {}).textContent || '';
        return { id: nome, cargo: ct ? ct.id : null, titulo: ct ? ct.titulo : nome, activos60: ct ? ct.activos60 : null, aCorrer: ct ? !!ct.aCorrer : false, total: ct ? ct.total : null,
                 pulsos: ct ? ct.pulsos : 0, pulsa: b.classList.contains('pulsa'), dependentes: ct ? ct.dependentes : null,
                 numero: (b.querySelector('.num') || {}).textContent || '', falha: (b.querySelector('.falha') || {}).textContent || '', classe: b.className };
      });
    },
    maisCartoes: function () { var el = $('cartoes') ? $('cartoes').querySelector('.cartao-mais') : null; return el ? Number(String(el.textContent).replace('+', '')) || 0 : 0; },
    acorde: function () { if (!D) return null; var andarDe = {}; lista(D.funcionarios).forEach(function (f) { andarDe[f.id] = andarTorreDe(f); }); var ac = acordeDoGrafo(D.ligacoes, andarDe), el = $('acorde'); return { total: ac.total, arcos: ac.arcos.length, dentro: ac.dentro, sem_andar: ac.sem_andar, nos: ac.nos.length, pintadoW: el ? el.width : 0, pintadoH: el ? el.height : 0 }; },
    vista: function () { return { ortografica: !!(camara && camara.isOrthographicCamera), meia: orbita.meia, theta: orbita.theta, phi: orbita.phi, cx: orbita.cx, cy: orbita.cy, mundoPorPx: mundoPorPx(), larg: vistaW, alt: vistaH, semNevoeiro: !(cena && cena.fog), pxPorAndar: pxPorAndarAgora(), nivel: nivelActual }; },
    hud: function () { return caixasDoHUD(); },
    // Desenha e le no MESMO passo sincrono (armadilha b): depois do compositing o readPixels devolve zeros.
    pixeis: function () {
      if (!renderer) return 0;
      renderer.render(cena, camara);
      var g = renderer.getContext(), w = renderer.domElement.width, h = renderer.domElement.height, px = new Uint8Array(4 * 400);
      g.readPixels(Math.floor(w / 2) - 10, Math.floor(h / 2) - 10, 20, 20, g.RGBA, g.UNSIGNED_BYTE, px);
      var s = 0; for (var i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2];
      return s;
    },
    tinta: function (esq, topo, larg, alt, limiar) {
      if (!renderer) return null;
      renderer.render(cena, camara);
      var g = renderer.getContext(), W = renderer.domElement.width, H = renderer.domElement.height, k = W / (vistaW || W);
      var x = Math.max(0, Math.floor(esq * k)), y0 = Math.max(0, Math.floor(topo * k)), w = Math.min(W - x, Math.ceil(larg * k)), h = Math.min(H - y0, Math.ceil(alt * k));
      if (w <= 0 || h <= 0) return null;
      var px = new Uint8Array(4 * w * h); g.readPixels(x, H - (y0 + h), w, h, g.RGBA, g.UNSIGNED_BYTE, px);
      var lim = isFinite(Number(limiar)) ? Number(limiar) : 140, linhas = 0, prim = -1, ult = -1, n = 0, maxLum = 0;
      for (var ly = 0; ly < h; ly++) {
        var temLinha = false;
        for (var lx = 0; lx < w; lx++) { var o = 4 * (ly * w + lx), lum = 0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]; if (lum > maxLum) maxLum = lum; if (lum > lim && px[o + 3] > 40) { temLinha = true; n++; } }
        if (temLinha) { linhas++; if (prim < 0) prim = ly; ult = ly; }
      }
      return { linhas: linhas / k, alturaTinta: (prim < 0 ? 0 : (ult - prim + 1) / k), pixeis: n, k: k, maxLum: maxLum };
    },
    abrir: abrirPainel, abrirOrdem: abrirPainelOrdem, fechar: fecharPainel, lancar: lancarPacote, onda: ondaDaFonte,
    jorrarUltima: function () { if (!T || !chafariz) return null; var gs = lista(obj(T.extremis).geracoes).filter(function (g) { return g && g.geracao != null; }); if (!gs.length) return null; return jorrarGeracao(gs.slice().sort(function (a, b) { return a.geracao - b.geracao; }).pop()); },
    v2Visivel: function (b) { v2Ligado = !!b; v2Grupos.forEach(function (g) { g.visible = v2Ligado; }); return v2Ligado; },
    anel: function () { return anel ? { assinatura: anel.assinatura, barras: anel.barras.map(function (b) { return { chave: b.chave, nome: b.nome, realizado: b.realizado, alvo: b.alvo, controlo: b.controlo, cor: b.cor }; }) } : null; },
    imprensaNos: function () { return imprensa ? imprensa.ordem.map(function (id) { var n = imprensa.nos[id]; return { id: id, r: n.r, cred: n.cred, sem_placar: n.sem_placar, hub: id === imprensa.hubId }; }) : []; },
    estado: function () { return { D: D, T: T }; },
    puro: { escalaDoRotulo: escalaDoRotulo, pixeisDoTexto: pixeisDoTexto, numeroDoMorador: numeroDoMorador, alvoDoNomeDoAndar: alvoDoNomeDoAndar, arrumarEtiquetas: arrumarEtiquetas,
            capitalExclusivo: capitalExclusivo, nomeQueCabe: nomeQueCabe, alvoQueCabe: alvoQueCabe, cartoesQueCabem: cartoesQueCabem, tocam: tocam, acordeDoGrafo: acordeDoGrafo,
            lugarNoCirculo: lugarNoCirculo, curto4: curto4, particulasDaGeracao: particulasDaGeracao, alturaDaBarra: alturaDaBarra, raioDoNo: raioDoNo }
  };
})();
