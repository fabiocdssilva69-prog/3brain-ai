// t3b_vivo.js — O RELOGIO QUE MANDA EM TUDO da Torre 3BRAIN (01/10/2026).
//
// A licao 01 do Lab de Animacao (o artefacto dele): "nao sao 20 animacoes soltas. E um unico tick() que gera dado novo.
// Cada peca so reage ao dado." Aqui o tick nao SIMULA nada: le. Um so agendador busca cada ficheiro a sua cadencia, guarda
// a ultima leitura, e avisa quem quer saber (T3B.on). Os hologramas, o nucleo, o anel, o chat, os cartoes e a torre 3D
// sao todos ouvintes - nenhum busca dados sozinho.
//
// O QUE SE LE (e de quanto em quanto):
//   /vivo.json?desde=N   1 s   quem mexeu, ao segundo (mercado/torre_vivo.py, dentro do servidor da sala)
//   torre.json           2 s   os numeros do dinheiro e do instrumento (o torre.py escreve de 15 em 15 s)
//   enxame.json          10 s  a S.H.I.E.L.D. (vigia, cargos, visitas, parecer do Stark)
//   /estrutura.json      60 s  andares, sectores, programas e o censo (substitui o predio.json de 1 MB)
//   pendencias.json      60 s  o que ele nao quer esquecer
//   conversa.json        1 vez o historico do chat; dai em diante as mensagens chegam pelo /vivo.json
// Com a aba escondida tudo abranda 5x (o custo de uma aba esquecida aberta e o de quem a deixou ali, nao o da torre).
//
// A REGRA DELE QUE ESTE FICHEIRO SERVE: "cada atualizacao na torre, seja de tempo, de numero ou de informacao, o
// funcionario responsavel por essa mudanca, ate dos segundos, tem que piscar ali nos cartoes". Cada evento do /vivo.json
// traz o id de quem o fez; cada numero do ecra sabe quem o produz (AUTORES) e, quando muda, diz o nome.
'use strict';
(function () {
  var T3B = window.T3B = window.T3B || {};
  var ouvintes = {};
  T3B.on = function (nome, fn) { (ouvintes[nome] = ouvintes[nome] || []).push(fn); };
  T3B.emit = function (nome, d) { (ouvintes[nome] || []).forEach(function (fn) { try { fn(d); } catch (e) { if (window.console) console.warn('t3b ' + nome, e); } }); };

  // ---------------------------------------------------------------- utilitarios (partilhados com os outros ficheiros)
  var $ = function (id) { return document.getElementById(id); };
  function txt(el, s) { s = String(s == null ? '' : s); if (el && el.textContent !== s) el.textContent = s; }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}; }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  var FMT = {};
  function fmt(v, c) {
    v = Number(v); if (!isFinite(v)) return '—'; c = c == null ? 2 : c;
    var f = FMT[c] || (FMT[c] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }));
    return f.format(v);
  }
  function sinal(v, c) { v = Number(v); if (!isFinite(v)) return '—'; return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), c); }
  function semente(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  // a hora de Brasilia de um ISO (04/10: um ISO em UTC - "Z" - mostrava a hora de Londres, 3 h a frente)
  var FMT_H = null; try { FMT_H = new Intl.DateTimeFormat('pt-PT', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch (e) { }
  function hhmmss(iso) {
    if (!iso) return '…'; var s = String(iso);
    if (FMT_H && /(Z|[+-]\d\d:?\d\d)$/.test(s) && !/-03:?00$/.test(s)) { var d = new Date(s); if (isFinite(d)) return FMT_H.format(d); }
    var m = /T(\d\d:\d\d:\d\d)/.exec(s); return m ? m[1] : s.slice(-8);
  }
  function epoch(iso) { var t = Date.parse(iso); return isFinite(t) ? t : 0; }
  function haQuanto(ms) { var s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : Math.round(s / 3600) + ' h'; }
  var calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // as cores: OURO e a marca; as divisoes tem cor propria; verde/ambar/vermelho so para ESTADO (regra do artefacto)
  var COR_DIVISAO = { Dados: '#2dd4e8', Negociacao: '#f2c230', Controlo: '#b265f5', Topo: '#e8e4d8' };
  var COR_ESTADO = { ok: '#3fd69a', a_correr: '#60a5fa', atrasado: '#fbbf24', erro: '#ff5a5f', sem_tarefa: '#6a6a76', a_dormir: '#6a6a76' };
  function divisaoDoAndar(n) { var a = andarPorN[n]; return a ? (a.divisao || (n >= 52 ? 'Topo' : 'Dados')) : (n >= 52 ? 'Topo' : null); }
  function corDoAndar(n) { return COR_DIVISAO[divisaoDoAndar(n)] || '#9797a3'; }

  // o busto de cada funcionario: deterministico pelo nome (a mesma cara no cartao, no chat e no painel). Estilo dos
  // bonecos da torre 3D (cabeca grande, mini): pele, cabelo, olhos que piscam, casaco da cor da divisao e, para quem
  // tem cargo de heroi, o anel de ouro. Sem imagens do MCU (direitos): ilustracao nossa.
  var cacheAv = {};
  function avatarSVG(nome, cor, feminino, heroi) {
    var k = nome + '|' + cor + '|' + (feminino ? 1 : 0) + '|' + (heroi ? 1 : 0);
    if (cacheAv[k]) return cacheAv[k];
    var h = semente(nome), peles = ['#f1c9a5', '#e0b088', '#c58c63', '#9a6644', '#f6d7bf', '#6e4630'];
    var cabelos = ['#17171c', '#3b2416', '#6e4527', '#c9922b', '#d8d3c8', '#5b2a1e', '#2b2f55', '#8b3a2e'];
    var pele = peles[h % peles.length], cab = cabelos[(h >> 3) % cabelos.length], est = (h >> 6) % 3;
    cor = cor || '#2dd4e8';
    var cabelo = feminino
      ? '<path d="M15 31 C13 13 51 13 49 31 L50 46 C46 42 45 36 43 28 C37 32 27 32 21 25 C19 34 18 41 14 46 Z" fill="' + cab + '"/>'
      : (est === 0 ? '<path d="M16 29 C16 12 48 12 48 29 L45 23 C38 18 26 18 19 23 Z" fill="' + cab + '"/>'
        : est === 1 ? '<path d="M17 27 C20 11 44 11 47 27 L43 20 L35 16 L28 16 L21 20 Z" fill="' + cab + '"/>'
          : '<path d="M16 30 C16 15 48 15 48 30 L47 31 L17 31 Z" fill="' + cab + '"/>');
    var oculos = (h >> 9) % 3 === 0, barba = !feminino && (h >> 11) % 4 === 0, brinco = feminino && (h >> 12) % 2 === 0;
    var gravata = !feminino && (h >> 13) % 2 === 0 ? ['#7a1f2b', '#1f3a6e', '#c9922b', '#2d2d33'][(h >> 14) % 4] : null;
    var d = 'g' + (h % 100000);
    var s = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="' + d + '" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#1d1a12"/><stop offset="1" stop-color="#0b0b0f"/></radialGradient></defs>' +
      '<rect x="0" y="0" width="64" height="64" fill="url(#' + d + ')"/>' +
      // 07/10 (Q5 C3, av_busto: "gola, oculos, mais detalhe no rosto"): busto - casaco na cor da divisao, camisa com gola,
      // gravata para alguns, pescoco, orelhas, sobrancelhas, olhos com branco e pupila, nariz, bochechas; oculos, barba e brincos
      // pelo nome (o mesmo funcionario tem sempre a mesma cara)
      '<path d="M6 64 C6 50 19 45 32 45 C45 45 58 50 58 64 Z" fill="' + cor + '" fill-opacity=".92"/>' +
      '<path d="M25 46 L32 57 L39 46 Z" fill="#f3f1ea"/>' +
      '<path d="M25 46 L29.5 52 L23.5 57 Z M39 46 L34.5 52 L40.5 57 Z" fill="' + cor + '" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>' +
      (gravata ? '<path d="M31 51 L33 51 L34.2 58 L32 61 L29.8 58 Z" fill="' + gravata + '"/>' : '') +
      '<rect x="28" y="39" width="8" height="9" rx="2" fill="' + pele + '"/><rect x="28" y="39" width="8" height="3" fill="#000" fill-opacity=".12"/>' +
      '<ellipse cx="18" cy="31" rx="2.3" ry="3.6" fill="' + pele + '"/><ellipse cx="46" cy="31" rx="2.3" ry="3.6" fill="' + pele + '"/>' +
      '<rect x="18" y="14" width="28" height="31" rx="13" fill="' + pele + '"/>' + cabelo +
      (brinco ? '<circle cx="17.6" cy="35.4" r="1.2" fill="#f2c230"/><circle cx="46.4" cy="35.4" r="1.2" fill="#f2c230"/>' : '') +
      '<path d="M23 27.2 Q26 25.6 29 27 M35 27 Q38 25.6 41 27.2" stroke="' + cab + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="26" cy="31" rx="2.6" ry="1.9" fill="#fbfaf6"/><ellipse cx="38" cy="31" rx="2.6" ry="1.9" fill="#fbfaf6"/>' +
      '<circle cx="26.4" cy="31.2" r="1.3" fill="#1d1a17"/><circle cx="38.4" cy="31.2" r="1.3" fill="#1d1a17"/>' +
      '<circle cx="26.9" cy="30.7" r=".4" fill="#fff"/><circle cx="38.9" cy="30.7" r=".4" fill="#fff"/>' +
      (oculos ? '<rect x="22.4" y="28.4" width="7.2" height="5.4" rx="2" fill="#fff" fill-opacity=".08" stroke="#1b1b22" stroke-width="1.2"/>' +
        '<rect x="34.4" y="28.4" width="7.2" height="5.4" rx="2" fill="#fff" fill-opacity=".08" stroke="#1b1b22" stroke-width="1.2"/>' +
        '<path d="M29.6 30.6 L34.4 30.6" stroke="#1b1b22" stroke-width="1.1"/>' : '') +
      '<path d="M32 31.5 Q30.8 35.2 32.6 36" stroke="#000" stroke-opacity=".22" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<circle cx="23.6" cy="36.6" r="2" fill="#e98f7a" fill-opacity=".22"/><circle cx="40.4" cy="36.6" r="2" fill="#e98f7a" fill-opacity=".22"/>' +
      (barba ? '<path d="M20 35 C21.5 46.5 42.5 46.5 44 35 C41 42 23 42 20 35 Z" fill="' + cab + '" fill-opacity=".88"/>' : '') +
      '<path d="M28 39 Q32 41.5 36 39" stroke="#5a3a2a" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      (heroi ? '<rect x="1.5" y="1.5" width="61" height="61" rx="9" fill="none" stroke="#f2c230" stroke-width="2.5"/>' : '') +
      '</svg>';
    cacheAv[k] = s;
    return s;
  }

  // 04/10 (obra 4, "caracteres bugados"): o texto que vem dos dados passa SEMPRE por aqui antes de ir para o ecra -
  // limpar (mojibake, losango, bandeiras, controlo), cortar por grafemas (nunca meio emoji), markdown -> negrito/listas
  var TX = window.T3BTexto;
  function limpo(s) { return TX ? TX.limpar(s) : String(s == null ? '' : s); }
  function cortar(s, n) { return TX ? TX.cortar(s, n) : String(s == null ? '' : s).slice(0, n); }
  T3B.util = { $: $, txt: txt, lista: lista, obj: obj, escH: escH, fmt: fmt, sinal: sinal, semente: semente, hhmmss: hhmmss, epoch: epoch,
    haQuanto: haQuanto, calmo: calmo, corDoAndar: corDoAndar, divisaoDoAndar: divisaoDoAndar, avatarSVG: avatarSVG,
    COR_DIVISAO: COR_DIVISAO, COR_ESTADO: COR_ESTADO, limpo: limpo, cortar: cortar };

  // ---------------------------------------------------------------- o estado (a ultima leitura de cada ficheiro)
  var E = T3B.estado = { T: null, ENX: null, EST: null, PEND: null, vivoSeq: 0, eventos: [], programas: {}, idadeT: null };
  var andarPorN = {};
  T3B.andar = function (n) { return andarPorN[n] || null; };

  // ---------------------------------------------------------------- o agendador (um relogio so)
  var FONTES = [
    { nome: 'vivo', url: function () { return 'vivo.json?desde=' + E.vivoSeq + (document.hidden ? '' : '&vista=1') + (window.T3B_PUBLICADO ? '&_=' + Math.floor(Date.now() / 15000) : ''); }, cada: window.T3B_PUBLICADO ? 15000 : 1000, aplicar: aplicarVivo },   // 09/10: na copia publica o '&_=' fura a cache de 10 min do site (a mesma fotografia vinha repetida)   // 05/10: vista=1 liga o modo espectador (mercado/espectador.py)
    { nome: 'torre', url: function () { return 'torre.json'; }, cada: 2000, aplicar: aplicarTorre },
    { nome: 'enxame', url: function () { return 'enxame.json'; }, cada: 10000, aplicar: aplicarEnxame },
    { nome: 'estrutura', url: function () { return 'estrutura.json'; }, cada: 60000, aplicar: aplicarEstrutura, primeiro: true },
    { nome: 'pend', url: function () { return 'pendencias.json'; }, cada: 60000, aplicar: aplicarPend },
    { nome: 'evolucao', url: function () { return 'evolucao.json'; }, cada: 60000, aplicar: aplicarEvolucao, primeiro: true, opcional: true },   // 05/10: a evolucao de todos os canais
    { nome: 'conversa', url: function () { return 'conversa.json'; }, cada: 0, aplicar: function (c) { T3B.emit('conversa_historia', c); } },
    // 03/10: o ALERTA 3D. sala/alertas.json e escrito pelo conserto (mercado/conserto.py: alertas()) quando a escada inteira
    // nao resolveu; sem ficheiro (404) ou vazio = nada aparece, e isso NAO e erro (opcional).
    { nome: 'alertas', url: function () { return 'alertas.json'; }, cada: 15000, aplicar: aplicarAlertas, opcional: true }
  ];
  FONTES.forEach(function (f) { f.ult = 0; f.emVoo = false; f.falhas = 0; f.feito = false; });
  function buscar(f, agora) {
    f.emVoo = true; f.ult = agora;
    var u = f.url(); u += (u.indexOf('?') >= 0 ? '&' : '?') + 't=' + agora;
    fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) { if (f.opcional) return null; throw new Error(r.status); } return r.json(); })
      .then(function (d) { f.falhas = 0; f.feito = true; f.aplicar(d); })
      .catch(function (e) { f.falhas++; if (f.falhas === 3 && window.console) console.warn('t3b: ' + f.nome + ' falha', String(e).slice(0, 80)); })
      .then(function () { f.emVoo = false; });
  }
  function tique() {
    var agora = Date.now(), lento = document.hidden ? 5 : 1;
    for (var i = 0; i < FONTES.length; i++) {
      var f = FONTES[i];
      if (f.emVoo) continue;
      if (f.cada === 0) { if (!f.feito && f.falhas < 3 && agora - f.ult > 4000) buscar(f, agora); continue; }
      // a estrutura chega primeiro: sem andares nao ha a quem dar os eventos
      if (!f.primeiro && !FONTES[3].feito && f.nome !== 'torre') continue;
      var cada = f.cada * lento * (f.falhas > 2 ? 3 : 1);
      if (agora - f.ult >= cada) buscar(f, agora);
    }
  }

  // ---------------------------------------------------------------- estrutura (andares, sectores, programas, censo)
  function aplicarEstrutura(d) {
    E.EST = d;
    andarPorN = {};
    lista(d.andares).forEach(function (a) { andarPorN[a.n] = a; });
    E.programas = {};
    lista(d.programas).forEach(function (p) { E.programas[p.id] = p; });
    pintarHUDEstrutura();
    pintarDirectorio();
    // 04/10: os hologramas representam sectores pela ESPECIALIDADE; os numeros dos andares sao os de agora (o organograma muda)
    if (window.T3BLigacoes) window.T3BLigacoes.definirAndares(lista(d.andares));
    T3B.emit('estrutura', d);
  }
  T3B.quem = function (id) {
    var p = E.programas[id];
    if (p) return { id: id, nome: p.curto || id, titulo: p.titulo || id, andar: p.andar, cargo: p.cargo, sector: p.sector, feminino: !!p.feminino,
      heroi: p.nivel === 'heroi' || /^(Director|Directora|Supervisor|Supervisora|Gerente de Operacoes|Sr\.)/.test(p.curto || ''), estado: p.estado };
    return null;
  };

  // ---------------------------------------------------------------- o vivo (quem mexeu, ao segundo)
  var ultimoPorId = {};     // id -> epoch ms do ultimo evento dele (para saber a quem dar um numero que mudou)
  var desdeAbriu = { n: 0, ids: {} };
  function aplicarVivo(d) {
    if (!d || d.seq == null) return;
    if (d.seq < E.vivoSeq) E.vivoSeq = 0;                     // o servidor reiniciou: o anel e outro
    var historia = !E.vivoSeq;                                // a 1.a leitura traz os ultimos 60 (passado): nao e um enxame de agora
    var evs = lista(d.eventos).filter(function (e) { return e.s > E.vivoSeq; });
    E.vivoSeq = d.seq;
    E.ritmo = { n: d.ritmo_60s || 0, quem: d.quem_60s || 0, porAndar: obj(d.por_andar_60s), agora: d.agora };
    if (d.cota) E.cota = d.cota;                                  // 04/10: o modo da cota (a ampulheta)
    txt($('b_ritmo'), (d.ritmo_60s || 0) + ' ev · ' + (d.quem_60s || 0) + ' func.');
    evs.forEach(function (e) {
      e.ms = epoch(e.t);
      ultimoPorId[e.id] = Math.max(ultimoPorId[e.id] || 0, e.ms || Date.now());
      E.eventos.push(e); desdeAbriu.n++; desdeAbriu.ids[e.id] = 1;
    });
    if (E.eventos.length > 400) E.eventos.splice(0, E.eventos.length - 400);
    if (evs.length) {
      if (window.T3B_PUBLICADO) tocarPublicado(evs, historia);   // 09/10: a copia publica toca em diferido continuo
      else if (historia) { evs.forEach(function (e) { e.historia = true; }); filaDeCartoes(evs); T3B.emit('eventos', evs); }
      else repetirNoRitmo(evs);
    }
    T3B.emit('ritmo', E.ritmo);
  }
  // 09/10 00:3x (ele, a ver a torre-viva no PC-HuntAI: "os hologramas travam e nao sincronizam"). MEDIDO: a fotografia publica
  // trazia ~2 min de eventos e chegava de ~9 em 9 min; a 1.a leitura era "historia" (nada reagia) e cada lote novo era
  // comprimido em 15 s - 15 s de movimento a cada 9 min. Agora (com o publicar_torre a juntar os ultimos 12 min): cada evento
  // sai a hora em que aconteceu MAIS um atraso fixo PUB.D (o relogio diferido). A 1.a leitura toca ja os ultimos 6 min; se uma
  // fotografia chegar tarde, o atraso estica (nunca encolhe: a ordem mantem-se). A torre no PC (ao vivo) nao muda.
  var PUB = { D: null }, PUB_ARRANQUE_MS = 6 * 60 * 1000;
  function tocarPublicado(evs, primeira) {
    var agora = Date.now(), ok = evs.filter(function (e) { return isFinite(e.ms) && e.ms > 0; });
    if (!ok.length) return;
    ok.sort(function (a, b) { return a.ms - b.ms; });
    var maxMs = ok[ok.length - 1].ms;
    if (primeira) {                                           // o que e mais velho que a janela de arranque fica como historia
      var velhos = ok.filter(function (e) { return e.ms < maxMs - PUB_ARRANQUE_MS; });
      if (velhos.length) { velhos.forEach(function (e) { e.historia = true; }); filaDeCartoes(velhos); T3B.emit('eventos', velhos); }
      ok = ok.filter(function (e) { return e.ms >= maxMs - PUB_ARRANQUE_MS; });
      if (!ok.length) return;
    }
    if (PUB.D == null || ok[0].ms + PUB.D < agora - 2000) PUB.D = agora - ok[0].ms;
    var grupos = [], porT = {};
    ok.forEach(function (e) { var k = String(e.t || ''); if (!porT[k]) { porT[k] = []; grupos.push(porT[k]); } porT[k].push(e); });
    grupos.forEach(function (g) {
      var atraso = g[0].ms + PUB.D - agora;
      var soltar = function () { filaDeCartoes(g); T3B.emit('eventos', g); };
      if (atraso < 30) soltar(); else setTimeout(soltar, atraso);
    });
  }
  // 08/10 (OBRA 11, ele: "tem que ta tudo sincronizado"): o lote do /vivo.json chega de 1 em 1 s (de 15 em 15 s na copia publica);
  // cada SEGUNDO do lote sai a sua hora relativa - o coracao, o vortex, os cartoes, os hologramas e o chat recebem o MESMO grupo no
  // MESMO instante, ao ritmo real da torre (o que aconteceu no mesmo segundo sai junto: e o enxame)
  function repetirNoRitmo(evs) {
    var grupos = [], porT = {}, m0 = Infinity, teto = (window.T3B_PUBLICADO ? 15000 : 1000) - 100;
    evs.forEach(function (e) { var k = String(e.t || ''); if (!porT[k]) { porT[k] = []; grupos.push(porT[k]); } porT[k].push(e); if (e.ms && e.ms < m0) m0 = e.ms; });
    grupos.forEach(function (g) {
      var atraso = isFinite(m0) && g[0].ms ? Math.min(teto, Math.max(0, g[0].ms - m0)) : 0;
      var soltar = function () { filaDeCartoes(g); T3B.emit('eventos', g); };
      if (atraso < 30) soltar(); else setTimeout(soltar, atraso);
    });
  }

  // A QUEM SE DA UM NUMERO QUE MUDOU: a quem produz o ficheiro de onde ele vem. Vence o candidato que escreveu mais
  // recentemente (3 min); sem nenhum, o Analista do torre.json - que foi, sem duvida, quem escreveu o numero no ecra.
  var AUTORES = {
    cap: ['capital', 'alocador', 'capital_fatia'], dia: ['painel', 'papel_cripto', 'papel', 'binance_real'],
    abe: ['binance_real', 'papel_cripto', 'painel'], ini: ['realizado', 'painel'], mes: ['mesa', 'painel'], org: ['torre'],
    cota: ['cota', 'regulador', 'cota_torre'], velocimetro: ['painel', 'papel_cripto'], trilho: ['painel'],
    stark: ['stark', 'sr_stark', 'alocador'], risco: ['risco', 'painel'], mesa: ['papel_cripto', 'papel', 'binance_real', 'fabrica_execucao', 'mesa'],
    lab: ['organismo', 'fabrica_ideias', 'organismo_p7', 'mesa_de_agentes'], numeros: ['realizado', 'painel', 'pulso'],
    turnos: ['turnos', 'forca_trabalho'], consertos: ['autoconserto', 'conserto', 'fila_consertos'], avarias: ['enxame', 'conserto']
  };
  T3B.autorDe = function (chave) {
    var c = AUTORES[chave] || [], melhor = null, tm = 0, agora = Date.now();
    c.forEach(function (id) { var t = ultimoPorId[id] || 0; if (t > tm && agora - t < 180000) { tm = t; melhor = id; } });
    var id = melhor || (ultimoPorId.torre ? 'torre' : (c[0] || 'torre'));
    var q = T3B.quem(id);
    return { id: id, nome: q ? q.nome : id, ms: tm || ultimoPorId.torre || 0 };
  };
  // um numero mudou: acende o cartao de quem o mudou (como se fosse um evento - e e: o ecra mudou por causa dele)
  T3B.creditar = function (chave, rotulo) {
    var a = T3B.autorDe(chave);
    filaDeCartoes([{ k: 'numero', id: a.id, t: new Date().toISOString(), ms: Date.now(), txt: rotulo, quem: a.nome, andar: (T3B.quem(a.id) || {}).andar }]);
    return a;
  };

  // ---------------------------------------------------------------- odometro (licao 15 do artefacto)
  // Cada digito e uma fita 0-9 numa janela de 1 linha; muda o numero, a fita rola ate ele. Os outros caracteres
  // (sinal, virgula, US$) ficam parados. So transform anima - a GPU faz o trabalho.
  // 03/10 noite (q31 "a cada segundo e ate antes de um segundo"): cada fita tem 11 casas (0-9 e outra vez 0) e o ULTIMO
  // digito pode receber a fraccao (`frac`, 0-1): no conta-quilometros vivo ele rola CONTINUO entre dois valores, como um de
  // verdade, em vez de saltar de digito em digito.
  function odometro(el, texto, frac) {
    if (!el) return false;
    texto = String(texto);
    var temFrac = frac != null && isFinite(frac);
    if (el.dataset.v === texto && !temFrac) return false;
    var antes = el.dataset.v; el.dataset.v = texto;
    var forma = texto.replace(/\d/g, '0');
    if (el.dataset.f !== forma) {                 // a forma mudou (mais um digito, outro sinal): reconstroi
      el.dataset.f = forma; el.innerHTML = '';
      var odo = document.createElement('span'); odo.className = 'odo';
      for (var i = 0; i < texto.length; i++) {
        var ch = texto[i];
        if (/\d/.test(ch)) {
          var dg = document.createElement('span'); dg.className = 'dg';
          var fi = document.createElement('span'); fi.className = 'fita';
          for (var k = 0; k <= 10; k++) { var sp = document.createElement('span'); sp.textContent = k % 10; fi.appendChild(sp); }
          fi.style.transitionDelay = (i * 35) + 'ms';
          dg.appendChild(fi); odo.appendChild(dg);
        } else { var s = document.createElement('span'); s.className = /[.,:]/.test(ch) ? 'sep' : 'ch'; s.textContent = ch; if (ch === ' ') s.style.width = '.25em'; odo.appendChild(s); }
      }
      el.appendChild(odo);
    }
    var fitas = el.querySelectorAll('.fita'), j = 0, nd = fitas.length;
    for (var x = 0; x < texto.length; x++) if (/\d/.test(texto[x])) {
      var d = Number(texto[x]) + (temFrac && j === nd - 1 ? Math.max(0, Math.min(0.999, frac)) : 0);
      fitas[j].classList.toggle('cont', temFrac && j === nd - 1);
      fitas[j].style.transform = 'translateY(' + (-d * 100 / 11).toFixed(3) + '%)'; j++;
    }
    return antes != null && antes !== texto;      // a primeira escrita nao e "mudanca"
  }
  T3B.odometro = odometro;

  function piscarCelula(id, chave, rotulo) {
    var c = $(id); if (!c) return;
    // 04/10 (obra 4): o "void offsetWidth" obrigava o browser a refazer o layout da pagina inteira a cada numero que mudava;
    // agora a luz e uma animacao do compositor (Web Animations) - nada a refazer
    var fl = c.querySelector(':scope > .fl'); if (!fl) { fl = document.createElement('i'); fl.className = 'fl'; c.appendChild(fl); }
    if (fl.animate && !calmo) fl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1600, easing: 'ease-out' });
    var a = T3B.creditar(chave, rotulo), ch = c.querySelector('.autor');
    if (ch) { ch.textContent = 'por ' + a.nome; ch.classList.add('on'); clearTimeout(ch._t); ch._t = setTimeout(function () { ch.classList.remove('on'); }, 4500); }
  }
  function numeroCasa(chave, celula, idV, texto, classe, rotulo) {
    var el = $(idV);
    if (odometro(el, texto)) piscarCelula(celula, chave, rotulo + ' → ' + texto);
    if (el) el.className = 'v' + (classe ? ' ' + classe : '');
  }
  // q31 (ordem dele): "os numeros VIVOS a mudar em tempo real, a cada segundo e ate antes de um segundo". Entre duas
  // leituras o numero nao salta: INTERPOLA (1,6 s, suavizado) e a fita do odometro rola a 10 Hz. O credito ao
  // funcionario e o flash da celula acontecem UMA vez, quando chega o valor novo - nunca a cada passo.
  var VIVOS = {};
  function numeroVivo(chave, celula, idV, valor, formatar, classe, rotulo) {
    var el = $(idV); if (!el) return;
    valor = Number(valor);
    if (!isFinite(valor)) { odometro(el, formatar(NaN)); return; }
    var v = VIVOS[chave];
    if (!v) { VIVOS[chave] = { de: valor, para: valor, t0: 0, el: el, formatar: formatar, dur: 1600 }; odometro(el, formatar(valor)); el.className = 'v vivo' + (classe ? ' ' + classe : ''); return; }
    if (v.para === valor) { el.className = 'v vivo' + (classe ? ' ' + classe : ''); return; }
    v.de = v.actual == null ? v.para : v.actual; v.para = valor; v.t0 = performance.now(); v.el = el; v.formatar = formatar;
    el.className = 'v vivo' + (classe ? ' ' + classe : '');
    piscarCelula(celula, chave, rotulo + ' → ' + formatar(valor));
  }
  // q31: a interpolacao corre a CADA QUADRO (era 10 Hz): o numero desliza entre duas leituras e o ultimo digito rola
  // continuo (a fraccao das centesimas) - "vivos a cada fraccao de segundo onde o dado e ao vivo"
  var ultVivos = 0;
  function quadroVivos() {
    requestAnimationFrame(quadroVivos);
    if (document.hidden) return;
    var agora = performance.now();
    if (agora - ultVivos < 32) return; ultVivos = agora;            // 04/10 (obra 4): 30 vezes por segundo chega para o rolar continuo
    passoFita(agora);
    Object.keys(VIVOS).forEach(function (k) {
      var v = VIVOS[k]; if (!v.t0) return;
      var p = Math.min(1, (agora - v.t0) / v.dur), e = 1 - Math.pow(1 - p, 3);
      v.actual = v.de + (v.para - v.de) * e;
      var esc = 100, f = Math.abs(v.actual) * esc; f = f - Math.floor(f);
      odometro(v.el, v.formatar(v.actual), p >= 1 ? null : f);
      if (p >= 1) { v.t0 = 0; v.actual = null; }
    });
  }
  requestAnimationFrame(quadroVivos);
  function cls(v) { v = Number(v); return !isFinite(v) || Math.abs(v) < 0.005 ? '' : (v > 0 ? 'up' : 'dn'); }

  // ---------------------------------------------------------------- torre.json (o dinheiro)
  var assTorre = '';
  function aplicarTorre(T) {
    if (!T) return;
    E.idadeT = T.t_iso ? epoch(T.t_iso) : null;
    if (T.t_iso === assTorre) return;             // o mesmo ficheiro: nada mudou, nada se toca
    assTorre = T.t_iso; E.T = T;
    try { if (window.__torrePintar) window.__torrePintar(T); } catch (e) { }
    pintarCasa(T);
    marcarAoVivo(T);
    pintarExtrasHUD(T);
    pintarHUDTorre(T);
    pintarFita(T);
    T3B.emit('torre', T);
  }
  function pintarCasa(T) {
    var r = obj(T.reactor), c = obj(r.conta), g = obj(r.ganho), je = obj(r.ja_entrou), p = obj(T.pepper), est = obj(obj(p.totais).estrategias), org = obj(T.orgaos);
    var fUS = function (v) { return fmt(v, 2) + ' US$'; }, sUS = function (v) { return sinal(v, 2) + ' US$'; };
    numeroVivo('cap', 'c_cap', 'n_cap', c.capital_escala, fUS, '', 'capital');
    txt($('n_cap_s'), 'acumulado em papel ' + sinal(c.acumulado_papel, 2) + ' US$');
    numeroVivo('dia', 'c_dia', 'n_dia', g.realizado_usd, sUS, cls(g.realizado_usd), 'realizado hoje');
    txt($('n_dia_s'), (g.n_entrou_hoje || 0) + ' entrada(s) · ' + (g.n_saiu_hoje || 0) + ' saída(s) · cripto ' + sinal(g.realizado_cripto_usd, 2));
    numeroVivo('ini', 'c_ini', 'n_ini', je.liquido, sUS, cls(je.liquido), 'desde o início');
    txt($('n_ini_s'), fmt(je.operacoes, 0) + ' operações · taxas ' + fmt(je.taxa, 2) + ' US$');
    numeroVivo('mes', 'c_mes', 'n_mes', est.realizado, sUS, cls(est.realizado), 'livro da mesa');
    txt($('n_mes_s'), (est.n_linhas || 0) + ' estratégias · ' + (est.n || 0) + ' operações');
    pintarEvolucao(T);                                                    // 05/10: no lugar dos "orgaos prontos" (ordem dele)
    abertoDoFicheiro = Number(r.aberto_total_usd);
    pintarAberto(false);
  }
  // o "em aberto" mexe ao segundo pelo livro da Binance (o reactor.js calcula-o e escreve-o em #k_aberto); entre
  // leituras do torre.json vale o do ficheiro. Quem o mexeu ao segundo e o MERCADO, nao um funcionario: diz-se isso.
  var abertoDoFicheiro = NaN, ultimoAbertoTxt = '';
  function pintarAberto(doTique) {
    // 05/10 (ele: "nao estao mudando em tempo real"; as 2 prints: -3,12 as 20:25 e as 20:58): o "ao segundo" lia o #k_aberto
    // do reactor.js, que deixou de ser actualizado quando a ligacao DELE a Binance caiu (e a marca __mdVivo nunca voltava a
    // falso). Agora e a propria pagina: as posicoes de cripto do torre.json x o preco ao vivo (AOVIVO, abaixo).
    var vivo = (AOVIVO.aberto != null && Date.now() - AOVIVO.tPreco < 15000) ? AOVIVO.aberto : null;
    var v = vivo != null ? vivo : abertoDoFicheiro;
    var txtV = sinal(v, 2) + ' US$';
    var el = $('n_abe');
    if (txtV === ultimoAbertoTxt) return;
    if (isFinite(v)) { E.abertoVivo = v; T3B.emit('aberto', v); }   // a mesa (G9) amostra o em aberto a cada mudanca
    var mudou = ultimoAbertoTxt !== '';
    ultimoAbertoTxt = txtV;
    // q31: interpola entre leituras (900 ms: o livro da Binance mexe ao segundo e o numero nunca salta)
    var vv = VIVOS.abe; if (!vv) { VIVOS.abe = { de: v, para: v, t0: 0, el: el, formatar: function (x) { return sinal(x, 2) + ' US$'; }, dur: 900 }; odometro(el, txtV); }
    else { vv.de = vv.actual == null ? vv.para : vv.actual; vv.para = v; vv.t0 = performance.now(); vv.el = el; }
    if (el) el.className = 'v vivo ' + cls(v);
    txt($('n_abe_s'), vivo != null ? 'ao segundo · Binance (' + AOVIVO.pos.length + ' cripto) + ações do ficheiro' : 'do ficheiro (sem preço ao vivo)');
    if (mudou && !doTique) piscarCelula('c_abe', 'abe', 'em aberto → ' + txtV);
    // (05/10: o tique do mercado ja nao acende a etiqueta - agora chega 4 vezes por segundo e tapava o numero; o subtitulo diz 'ao segundo')
  }

  // ---------------------------------------------------------------- 05/10: OS NUMEROS AO VIVO
  // As posicoes de CRIPTO do torre.json (quantidade e o preco a que o ficheiro as marcou) x o preco AO VIVO da Binance
  // (bookTicker, o meio entre a melhor compra e a melhor venda, pela ligacao unica da pagina - t3b_ws.js): a diferenca mexe o
  // CAPITAL DA CASA e o EM ABERTO ao segundo, para cima e para baixo. O realizado (hoje, desde o inicio, o livro da mesa) so
  // muda quando uma operacao FECHA - esse nao se inventa. As accoes ficam no preco do ficheiro (nao ha fluxo gratis ao segundo).
  var AOVIVO = { pos: [], fluxos: {}, mid: {}, base: null, ult: 0, tPreco: 0, aberto: null, delta: 0 };
  function marcarAoVivo(T) {
    var r = obj(T.reactor), c = obj(r.conta);
    AOVIVO.base = { cap: Number(c.capital_escala), abe: Number(r.aberto_total_usd) };
    AOVIVO.pos = lista(r.posicoes).filter(function (p) { return p.cripto && isFinite(Number(p.qty)) && Number(p.agora) > 0; })
      .map(function (p) { return { sym: String(p.simbolo).replace(/USD$/, 'USDT'), qty: Number(p.qty), ref: Number(p.agora) }; });
    if (!window.T3BBinance) return;
    var quer = {}; AOVIVO.pos.forEach(function (p) { quer[p.sym.toLowerCase() + '@bookTicker'] = p.sym; });
    Object.keys(AOVIVO.fluxos).forEach(function (f) { if (!quer[f]) { try { window.T3BBinance.largar(f); } catch (e) { } delete AOVIVO.fluxos[f]; } });
    Object.keys(quer).forEach(function (f) {
      if (AOVIVO.fluxos[f]) return; AOVIVO.fluxos[f] = 1;
      (function (sym) { window.T3BBinance.assinar(f, function (d) { aoPreco(sym, d); }); })(quer[f]);
    });
  }
  function aoPreco(sym, d) {
    d = d && d.data ? d.data : d;
    var b = Number(d && d.b), a = Number(d && d.a); if (!(b > 0 && a > 0)) return;
    AOVIVO.mid[sym] = (a + b) / 2; AOVIVO.tPreco = Date.now();
    var agora = performance.now(); if (agora - AOVIVO.ult < 250) return; AOVIVO.ult = agora;     // 4 vezes por segundo chega
    var dl = 0; AOVIVO.pos.forEach(function (p) { var m = AOVIVO.mid[p.sym]; if (m) dl += p.qty * (m - p.ref); });
    AOVIVO.delta = dl;
    if (AOVIVO.base && isFinite(AOVIVO.base.cap)) quieto('cap', AOVIVO.base.cap + dl, 700);
    AOVIVO.aberto = AOVIVO.base && isFinite(AOVIVO.base.abe) ? AOVIVO.base.abe + dl : null;
    if (AOVIVO.aberto != null) { var bx = $('bx_abe'); txt(bx, sinal(AOVIVO.aberto, 2) + ' US$'); if (bx) bx.className = cls(AOVIVO.aberto); }
    pintarAberto(true);
  }
  // o numero desliza para o valor novo SEM piscar a celula (o mercado mexeu, nao um funcionario)
  function quieto(chave, valor, dur) { var v = VIVOS[chave]; if (!v || !isFinite(valor) || v.para === valor) return; v.de = v.actual == null ? v.para : v.actual; v.para = valor; v.t0 = performance.now(); v.dur = dur || 700; }
  // 05/10 (ele: "orgaos prontos nao pode ser isso, quero que seja algo como novas evolucoes... o quanto fez de evolucao no dia
  // e quanto pretende fazer nas proximas horas; importante que esse numero sempre va aumentando"): o TOTAL de avaliacoes de genes
  // desde sempre (so sobe), o que entrou HOJE (as geracoes de hoje, hora de Brasilia) e a previsao das proximas 3 h pelo ritmo das
  // ultimas 6 h. (As fontes - Instagram, YouTube, noticias, GitHub - entram quando ele confirmar a conta: OBRA_9 ponto 5.)
  function brtDia(ms) { return new Date(ms - 3 * 3600000).toISOString().slice(0, 10); }
  // 05/10 21:4x (ele confirmou: "sim, de todos os canais que a gente evolui e consulta"): /evolucao.json (mercado/evolucao_canais.py)
  // - genes + pesquisa + agentes (YouTube...) + Instagram + prints + ideias + GitHub, num total que so sobe; o detalhe por canal
  // fica no title do cartao. Sem a rota (servidor antigo), vale o calculo so dos genes (abaixo).
  var NOME_CANAL = { genes: 'genes', pesquisa: 'pesquisa', agentes: 'YouTube e agentes', instagram: 'Instagram', prints: 'prints', ideias: 'ideias', github: 'GitHub' };
  function aplicarEvolucao(d) {
    if (!d || d.total == null || d.erro) return;
    E.evo = d;
    numeroVivo('org', 'c_org', 'n_org', d.total, function (v) { return fmt(v, 0); }, 'up', 'evolução');
    txt($('n_org_s'), 'hoje +' + fmt(d.hoje, 0) + ' · próximas 3 h ≈ +' + fmt(d.proximas_3h, 0));
    txt($('bx_hoje'), '+' + fmt(d.hoje, 0));
    var pc = obj(d.por_canal_hoje), det = Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; }).map(function (k) { return (NOME_CANAL[k] || k) + ' +' + fmt(pc[k], 0); }).join(' · ');
    var c = $('c_org'); if (c) c.title = 'evolução de hoje por canal: ' + det + ' · total desde sempre (só sobe): ' + fmt(d.total, 0);
  }
  function pintarEvolucao(T) {
    if (E.evo) return;
    var ex = obj(T.extremis), gs = lista(ex.geracoes), hoje = brtDia(Date.now()), agora = Date.now(), hojeN = 0, hojeR = 0, ult6 = 0;
    gs.forEach(function (g) { var ms = epoch(g.quando); if (!ms) return; if (brtDia(ms) === hoje) { hojeN += Number(g.avaliados) || 0; hojeR += Number(g.robustos) || 0; } if (agora - ms < 6 * 3600000) ult6 += Number(g.avaliados) || 0; });
    numeroVivo('org', 'c_org', 'n_org', ex.n_avaliacoes, function (v) { return fmt(v, 0); }, 'up', 'evolução');
    txt($('n_org_s'), 'hoje +' + fmt(hojeN, 0) + ' (' + fmt(hojeR, 0) + ' robustos) · próximas 3 h ≈ +' + fmt(Math.round(ult6 / 6 * 3), 0));
    txt($('bx_hoje'), '+' + fmt(hojeN, 0));
  }

  // 05/10 22:xx (ele: "as escritas que ficam ali embaixo [dos numeros] vao ficar em carrossel tambem"): cada linha que nao cabe corre
  // de um lado ao outro e volta (so a que nao cabe; medido de 2 em 2 s)
  setInterval(function () {
    if (document.hidden) return;
    Array.prototype.forEach.call(document.querySelectorAll('.casa .s'), function (s) {
      var cel = s.parentElement; if (!cel) return;
      var falta = Math.ceil(s.scrollWidth - (cel.clientWidth - 32));
      if (falta > 4) { s.style.setProperty('--falta', falta + 'px'); s.style.setProperty('--dur', Math.max(6, Math.round(falta / 18) + 4) + 's'); s.classList.add('corre'); }
      else s.classList.remove('corre');
    });
  }, 2000);

  // ---------------------------------------------------------------- HUD
  function pintarHUDEstrutura() {
    var d = E.EST; if (!d) return;
    var ands = lista(d.andares), obras = ands.filter(function (a) { return a.obra === 'em_obras'; }).length;
    txt($('b_andares'), ands.length + ' · ' + (ands.length - obras) + ' hab · ' + obras + ' obras');
    var pt = obj(obj(d.predio).totais), ce = obj(pt.censo_especies);
    var censo = pt.censo || obj(d.totais).peoes;
    txt($('b_func'), fmt(censo, 0) + ' · ' + (pt.funcionarios || lista(d.programas).length) + ' prog.');
    var b = $('b_func_c');
    if (b) b.title = fmt(censo, 0) + ' funcionários no censo = ' + Object.keys(ce).map(function (k) { return fmt(ce[k], 0) + ' ' + k + (ce[k] === 1 ? '' : 's'); }).join(' + ') +
      '. Destes, ' + (pt.funcionarios || 0) + ' são PROGRAMAS do registo: os que escrevem ficheiros e por isso acendem os cartões ao segundo. Algoritmos e regras trabalham dentro deles.';
    var maus = lista(d.programas).filter(function (p) { return p.estado === 'erro'; });
    estadoBase = maus.length ? (maus.length + ' em erro: ' + maus.slice(0, 2).map(function (p) { return limpo(p.curto || p.id); }).join(', ')) : 'torre de pé';
    // 05/10 22:xx (ele: "a parte '3 em erro' sai, fica so a luz vermelha quando tiver algum erro e verde quando ok"): o texto saiu do
    // cabecalho (t3b.css #b_estado). 09/10: a COR e a dica da luz sao do radar da S.H.I.E.L.D. (t3b_holo.pintarLegendaRadar) - uma
    // fonte so, para a luz e o radar nunca discordarem.
  }
  var estadoBase = '';
  function pintarHUDTorre(T) {
    txt($('b_fase'), String(T.fase || '—'));
    var org = obj(T.orgaos), prox = obj(org.proximo);
    txt($('b_prox'), prox.nome ? (String(prox.nome).replace('Tesouraria-', '') + ' em ' + fmt(prox.em_min, 0) + ' min') : '—');
    var j = obj(T.jarvis); txt($('b_portao'), j.portao ? String(j.portao) : '—');
    barra('jb_ses', 'jt_ses', j.sessao_pct, 'cota'); barra('jb_sem', 'jt_sem', j.semana_pct, 'cota');
  }
  var ultimaCota = {};
  function barra(idBarra, idTexto, pct, chave) {
    var el = $(idBarra), b = $(idTexto); if (!el || pct == null) return;
    var i = el.firstChild; if (i) i.style.width = Math.max(0, Math.min(100, pct)) + '%';
    var s = fmt(pct, 0) + '%';
    if (ultimaCota[idBarra] != null && ultimaCota[idBarra] !== s) T3B.creditar(chave, 'cota ' + s);
    ultimaCota[idBarra] = s;
    txt(b, s);
  }
  // BRT e NY sao RELOGIOS: andam ao segundo. Ao lado do estado conta-se a IDADE do dado - diz quando chegou, nao finge.
  function relogio() {
    var a = new Date(), hora = function (tz) { try { return a.toLocaleTimeString('pt-PT', { timeZone: tz, hour12: false }); } catch (e) { return '—'; } };
    txt($('b_brt'), hora('America/Sao_Paulo')); txt($('b_ny'), hora('America/New_York'));
    var s = E.idadeT ? Math.max(0, Math.round((Date.now() - E.idadeT) / 1000)) : null;
    txt($('b_estado'), (estadoBase || 'a ligar…') + (s == null ? '' : ' · dado há ' + (s < 90 ? s + ' s' : Math.round(s / 60) + ' min')));
    pintarAberto(true);
    pintarRodapeCartoes();
  }

  // a fita de cotacoes: as posicoes abertas com o preco VIVO (o reactor guarda o ultimo preco da Binance ancorado)
  var fitaAss = '';
  var NOME_CRIPTO = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', AAVE: 'Aave', DOT: 'Polkadot', ONDO: 'Ondo', UNI: 'Uniswap', PAXG: 'PAX Gold',
    BCH: 'Bitcoin Cash', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', LINK: 'Chainlink', AVAX: 'Avalanche', LTC: 'Litecoin', BNB: 'BNB', TRX: 'Tron',
    XLM: 'Stellar', ATOM: 'Cosmos', NEAR: 'Near', APT: 'Aptos', ARB: 'Arbitrum', OP: 'Optimism', SUI: 'Sui', HBAR: 'Hedera', FIL: 'Filecoin',
    ETC: 'Ethereum Classic', MATIC: 'Polygon', POL: 'Polygon', SHIB: 'Shiba Inu', PEPE: 'Pepe', TON: 'Toncoin', ICP: 'Internet Computer', ALGO: 'Algorand',
    MKR: 'Maker', CRV: 'Curve', LDO: 'Lido', INJ: 'Injective', RNDR: 'Render', RENDER: 'Render', FET: 'Fetch.ai', TIA: 'Celestia', SEI: 'Sei', WLD: 'Worldcoin',
    ENA: 'Ethena', JUP: 'Jupiter', PYTH: 'Pyth', HYPE: 'Hyperliquid', TAO: 'Bittensor', USDT: 'Tether', USDC: 'USD Coin' };
  function pintarFita(T) {
    var el = $('fita_mov'); if (!el) return;
    var pos = lista(obj(obj(T || E.T).reactor).posicoes), vivos = {};
    try { if (window.__md && window.__md.S && window.__md.S.cr) vivos = window.__md.S.cr; } catch (e) { }
    // 05/10 22:xx (ele: "o carrossel dos valores no cabecalho tem que falar o nome todo do activo e nao so a sigla"): o nome inteiro
    // (as accoes trazem-no no torre.json; as cripto pelo dicionario NOME_CRIPTO) + a sigla; o preco e o P&L das cripto AO VIVO
    // (AOVIVO, o mesmo bookTicker que mexe o "em aberto")
    var pecas = pos.map(function (p) {
      var s = String(p.simbolo || ''), c = obj(vivos[s]), base = s.replace(/USDT?$/, ''), mid = AOVIVO.mid[base + 'USDT'];
      var preco = p.cripto && mid && Date.now() - AOVIVO.tPreco < 15000 ? mid : (c.bin != null && c.basis != null) ? (c.bin + c.basis) : Number(p.agora);
      var pnl = Number(p.pnl_aberto_usd), pct = Number(p.pnl_aberto_pct), ent = Number(p.entrada), q = Number(p.qty);
      if (p.cripto && mid && isFinite(ent) && ent > 0 && isFinite(q)) { pnl = (preco - ent) * q; pct = (preco / ent - 1) * 100 * (q < 0 ? -1 : 1); }
      var k = cls(pnl), nome = p.cripto ? (NOME_CRIPTO[base] || base) : limpo(p.nome || s);
      return '<span><u>' + escH(nome) + ' <small>' + escH(base) + '</small></u>' + (isFinite(preco) ? fmt(preco, preco > 100 ? 2 : 4) : '—') +
        '<i class="' + k + '">' + (isFinite(pct) ? sinal(pct, 2) + '%' : '') + '</i><i class="' + k + '">' + (isFinite(pnl) ? sinal(pnl, 2) + ' US$' : '') + '</i></span>';
    });
    if (!pecas.length) pecas = ['<span><u>sem posições abertas</u></span>'];
    var html = pecas.join('') + pecas.join('');
    if (html === fitaAss) return;
    fitaAss = html; el.innerHTML = html; FITA.meia = 0;
  }
  // 04/10 (obra 4, medido por processo do Chrome): a fita a correr por CSS (40 s, infinita) obrigava o compositor a refazer o
  // ecra inteiro a cada vsync, para sempre (60 vezes por segundo no ecra dele) - o processo da GPU nunca descansava. Agora anda
  // pelo relogio da pagina (t3b_ritmo.js, ~20 quadros/s): a mesma velocidade (metade da largura em 40 s, ~25 px/s = ~1,2 px por
  // quadro, a vista igual) e o compositor so trabalha quando ela anda.
  var FITA = { x: 0, meia: 0, t: 0 };
  function passoFita(agora) {
    var el = $('fita_mov'); if (!el || calmo) return;
    if (!FITA.meia) FITA.meia = el.scrollWidth / 2;          // (uma leitura de layout so quando o conteudo muda)
    var dt = FITA.t ? Math.min(0.25, (agora - FITA.t) / 1000) : 0; FITA.t = agora;
    if (FITA.meia < 10) return;
    FITA.x = (FITA.x + dt * FITA.meia / 40) % FITA.meia;
    el.style.transform = 'translate3d(' + (-FITA.x).toFixed(1) + 'px,0,0)';
  }

  // ---------------------------------------------------------------- enxame (S.H.I.E.L.D.)
  function aplicarEnxame(d) {
    if (!d) return;
    var ass = (d.batimento && d.batimento.seq) + '|' + d.t_iso;
    if (E.ENX && E.ENX._ass === ass) return;
    d._ass = ass; E.ENX = d;
    pintarBarraTurnos(d);
    T3B.emit('enxame', d);
  }

  // 04/10 (obra 4, t07 dele): a barra do topo com os 7 numeros dos turnos - registados, em turno, a trabalhar agora, a evoluir,
  // faltaram ao turno, consertos de hoje feitos sozinhos, avarias abertas (obra 2: sala/enxame.json -> pessoal.turnos.barra).
  // Cada numero e um conta-quilometros e, quando muda, acende o cartao de quem o produz.
  var CHAVE_DA_BARRA = { registados: 'turnos', em_turno: 'turnos', a_trabalhar_agora: 'turnos', a_evoluir: 'turnos', faltaram: 'turnos', consertos_sozinhos: 'consertos', avarias_abertas: 'avarias' };
  function pintarBarraTurnos(d) {
    var tb = obj(obj(d.pessoal).turnos), barra = lista(tb.barra);
    barra.forEach(function (x) {
      var el = $('bt_' + x.id + '_v'); if (!el || x.valor == null) return;
      var v = fmt(x.valor, 0);
      if (odometro(el, v)) { var c = $('bt_' + x.id); if (c && c.animate && !calmo) c.animate([{ color: '#ffdc6a' }, { color: 'inherit' }], { duration: 1200 }); T3B.creditar(CHAVE_DA_BARRA[x.id] || 'turnos', String(x.rotulo || x.id) + ' → ' + v); }
      if (x.id === 'faltaram' || x.id === 'avarias_abertas') el.className = 'num ' + (x.valor > 0 ? 'mau' : 'ok');
      var c2 = $('bt_' + x.id); if (c2) c2.title = String(x.rotulo || x.id) + ': ' + v + (tb.t_iso ? ' · medido ' + String(tb.t_iso).slice(11, 16) : '') + (x.id === 'em_turno' && tb.carga_horaria_pct != null ? ' · carga horária ' + fmt(tb.carga_horaria_pct, 1) + '%' : '');
    });
  }

  // ---------------------------------------------------------------- ALERTAS (03/10): o que a escada inteira nao resolveu
  // O FORMATO (o mesmo que mercado/conserto.py escreve em sala/alertas.json e dados/enxame/alertas.json):
  //   { "t_iso": "...", "regra": "...", "alertas": [ { "id", "funcionario" (id do programa), "andar", "tipo", "sev_agora"
  //     ("vermelho"|"amarelo"|"sem_vigia"), "aberto_em" (ISO), "fechado_ts" (epoch s, quando a escada desistiu),
  //     "tentativas" (n), "ultimo_modelo" ("haiku"|"sonnet"|"opus"), "o_que_falhou" (texto), "prova" (texto) } ] }
  // Sem ficheiro, ou com "alertas": [] -> nada aparece. Um alerta por funcionario (o mais recente). Tudo o que falte
  // fica a "—": a pagina nunca inventa um numero.
  function aplicarAlertas(d) {
    var A = d && typeof d === 'object' ? d : { alertas: [] };
    A.alertas = lista(A.alertas).filter(function (a) { return a && typeof a === 'object' && a.funcionario; }).map(function (a, i) { if (!a.id) a.id = 'al' + i + ':' + a.funcionario; return a; });
    var ass = A.alertas.map(function (a) { return a.id + ':' + a.sev_agora + ':' + a.tentativas + ':' + a.fechado_ts; }).join('|');
    if (E.ALERTAS && E.ALERTAS._ass === ass) return;
    A._ass = ass; E.ALERTAS = A;
    var b = $('b_alertas'); if (b) { txt(b, A.alertas.length ? A.alertas.length + ' por resolver' : 'nenhum'); b.className = A.alertas.length ? 'mau' : ''; }
    txt($('pc_alertas'), String(A.alertas.length));
    T3B.emit('alertas', A);
  }
  T3B.alertaDetalhe = function (al) {
    var p = $('alerta_det'), c = $('ad_corpo'); if (!p || !c) return;
    var A = E.ALERTAS || { alertas: [] };
    if (!al) {                                             // a lista inteira (clique no HUD)
      txt($('ad_tit'), A.alertas.length ? A.alertas.length + ' alerta(s) por resolver' : 'sem alertas');
      c.innerHTML = A.alertas.length ? '<div class="lista">' + A.alertas.map(function (a) { var q = T3B.quem(a.funcionario); return '<div data-id="' + escH(a.id) + '">⚠ <b>' + escH(limpo(q ? q.nome : a.funcionario)) + '</b> · and. ' + escH(a.andar != null ? a.andar : '?') + ' · ' + escH(cortar(limpo(a.o_que_falhou || a.tipo || ''), 70)) + '</div>'; }).join('') + '</div>'
        : '<p style="color:var(--mute)">A escada de conserto (3 tentativas por passo, Haiku → Sonnet → Opus alto) não deixou nada por resolver. O ficheiro sala/alertas.json está vazio ou não existe — e é assim que deve estar.</p>';
      p.hidden = false; return;
    }
    var q = T3B.quem(al.funcionario), and = andarPorN[al.andar] || {};
    var ha = al.fechado_ts ? haQuanto(Date.now() - Number(al.fechado_ts) * 1000) : (al.aberto_em ? haQuanto(Date.now() - epoch(al.aberto_em)) : '—');
    var desde = al.aberto_em ? haQuanto(Date.now() - epoch(al.aberto_em)) : '—';
    var passos = ['haiku', 'sonnet médio', 'sonnet alto', 'opus médio', 'opus alto'], ult = String(al.ultimo_modelo || '').toLowerCase(), idx = /opus/.test(ult) ? 4 : /sonnet/.test(ult) ? 2 : /haiku/.test(ult) ? 0 : -1;
    txt($('ad_tit'), '⚠ ' + (q ? q.nome : al.funcionario));
    c.innerHTML = '<div style="color:var(--mute)">' + escH(q ? (q.cargo || q.titulo || '') : '') + '</div>' +
      '<div class="l"><u>o que falhou</u><span>' + escH(limpo(al.o_que_falhou || al.tipo || 'sem descrição')) + '</span>' +
      '<u>prova do vigia</u><span>' + escH(limpo(al.prova || 'sem prova escrita')) + '</span>' +
      '<u>andar</u><span>' + escH(al.andar != null ? al.andar + ' · ' + (and.nome || '') : '—') + '</span>' +
      '<u>estado agora</u><span style="color:' + (al.sev_agora === 'vermelho' ? 'var(--mau)' : 'var(--am)') + '">' + escH(al.sev_agora || '—') + '</span>' +
      '<u>aberto há</u><span>' + escH(desde) + (al.aberto_em ? ' · ' + escH(String(al.aberto_em).slice(0, 16).replace('T', ' ')) : '') + '</span>' +
      '<u>a escada desistiu há</u><span>' + escH(ha) + '</span>' +
      '<u>tentativas</u><span>' + escH(al.tentativas != null ? al.tentativas : '—') + (al.ultimo_modelo ? ' · a última com ' + escH(al.ultimo_modelo) : '') + '</span>' +
      '<u>id do caso</u><span class="mono" style="font-size:10px">' + escH(al.id) + '</span></div>' +
      '<div class="escada">' + passos.map(function (s, i) { return '<span class="' + (i <= idx ? 'feito' : '') + '">' + escH(s) + '</span>'; }).join('') + '</div>' +
      '<p style="color:var(--mute);font-size:11px;margin:8px 0 0">A escada inteira de conserto (3 tentativas por passo, do Haiku ao Opus alto) não resolveu e o vigia continua a não dar verde. É contigo: ' +
      (al.andar != null ? '<button type="button" class="ad-and" data-n="' + escH(al.andar) + '" style="background:none;border:1px solid var(--ouro-dk);border-radius:8px;color:var(--ouro);padding:2px 8px;cursor:pointer;font:inherit">puxar a gaveta do andar ' + escH(al.andar) + '</button>' : '') + '</p>';
    p.hidden = false;
  };
  T3B.on('alertaDetalhe', T3B.alertaDetalhe);
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.closest && t.closest('#b_alertas_c')) { T3B.alertaDetalhe(null); return; }
    if (t.closest && t.closest('#ad_fx')) { $('alerta_det').hidden = true; return; }
    var li = t.closest && t.closest('#alerta_det .lista div'); if (li) { var al = lista(E.ALERTAS && E.ALERTAS.alertas).filter(function (a) { return a.id === li.dataset.id; })[0]; if (al) T3B.alertaDetalhe(al); return; }
    var ba = t.closest && t.closest('#alerta_det .ad-and'); if (ba) { T3B.abrirAndar(Number(ba.dataset.n), true); return; }
  });

  // ---------------------------------------------------------------- pendencias
  function aplicarPend(p) {
    E.PEND = p;
    var itens = lista(p && p.itens).filter(function (x) { return !/^\[(FEITO|RESOLVIDO)\b/.test(String(x.titulo || '')); });
    var cx = $('pendencias'), bl = $('bl_pend');
    if (cx) cx.innerHTML = itens.map(function (x) {
      var dele = String(x.quem || '') === 'ele';
      return '<div class="pd-it ' + escH(x.peso || 'media') + '"><i class="' + (dele ? 'dele' : '') + '">' + escH(x.peso || '') + ' · ' +
        (dele ? 'depende dele' : (x.quem === 'eu' ? 'é comigo' : 'dos dois')) + '</i><b>' + escH(TX ? TX.semMarkdown(limpo(x.titulo || '')) : x.titulo) + '</b>' +
        (x.falta ? '<em>' + escH(TX ? TX.semMarkdown(limpo(x.falta)) : x.falta) + '</em>' : '') + '</div>';
    }).join('');
    if (bl) bl.hidden = !itens.length;
    var dele = itens.filter(function (x) { return x.quem === 'ele'; }).length;
    txt($('pd_kn'), itens.length ? (itens.length + ' em aberto · ' + dele + ' dependem dele') : '');
  }

  // ---------------------------------------------------------------- directorio dos andares
  function pintarDirectorio() {
    var cx = $('dir'), d = E.EST; if (!cx || !d) return;
    var ass = lista(d.andares).map(function (a) { return a.n + ':' + a.n_peoes + ':' + a.obra; }).join('|');
    if (cx.dataset.ass === ass) return;
    cx.dataset.ass = ass;
    // 05/10 (ele: "essa barra no rodape poderia andar em tempo real pro lado"): corre sozinha; a copia e igual ao original; o
    // rato por cima para-a; o clique e um so para as duas (delegado no #dir, abaixo)
    var tr = cx.querySelector('.car-tr'); if (!tr) { cx.innerHTML = '<div class="car-tr"><span class="car-orig"></span><span class="car-copia" aria-hidden="true"></span></div>'; tr = cx.querySelector('.car-tr'); }
    var orig = tr.querySelector('.car-orig'); orig.innerHTML = '';
    lista(d.andares).slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = a.obra === 'em_obras' ? 'obra' : '';
      b.dataset.n = a.n;
      b.innerHTML = '<u>' + escH(a.n) + '</u>' + escH(limpo(a.nome)) + ' · ' + escH(a.n_peoes);
      b.style.borderLeft = '3px solid ' + corDoAndar(a.n);
      orig.appendChild(b);
    });
    tr.querySelector('.car-copia').innerHTML = orig.innerHTML;
    tr.style.setProperty('--dur', Math.max(40, Math.round(orig.scrollWidth / 35)) + 's');   // ~35 px por segundo
  }
  (function () { var cx = $('dir'); if (cx) cx.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('button[data-n]'); if (b) T3B.abrirAndar(Number(b.dataset.n), true); }); })();
  // 05/10 (ele: a barra do cabecalho "em carrossel vivo... e tem que atualizar em tempo real conforme a torre"): a barra corre
  // sozinha; a copia (sem ids) segue o original de segundo a segundo; o rato por cima para-a para se ler
  function ligarCarrossel(idTr, pxPorSeg) {
    var tr = $(idTr); if (!tr || tr._car) return; tr._car = true;
    var orig = tr.querySelector('.car-orig'), copia = tr.querySelector('.car-copia'); if (!orig || !copia) return;
    function sinc() {
      var h = orig.innerHTML.replace(/\sid="[^"]*"/g, ''); if (copia._h !== h) { copia._h = h; copia.innerHTML = h; }
      var w = orig.scrollWidth; if (w && Math.abs(w - (tr._w || 0)) > 40) { tr._w = w; tr.style.setProperty('--dur', Math.max(30, Math.round(w / pxPorSeg)) + 's'); }
    }
    sinc(); setInterval(function () { if (!document.hidden) sinc(); }, 1000);
  }
  ligarCarrossel('hud_tr', 45);
  // as celulas novas da barra (05/10): o que a torre tem aberto e o que evoluiu
  function pintarExtrasHUD(T) {
    var r = obj(T.reactor), ex = obj(T.extremis), ps = lista(r.posicoes), cr = ps.filter(function (p) { return p.cripto; }).length;
    txt($('bx_pos'), ps.length + ' (' + cr + ' cripto · ' + (ps.length - cr) + ' ações)');
    txt($('bx_ger'), fmt(ex.geracao_actual, 0)); txt($('bx_fam'), fmt(ex.n_familias, 0)); txt($('bx_rob'), fmt(ex.robustos_alguma_vez, 0));
  }
  T3B.on('eventos', function (evs) {             // o botao do andar acende quando alguem la mexe
    var cx = $('dir'); if (!cx) return;
    evs.forEach(function (e) {
      if (e.andar == null) return;
      Array.prototype.forEach.call(cx.querySelectorAll('button[data-n="' + e.andar + '"]'), function (b) {   // o original e a copia do carrossel
        b.classList.add('vivo'); clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('vivo'); }, 2500);
      });
    });
  });

  // ---------------------------------------------------------------- abrir um andar (painel + camara)
  T3B.abrirAndar = function (n, voar) {
    var a = andarPorN[n]; if (!a) return;
    E.andarAberto = n;
    pintarPainel(a);
    Array.prototype.forEach.call(document.querySelectorAll('#dir button'), function (b) { b.classList.toggle('on', Number(b.dataset.n) === n); });
    T3B.emit('abrirAndar', { n: n, voar: voar !== false });
  };
  function pintarPainel(a) {
    var p = $('painel'); if (!p) return;
    txt($('pn_tit'), 'Andar ' + a.n + ' · ' + a.nome);
    txt($('pn_kn'), (a.obra === 'em_obras' ? 'em obras · ' : '') + fmt(a.n_peoes, 0) + ' funcionários · ' + lista(a.sectores).length + ' sectores · ' + (a.divisao || 'topo'));
    var progs = lista(E.EST && E.EST.programas).filter(function (x) { return x.andar === a.n; });
    var h = '';
    if (a.obra === 'em_obras') h += '<p>Andar em obras: ainda sem gente. Os contadores estão a zero porque o andar ainda não existe — um ecrã que lhe desse números seria um ecrã a mentir. O Arquiteto decide quando abre.</p>';
    h += '<div class="sect">' + lista(a.sectores).slice().sort(function (x, y) { return y.n - x.n; }).slice(0, 60).map(function (s) {
      return '<span title="' + escH(s.id) + (s.lider ? ' · líder ' + escH(s.lider) : '') + '">' + escH(s.nome) + '<b>' + escH(s.n) + '</b></span>';
    }).join('') + (lista(a.sectores).length > 60 ? '<span>+' + (lista(a.sectores).length - 60) + ' sectores</span>' : '') + '</div>';
    if (a.gerente) h += '<p style="color:var(--mute);font-size:11px">gerente do andar: <b style="color:var(--ouro)">' + escH(a.gerente) + '</b> · mínimo ' + escH(a.minimo || '—') + ' · tecto ' + escH(a.tecto || '—') + '</p>';
    if (progs.length) {
      h += '<details><summary>' + progs.length + ' programas neste andar</summary><table><thead><tr><th>programa</th><th>cargo</th><th>estado</th><th>último</th></tr></thead><tbody>' + progs.map(function (x) {
        var t = ultimoPorId[x.id];
        return '<tr><td>' + escH(x.curto) + '</td><td>' + escH(x.cargo || '') + '</td><td style="color:' + (COR_ESTADO[x.estado] || '#999') + '">' + escH(String(x.estado || '').replace('_', ' ')) + '</td><td>' + (t ? 'há ' + haQuanto(Date.now() - t) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></details>';
    }
    if (window.T3BHolo && window.T3BHolo.blocoDoAndar) { try { h += window.T3BHolo.blocoDoAndar(a) || ''; } catch (e) { } }
    $('pn_corpo').innerHTML = h;
    p.classList.remove('fechando');
    p.classList.add('aberto'); p.setAttribute('aria-hidden', 'false');
    // ponto 4 (q20/r04): o cartao do andar e pequeno, no canto, e FECHA SOZINHO (8 s; com o rato em cima espera)
    clearTimeout(p._t);
    var agendar = function () { clearTimeout(p._t); p._t = setTimeout(function () { if (p.matches(':hover')) { agendar(); return; } p.classList.add('fechando'); setTimeout(function () { if (p.classList.contains('fechando')) fecharPainel(); }, 480); }, 8000); };
    agendar();
    if (!p._ligado) { p._ligado = true; p.addEventListener('mouseleave', agendar); }
  }
  function fecharPainel() { var p = $('painel'); if (p) { clearTimeout(p._t); p.classList.remove('aberto', 'fechando'); p.setAttribute('aria-hidden', 'true'); T3B.emit('layout'); } }
  T3B.fecharPainel = fecharPainel;

  // ================================================================ OS CARTOES AO VIVO
  // A ordem dele, cinco vezes (19-22/09): "cada funcionario que reagir acende o seu cartao; tipo um carrossel, cada card a
  // reagir aparece ali na linha; nao pode aparecer aquele '+9'; e para ser assim com TODOS OS FUNCIONARIOS; o cartao e
  // somente reagir/acender - a informacao do chat fica so no chat; os textos nao podem ficar uns em cima dos outros."
  // COMO: N lugares fixos (os que cabem na largura, sem barra de rolagem). Quem mexe e ja tem cartao no ecra re-acende o
  // SEU (nao se duplica); quem nao tem entra no lugar mais antigo. Uma rajada (o pulso traz 12 de uma vez) e espalhada a
  // 4 por segundo, para se ver cada um acender - a hora no cartao e sempre a do EVENTO, ao segundo.
  // 04/10 (v08 "diminui um pouquinho so o tamanho deles, ta cabendo so 4 um do lado do outro quero pelo menos 5"): 186 px no M
  var lugares = [], fila = [], filaT = null, porId = {}, larguraLugar = { s: 124, m: 152, g: 200 }, tamanho = 'm';
  try { tamanho = localStorage.getItem('t3b_cart') || 'm'; } catch (e) { }
  function quantosLugares() {
    var cx = $('lugares'); if (!cx) return 0;
    return Math.max(5, Math.min(24, Math.floor((cx.clientWidth - 16 + 8) / (larguraLugar[tamanho] + 8))));   // n cartoes tem n-1 intervalos (05/10: contava um a mais e perdia o 6.o lugar)
  }
  function montarLugares() {
    var cx = $('lugares'); if (!cx) return;
    var n = quantosLugares();
    if (n === lugares.length) return;
    var velhos = lugares.filter(function (l) { return l.id; }).sort(function (a, b) { return b.ms - a.ms; }).slice(0, n);
    cx.innerHTML = ''; lugares = []; porId = {};
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div'); el.className = 'cartao vazio';
      el.innerHTML = '<span class="brilho"></span>';
      cx.appendChild(el); lugares.push({ el: el, id: null, ms: 0, n: 0, evs: [] });
    }
    velhos.reverse().forEach(function (v) { ocupar(v.id, v.ultimoEv, true); });
  }
  // 08/10 (OBRA 11, ele: "cada acao... o seu responsavel tem que PISCAR ali nos cartoes; tem que ta tudo sincronizado"): a fila ja
  // nao deita fora ninguem (era 60) e anda ao ritmo do que chega - em cada passo acende varios (um enxame acende varios cartoes ao
  // mesmo tempo), nunca mais de ~1,5 s atras do vortex e do coracao. Quem FALA vai a frente: o cartao acende com a mensagem no chat.
  function filaDeCartoes(evs) {
    var frente = [];
    evs.forEach(function (e) { if (e && e.id && e.id !== 'ele' && !(e.k === 'recado' && e.chat)) ((e.k === 'falou' || e.k === 'recado') ? frente : fila).push(e); });   // 'ele' = o dono a perguntar no chat: nao e um funcionario
    if (frente.length) fila = frente.concat(fila);
    if (fila.length > 400) fila.splice(frente.length, fila.length - 400);
    T3B.estado.sync = T3B.estado.sync || { eventos: 0, cartoes: 0, leitores: 0 }; T3B.estado.sync.eventos += evs.length;
    if (!filaT) correrFila();
  }
  function correrFila() {
    if (!fila.length) { filaT = null; return; }
    var k = Math.max(1, Math.ceil(fila.length / 6));
    for (var i = 0; i < k && fila.length; i++) { var e = fila.shift(); ocupar(e.id, e, false); leitores(e); T3B.estado.sync.cartoes++; }
    filaT = setTimeout(correrFila, 160);
  }
  // quem LE o que este escreveu (o 'le' do registo: para_ids) e ja tem cartao no ecra acende-o a AZUL no mesmo instante - nao toma o
  // lugar a ninguem (nao foi ele que agiu: recebeu)
  function leitores(e) {
    if (calmo || !e || !e.para_ids || !e.para_ids.length) return;
    e.para_ids.forEach(function (pid) {
      var l = porId[pid]; if (!l || pid === e.id || !l.el.animate) return;
      l.el.animate([{ boxShadow: '0 0 0 1px rgba(45,212,232,.95), 0 0 16px rgba(45,212,232,.6)' }, { boxShadow: '0 0 0 1px rgba(45,212,232,0), 0 0 0 rgba(45,212,232,0)' }], { duration: 1300, easing: 'ease-out' });
      T3B.estado.sync.leitores++;
    });
  }
  function ocupar(id, e, semAnimar) {
    if (!lugares.length) montarLugares();
    if (!lugares.length) return;
    var l = porId[id];
    if (!l) {
      l = lugares.slice().sort(function (a, b) { return a.ms - b.ms; })[0];
      if (l.id) delete porId[l.id];
      l.id = id; l.n = 0; l.evs = [];
      porId[id] = l;
      pintarCartao(l, e);
      if (!semAnimar && !calmo && performance.now() - (l.tAnim || 0) > 900 && l.el.animate) { l.tAnim = performance.now(); l.el.animate([{ opacity: 0.55, transform: 'translateY(6px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' }); }   // 03/10: numa rajada a entrada recomecava a cada 250 ms e o cartao ficava invisivel (opacidade 0 no inicio da animacao)
    }
    l.ms = Date.now(); l.n++; l.ultimoEv = e;
    l.evs.unshift(e); if (l.evs.length > 12) l.evs.length = 12;
    l.hist = l.hist || []; l.hist.push(e.ms || Date.now()); if (l.hist.length > 80) l.hist.shift();
    var hh = l.el.querySelector('.hh');
    // v08 ("otimizar as informacoes"): no cartao estreito a linha de baixo leva a hora do EVENTO (ao segundo) e quantas vezes
    // agiu; o andar e o tipo ficam no titulo do cartao (passar o rato) e no detalhe (clicar)
    if (hh) { hh.innerHTML = escH(hhmmss(e.t)) + '<b class="vz">' + l.n + '×</b>'; l.el.title = (l.q ? l.q.nome : id) + (l.q && l.q.andar != null ? ' · andar ' + l.q.andar : '') + ' · ' + rotuloDoTipo(e.k) + ' às ' + hhmmss(e.t) + ' · ' + l.n + ' vez(es) desde que abriste a torre'; }
    l.el.dataset.acendeu = String(Date.now());   // q27: o andar na linha da hora (antes do tipo: nunca e ele que se corta)
    var ct = l.el.querySelector('.cont'); if (ct) ct.innerHTML = l.n + '<small>' + (l.n === 1 ? 'vez' : 'vezes') + '</small>';   // q27: quantas vezes agiu
    desenharSpark(l);                                                                                                   // q27: o mini grafico
    // v08 "confirma que eles estao reagindo/acendendo conforme atividade": cada evento acende o cartao de quem o fez (o brilho
    // e o aro dourado, 1,5 s) - pelo compositor, sem refazer o layout
    if (!semAnimar && !calmo) {
      l.acesos = (l.acesos || 0) + 1; T3B.estado.cartoesAcesos = (T3B.estado.cartoesAcesos || 0) + 1;
      var br = l.el.querySelector('.brilho'), ar = l.el.querySelector('.aro-c');
      if (br && br.animate) br.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500, easing: 'ease-out' });
      if (ar && ar.animate) ar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500, easing: 'ease-out' });
    }
    T3B.emit('cartao', { id: id, ev: e });
  }
  // o mini grafico do cartao (q27, estilo ATS): os eventos deste funcionario nos ultimos 10 min, em 20 caixas
  function desenharSpark(l) {
    var c = l.el.querySelector('canvas.spark'); if (!c || !l.hist) return;
    var g = c.getContext('2d', { willReadFrequently: true }), w = c.width, h = c.height, agora = Date.now(), caixas = new Array(20).fill(0), mx = 1;   // (software: ver t3b_holo.js cena)
    l.hist.forEach(function (ms) { var k = Math.floor((agora - ms) / 30000); if (k >= 0 && k < 20) caixas[19 - k]++; });
    caixas.forEach(function (v) { if (v > mx) mx = v; });
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(242,194,48,.25)'; g.beginPath(); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
    var bw = w / 20;
    caixas.forEach(function (v, i) { var bh = v ? Math.max(3, v / mx * (h - 4)) : 1; g.fillStyle = i === 19 ? '#ffdc6a' : v ? 'rgba(242,194,48,.75)' : 'rgba(255,255,255,.08)'; g.fillRect(i * bw + 1, h - 1 - bh, bw - 2, bh); });
  }
  function rotuloDoTipo(k) { return ({ escreveu: 'escreveu', mudou: 'mudou', falou: 'falou', visita: 'visita', recado: 'recado', batimento: 'bateu', numero: 'número', avaria: 'avaria', consertou: 'consertou', genes: 'genes', turno: 'turno' })[k] || k || ''; }
  function identidade(id, e) {
    var q = T3B.quem(id);
    if (q) return q;
    var a = obj(e && e.autor);
    // 04/10 (c01 "ids em vez de nomes"): o sector do barramento pelo nome do seu andar (o servidor manda-o em de_nome/quem), um
    // lab pelo nome do lab; um id de maquina sem nome fica legivel (sem os traços baixos)
    if (String(id).indexOf('sector:') === 0) {
      var nome = limpo((e && (e.de_nome || e.quem)) || (TX ? TX.nomeDeId(id) : String(id).slice(7)));
      return { id: id, nome: 'Sector ' + nome, titulo: nome, andar: e && e.andar, cargo: 'sector (recados entre sectores)', feminino: false, heroi: false };
    }
    if (String(id).indexOf('lab:') === 0) return { id: id, nome: limpo((e && e.quem) || 'Lab'), titulo: limpo((e && e.quem) || 'Lab'), andar: e && e.andar, cargo: 'os genes deste lab (prévia, revisão, evolução)', feminino: false, heroi: false };
    var qn = (e && e.quem) || a.titulo || (TX ? TX.nomeDeId(id) : id);
    return { id: id, nome: limpo(qn), titulo: limpo(a.titulo || qn), andar: (e && e.andar) != null ? e.andar : a.andar,
      cargo: limpo(a.cargo || (e && e.cargo) || ''), feminino: !!a.feminino, heroi: /Stark|Director|Supervisor/.test(a.titulo || (e && e.quem) || '') };
  }
  function funcaoCurta(t) {   // 04/10: a funcao resumida do cartao (pura)
    var s = String(t || '').split(/:|\(|;| - | — /)[0].replace(/\s+/g, ' ').trim();
    if (s.length <= 34) return s;
    var c = s.slice(0, 33), esp = c.lastIndexOf(' ');
    return (esp > 12 ? c.slice(0, esp) : c).replace(/[ ,.;-]+$/, '') + '…';
  }
  function pintarCartao(l, e) {
    var q = identidade(l.id, e), cor = corDoAndar(q.andar);
    l.q = q;
    l.el.className = 'cartao';
    // q26/q27 (estilo ATS em grande): busto, nome, cargo, hora e tipo, contador de vezes, LED de estado, andar e o mini grafico
    // ponto 8 (r07 "falta so do jeito que tinhamos definido"): o CARGO INTEIRO, sem reticencias - quanto mais comprido, mais
    // pequena a letra (classes l / xl), nunca cortado
    // 04/10 20:1x, ele: "e so pra aparecer o nome do funcionario e a funcao dele, resumido" (substitui o r07 do cargo inteiro):
    // a funcao = o cargo ate ao primeiro ':' '(' ';' ' - ' ("Dimensionador Sonnet"), numa linha; o cargo inteiro fica no title
    // 05/10 (questionario 4, C1 "nome + sector" e C2 "andar + luz"): sairam a hora, as vezes e o mini grafico; a funcao e o
    // cargo inteiro ficam no title (passar o rato) e no detalhe (clicar)
    var cgInteiro = limpo(String(q.cargo || q.sector || '')), sec = limpo(String(q.sector || (andarPorN[q.andar] || {}).nome || '')) || funcaoCurta(cgInteiro);
    l.el.innerHTML = '<span class="brilho"></span><i class="aro-c" aria-hidden="true"></i><span class="av">' + avatarSVG(q.titulo || q.nome, cor, q.feminino, q.heroi) + '</span>' +
      '<span class="nm" title="' + escH(q.titulo) + '">' + escH(q.nome) + '</span>' +
      '<span class="cg curta" title="' + escH(cgInteiro) + '">' + escH(sec) + (q.andar != null ? ' · and. ' + escH(q.andar) : '') + '</span>' +   // 05/10: o andar na linha do sector (o nome cabe inteiro)
      '<i class="k" style="background:' + (COR_ESTADO[q.estado] || cor) + ';color:' + (COR_ESTADO[q.estado] || cor) + '" title="' + escH(q.estado || '') + '"></i>' +
      '<span class="and">' + (q.andar != null ? 'and. ' + escH(q.andar) : '') + '</span>';
    l.el.style.borderLeftColor = cor;
  }
  function pintarRodapeCartoes() {
    // 04/10 (v08): o "desde que abriu: N acenderam" saiu - cada cartao ja diz quantas vezes o seu funcionario agiu
    var ult = lugares.filter(function (l) { return l.id; }).sort(function (a, b) { return b.ms - a.ms; })[0];
    txt($('ct_r2'), ult ? 'último: ' + cortar(ult.q ? ult.q.nome : ult.id, 26) + ' há ' + haQuanto(Date.now() - ult.ms) : 'à espera do primeiro…');
  }
  // o detalhe abre ao clicar (ordem dele 19/09: "essas informacoes so se apertar no card e expandir")
  var det = null, detDe = null;
  document.addEventListener('click', function (ev) {
    var c = ev.target.closest && ev.target.closest('.cartao');
    if (det && ev.target.closest && ev.target.closest('.cartao-det .fx')) { det.remove(); det = null; detDe = null; window.__t3b3d && window.__t3b3d.ocultarGlobo && window.__t3b3d.ocultarGlobo(false); return; }
    if (det && !(ev.target.closest && ev.target.closest('.cartao-det'))) { var era = detDe; det.remove(); det = null; detDe = null; window.__t3b3d && window.__t3b3d.ocultarGlobo && window.__t3b3d.ocultarGlobo(false); if (!c || c === era) return; }
    if (!c) return;
    var l = lugares.filter(function (x) { return x.el === c; })[0]; if (!l || !l.id) return;
    var q = l.q || identidade(l.id, l.ultimoEv);
    det = document.createElement('div'); det.className = 'cartao-det'; detDe = c;
    if (window.__t3b3d && window.__t3b3d.ocultarGlobo) window.__t3b3d.ocultarGlobo(true);   // 04/10: o detalhe nao tapa o globo
    det.setAttribute('data-painel', 'cartao-det');
    det.innerHTML = '<button type="button" class="fx" aria-label="fechar">✕</button><h4>' + escH(q.titulo || q.nome) + '</h4><div style="color:var(--mute);font-size:11px">' + escH(q.cargo || '') + '</div>' +
      '<div class="l"><u>andar</u><span>' + escH(q.andar != null ? q.andar + ' · ' + ((andarPorN[q.andar] || {}).nome || '') : '—') + '</span>' +
      '<u>sector</u><span>' + escH(q.sector || '—') + '</span><u>estado</u><span style="color:' + (COR_ESTADO[q.estado] || '#999') + '">' + escH(q.estado || '—') + '</span>' +
      '<u>acendeu</u><span>' + l.n + ' vez(es) desde que abriu</span><u>id</u><span class="mono" style="font-size:10px">' + escH(l.id) + '</span></div>' +
      '<div class="ult">' + l.evs.map(function (e) { return '<div>' + escH(hhmmss(e.t)) + ' · ' + escH(rotuloDoTipo(e.k)) + ' · ' + escH(cortar(limpo(TX ? TX.semMarkdown(e.txt || e.ficheiro || '') : (e.txt || e.ficheiro || '')), 140)) + '</div>'; }).join('') + '</div>';
    document.body.appendChild(det);
    lugarDoDetalhe(det, c);
  });
  // 04/10 (c02 "texto por cima de texto"): o detalhe abria por cima dos hologramas da esquerda e da barra dos niveis.
  // Agora abre no espaco livre do palco - entre a coluna da esquerda e a coluna perto da torre, por baixo dos contadores
  // e por cima dos niveis - so por cima do 3D. Sem esse espaco (telemovel), fica por cima do cartao, como antes.
  function lugarDoDetalhe(det, c) {
    function rr(sel) { var e = document.querySelector(sel); if (!e || !e.offsetParent) return null; var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; }
    function borda(sel, lado) {   // a borda dos hologramas visiveis de uma coluna (o contentor e mais largo do que eles)
      var v = null; Array.prototype.forEach.call(document.querySelectorAll(sel), function (e) { if (!e.offsetParent) return; var r = e.getBoundingClientRect(); if (r.width <= 0) return; v = v == null ? r[lado] : (lado === 'right' ? Math.max(v, r[lado]) : Math.min(v, r[lado])); }); return v;
    }
    var L = borda('.palco .holos.esq .holo', 'right'), Rr = borda('.palco .holos.perto .holo', 'left');
    if (Rr == null) Rr = borda('.palco .holos.dir .holo', 'left');
    var pc = rr('#pc'), fita = rr('.fita-cot'), niv = rr('#niveis');
    var T = Math.max(pc ? pc.bottom : 0, fita ? fita.bottom : 0) + 8, B = (niv ? niv.top : innerHeight) - 8;
    if (L != null && Rr != null && Rr - L - 16 >= 230 && B - T >= 200) {
      var w = Math.min(320, Rr - L - 16);
      det.style.width = w + 'px'; det.style.maxHeight = (B - T) + 'px'; det.style.overflow = 'auto';
      det.style.left = Math.round(L + (Rr - L - w) / 2) + 'px';
      det.style.top = Math.round(Math.max(T, B - det.offsetHeight)) + 'px';
      return;
    }
    var r = c.getBoundingClientRect();
    det.style.left = Math.max(8, Math.min(innerWidth - 330, r.left)) + 'px';
    det.style.top = Math.max(8, r.top - det.offsetHeight - 8) + 'px';
  }
  function ligarTamanhos() {
    var cx = $('cartoes'); if (!cx) return;
    function aplicar(t) {
      tamanho = t; try { localStorage.setItem('t3b_cart', t); } catch (e) { }
      cx.classList.remove('s', 'g'); if (t !== 'm') cx.classList.add(t);
      Array.prototype.forEach.call(cx.querySelectorAll('.tam button'), function (b) { b.classList.toggle('on', b.dataset.t === t); });
      montarLugares();
    }
    Array.prototype.forEach.call(cx.querySelectorAll('.tam button'), function (b) { b.addEventListener('click', function () { aplicar(b.dataset.t); }); });
    aplicar(tamanho);
  }

  // ---------------------------------------------------------------- a gaveta, a coluna, o painel, as teclas
  function ligarInterface() {
    var gv = $('gaveta'), bt = $('btn_gaveta');
    function gaveta(abrir) { if (!gv) return; gv.hidden = !abrir; if (bt) bt.classList.toggle('on', abrir); T3B.emit('gaveta', abrir); if (abrir && window.__md && window.__md.recalcular) try { window.__md.recalcular(); } catch (e) { } }
    T3B.gaveta = gaveta;
    if (bt) bt.addEventListener('click', function () { gaveta(gv.hidden); });
    if ($('gv_fx')) $('gv_fx').addEventListener('click', function () { gaveta(false); });
    if ($('pn_fx')) $('pn_fx').addEventListener('click', fecharPainel);
    if ($('pd_bh')) $('pd_bh').addEventListener('click', function () { $('bl_pend').classList.toggle('dobrado'); });
    var tg = $('lado_tg'), corpo = $('corpo');
    var fechado = false; try { fechado = localStorage.getItem('t3b_lado') === '1'; } catch (e) { }
    function lado(f) { fechado = f; corpo.classList.toggle('lado-fechado', f); tg.textContent = f ? '▶' : '◀'; try { localStorage.setItem('t3b_lado', f ? '1' : '0'); } catch (e) { } T3B.emit('layout'); }
    if (tg && corpo) { tg.addEventListener('click', function () { lado(!fechado); }); lado(fechado); }
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'Escape') { if (gv && !gv.hidden) gaveta(false); else fecharPainel(); if (det) { det.remove(); det = null; detDe = null; window.__t3b3d && window.__t3b3d.ocultarGlobo && window.__t3b3d.ocultarGlobo(false); } var ad = $('alerta_det'); if (ad) ad.hidden = true; }
    });
    // ponto 4: na gaveta os hologramas saem do caminho; a aba tra-los de volta (por cima da cena) e leva-os outra vez.
    // (o abrir/minimizar de cada holograma vive no t3b_holo.js)
    var aba = $('holos_tab');
    if (aba) aba.addEventListener('click', function () { var pl = $('palco'); pl.classList.toggle('holos-de-volta'); aba.textContent = pl.classList.contains('holos-de-volta') ? 'esconder' : 'hologramas'; T3B.emit('layout'); });
    // ecra pequeno (ordem dele, 21/09): sem torre 3D; o instrumento e os numeros sao a pagina
    var mq = window.matchMedia && matchMedia('(max-width: 900px)');
    function modo() { var p = !!(mq && mq.matches); T3B.pequeno = p; document.body.classList.toggle('pequeno', p); if (p && gv) gv.hidden = false; T3B.emit('modo', p); }
    if (mq) { mq.addEventListener ? mq.addEventListener('change', modo) : mq.addListener(modo); }
    modo();
    var t = null; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { montarLugares(); T3B.emit('layout'); }, 200); });
  }

  // ---------------------------------------------------------------- arranque
  function arrancar() {
    ligarInterface(); ligarTamanhos(); montarLugares();
    tique(); setInterval(tique, 250);
    relogio(); setInterval(relogio, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tique(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
