// t3b_holo.js — OS HOLOGRAMAS da Torre 3BRAIN. Versao da OBRA 4 (04/10/2026). Copias: t3b_holo.js.bak_04out_visual (a de
// 03/10, a original desta obra) e .bak_03out_visual.
//
// O QUE ELE PEDIU (04/10, questionario 3 e as notas dele):
//  - "mais leve" (p02 "pesado em TUDO") -> os 9 canvases desenhavam a 60 quadros por segundo, sempre, mexesse o dado ou
//    nao (o vortex: 600 particulas e 36 mil cores por segundo em texto). Agora: no maximo 15 quadros/s, e SO quando ha que
//    desenhar (o dado mudou, uma reaccao a decorrer, ou a actividade do sector a mover o desenho). Quieto = 0 quadros.
//  - "todos os hologramas reagirem conforme a atividade de cada funcionario e cada setor correspondente" (f01 e a regra das
//    11:4x) -> a REACCAO: cada evento do /vivo.json passa por T3BLigacoes.reacoes() (sala/t3b_ligacoes.js: que holograma
//    representa que andares/funcionarios); o holograma que lhe corresponde faz a SUA reaccao (pulso, faisca, ponto que
//    acende) e o aro acende; a intensidade de base (--act) e a actividade desse sector nos ultimos 3 minutos. "Nada de
//    animacao em ciclo sem dados": a espiral, o anel, as estrelas e o feixe so andam com actividade.
//  - os novos (gostou: G21 Radar no lugar da S.H.I.E.L.D., G22 Coracao, G23 Globo, G24 Livro de ofertas e G28 Equalizador
//    na Mesa, G27 Relogio dos turnos no Risco, G31 Ampulheta da cota, G32 Fita do P&L dentro do escritorio) - o Globo e a
//    Fita sao objectos 3D (t3b_torre.js / t3b_andar.js); os outros vivem aqui. "o que ta na shield vai pro sr.stark": o
//    anel de agentes (G2) passou para o painel do Sr. Stark, por cima dos robos.
//  - v03: "o vortex e o holograma da shield maiores, o vortex maior que o da shield" (t3b.css) e a reagir em tempo real.
// O desenho de cada um e o da galeria (D.* das demos do questionario), com DADOS REAIS no lugar do Math.random.
'use strict';
(function () {
  var T3B = window.T3B, U = T3B.util, $ = U.$, fmt = U.fmt, sinal = U.sinal, lista = U.lista, obj = U.obj;
  var TX = window.T3BTexto, LG = window.T3BLigacoes;
  var TAU = Math.PI * 2, calmo = U.calmo;
  var C = { ouro: '#f2c230', ouroHi: '#ffdc6a', ouroDk: '#7e6210', cy: '#2dd4e8', vi: '#b265f5', ok: '#3fd69a', am: '#fbbf24', mau: '#ff5a5f',
    az: '#60a5fa', txt: '#efede8', fg: '#efede8', mute: '#8b8a93', dim: '#6a6a76', line: '#24242e', bg: '#07070a', grid: 'rgba(45,212,232,.10)' };
  var FONTES = {};
  function fonte(peso, tam) { var k = (peso || 600) + '|' + (tam || 9); return FONTES[k] || (FONTES[k] = TX.fonteCanvas(peso || 600, tam || 9)); }
  // (o ctx guarda a ultima fonte: interpretar a fonte - com a lista de recurso - a cada texto era 2,5% do fio principal)
  function rot(ctx, t, x, y, cor, tam, al, peso) { var f = fonte(peso, tam); if (ctx._f !== f) { ctx.font = f; ctx._f = f; } ctx.fillStyle = cor; ctx.textAlign = al || 'left'; ctx.fillText(t, x, y); }
  // 07/10 (ele: "as informacoes no card do sr stark estao se sobrepondo... quero mostrar tudo"): o texto cabe na largura dada -
  // se nao couber, a letra encolhe (ate 6 px) em vez de cortar ou tapar o vizinho
  function rotCabe(ctx, t, x, y, cor, tam, al, peso, maxW) {
    var f = fonte(peso, tam); if (ctx._f !== f) { ctx.font = f; ctx._f = f; }
    var lw = ctx.measureText(String(t)).width;
    rot(ctx, t, x, y, cor, lw > maxW && maxW > 0 ? Math.max(6, tam * maxW / lw) : tam, al, peso);
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function ease(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }
  function agoraMs() { return performance.now(); }
  var TOPO = 24;      // a faixa do titulo de cada painel (o desenho comeca abaixo dela)
  // os numeros ao lado de um desenho, numa grelha: 1 coluna se couberem, senao 2 (rotulo pequeno por cima do valor) - nunca
  // uns por cima dos outros (04/10: na ampulheta e no relogio com 84-100 px de altura as linhas pisavam-se)
  function grelhaDeNumeros(ctx, x0, x1, h, itens) {
    var alt = h - TOPO - 4, porCol = Math.max(1, Math.floor(alt / 21)), cols = Math.ceil(itens.length / porCol), cw = (x1 - x0) / cols;
    itens.forEach(function (it, i) {
      var c = Math.floor(i / porCol), l = i % porCol, x = x0 + c * cw, y = TOPO + 9 + l * 21;
      rot(ctx, it[0], x, y, C.dim, 7, 'left', 600);
      ctx.font = fonte(700, 9.5); ctx._f = null; var t = String(it[1]); while (t.length > 2 && ctx.measureText(t).width > cw - 4) t = t.slice(0, -1);
      rot(ctx, t, x, y + 10, it[2], 9.5, 'left', 700);
    });
  }
  // 05/10 (questionario 4, D1 dele: "sempre vivos e suaves, 60 q/s, mesmo que gaste mais"; e a print das 18:32: "continua
  // pesado e tudo em fotograma"): a obra 4 tinha posto os hologramas a 15 quadros e SO quando o dado mudava - era isso o
  // fotograma. Agora cada holograma anda a 60 q/s, SEMPRE, e o movimento e pelo RELOGIO: o dado real acelera, acende e muda o
  // desenho, nunca o faz saltar. Para nao pesar (medido a 04/10: 15 q/s no CPU custavam ~63% + ~49% de um nucleo):
  //  (1) a placa grafica desenha directo (antes o CPU desenhava e mandava uma imagem nova a cada quadro);
  //  (2) o que nao mexe (grelhas, aneis, etiquetas, numeros) desenha-se UMA vez numa camada guardada e depois so se copia;
  //  (3) nada de shadowBlur (o desfoque do canvas, o mais caro de tudo): o brilho e uma imagem pronta por cor e tamanho.
  // ?holosoft=1 volta ao desenho no CPU (para a sonda medir os dois).
  var FPS_MAX = 60, SOFT = /[?&]holosoft=1/.test(location.search);

  // ================================================================ a maquinaria comum: cenas, tamanho, visibilidade
  var cenas = [], COLISOES = {};
  window.__t3bHoloColisoes = function () { return COLISOES; };
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { es.forEach(function (e) { cenas.forEach(function (s) { if (s.c === e.target) { s.vis = e.isIntersecting; if (s.vis) s.sujo = true; } }); }); }) : null;
  // uma cena: desenhar(ctx, w, h, t, dt, s); sempre (por omissao) = anda a 60 q/s enquanto esta a vista; vivo(agora) so para
  // as que ainda nao sao continuas
  function cena(canvas, opts) {
    var s = { c: canvas, ctx: canvas.getContext('2d', SOFT ? { willReadFrequently: true } : { alpha: true }), w: 0, h: 0, vis: true, ultimo: 0, fps: Math.min(FPS_MAX, opts.fps || FPS_MAX), desenhar: opts.desenhar,
      vivo: opts.vivo || null, sempre: opts.sempre !== false, holo: opts.holo || null, bloco: opts.bloco || null, id: opts.id || null, precisaTam: true, sujo: true, ate: 0, desenhos: 0, estado: {}, camadas: {}, msDesenho: 0 };
    if (window.ResizeObserver) new ResizeObserver(function () { s.precisaTam = true; s.sujo = true; }).observe(canvas.parentElement);
    if (io) io.observe(canvas);
    cenas.push(s);
    return s;
  }
  function sujar(s, ms) { if (!s) return; s.sujo = true; if (ms) s.ate = Math.max(s.ate, agoraMs() + ms); }
  // ponto 6: o canvas ao devicePixelRatio EXACTO do ecra (1,25 no dele) - nada de borrado nem pixelado
  function medir(s) {
    s.precisaTam = false;
    var r = s.c.getBoundingClientRect(), d = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === s.w && h === s.h && s.d === d) return;
    s.w = w; s.h = h; s.d = d; s.c.width = Math.ceil(w * d); s.c.height = Math.ceil(h * d); s.ctx.setTransform(s.c.width / w, 0, 0, s.c.height / h, 0, 0); s.ctx._f = null;
  }
  // AS CAMADAS PARADAS: desenhadas uma vez por tamanho e por "chave" (o texto/dado que as muda) e depois so copiadas
  function camada(s, nome, chave, fn) {
    var L = s.camadas[nome], k = s.w + 'x' + s.h + '@' + s.d + '|' + chave;
    if (!L) L = s.camadas[nome] = { cv: document.createElement('canvas'), k: null };
    if (L.k !== k) {
      L.k = k; s.refeitas = (s.refeitas || 0) + 1; L.cv.width = Math.max(1, Math.ceil(s.w * s.d)); L.cv.height = Math.max(1, Math.ceil(s.h * s.d));
      var g = L.cv.getContext('2d'); g.setTransform(s.d, 0, 0, s.d, 0, 0); g.clearRect(0, 0, s.w, s.h); g._f = null; fn(g, s.w, s.h);
    }
    return L.cv;
  }
  function porCamada(ctx, s, nome, chave, fn) { ctx.drawImage(camada(s, nome, chave, fn), 0, 0, s.w, s.h); }
  // O BRILHO: um sprite radial por cor e raio (feito uma vez), somado por cima ('lighter') - o lugar do shadowBlur
  var SPRITES = {}, RGB = {};
  function rgbDe(cor) {
    if (RGB[cor]) return RGB[cor];
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(cor), v;
    if (m) v = parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16);
    else { var n = /rgba?\(([^)]+)\)/.exec(cor); v = n ? n[1].split(',').slice(0, 3).map(function (x) { return x.trim(); }).join(',') : '255,255,255'; }
    return (RGB[cor] = v);
  }
  function sprite(cor, r) {
    r = Math.max(2, Math.min(64, Math.round(r))); var k = cor + '|' + r, sp = SPRITES[k]; if (sp) return sp;
    var d = 2, c = document.createElement('canvas'); c.width = c.height = r * 2 * d; var g = c.getContext('2d'), rgb = rgbDe(cor);
    var gr = g.createRadialGradient(r * d, r * d, 0, r * d, r * d, r * d);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.16, 'rgba(' + rgb + ',.6)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',.16)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    return (SPRITES[k] = c);
  }
  function luz(ctx, cor, x, y, r, a) {
    if (!(a > 0.01) || !(r > 0.5)) return;
    var sp = sprite(cor, r), ga = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
  }
  // a mudanca suave de um valor para o alvo, igual a 30 ou a 120 q/s (k por segundo)
  function seguir(v, alvo, k, dt) { return v + (alvo - v) * (1 - Math.exp(-k * dt)); }
  function onda(t, f, fase) { return Math.sin(t * f + fase); }
  var gavetaAberta = false, tAnt = 0;
  T3B.on('gaveta', function (a) { gavetaAberta = a; cenas.forEach(function (s) { s.sujo = true; }); });
  function escondido(s) {
    var el = s.holo || s.bloco; if (!el) return false;
    if (el.classList.contains('min')) return true;
    if (s.holo && T3B.estado.perto && !document.getElementById('palco').classList.contains('holos-de-volta')) return true;
    return false;
  }
  function quadro(ms) {
    requestAnimationFrame(quadro);
    if (document.hidden || gavetaAberta) return;
    var t = ms / 1000; tAnt = t;
    for (var i = 0; i < cenas.length; i++) {
      var s = cenas[i];
      if (T3B.pequeno && s.holo) continue;
      if (!s.vis || escondido(s)) continue;
      var precisa = s.sujo || ms < s.ate || (s.sempre && !calmo) || (s.vivo && !calmo && s.vivo(ms));
      if (!precisa) continue;
      if (ms - s.ultimo < 1000 / s.fps - 4) continue;            // (-4: num ecra de 60 Hz o quadro chega a 16,7 ms; com -2 um quadro adiantado saltava um)
      var dts = s.ultimo ? Math.min(0.1, (ms - s.ultimo) / 1000) : 1 / 60;
      s.ultimo = ms; s.sujo = false;
      if (s.precisaTam) medir(s);
      if (s.w < 20 || s.h < 20) continue;
      var t0 = performance.now();
      try { s.desenhar(s.ctx, s.w, s.h, t, dts, s); s.desenhos++; } catch (e) { if (window.console) console.warn('holo', e); }
      s.msDesenho = s.msDesenho * 0.95 + (performance.now() - t0) * 0.05;
    }
  }
  requestAnimationFrame(quadro);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) cenas.forEach(function (s) { s.sujo = true; s.ultimo = 0; }); });

  // o holograma piscou porque o seu DADO mudou: aresta de ouro + o nome de quem o mudou (e o cartao dele acende)
  function creditarHolo(nome, chave, txtR) {
    var h = $('h_' + nome) || $('bl_' + nome), q = $('hq_' + nome);
    var a = T3B.creditar(chave, txtR);
    // (04/10: era uma sombra animada - box-shadow repinta o painel inteiro a cada quadro durante 0,9 s; agora o mesmo aro de ouro da
    //  reaccao, so opacidade, que o compositor anima sozinho)
    if (h && !calmo) { var aro = h.querySelector(':scope > .aro'); if (aro && aro.animate) aro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); }
    // (04/10, c02 "texto por cima de texto": o "por Fulano" tapava o titulo - agora o titulo encolhe com reticencias para lhe dar o
    // lugar; a largura sai da conta dos caracteres (letra mono de 9 px ~ 5,45 px), sem ler o layout)
    if (q) {
      q.textContent = 'por ' + TX.cortar(TX.limpar(a.nome), 28); q.classList.add('on');
      if (h) { h.style.setProperty('--quem-w', Math.round(TX.grafemas(q.textContent).length * 5.45 + 12) + 'px'); h.classList.add('q-on'); }
      clearTimeout(q._t); q._t = setTimeout(function () { q.classList.remove('on'); if (h) h.classList.remove('q-on'); }, 5000);
    }
  }
  function canvasDe(id, sel) { var h = $(id); return h ? h.querySelector(sel || 'canvas') : null; }
  // as etiquetas de um desenho nunca ficam por cima umas das outras: cada uma procura o primeiro sitio livre; as que nao cabem
  // contam como colisao (a sonda mede-as)
  function arrumarEtiquetas(ctx, nome, itens, w, h, evitar) {
    var postas = [], col = 0;
    itens.forEach(function (it) {
      ctx.font = fonte(600, it.tam || 8); ctx._f = ctx.font; var lw = ctx.measureText(it.t).width + 4, lh = (it.tam || 8) + 3;
      var tent = [[0, 0], [it.dx || 0, it.dy || 0], [(it.dx || 0) * 2, (it.dy || 0) * 2], [0, -lh], [0, lh], [lw * 0.6, 0], [-lw * 0.6, 0], [(it.dx || 0) * 3, (it.dy || 0) * 3]];
      var ok = null;
      for (var k = 0; k < tent.length && !ok; k++) {
        var x = clamp(it.x + tent[k][0], lw / 2 + 1, w - lw / 2 - 1), y = clamp(it.y + tent[k][1], TOPO + lh, h - 2);
        var r = { l: x - lw / 2, r: x + lw / 2, t: y - lh + 2, b: y + 2 };
        var bate = postas.some(function (p) { return r.l < p.r && p.l < r.r && r.t < p.b && p.t < r.b; }) || (evitar || []).some(function (p) { return r.l < p.r && p.l < r.r && r.t < p.b && p.t < r.b; });
        if (!bate) ok = { x: x, y: y, r: r };
      }
      if (!ok) { col++; return; }
      postas.push(ok.r); rot(ctx, it.t, ok.x, ok.y, it.cor, it.tam || 8, 'center');
    });
    COLISOES[nome] = col;
  }

  // ================================================================ A REACCAO (a regra dele) e a actividade de base
  // ACT[holo]: reacoes contadas, a janela dos ultimos 3 min (para a base), o pulso (1 -> 0 em ~1,2 s) e o ultimo evento.
  var ACT = {}, CB = {}, ELS = {}, ESCALA = { coracao: 140, equalizador: 140, vortex: 30, numeros: 20, radar: 12, lab: 25, globo: 30 };
  var JANELA_MS = 180000;
  function act(id) { return ACT[id] || (ACT[id] = { reacoes: 0, janela: [], pulso: 0, tPulso: 0, ultimo: null, base: 0, porAndar: {} }); }
  function pulsoDe(id, agora) { var A = ACT[id]; if (!A || !A.tPulso) return 0; return clamp(1 - ((agora || agoraMs()) - A.tPulso) / 1200, 0, 1); }
  function reagir(id, ev, r) {
    var A = act(id), agora = agoraMs();
    A.reacoes++; A.janela.push(Date.now()); A.tPulso = agora; A.ultimo = { t: ev.t || null, k: ev.k, quem: ev.quem || ev.id, andar: r && r.andar != null ? r.andar : ev.andar };
    if (r && r.andar != null) A.porAndar[r.andar] = (A.porAndar[r.andar] || 0) + 1;
    if (A.janela.length > 600) A.janela.splice(0, A.janela.length - 600);
    // o aro do painel acende (opacidade animada pelo compositor: nao refaz o layout nem a pintura do painel)
    var el = ELS[id];
    if (el && !calmo) { var aro = el.querySelector(':scope > .aro'); if (aro && aro.animate) aro.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); }
    (CB[id] || []).forEach(function (fn) { try { fn(ev, r || {}); } catch (e) { if (window.console) console.warn('reaccao ' + id, e); } });
    T3B.emit('holo:' + id, { ev: ev, r: r || {} });                  // os 3D (o globo, a fita) ouvem isto
  }
  function aoReagir(id, fn) { (CB[id] = CB[id] || []).push(fn); }
  function registar(id, el) { ELS[id] = el; act(id); if (el && !el.querySelector(':scope > .aro')) { var a = document.createElement('i'); a.className = 'aro'; a.setAttribute('aria-hidden', 'true'); el.appendChild(a); } }
  function receber(evs) { (evs || []).forEach(function (e) { LG.reacoes(e).forEach(function (par) { reagir(par[0], e, par[1]); }); }); }
  T3B.on('eventos', receber);
  // a base: os ultimos 3 minutos do sector, de 0 a 1 (escala por holograma); vai para o CSS (--act) - o brilho do aro
  function bases() {
    var corte = Date.now() - JANELA_MS;
    Object.keys(ACT).forEach(function (id) {
      var A = ACT[id]; while (A.janela.length && A.janela[0] < corte) A.janela.shift();
      var porMin = A.janela.length / (JANELA_MS / 60000), b = clamp(porMin / (ESCALA[id] || 8), 0, 1);
      if (Math.abs(b - A.base) > 0.02) { A.base = b; var el = ELS[id]; if (el) el.style.setProperty('--act', b.toFixed(2)); }
    });
  }
  setInterval(bases, 1000);
  // a prova (sala/sonda_t3b.js e a pagina de prova): o estado de cada holograma e a injeccao de eventos sinteticos
  window.__t3bHolo = {
    estado: function () { var o = {}; Object.keys(ACT).forEach(function (id) { var A = ACT[id]; o[id] = { reacoes: A.reacoes, base: Math.round(A.base * 100) / 100, pulso: Math.round(pulsoDe(id) * 100) / 100, ultimo: A.ultimo, porAndar: A.porAndar, desenhos: (cenas.filter(function (s) { return s.id === id; })[0] || {}).desenhos || 0, extra: EXTRA[id] ? EXTRA[id]() : null }; }); return o; },
    injectar: function (evs) { receber(evs); return true; },
    base: function (id) { return (ACT[id] || {}).base || 0; },
    ligacoes: function () { return LG.tabela(); },
    cenas: function () { return cenas.map(function (s) { return { id: s.id, desenhos: s.desenhos, vis: s.vis, escondido: escondido(s), w: s.w, h: s.h, ms: Math.round(s.msDesenho * 100) / 100, gpu: !SOFT, camadas_refeitas: s.refeitas || 0 }; }); }
  };
  var EXTRA = {};       // o estado interno que cada holograma expoe a prova (o que a reaccao mudou)

  // ================================================================ MINIMIZAR (r03): cada holograma abre/minimiza; minimizado = so os numeros
  var MINIS = {};
  function mini(id, partes) {
    var el = $(id); if (!el) return;
    if (!MINIS[id]) { el.innerHTML = partes.map(function (p, i) { return (i ? '<i>·</i>' : '') + (p[0] ? '<span class="ml">' + U.escH(p[0]) + ' </span>' : '') + '<b id="' + id + '_' + i + '"></b>' + (p[2] ? '<span class="ml"> ' + U.escH(p[2]) + '</span>' : ''); }).join(''); MINIS[id] = 1; }
    partes.forEach(function (p, i) { var b = $(id + '_' + i); if (!b) return; T3B.odometro(b, p[1]); var c = p[3] || ''; if (b.className !== c) b.className = c; });
  }
  function ligarMinimizar() {
    Array.prototype.forEach.call(document.querySelectorAll('.holo .mm, .bl .mm'), function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var h = b.closest('.holo') || b.closest('.bl'); if (!h) return;
        h.classList.toggle('min'); b.textContent = h.classList.contains('min') ? '+' : '–'; b.setAttribute('aria-label', h.classList.contains('min') ? 'abrir' : 'minimizar');
        try { var m = JSON.parse(localStorage.getItem('t3b_min') || '{}'); m[h.id] = h.classList.contains('min'); localStorage.setItem('t3b_min', JSON.stringify(m)); } catch (e) { }
        cenas.forEach(function (s) { s.sujo = true; });
        T3B.emit('layout'); posicionarJa();
      });
    });
    try { var m = JSON.parse(localStorage.getItem('t3b_min') || '{}'); Object.keys(m).forEach(function (id) { var h = $(id); if (!h) return; var b = h.querySelector('.mm'); if (m[id]) { h.classList.add('min'); if (b) b.textContent = '+'; } else if (m[id] === false && h.classList.contains('min')) { h.classList.remove('min'); if (b) b.textContent = '–'; } }); /* 04/10: um holograma que comeca minimizado (Numeros) abre se ele o abriu */ } catch (e) { }
  }

  // ================================================================ 1. O VORTEX (G16) — as PASSAGENS entre funcionarios
  // D.vortex: 600 particulas numa espiral, o fundo escurece (rastro). Real (obra 4: "Vortex/acorde = passagens reais entre
  // funcionarios"): cada recado de um sector para outro, cada visita da S.H.I.E.L.D. e cada resposta lanca um FIO de
  // particulas do andar de quem envia (altura na espiral) para o de quem recebe. O brilho e quantos funcionarios mexeram no
  // ultimo minuto.
  // 05/10 (Q4 B6, ele: "nenhum deles, eu quero o actual porem fluido e natural"; a13 "nao ta animando"): sem passagens no
  // ultimo minuto a espiral PARAVA (giro = passagens/12). Agora gira sempre devagar (o giro de base) e as passagens ACELERAM-na
  // com suavidade (o giro segue o alvo, nunca salta); o rastro tem o mesmo comprimento a 15 ou a 60 q/s; a espiral respira.
  var NUC = { p: [], fios: [], ouro: 0, ritmo: null, ultimo: null, porAndar: {}, giro: 0.4, giroAlvo: 0.4, brilho: 0.5, passagens: [], nFios: 0 };
  var COR_NUC = { recado: '#3fd69a', visita: '#ffdc6a', resposta: '#b265f5', dados: '#2dd4e8' };
  var GIRO_BASE = 0.4;            // a espiral nunca para (rad/s por unidade de velocidade de cada particula)
  for (var iv = 0; iv < 600; iv++) { var sv = U.semente('v' + iv); NUC.p.push({ a: (sv % 6283) / 1000, y: ((sv >> 3) % 2000) / 1000 - 1, r: 0.2 + ((sv >> 7) % 800) / 1000, v: 0.4 + ((sv >> 11) % 800) / 1000, b: (sv >> 5) % 8, f: ((sv >> 13) % 628) / 100 }); }
  function yDoAndar(n) { n = Number(n); return isFinite(n) ? clamp(1 - (n - 1) / 58 * 2, -1, 1) : 0.8; }
  // 07/10 (Q5 B7, ele: "ela tem que reagir a cada pulso da torre... igual o coracao, cada pontinho brilha no momento em que reage e
  // com a cor do setor; a cada pulso tem que pulsar o nome do setor no coracao; esses 2 cards interligados e sincronizados"):
  // UMA lista de pulsos partilhada - o coracao escreve-a a cada batida, o vortex e o coracao desenham-na pela mesma hora
  // 08/10 (OBRA 11): chamava-se pulsoDe, como a funcao do pulso de cada holograma (mais acima) - a segunda escondia a primeira e o
  // pulso do velocimetro, do trilho e do risco dava NaN. Agora tem nome proprio.
  // 08/10 (OBRA 11, ele: "cada pontinho do vortex vai ser igual a cada 'batida' - as vezes mais de 1 pontinho vai reagir, as vezes
  // um ENXAME porque varias coisas na torre se mexem ao mesmo tempo"): cada evento escolhe UM ponto da espiral a altura do seu andar
  // (pelo numero do evento: eventos diferentes do mesmo andar acendem pontos diferentes)
  var PULSOS = [], FAIXAS = null, PULSOS_MAX = 240;
  function pontoDoAndar(n, sem) {
    if (!FAIXAS) { FAIXAS = {}; for (var a = 1; a <= 63; a++) { var ya = yDoAndar(a), l = []; for (var i = 0; i < NUC.p.length; i++) if (Math.abs(NUC.p[i].y - ya) < 0.06) l.push(i); FAIXAS[a] = l; } }
    var fx = n != null ? FAIXAS[Math.round(n)] : null;
    return fx && fx.length ? fx[sem % fx.length] : sem % NUC.p.length;
  }
  function pulsoDoEvento(ev) {
    var n = ev && ev.andar != null && isFinite(Number(ev.andar)) ? Number(ev.andar) : null, an = n != null && T3B.andar ? T3B.andar(n) : null;
    var div = n != null && U.divisaoDoAndar ? U.divisaoDoAndar(n) : '', nome = TX.limpar((an && (an.sector || an.nome)) || div || '');
    return { n: n, t: agoraMs(), ip: pontoDoAndar(n, U.semente(String(ev && ev.s) + '|' + (ev && ev.id))), cor: n != null && U.corDoAndar ? U.corDoAndar(n) : '#ffdc6a',
      nome: nome ? (div && nome !== div ? div + ' · ' + nome : nome) + (n != null ? ' · and. ' + n : '') : '' };
  }
  aoReagir('vortex', function (ev, r) {
    var tipo = ev.k === 'visita' ? 'visita' : ev.k === 'recado' ? 'recado' : (ev.k === 'escreveu' || ev.k === 'mudou') ? 'dados' : 'resposta';
    // 08/10 (OBRA 11): as passagens de DADOS (2 em cada 3 eventos) eram cordoes grossos que tapavam os pontos - ficam finos e apagados
    if (NUC.fios.length < 16) NUC.fios.push({ de: yDoAndar(r.de != null ? r.de : ev.andar), para: yDoAndar(r.para != null ? r.para : (ev.para != null ? ev.para : 59)), a0: (U.semente(String(ev.s) + ev.id) % 6283) / 1000, t: 0, cor: COR_NUC[tipo], fr: tipo === 'dados' ? 0.4 : 1, nn: tipo === 'dados' ? 8 : 14 });
    NUC.passagens.push(Date.now()); NUC.nFios++;
    NUC.giroAlvo = Math.min(2.6, NUC.giroAlvo + 0.18);         // cada passagem empurra a espiral (e o alvo volta devagar ao ritmo do minuto)
    if (tipo === 'visita') NUC.ouro = Math.min(1.5, NUC.ouro + 0.6);
    NUC.ultimo = ev; pintarLegendaNucleo();
  });
  EXTRA.vortex = function () { return { fios: NUC.fios.length, fios_lancados: NUC.nFios, giro: Math.round(NUC.giro * 100) / 100, pontos_acesos: NUC.acesos || 0, pulsos: PULSOS.length, pontos_lancados: NUC.nPontos || 0 }; };
  T3B.on('ritmo', function (r) { NUC.ritmo = r; NUC.brilho = 0.45 + Math.min(0.55, (r.quem || 0) / 60); NUC.porAndar = r.porAndar || {}; pintarLegendaNucleo(); });
  function pintarLegendaNucleo() {
    var corte = Date.now() - 60000; while (NUC.passagens.length && NUC.passagens[0] < corte) NUC.passagens.shift();
    var pm = NUC.passagens.length;
    NUC.giroMinuto = GIRO_BASE + Math.min(1.8, pm / 12);         // o ritmo do ultimo minuto: para onde o giro volta
    var r = NUC.ritmo || {}, u = NUC.ultimo, leg = $('nu_leg');
    var LT = ECG ? ECG.lotes : [], evm = r.n != null ? r.n : (ECG ? ECG.bat.length : 0), enx = 0, corteE = Date.now() - 60000;   // (o ECG do coracao e declarado mais abaixo)
    while (LT.length && LT[0][0] < corteE) LT.shift();
    LT.forEach(function (x) { if (x[1] > enx) enx = x[1]; });
    U.txt($('nu_kn'), evm + ' eventos/min');
    // 08/10 (OBRA 11): o vortex passou a ser CADA evento (um ponto cada); as passagens continuam (os fios)
    if (leg) leg.innerHTML = '<i><b>' + evm + '</b> eventos/min · 1 ponto cada</i><i>maior enxame <b>' + enx + '</b> · ' + pm + ' passagens</i><i>' + (r.quem || 0) + ' funcionários mexeram</i>' +
      (u ? '<i>última: <b>' + U.escH(TX.cortar(TX.limpar(u.k === 'recado' ? (u.de_nome || u.quem || '') + ' → ' + (u.para_nome || u.para_sector || '') : (u.quem || u.id) + (u.para_nome ? ' → ' + u.para_nome : '')), 44)) + '</b></i>' : '');
    mini('hm_nucleo', [['', fmt(evm, 0), 'eventos/min'], ['', fmt(pm, 0), 'passagens/min'], ['', fmt(r.quem || 0, 0), 'funcionários']]);
  }
  setInterval(pintarLegendaNucleo, 3000);
  var cenaNucleo = null;
  (function () {
    var cv = $('cv_nucleo'); if (!cv) return;
    registar('vortex', $('bl_nucleo'));
    var buckets = []; for (var b = 0; b < 8; b++) buckets.push([]);
    cenaNucleo = cena(cv, { id: 'vortex', bloco: $('bl_nucleo'), desenhar: function (ctx, w, h, t, dt) {
      // o rastro: a mesma fraccao por SEGUNDO a qualquer cadencia (a 15 q/s eram 45% por quadro)
      ctx.fillStyle = 'rgba(7,7,10,' + (1 - Math.pow(0.55, dt * 15)).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h);
      // o giro segue o alvo (o empurrao das passagens desfaz-se em ~4 s ate ao ritmo do ultimo minuto)
      NUC.giroAlvo = seguir(NUC.giroAlvo, NUC.giroMinuto || GIRO_BASE, 0.25, dt);
      NUC.giro = calmo ? 0 : seguir(NUC.giro, NUC.giroAlvo, 1.6, dt);
      // 07/10 (ele: "o vortex nao ta pulsando igual o coracao... e pra cada acao e reacao da torre em tempo real"): o vortex BATE
      // a cada pulso, como o coracao - expande, acende e acalma em ~0,3 s, mais forte quanto mais forte o evento
      for (var ib = PULSOS.length - 1; ib >= 0 && PULSOS[ib].t > (NUC.ultPulso || 0); ib--) NUC.bate = Math.min(1.3, (NUC.bate || 0) + 0.55 * (PULSOS[ib].f || 0.6));
      if (PULSOS.length) NUC.ultPulso = PULSOS[PULSOS.length - 1].t;
      NUC.bate = (NUC.bate || 0) * Math.pow(0.015, dt);
      var cx = w / 2, cy = h / 2, S = Math.min(w, h) * 0.44, giro = NUC.giro, br = Math.min(1.25, NUC.brilho + 0.45 * NUC.bate), resp = 1 + 0.035 * Math.sin(t * 0.7) + 0.1 * NUC.bate;
      NUC.ouro *= Math.pow(0.3, dt);
      for (var q = 0; q < 8; q++) buckets[q].length = 0;
      // D.vortex, linha a linha: x = cos(a)*r, z = sin(a)*r, y = p.y*S*.9 + z*.25 - agrupado em 8 brilhos (8 cores por quadro, nao 600)
      for (var i = 0; i < NUC.p.length; i++) {
        var p = NUC.p[i]; p.a += dt * p.v * (1.6 - Math.abs(p.y)) * giro;
        var yy0 = p.y + 0.025 * Math.sin(t * 0.9 + p.f);                       // cada particula ondula um pouco (natural)
        var r2 = p.r * (1 - Math.abs(yy0) * 0.55) * S * resp, x = Math.cos(p.a) * r2, z = Math.sin(p.a) * r2, y = yy0 * S * 0.9 + z * 0.25;
        var k = Math.min(7, Math.max(0, Math.floor(((z / S + 1) / 2) * 8))); buckets[k].push(cx + x, cy + y);
        p.sx = cx + x; p.sy = cy + y;                                           // (Q5 B7) para o pulso acender este ponto
      }
      for (var bq = 0; bq < 8; bq++) {
        var kk = 0.6 + 0.4 * (bq + 0.5) / 8, arr = buckets[bq], sz = 1.5 * kk;
        ctx.fillStyle = 'rgba(96,165,250,' + (0.2 + kk * 0.6 * br).toFixed(3) + ')';
        for (var j = 0; j < arr.length; j += 2) ctx.fillRect(arr[j], arr[j + 1], sz, sz);
      }
      // 08/10 (OBRA 11, ele: "cada pontinho do vortex vai ser igual a cada batida"): cada evento acende UM ponto (o seu, a altura do
      // andar, na cor do sector) no mesmo instante da batida do coracao, e apaga-se em 1,6 s; um lote grande = um ENXAME de pontos ao
      // mesmo tempo. O ponto continua na espiral (gira com ela). Antes cada pulso acendia uma faixa inteira (nao se via cada evento).
      // 08/10 noite (ele: "o vortex nao esta reagindo"): medido - reagia, mas um ponto de 2 px durante 1,6 s no meio de 600, com
      // 2-5 eventos por 10 s de noite, nao se via. Cada evento continua a ser UM ponto (o seu), agora visivel: nucleo maior,
      // brilho largo e uma ONDA que se expande a partir dele, 2,4 s. Um enxame = varias ondas ao mesmo tempo.
      var agP = agoraMs(), vivos = 0, VIDA_P = 2.4;
      for (var ip = PULSOS.length - 1; ip >= 0; ip--) {
        var pu = PULSOS[ip], idP = (agP - pu.t) / 1000; if (idP > VIDA_P) break;
        var pa = NUC.p[pu.ip]; if (!pa || pa.sx == null) continue;
        var fP = 1 - idP / VIDA_P;
        luz(ctx, pu.cor, pa.sx, pa.sy, 9 + 18 * fP * (0.75 + 0.25 * (pu.f || 0.6)), Math.min(1, 1.1 * fP)); vivos++;
      }
      ctx.lineWidth = 1.6;
      for (ip = PULSOS.length - 1; ip >= 0; ip--) {
        pu = PULSOS[ip]; idP = (agP - pu.t) / 1000; if (idP > VIDA_P) break;
        pa = NUC.p[pu.ip]; if (!pa || pa.sx == null) continue;
        fP = 1 - idP / VIDA_P; var tamP = 2.6 + 3.6 * fP;
        ctx.fillStyle = fP > 0.7 ? '#ffffff' : pu.cor; ctx.globalAlpha = Math.min(1, 0.45 + fP);
        ctx.fillRect(pa.sx - tamP / 2, pa.sy - tamP / 2, tamP, tamP);
        ctx.strokeStyle = pu.cor; ctx.globalAlpha = 0.75 * fP;                       // a onda
        ctx.beginPath(); ctx.arc(pa.sx, pa.sy, 3 + 22 * (idP / VIDA_P), 0, TAU); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.globalAlpha = 1; NUC.acesos = vivos;
      // os FIOS das passagens: um cordao de particulas que desce/sobe a espiral do andar de quem envia ao de quem recebe
      for (var f = NUC.fios.length - 1; f >= 0; f--) {
        var fi = NUC.fios[f]; fi.t += dt / 1.6;
        if (fi.t >= 1.25) { NUC.fios.splice(f, 1); continue; }
        ctx.fillStyle = fi.cor;
        var NN = fi.nn || 14;
        for (var n = 0; n < NN; n++) {
          var u = clamp(fi.t - n * 0.03, 0, 1); if (u <= 0) break;
          var yy = lerp(fi.de, fi.para, ease(u)), aa = fi.a0 + u * 5.5, rr2 = S * (0.85 - 0.45 * Math.abs(yy)), xx = Math.cos(aa) * rr2, zz = Math.sin(aa) * rr2, k3 = 0.6 + 0.4 * (zz / S + 1) / 2;
          var fa = (1 - n / NN) * (fi.t > 1 ? (1.25 - fi.t) * 4 : 1) * (0.5 + 0.5 * k3) * (fi.fr || 1);
          ctx.globalAlpha = fa; ctx.beginPath(); ctx.arc(cx + xx, cy + yy * S * 0.9 + zz * 0.25, (fi.fr < 1 ? 0.8 : 1.2) + (fi.fr < 1 ? 1 : 1.8) * k3 * (1 - n / NN), 0, TAU); ctx.fill();
          if (n === 0) luz(ctx, fi.cor, cx + xx, cy + yy * S * 0.9 + zz * 0.25, 9, fa * 0.8);
        }
      }
      ctx.globalAlpha = 1;
      // o nucleo: respira sempre; as visitas da S.H.I.E.L.D. fazem-no brilhar a ouro
      luz(ctx, '#9cc8ff', cx, cy, 10 + 3 * Math.sin(t * 1.3), 0.35 + 0.15 * br);
      if (NUC.bate > 0.03) luz(ctx, '#ffffff', cx, cy, 10 + 16 * NUC.bate, Math.min(0.85, 0.6 * NUC.bate));   // o nucleo bate
      if (NUC.ouro > 0.02) luz(ctx, '#ffdc6a', cx, cy, 8 + NUC.ouro * 10, Math.min(1, NUC.ouro));
    } });
  })();

  // ================================================================ 2. O RADAR DA S.H.I.E.L.D. (G21)
  // D.radar: o feixe a varrer, aneis e raios, cada avaria um ponto. Real: o feixe da UMA volta por cada volta do vigia (o
  // batimento do enxame: ~9 s); cada funcionario fora do verde (enxame.json -> fora_do_verde) e um ponto no ANGULO DO SEU
  // ANDAR (vermelho mais perto do centro, amarelo mais fora); quando sai (evento 'consertou') o ponto fica verde e apaga-se;
  // cada visita da S.H.I.E.L.D. a um andar e um 'ping' nesse angulo.
  // 05/10 (Q4 B7, ele: "radar vivo, porem com mais detalhes e mais sofisticado, fluido e natural"; a14 "tambem nao [anima]"):
  // o feixe PARAVA sem batimento recente e saltava a cada batimento. Agora roda sempre (o periodo e a volta do vigia) e acerta
  // a fase pelo batimento devagar (sem saltos); os pontos sao FOSFORO - acendem quando o feixe passa e esmorecem ate a volta
  // seguinte; o aro tem um traco por andar (59) e os numeros 1/15/30/45; o centro pulsa; a camada parada e guardada.
  var RAD = { pontos: {}, pings: [], tBat: 0, intervalo: 9000, seq: null, abertas: 0, verdes: 0, vermelhos: 0, volta: null, ang: -Math.PI / 2, corr: 0 };
  function anguloDoAndar(n) { return ((Number(n) || 1) - 1) / 59 * TAU - Math.PI / 2; }
  function difAng(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  T3B.on('enxame', function (e) {
    var b = obj(e.batimento); if (b.volta_ms) RAD.intervalo = clamp(Number(b.volta_ms) || 9000, 3000, 60000);
    var vistos = {};
    lista(e.fora_do_verde).forEach(function (f) {
      if (!f || !f.id) return; vistos[f.id] = 1;
      var p = RAD.pontos[f.id];
      if (!p) RAD.pontos[f.id] = { id: f.id, andar: f.andar, sev: f.sev, t0: agoraMs(), ok: 0 };
      else { p.sev = f.sev; p.andar = f.andar; if (p.ok) { p.ok = 0; p.t0 = agoraMs(); } }
    });
    Object.keys(RAD.pontos).forEach(function (id) { var p = RAD.pontos[id]; if (!vistos[id] && !p.ok) { p.ok = agoraMs(); } });
    var t = obj(e.totais); RAD.verdes = t.verde || 0; RAD.vermelhos = t.vermelho || 0;
    pintarLegendaRadar();
  });
  aoReagir('radar', function (ev, r) {
    var agora = agoraMs();
    if (ev.k === 'batimento') {
      RAD.tBat = agora; RAD.volta = (ev.txt || '').replace(/\D+/g, ' ').trim().split(' ')[0] || RAD.volta;
      RAD.corr = difAng(-Math.PI / 2 - RAD.ang);            // a volta do vigia comeca no topo: acerta-se a fase devagar (~1 s)
    }
    else if (ev.k === 'avaria') { RAD.pontos[ev.id] = { id: ev.id, andar: ev.andar, sev: ev.sev || 'vermelho', t0: agora, ok: 0, novo: 1 }; }
    else if (ev.k === 'consertou') { var p = RAD.pontos[ev.id]; if (p) p.ok = agora; else RAD.pontos[ev.id] = { id: ev.id, andar: ev.andar, sev: 'amarelo', t0: agora, ok: agora }; }
    else if (ev.k === 'visita' || ev.andar != null) { if (RAD.pings.length < 12) RAD.pings.push({ andar: ev.k === 'visita' ? ev.para : ev.andar, t0: agora }); }
    pintarLegendaRadar();
  });
  EXTRA.radar = function () { return { pontos: Object.keys(RAD.pontos).length, abertas: RAD.abertas, pings: RAD.pings.length, batimento_ha_ms: RAD.tBat ? Math.round(agoraMs() - RAD.tBat) : null }; };
  function pintarLegendaRadar() {
    var ab = 0; Object.keys(RAD.pontos).forEach(function (id) { if (!RAD.pontos[id].ok) ab++; }); RAD.abertas = ab;
    U.txt($('ra_kn'), ab + ' avaria' + (ab === 1 ? '' : 's') + ' · ' + RAD.verdes + ' verdes');
    var leg = $('ra_leg');
    if (leg) leg.innerHTML = '<i><b style="color:' + (ab ? C.mau : C.ok) + '">' + ab + '</b> fora do verde</i><i>volta <b>' + U.escH(RAD.volta || '—') + '</b> do vigia</i>';
    mini('hm_radar', [['', fmt(ab, 0), 'avarias', ab ? 'dn' : 'up'], ['', fmt(RAD.verdes, 0), 'verdes'], ['volta', String(RAD.volta || '…')]]);
    // 09/10 (ele: "nao ta sincronizado a luz amarela/vermelha/verde com o radar da shield"): a luz do cabecalho sai DAQUI, dos
    // mesmos pontos do radar (vigia: fora_do_verde + avaria/consertou). Antes vinha dos 'programas em erro' da estrutura
    // (t3b_vivo.pintarHUDEstrutura: outra fonte, outro ritmo, so verde/vermelho) e discordava do radar.
    var nv = 0, na = 0, nomes = [];
    Object.keys(RAD.pontos).forEach(function (id) {
      var p = RAD.pontos[id]; if (p.ok) return;
      if (p.sev === 'vermelho') nv++; else na++;
      if (nomes.length < 4) nomes.push(TX.limpar(TX.nomeDeId(id)));
    });
    var led = $('b_led');
    if (led && (RAD.tBat || Object.keys(RAD.pontos).length || RAD.verdes)) {
      led.className = 'led pulsa ' + (nv ? 'mau' : na ? 'at' : 'ok');
      led.title = (nv + na) ? (nv + ' vermelho(s) e ' + na + ' amarelo(s) no radar da S.H.I.E.L.D.: ' + nomes.join(', ') + (nv + na > nomes.length ? '…' : ''))
        : 'tudo verde no radar da S.H.I.E.L.D. (' + RAD.verdes + ' verdes)';
    }
  }
  var cenaRadar = null;
  (function () {
    var cv = $('cv_radar'); if (!cv) return;
    registar('radar', $('bl_radar'));
    // a parte parada (guardada): o aro com um traco por andar, os aneis, os raios, os numeros dos andares
    // 07/10 (Q5 B8, sh_lista: "o radar e, ao lado, os piores casos"): com largura, o radar vai para a esquerda e a lista a direita
    function geoRadar(w, h) { var lado = w >= 240; return { lado: lado, cx: lado ? w * 0.3 : w / 2, cy: h / 2 + 2, R: lado ? Math.min(w * 0.25, h * 0.4) : Math.min(w, h) * 0.43 }; }
    function fundo(g, w, h) {
      var GR = geoRadar(w, h), cx = GR.cx, cy = GR.cy, R = GR.R;
      var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, 'rgba(45,212,232,.10)'); gr.addColorStop(0.7, 'rgba(45,212,232,.03)'); gr.addColorStop(1, 'rgba(45,212,232,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      g.lineWidth = 1;
      for (var i = 1; i <= 4; i++) { g.strokeStyle = i === 4 ? 'rgba(45,212,232,.32)' : 'rgba(45,212,232,.11)'; g.beginPath(); g.arc(cx, cy, R * i / 4, 0, TAU); g.stroke(); }
      g.strokeStyle = 'rgba(45,212,232,.08)';
      for (var j = 0; j < 12; j++) { var q = j / 12 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(q) * R * 0.08, cy + Math.sin(q) * R * 0.08); g.lineTo(cx + Math.cos(q) * R, cy + Math.sin(q) * R); g.stroke(); }
      for (var a = 1; a <= 59; a++) {                        // o aro: um traco por andar, maior de 5 em 5
        var qa = anguloDoAndar(a), l = a % 5 === 0 ? 6 : 3;
        g.strokeStyle = a % 5 === 0 ? 'rgba(45,212,232,.55)' : 'rgba(45,212,232,.25)';
        g.beginPath(); g.moveTo(cx + Math.cos(qa) * (R + 2), cy + Math.sin(qa) * (R + 2)); g.lineTo(cx + Math.cos(qa) * (R + 2 + l), cy + Math.sin(qa) * (R + 2 + l)); g.stroke();
      }
      [1, 15, 30, 45].forEach(function (n) { var qn = anguloDoAndar(n); rot(g, String(n), cx + Math.cos(qn) * (R + 14), cy + Math.sin(qn) * (R + 14) + 3, 'rgba(139,138,147,.85)', 7.5, 'center', 600); });
      g.setLineDash([2, 4]); g.strokeStyle = 'rgba(45,212,232,.16)'; g.beginPath(); g.arc(cx, cy, R * 0.5, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    cenaRadar = cena(cv, { id: 'radar', bloco: $('bl_radar'), desenhar: function (ctx, w, h, t, dt, s) {
      var agora = agoraMs(), GR = geoRadar(w, h), cx = GR.cx, cy = GR.cy, R = GR.R;
      ctx.clearRect(0, 0, w, h);
      porCamada(ctx, s, 'fundo', '', fundo);
      // o feixe: roda sempre, ao periodo da volta do vigia; o batimento acerta a fase aos poucos
      if (!calmo) {
        RAD.ang += dt * TAU / (RAD.intervalo / 1000);
        var kc = 1 - Math.exp(-dt * 2.2), d = RAD.corr * kc; RAD.ang += d; RAD.corr -= d;
      }
      RAD.ang = ((RAD.ang + Math.PI) % TAU + TAU) % TAU - Math.PI;
      var a = RAD.ang, vivoVigia = RAD.tBat && agora - RAD.tBat < RAD.intervalo * 2;
      // (05/10, medido: o gradiente conico criado a cada quadro custava 2-5 ms na placa grafica; agora e uma imagem feita uma vez
      //  por tamanho e so se RODA - o mesmo desenho)
      var cun = s.cunha;
      if (!cun || cun.R !== R || cun.d !== s.d) {
        cun = s.cunha = { R: R, d: s.d, cv: document.createElement('canvas') };
        var lado = Math.ceil(R * 2 * s.d) + 2; cun.cv.width = cun.cv.height = lado;
        var gc = cun.cv.getContext('2d'); gc.setTransform(s.d, 0, 0, s.d, 0, 0);
        if (gc.createConicGradient) {
          var g = gc.createConicGradient(-1.1, R, R);
          g.addColorStop(0, 'rgba(45,212,232,0)'); g.addColorStop(0.16, 'rgba(45,212,232,.30)'); g.addColorStop(0.1752, 'rgba(45,212,232,0)');
          gc.fillStyle = g; gc.beginPath(); gc.arc(R, R, R, 0, TAU); gc.fill();
        }
      }
      ctx.save(); ctx.globalAlpha = vivoVigia ? 1 : 0.55; ctx.translate(cx, cy); ctx.rotate(a); ctx.drawImage(cun.cv, -R, -R, R * 2, R * 2); ctx.restore();
      ctx.strokeStyle = vivoVigia ? C.cy : 'rgba(45,212,232,.6)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); ctx.lineWidth = 1;
      luz(ctx, C.cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 7, 0.9);
      // as faiscas do feixe (detalhe): 5 pontinhos que piscam ao longo do raio, sempre diferentes mas sem acaso por quadro
      for (var sp = 0; sp < 5; sp++) {
        var fr = ((t * 0.37 + sp * 0.213) % 1), al = Math.sin(fr * Math.PI) * 0.7, rr0 = R * (0.2 + 0.75 * ((sp * 0.618 + Math.floor(t * 0.37 + sp * 0.213) * 0.31) % 1));
        ctx.fillStyle = 'rgba(180,245,255,' + al.toFixed(2) + ')'; ctx.fillRect(cx + Math.cos(a - 0.05) * rr0 - 0.8, cy + Math.sin(a - 0.05) * rr0 - 0.8, 1.6, 1.6);
      }
      // os pontos: FOSFORO - acendem quando o feixe passa e esmorecem ate a volta seguinte (nunca apagam de todo)
      Object.keys(RAD.pontos).forEach(function (id) {
        var p = RAD.pontos[id], q = anguloDoAndar(p.andar), rr = R * (p.sev === 'vermelho' ? 0.5 : 0.78) + ((U.semente(id) % 9) - 4) * 0.8;
        var x = cx + Math.cos(q) * rr, y = cy + Math.sin(q) * rr, idade = (agora - p.t0) / 1000, atras = (a - q) % TAU; if (atras < 0) atras += TAU;
        var fosforo = 0.35 + 0.65 * Math.exp(-atras * 0.9), cor, base = 1;
        if (p.ok) { var ida = (agora - p.ok) / 1000; if (ida > 9) { delete RAD.pontos[id]; return; } base = 1 - ida / 9; cor = C.ok; }
        else cor = p.sev === 'vermelho' ? C.mau : C.am;
        ctx.globalAlpha = base * fosforo; ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 2.6 + 1.6 * Math.max(0, 1 - idade) + (p.sev === 'vermelho' && !p.ok ? 0.5 * Math.sin(t * 4) : 0), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        luz(ctx, cor, x, y, 10, base * fosforo * 0.85);
        if (idade < 3 && !p.ok) { ctx.strokeStyle = cor; ctx.globalAlpha = 1 - idade / 3; ctx.beginPath(); ctx.arc(x, y, 4 + idade * 5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      });
      for (var k = RAD.pings.length - 1; k >= 0; k--) {
        var pg = RAD.pings[k], idd = (agora - pg.t0) / 1000; if (idd > 1.6) { RAD.pings.splice(k, 1); continue; }
        var qq = anguloDoAndar(pg.andar), px = cx + Math.cos(qq) * R * 0.92, py = cy + Math.sin(qq) * R * 0.92;
        ctx.globalAlpha = 1 - idd / 1.6; ctx.strokeStyle = C.ouroHi; ctx.beginPath(); ctx.arc(px, py, 2 + idd * 8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        luz(ctx, C.ouroHi, px, py, 6, 1 - idd / 1.6);
      }
      // o centro pulsa ao ritmo do vigia
      var pul = 0.5 + 0.5 * Math.sin(t * TAU / Math.max(1.5, RAD.intervalo / 3000));
      luz(ctx, C.cy, cx, cy, 6 + 2 * pul, 0.55 + 0.25 * pul);
      rot(ctx, 'AVARIAS ' + RAD.abertas, 8, h - 6, RAD.abertas ? C.mau : C.ok, 9, 'left', 600);
      // 05/10 (ele: "mais detalhes e informacoes relevantes"): os 3 casos abertos mais antigos - quem e ha quanto tempo
      var foraV = Object.keys(RAD.pontos).map(function (id) { return RAD.pontos[id]; }).filter(function (p) { return !p.ok; }).sort(function (a, b) { return a.t0 - b.t0; });
      var xL = GR.lado ? w * 0.58 : 6, nL = GR.lado ? Math.max(1, Math.min(6, Math.floor((h - TOPO - 24) / 13))) : 3, cL = GR.lado ? Math.floor((w * 0.42 - 8) / 4.6) : 26;
      if (GR.lado) rot(ctx, foraV.length ? 'FORA DO VERDE · ' + foraV.length : 'TUDO VERDE', xL, TOPO + 10, foraV.length ? C.am : C.ok, 7.5, 'left', 700);
      foraV.slice(0, nL).forEach(function (p, i) {
        var q = T3B.quem ? T3B.quem(p.id) : null, nm = TX.limpar((q && q.nome) || TX.nomeDeId(p.id)), min = Math.max(1, Math.round((agora - p.t0) / 60000));
        var ha = min < 60 ? min + ' min' : Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0');
        rot(ctx, TX.cortar('● ' + nm + ' · há ' + ha, cL), xL, (GR.lado ? TOPO + 24 : 12) + i * (GR.lado ? 13 : 11), p.sev === 'vermelho' ? C.mau : C.am, 7.5, 'left', 600);
      });
    } });
  })();

  // ================================================================ 3. O CORACAO DA TORRE (G22) — cada evento e uma batida
  // D.ecg: a linha de batimento. Real: CADA evento do /vivo.json e uma batida (a altura pela forca do evento: mudou > falou >
  // escreveu), o batimento do vigia e a batida forte; o numero e batidas por minuto (o ritmo real da torre).
  // 05/10 (Q4 B8, ele: "precisa otimizar e tambem deixar mais fluido, pode adicionar mais algum detalhe"): a linha andava aos
  // saltos (shift de N amostras por quadro, a 15 q/s) e parava 4 s depois do ultimo evento. Agora corre SEMPRE, com deslocamento
  // abaixo do pixel (amostras a 60 por segundo e o resto da conta empurra o desenho); a batida tem a forma PQRST; sem eventos a
  // linha fica quase plana mas viva (um ruido de 1-2%); o traco tem rasto (mais apagado a esquerda) e uma ponta que brilha; o
  // numero e o coracao pequeno batem a cada batida real; a grelha e uma camada guardada.
  var ECG = { y: null, fila: [], bat: [], ultimo: 0, n: 0, acc: 0, tBat: 0, lote: null, lotes: [], nLotes: 0, normal: null };
  var PQRST = [0, 0.04, 0.08, 0.04, 0, 0, -0.1, 1, -0.42, -0.08, 0, 0.06, 0.12, 0.16, 0.12, 0.05, 0];
  aoReagir('coracao', function (ev, r) {
    if (ev.historia) { ECG.bat.push(ev.ms || Date.now()); ECG.n++; return; }   // o passado (a 1.a leitura): conta, mas nao bate nem acende
    var f = clamp(r.forca || 0.5, 0.2, 1) * (ev.k === 'batimento' ? 1.4 : 1), ag = agoraMs();
    // 08/10 (OBRA 11): o que chega JUNTO (o mesmo lote do /vivo.json) e UMA batida, mais forte quanto mais coisas mexem. Antes cada
    // evento punha uma batida inteira (0,3 s) na fila: uma rajada de 10 deixava o coracao 3,5 s atrasado do vortex e dos cartoes
    if (ECG.lote && ag - ECG.lote.t0 < 150) { ECG.lote.n++; ECG.lote.f = Math.max(ECG.lote.f, f); }
    else { ECG.lote = { n: 1, f: f, t0: ag, feito: false }; ECG.lotes.push([Date.now(), 1]); }
    ECG.lotes[ECG.lotes.length - 1][1] = ECG.lote.n;
    ECG.bat.push(Date.now()); ECG.n++;
    var pz = pulsoDoEvento(ev); pz.f = f; PULSOS.push(pz); NUC.nPontos = (NUC.nPontos || 0) + 1; if (PULSOS.length > PULSOS_MAX) PULSOS.shift();   // o ponto deste evento no vortex
  });
  EXTRA.coracao = function () { return { eventos: ECG.n, batidas: ECG.nLotes, na_fila: ECG.fila.length, bpm: ECG.bat.length, ultimo_lote: ECG.lote ? ECG.lote.n : 0 }; };
  T3B.on('ritmo', function (r) { if (ECG.normal == null && r && r.n > 0) ECG.normal = Math.max(20, r.n); });   // o ritmo normal da torre: comeca no do servidor
  var cenaEcg = null;
  (function () {
    var cv = $('cv_coracao'); if (!cv) return;
    registar('coracao', $('bl_coracao'));
    var X0 = 92, PASSO = 2, AMOSTRAS_S = 60;                    // 2 px por amostra, 60 amostras por segundo = 120 px/s
    function grelha(g, w, h) {
      g.strokeStyle = 'rgba(63,214,154,.07)'; g.lineWidth = 1;
      for (var x = X0; x < w; x += 8) { g.beginPath(); g.moveTo(x + 0.5, 4); g.lineTo(x + 0.5, h - 2); g.stroke(); }
      g.strokeStyle = 'rgba(63,214,154,.13)';
      for (var x2 = X0; x2 < w; x2 += 40) { g.beginPath(); g.moveTo(x2 + 0.5, 4); g.lineTo(x2 + 0.5, h - 2); g.stroke(); }
      for (var y = 6; y < h; y += 10) { g.strokeStyle = 'rgba(63,214,154,.06)'; g.beginPath(); g.moveTo(X0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
      rot(g, 'EVENTOS/MIN', 8, h - 5, C.dim, 8, 'left', 600);
    }
    cenaEcg = cena(cv, { id: 'coracao', bloco: $('bl_coracao'), desenhar: function (ctx, w, h, t, dt, s) {
      var N = Math.max(40, Math.ceil((w - X0) / PASSO) + 2);
      if (!ECG.y || ECG.y.length !== N) ECG.y = new Array(N).fill(0);
      if (ECG.lote && !ECG.lote.feito) {                               // a batida do lote: ja, sem esperar pela anterior
        // 08/10 noite: um evento so batia a meia altura (forca 0,5) e de noite parecia parado - o minimo e 75% da altura
        var Lb = ECG.lote, ampL = clamp(Math.max(0.75, Lb.f) * (1 + 0.32 * Math.log2(Math.max(1, Lb.n))), 0.75, 1.55);
        Lb.feito = true; ECG.nLotes++; ECG.ultimo = agoraMs();
        if (ECG.fila.length > 6) ECG.fila.length = 6;
        if (ECG.fila.length) ECG.fila.push(0);
        PQRST.forEach(function (v) { ECG.fila.push(v * ampL); });
      }
      ECG.acc += dt * AMOSTRAS_S;
      while (ECG.acc >= 1) {
        ECG.acc -= 1; ECG.y.shift();
        ECG.y.push(ECG.fila.length ? ECG.fila.shift() : 0.012 * Math.sin(t * 9.1) + 0.008 * Math.sin(t * 23.7) + 0.006 * Math.sin(t * 2.3));
      }
      var corte = Date.now() - 60000; while (ECG.bat.length && ECG.bat[0] < corte) ECG.bat.shift();
      ctx.clearRect(0, 0, w, h);
      porCamada(ctx, s, 'grelha', '', grelha);
      var base = h * 0.6, amp = h * 0.46, sub = ECG.acc * PASSO, ult = ECG.y.length - 1;
      var xDe = function (i) { return X0 + (i - (ult - Math.ceil((w - X0) / PASSO))) * PASSO - sub; };
      // 05/10 (ele: "vai mudar de cores quando a velocidade muda"): verde calmo, ouro activo, vermelho acelerado (batidas por minuto)
      // 08/10 (OBRA 11): a cor pela MUDANCA de velocidade (ele: "vai mudar de cores quando a velocidade muda") - contra o ritmo normal da
      // torre (media dos ultimos ~20 min), nao contra numeros fixos (de dia a torre fica sempre acima de 90/min e era sempre vermelho)
      var bpm = NUC.ritmo && NUC.ritmo.n != null ? NUC.ritmo.n : ECG.bat.length;
      if (ECG.normal != null) ECG.normal += (Math.max(20, bpm) - ECG.normal) * Math.min(1, dt / 1200);
      var nor = ECG.normal || 40, estado = bpm >= nor * 1.5 ? 2 : bpm >= nor * 0.7 ? 1 : 0, RGB3 = ['63,214,154', '242,194,48', '255,90,95'], g = ECG.grad;
      if (!g || ECG.gradW !== w || ECG.gradE !== estado) { g = ECG.grad = ctx.createLinearGradient(X0, 0, w, 0); g.addColorStop(0, 'rgba(' + RGB3[estado] + ',0)'); g.addColorStop(0.35, 'rgba(' + RGB3[estado] + ',.55)'); g.addColorStop(1, 'rgba(' + RGB3[estado] + ',1)'); ECG.gradW = w; ECG.gradE = estado; }
      ctx.save(); ctx.beginPath(); ctx.rect(X0, 0, w - X0, h); ctx.clip();
      ctx.beginPath();
      for (var i = 0; i <= ult; i++) { var xx = xDe(i), yy = base - ECG.y[i] * amp; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(' + RGB3[estado] + ',.16)'; ctx.lineWidth = 4.5; ctx.stroke();          // o halo do traco (mais barato que um desfoque)
      ctx.strokeStyle = g; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.restore(); ctx.lineWidth = 1;
      var px = xDe(ult), py = base - ECG.y[ult] * amp;
      luz(ctx, 'rgb(' + RGB3[estado] + ')', px, py, 9, 0.9); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px, py, 1.9, 0, TAU); ctx.fill();
      // o numero e o coracao pequeno: batem com cada batida real
      var bt = clamp(1 - (agoraMs() - ECG.ultimo) / 380, 0, 1), esc = 1 + 0.22 * bt;
      rot(ctx, String(bpm), 8, h * 0.5 + 6, 'rgb(' + RGB3[estado] + ')', 20, 'left', 700);
      rot(ctx, ['calmo', 'activo', 'acelerado'][estado], 46, h * 0.5 + 5, 'rgba(' + RGB3[estado] + ',.85)', 7.5, 'left', 600);
      var ulP = PULSOS[PULSOS.length - 1];                                     // (Q5 B7) o nome do sector pulsa a cada batida
      if (ulP && ulP.nome) { var idU = (agoraMs() - ulP.t) / 1000; if (idU < 2.2) { ctx.globalAlpha = 1 - idU / 2.2; rot(ctx, TX.cortar(ulP.nome, 24), 8, h * 0.5 + 20, ulP.cor, 8 + 2.5 * Math.max(0, 1 - idU * 3), 'left', 700);
        if (ECG.lote && ECG.lote.n > 1) rot(ctx, ECG.lote.n + ' ao mesmo tempo', 8, h * 0.5 + 31, 'rgba(255,255,255,.75)', 7.5, 'left', 600);   // o enxame
        ctx.globalAlpha = 1; } }
      var hx = 70, hy = h * 0.5 - 2, hs = 5.2 * esc;
      ctx.fillStyle = bt > 0.05 ? '#ff7b7f' : 'rgba(255,90,95,.75)';
      ctx.beginPath(); ctx.moveTo(hx, hy + hs * 0.9); ctx.bezierCurveTo(hx - hs * 1.6, hy - hs * 0.2, hx - hs * 0.6, hy - hs * 1.3, hx, hy - hs * 0.45); ctx.bezierCurveTo(hx + hs * 0.6, hy - hs * 1.3, hx + hs * 1.6, hy - hs * 0.2, hx, hy + hs * 0.9); ctx.fill();
      if (bt > 0.05) luz(ctx, C.mau, hx, hy, 11, bt * 0.8);
      if (s.desenhos % 30 === 0) mini('hm_coracao', [['', fmt(bpm, 0), 'eventos/min'], ['total', fmt(ECG.n, 0)]]);
    } });
  })();

  // ================================================================ 4. VELOCIMETRO (G18, D.veloc) — o dia
  var VEL = { a: null, v: null, stop: null, meta: null, esp: null, min: -15, max: 20 };
  function lerAgoraDoInstrumento() {
    var el = $('md_agora'); if (!el) return null;
    var s = el.textContent.replace(/US\$/g, '').replace(/\s/g, '').replace('−', '-').replace('+', '');
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(',', '.');
    var v = Number(s); return isFinite(v) && /\d/.test(s) ? v : null;
  }
  function actualizarVel(T, creditar) {
    var r = obj(T && T.reactor), md = obj(r.medidor), S = obj(window.__md && window.__md.S);
    var v = lerAgoraDoInstrumento(); if (v == null) v = Number(md.agora);
    if (!isFinite(v)) return;
    var n = function (x) { x = Number(x); return isFinite(x) ? x : null; };
    VEL.stop = n(obj(r.limites).perda_dia_usd); VEL.meta = n(S.meta); VEL.esp = n(S.esp != null ? S.esp : obj(r.cartao_plano).esperado_usd);
    var vals = [v, 0, VEL.stop, VEL.meta, VEL.esp].filter(function (x) { return x != null; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), folga = Math.max(1, (mx - mn) * 0.15);
    VEL.min = mn - folga; VEL.max = mx + folga;
    if (VEL.a !== v) { var mudou = VEL.a != null; VEL.a = v; if (VEL.v == null) VEL.v = v; if (mudou && creditar) creditarHolo('velocimetro', 'velocimetro', 'resultado do dia → ' + sinal(v, 2)); T3B.estado.resultadoDia = v; T3B.emit('resultadoDia', v); sujar(cenaVel, 1500); }
    // c02 "painel vazio ou —": sem meta definida diz-se "sem meta", nunca um traco
    mini('hm_velocimetro', [['', sinal(v, 2), 'US$', v >= 0 ? 'up' : 'dn'], ['stop', VEL.stop != null ? sinal(VEL.stop, 2) : 'sem stop'], ['meta', VEL.meta != null ? sinal(VEL.meta, 2) : 'sem meta']]);
  }
  T3B.on('torre', function (T) { actualizarVel(T, true); });
  setInterval(function () { if (T3B.estado.T) actualizarVel(T3B.estado.T, false); }, 1000);
  aoReagir('velocimetro', function () { sujar(cenaVel, 1300); });
  var cenaVel = null;
  (function () {
    var cv = canvasDe('h_velocimetro'); if (!cv) return;
    registar('velocimetro', $('h_velocimetro'));
    cenaVel = cena(cv, { id: 'velocimetro', holo: $('h_velocimetro'), fps: 15, vivo: function () { return VEL.a != null && VEL.v != null && Math.abs(VEL.a - VEL.v) > Math.max(0.005, Math.abs(VEL.max - VEL.min) * 0.001); }, desenhar: function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      if (VEL.a == null) { rot(ctx, 'a ler o resultado do dia…', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      VEL.v += (VEL.a - VEL.v) * (calmo ? 1 : 0.22);
      var pz = pulsoDe('velocimetro'), base = (ACT.velocimetro || {}).base || 0;
      var ah = h - TOPO, cx = w / 2, cy = TOPO + ah * 0.66, R = Math.min(w * 0.36, ah * 0.50), a0 = Math.PI * 5 / 6, a1 = Math.PI * 13 / 6;
      var ang = function (v) { return a0 + (a1 - a0) * clamp((v - VEL.min) / (VEL.max - VEL.min), 0, 1); };
      ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
      // a base: um halo do arco pela actividade do P&L nos ultimos minutos; o pulso: o arco engrossa e clareia
      if (base > 0.05) { ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(242,194,48,' + (0.05 + 0.12 * base).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke(); }
      var az = ang(0), av = ang(VEL.v); ctx.lineWidth = 7 + pz * 3; ctx.strokeStyle = VEL.v >= 0 ? C.ok : C.mau; ctx.globalAlpha = 0.85 + 0.15 * pz; ctx.beginPath(); ctx.arc(cx, cy, R, Math.min(az, av), Math.max(az, av)); ctx.stroke(); ctx.globalAlpha = 1;
      var marcas = [[VEL.stop, C.mau, 'stop'], [VEL.meta, C.fg, 'meta'], [VEL.esp, C.am, 'esp.']].filter(function (m) { return m[0] != null; });
      var etq = [];
      marcas.forEach(function (m) {
        var a = ang(m[0]); ctx.strokeStyle = m[1]; ctx.lineWidth = 2; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10)); ctx.lineTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8)); ctx.stroke();
        etq.push({ t: m[2], x: cx + Math.cos(a) * (R + 16), y: cy + Math.sin(a) * (R + 16) + 3, cor: m[1], tam: 8, dx: Math.cos(a) * 10, dy: Math.sin(a) * 10 });
      });
      var tamN = Math.max(15, Math.min(22, w / 11)), yN = cy + R * 0.45 + 4;
      ctx.font = fonte(600, tamN); ctx._f = null; var wN = ctx.measureText(sinal(VEL.v, 2)).width;
      arrumarEtiquetas(ctx, 'velocimetro', etq, w, h, [{ l: cx - wN / 2 - 3, r: cx + wN / 2 + 3, t: yN - tamN, b: yN + 3 }]);
      ctx.strokeStyle = C.ouroHi; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(av) * (R - 4), cy + Math.sin(av) * (R - 4)); ctx.stroke();
      if (pz > 0.02) { ctx.fillStyle = 'rgba(255,236,170,' + (pz * 0.9).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(cx + Math.cos(av) * (R - 4), cy + Math.sin(av) * (R - 4), 2 + pz * 5, 0, TAU); ctx.fill(); }
      ctx.lineWidth = 1; ctx.fillStyle = C.ouro; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill();
      rot(ctx, sinal(VEL.v, 2), cx, yN, VEL.v >= 0 ? C.ok : C.mau, tamN, 'center');
    } });
  })();

  // ================================================================ 5. TRILHO DO DIA (G10, D.linha): a linha escreve-se e desliza
  var TRI = { d: [], ass: '', t0: 0, sl: -9 };
  T3B.on('torre', function (T) {
    var md = obj(obj(T.reactor).medidor), serie = lista(md.serie);
    var ass = serie.length + ':' + (serie.length ? serie[serie.length - 1].join(',') : '');
    var ult = serie.length ? Number(serie[serie.length - 1][1]) : Number(md.agora);
    mini('hm_trilho', [['agora', isFinite(ult) ? sinal(ult, 2) : 'sem pontos', '', ult >= 0 ? 'up' : 'dn'], ['pico', sinal(md.pico, 2)], ['vale', sinal(md.vale, 2)]]);
    U.txt($('h_trilho_e'), 'pico ' + sinal(md.pico, 2) + ' · vale ' + sinal(md.vale, 2));
    if (ass === TRI.ass) return;
    var novo = TRI.ass !== '' && serie.length > TRI.d.length;
    TRI.ass = ass;
    var vals = serie.map(function (p) { return Number(p[1]); }).filter(isFinite);
    if (vals.length > 90) { var passo = vals.length / 90, out = []; for (var i = 0; i < 90; i++) out.push(vals[Math.min(vals.length - 1, Math.round(i * passo))]); out[89] = vals[vals.length - 1]; vals = out; }
    TRI.d = vals;
    if (!TRI.t0) TRI.t0 = performance.now() / 1000;
    if (novo) { TRI.sl = performance.now() / 1000; creditarHolo('trilho', 'trilho', 'trilho +1 ponto ' + (serie[serie.length - 1] || [])[0]); }
    sujar(cenaTri, 1700);
  });
  aoReagir('trilho', function () { sujar(cenaTri, 1300); });
  var cenaTri = null;
  (function () {
    var cv = canvasDe('h_trilho'); if (!cv) return;
    registar('trilho', $('h_trilho'));
    // 05/10 (a04 "ta bom por enquanto"; D1 "sempre vivos"): o desenho fica igual; a linha passa a ser uma camada guardada (so se
    // refaz quando o dado ou o deslize mudam), o ultimo ponto respira e um brilho percorre a linha devagar (~6 s por volta)
    function pontos(w, h, d, off) {
      var N = d.length, mn = Math.min.apply(null, d.concat([0])), mx = Math.max.apply(null, d.concat([0])), sp = (mx - mn) || 1, out = [];
      for (var i = 0; i < N; i++) out.push([8 + (w - 16) * i / (N - 1) + off, h - 12 - (d[i] - mn) / sp * (h - 12 - TOPO - 8)]);
      return out;
    }
    cenaTri = cena(cv, { id: 'trilho', holo: $('h_trilho'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      var d = TRI.d, N = d.length; if (N < 2) { rot(ctx, 'o trilho começa com o 2.º ponto do dia', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      var pe = calmo ? 1 : Math.min(1, (t - TRI.t0) / 1.6), off = calmo ? 0 : (1 - Math.min(1, (t - TRI.sl) / 1.4)) * (w - 16) / (N - 1);
      var ult = d[N - 1], cor = ult >= 0 ? C.ok : C.mau, rgb = ult >= 0 ? '63,214,154' : '255,90,95', base = (ACT.trilho || {}).base || 0, pz = pulsoDe('trilho');
      var P = pontos(w, h, d, off);
      var chave = N + '|' + ult + '|' + d[0] + '|' + Math.round(off * 4) + '|' + Math.round(pe * 40) + '|' + Math.round(base * 10);
      porCamada(ctx, s, 'linha', chave, function (g) {
        g.save(); g.beginPath(); g.rect(0, 0, 8 + (w - 16) * pe, h); g.clip();
        var gr = g.createLinearGradient(0, TOPO, 0, h); gr.addColorStop(0, 'rgba(' + rgb + ',' + (0.22 + 0.2 * base).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.beginPath(); P.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.lineTo(P[N - 1][0], h); g.lineTo(P[0][0], h); g.fillStyle = gr; g.fill();
        g.beginPath(); P.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.strokeStyle = cor; g.lineWidth = 1.8; g.lineJoin = 'round'; g.stroke(); g.restore();
      });
      if (pz > 0.02) { ctx.beginPath(); P.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.5 * pz).toFixed(2) + ')'; ctx.lineWidth = 3.2; ctx.stroke(); ctx.lineWidth = 1; }
      // o brilho que percorre a linha (so na parte ja escrita)
      if (!calmo && pe >= 1) {
        var u = (t / 6) % 1, fi = u * (N - 1), i0 = Math.floor(fi), k = fi - i0, a = P[i0], b = P[Math.min(N - 1, i0 + 1)];
        luz(ctx, cor, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 10, 0.55 * Math.sin(u * Math.PI));
      }
      var lx = P[N - 1][0], ly = P[N - 1][1], resp = 0.5 + 0.5 * Math.sin(t * 2.4);
      luz(ctx, C.ouro, lx, ly, 9 + 3 * resp, 0.45 + 0.3 * resp);
      ctx.fillStyle = C.ouro; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, TAU); ctx.fill();
      if (pz > 0.02) { ctx.strokeStyle = 'rgba(255,220,106,' + pz.toFixed(2) + ')'; ctx.beginPath(); ctx.arc(lx, ly, 4 + (1 - pz) * 12, 0, TAU); ctx.stroke(); }
    } });
  })();

  // ================================================================ 6. SR. STARK — so o robo, com as decisoes dele
  // 05/10 (Q4 B1, ele: "so o Sr. Stark", nota "so que mais otimizado que isso"; a02 "ficou com o holograma misturado"): o anel
  // de agentes e os 3 robos em HTML (Stark, Sersi, Sprite - 7 animacoes CSS sempre a correr) SAIRAM. Fica um canvas so: o
  // robo do Sr. Stark (o corpo e uma camada guardada; por cima, a cada quadro, os olhos - piscam e acendem a ouro quando ele
  // decide -, a boca que fala, a antena que brilha e a flutuacao) e por baixo a DECISAO dele a escrever-se letra a letra.
  // Real: a decisao e o parecer do Sr. Stark (enxame.json -> stark.decisao, senao a 1.a frase do parecer); um parecer novo
  // escreve-se de novo e acende os olhos; cada evento do atico faz-o falar 1,4 s.
  var ROBO = { parecer: '', decisao: '', t: '', mod: '', tf: -9, fala: -9, olho: 0, linhas: null, chaveL: '' };
  function primeiraFrase(p) { var s = String(p || '').replace(/\s+/g, ' ').trim(); var m = /^(.{12,}?[.;!?])(\s|$)/.exec(s); return (m ? m[1] : s).slice(0, 200); }
  T3B.on('enxame', function (e) {
    var s = obj(e.stark), p = TX.semMarkdown(TX.limpar(String(s.parecer || ''))); if (!p) return;
    ROBO.mod = s.modelo || ROBO.mod; ROBO.t = s.t_iso || ROBO.t;
    if (p === ROBO.parecer) return;
    var primeira = !ROBO.parecer; ROBO.parecer = p;
    ROBO.decisao = primeiraFrase(TX.semMarkdown(TX.limpar(String(s.decisao || ''))) || p);
    if (!primeira) { ROBO.tf = agoraMs() / 1000; ROBO.olho = 1; creditarHolo('stark', 'stark', 'parecer novo do Sr. Stark'); }
  });
  aoReagir('stark', function (ev) { ROBO.fala = agoraMs() / 1000; ROBO.aceno = 1; ROBO.olho = Math.max(ROBO.olho, ev.k === 'mudou' || ev.k === 'falou' ? 1 : 0.6); });
  // 05/10 (ele: "mais interacoes... mostrar alguma estatistica interessante"): a estatistica real da casa a rodar de 3,5 em 3,5 s
  function statsDoStark() {
    var T = obj(T3B.estado.T), r = obj(T.reactor), g = obj(r.ganho), je = obj(r.ja_entrou), ex = obj(T.extremis), o = [];
    if (g.realizado_usd != null) o.push(['P&L DE HOJE', sinal(g.realizado_usd, 2) + ' US$', g.realizado_usd >= 0 ? C.ok : C.mau]);
    if (je.n_ganhos != null) o.push(['ACERTO', fmt(je.n_ganhos / Math.max(1, je.n_ganhos + je.n_perdas) * 100, 1) + '% em ' + fmt(je.operacoes, 0) + ' ops', C.cy]);
    if (r.aberto_total_usd != null) o.push(['EM ABERTO', sinal(r.aberto_total_usd, 2) + ' US$ · ' + lista(r.posicoes).length + ' posições', r.aberto_total_usd >= 0 ? C.ok : C.mau]);
    if (ex.geracao_actual != null) o.push(['EVOLUÇÃO', 'geração ' + ex.geracao_actual + ' · ' + fmt(ex.n_familias, 0) + ' famílias', C.ouroHi]);
    if (je.liquido != null) o.push(['DESDE O INÍCIO', sinal(je.liquido, 2) + ' US$', je.liquido >= 0 ? C.ok : C.mau]);
    return o;
  }
  // 07/10 (Q5 B1, ele: "quero outra coisa dessa parecida no canto superior direito tambem com outras informacoes relevantes
  // tambem mudando assim"): o bloco da direita, desfasado meio passo do da esquerda
  function statsDireita() {
    var T = obj(T3B.estado.T), ex = obj(T.extremis), o = [];
    if (ROBO.mod) o.push(['MODELO DO STARK', String(ROBO.mod).replace(/^claude-/, ''), C.cy]);
    if (ROBO.t) o.push(['ÚLTIMO PARECER', 'há ' + U.haQuanto(Date.now() - U.epoch(ROBO.t)), C.txt]);
    o.push(['VISITAS', fmt((ACT.stark || { janela: [] }).janela.length, 0) + ' da S.H.I.E.L.D.', C.vi]);
    if (ex.robustos_alguma_vez != null) o.push(['GENES ROBUSTOS', fmt(ex.robustos_alguma_vez, 0), C.ok]);
    if (ex.n_familias != null) o.push(['FAMÍLIAS', fmt(ex.n_familias, 0), C.ouroHi]);
    if (ex.n_avaliacoes != null) o.push(['AVALIAÇÕES', fmt(ex.n_avaliacoes, 0), C.ouroHi]);
    return o;
  }
  // 07/10 (Q5 B1, ele: "ali onde ta 'noite de rede, nao de bugs' isso pode ficar mudando e aparecendo outras mensagens relevantes,
  // importante ser no maximo de duas linhas pra nao ficar cortado"): a decisao + as frases do parecer, cada uma em ate 2 linhas
  // (uma frase maior vira blocos de 2 linhas pelas palavras - nunca cortada a meio)
  function frasesDoStark(ctx, larg, quebrar) {      // (o quebrar vive dentro da cena do Stark: vem como argumento)
    var chave = (ROBO.decisao || '') + '|' + (ROBO.parecer || '') + '|' + larg;
    if (ROBO.chaveF === chave) return ROBO.frases;
    var fontes = [ROBO.decisao || 'a ler o parecer do Sr. Stark…'].concat(String(TX.semMarkdown(TX.limpar(String(ROBO.parecer || '')))).split(/(?<=[.!?])\s+/));
    var out = [], vistas = {};
    fontes.forEach(function (f) {
      f = String(f || '').trim(); if (f.length < 12 || vistas[f]) return; vistas[f] = 1;
      var ls = quebrar(ctx, f, larg);
      for (var i = 0; i < ls.length && out.length < 8; i += 2) out.push(ls.slice(i, i + 2));
    });
    ROBO.frases = out.length ? out : [[ROBO.decisao || 'a ler o parecer do Sr. Stark…']]; ROBO.chaveF = chave;
    return ROBO.frases;
  }
  EXTRA.stark = function () { return { olho: Math.round(ROBO.olho * 100) / 100, parecer: ROBO.parecer ? TX.cortar(ROBO.parecer, 60) : null, decisao: ROBO.decisao ? TX.cortar(ROBO.decisao, 60) : null, falou_ha_ms: ROBO.fala > 0 ? Math.round(agoraMs() - ROBO.fala * 1000) : null }; };
  var cenaAnel = null;
  (function () {
    var cv = canvasDe('h_stark', 'canvas.anel'); if (!cv) return;
    registar('stark', $('h_stark'));
    var em = document.querySelector('#h_stark .ht em'); if (em) em.textContent = 'as decisões dele';
    cv.setAttribute('aria-label', 'o Sr. Stark: os olhos acendem quando ele decide; por baixo, a decisão dele');
    var rb = $('h_stark_robo'); if (rb) rb.parentNode.removeChild(rb);           // os 3 robos em HTML sairam (ordem dele)
    // 07/10: o robo abaixo dos dois blocos de cima (que acabam a TOPO+26) e acima das 2 linhas de baixo - deixou de tapar o texto
    function geo(w, h) { var top0 = TOPO + 30, bot0 = h - 32, r = Math.max(12, Math.min(w * 0.18, (bot0 - top0) * 0.42)); return { cx: w / 2, cy: (top0 + bot0) / 2, r: r }; }
    function corpo(g, w, h) {
      var G = geo(w, h), cx = G.cx, cy = G.cy, r = G.r;
      var ch = g.createRadialGradient(cx, cy + r * 1.25, 0, cx, cy + r * 1.25, r * 1.6); ch.addColorStop(0, 'rgba(242,194,48,.16)'); ch.addColorStop(1, 'rgba(242,194,48,0)');
      g.fillStyle = ch; g.beginPath(); g.ellipse(cx, cy + r * 1.25, r * 1.6, r * 0.32, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(242,194,48,.85)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cy - r * 0.8); g.lineTo(cx, cy - r * 1.12); g.stroke();
      [-1, 1].forEach(function (lado) { rr(g, cx + lado * (r + 1) - (lado > 0 ? 0 : r * 0.16), cy - r * 0.28, r * 0.16, r * 0.56, r * 0.06); g.fillStyle = '#2a2414'; g.fill(); g.strokeStyle = 'rgba(242,194,48,.7)'; g.stroke(); });
      var gr = g.createLinearGradient(0, cy - r * 0.8, 0, cy + r * 0.8); gr.addColorStop(0, '#2a3346'); gr.addColorStop(1, '#121722');
      rr(g, cx - r, cy - r * 0.8, r * 2, r * 1.6, r * 0.45); g.fillStyle = gr; g.fill(); g.strokeStyle = C.ouro; g.lineWidth = 1.6; g.stroke();
      rr(g, cx - r * 0.78, cy - r * 0.48, r * 1.56, r * 0.78, r * 0.3); g.fillStyle = '#070a12'; g.fill(); g.strokeStyle = 'rgba(45,212,232,.25)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, cx - r * 0.7, cy - r * 0.72, r * 1.4, r * 0.14, r * 0.07); g.fill();
      rot(g, 'DECISÃO', w / 2, h - 34, C.dim, 8, 'center', 600);   // (05/10: por cima das 2 linhas, nunca por cima delas)
    }
    function quebrar(ctx, txt, larg) {
      ctx.font = fonte(600, 10); ctx._f = ctx.font;
      var pal = String(txt).split(' '), lin = [], cur = '', sobra = false;
      for (var i = 0; i < pal.length; i++) {
        var tenta = cur ? cur + ' ' + pal[i] : pal[i];
        if (!cur || ctx.measureText(tenta).width <= larg) { cur = tenta; continue; }
        lin.push(cur); cur = pal[i];
        if (lin.length === 2) { sobra = true; break; }
      }
      if (!sobra) lin.push(cur);
      return lin.map(function (l, k) {                         // nada passa da largura; a 2.a linha leva '…' se o texto continuar
        var fim = sobra && k === lin.length - 1;
        if (!fim && ctx.measureText(l).width <= larg) return l;
        while (l.length > 1 && ctx.measureText(l + '…').width > larg) l = l.slice(0, -1);
        return l.replace(/\s+$/, '') + '…';
      });
    }
    cenaAnel = cena(cv, { id: 'stark', holo: $('h_stark'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      ROBO.aceno = (ROBO.aceno || 0) * Math.pow(0.08, dt);
      var G = geo(w, h), cx = G.cx, r = G.r, dy = calmo ? 0 : Math.sin(t * 1.3) * Math.min(3, r * 0.06) + Math.sin((1 - ROBO.aceno) * Math.PI * 2) * ROBO.aceno * r * 0.12, cy = G.cy + dy;
      ROBO.olho *= Math.pow(0.35, dt);
      var ST = statsDoStark();
      if (ST.length) {
        var kst = Math.floor(t / 3.5) % ST.length, fs = (t % 3.5) / 3.5, aS = Math.min(1, fs * 8, (1 - fs) * 8);
        ctx.globalAlpha = aS; rotCabe(ctx, ST[kst][0], 8, TOPO + 10, C.dim, 7.5, 'left', 600, w / 2 - 14); rotCabe(ctx, ST[kst][1], 8, TOPO + 22, ST[kst][2], 10, 'left', 700, w / 2 - 14); ctx.globalAlpha = 1;
      }
      var fala = t - ROBO.fala < 1.4 || t - ROBO.tf < 1.6, base = (ACT.stark || {}).base || 0;
      ctx.drawImage(camada(s, 'corpo', '', corpo), 0, dy, w, h);
      // a antena: brilha sempre, mais quando fala
      var ant = 0.45 + 0.3 * Math.sin(t * 2.1) + (fala ? 0.4 : 0);
      luz(ctx, C.ouro, cx, cy - r * 1.16, 5 + r * 0.12, ant); ctx.fillStyle = C.ouroHi; ctx.beginPath(); ctx.arc(cx, cy - r * 1.16, Math.max(1.6, r * 0.07), 0, TAU); ctx.fill();
      // os olhos: piscam a cada ~4,2 s; acendem a ouro quando ele decide; olham devagar para os lados
      var ph = (t + 1.3) % 4.2, pis = ph > 4.05 ? Math.abs(ph - 4.125) / 0.075 : 1, ol = fala || ROBO.olho > 0.3 ? C.ouro : C.cy, oi = 0.55 + 0.45 * Math.max(ROBO.olho, fala ? 1 : 0.35 + 0.15 * base);
      var ox = Math.sin(t * 0.43) * r * 0.06, ey = cy - r * 0.1;
      [-1, 1].forEach(function (lado) {
        var ex = cx + lado * r * 0.38 + ox;
        luz(ctx, ol, ex, ey, r * 0.42, oi * 0.75);
        ctx.fillStyle = ol; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.15, Math.max(0.6, r * 0.19 * pis), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(ex - r * 0.05, ey - r * 0.07 * pis, r * 0.035, 0, TAU); ctx.fill();
      });
      // a boca: fala (onda) ou respira (quase parada)
      var am = fala ? r * 0.08 * (0.6 + 0.4 * Math.sin(t * 5)) : r * 0.012;
      ctx.strokeStyle = ol; ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.lineCap = 'round'; ctx.beginPath();
      for (var i = 0; i <= 18; i++) { var x = cx - r * 0.45 + i / 18 * r * 0.9, y = cy + r * 0.42 + Math.sin(i * 1.25 + t * (fala ? 17 : 2.2)) * am * Math.sin(i / 18 * Math.PI); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
      if (fala) luz(ctx, C.ouro, cx, cy + r * 0.42, r * 0.5, 0.25);
      // a decisao, a escrever-se (28 letras/s) em ate 2 linhas
      var FR = frasesDoStark(ctx, w - 16, quebrar), kf = Math.floor(t / 7) % FR.length;
      if (ROBO.kf !== kf) { ROBO.kf = kf; ROBO.tfr = t; }
      ROBO.linhas = FR[kf];
      var k = ROBO.tf > 0 && t - ROBO.tf < 7 ? Math.floor((t - ROBO.tf) * 28) : Math.floor((t - (ROBO.tfr || 0)) * 28), ja = 0;
      ROBO.linhas.forEach(function (l, i) {
        var mostra = l.slice(0, Math.max(0, k - ja)); ja += l.length + 1;
        if (mostra) rot(ctx, mostra, w / 2, h - (ROBO.linhas.length > 1 ? 20 : 14) + i * 12, ROBO.decisao ? C.ouroHi : C.dim, 10, 'center', 600);
      });
      var SD = statsDireita();
      if (SD.length) {
        var kd = Math.floor((t + 1.75) / 3.5) % SD.length, fd = ((t + 1.75) % 3.5) / 3.5, aD = Math.min(1, fd * 8, (1 - fd) * 8);
        ctx.globalAlpha = aD; rotCabe(ctx, SD[kd][0], w - 8, TOPO + 10, C.dim, 7.5, 'right', 600, w / 2 - 14); rotCabe(ctx, SD[kd][1], w - 8, TOPO + 22, SD[kd][2], 10, 'right', 700, w / 2 - 14); ctx.globalAlpha = 1;
      }
    } });
  })();
  setInterval(function () { if (!ROBO.t) return; mini('hm_stark', [['parecer há', U.haQuanto(Date.now() - U.epoch(ROBO.t))], ['', ROBO.mod || 'modelo ?'], ['visitas', fmt((ACT.stark || { janela: [] }).janela.length, 0)]]); }, 2000);

  // ================================================================ 7. NUMEROS (G7, domOdo): o conta-quilometros + a fita
  // O conta-quilometros conta os EVENTOS REAIS da torre desde que o servidor arrancou (sobe com cada evento). A fita dos
  // contadores (operacoes, acerto, genes, ...) ja nao corre sozinha em ciclo: anda um passo por cada evento da Estatistica
  // (and. 46) - a reaccao deste holograma.
  var ODO = { el: null, fita: null, strips: [], forma: '', off: 0, largura: 0 };
  (function () {
    var cx = $('h_numeros_odo'); if (!cx) return;
    registar('numeros', $('h_numeros'));
    // 07/10 (Q5 B2, ele: "quero so que diga do lado o numero o que ta sendo mostrado"): o rotulo AO LADO do numero
    cx.innerHTML = '<div class="odlinha"><div class="od" title="eventos reais da torre desde que o servidor arrancou"></div><div class="od-rot">eventos reais</div></div><div class="fitah"><div class="tr"></div></div>';
    var em = document.querySelector('#h_numeros .ht em'); if (em) em.textContent = 'eventos reais da torre';
    ODO.el = cx.querySelector('.od'); ODO.fita = cx.querySelector('.tr'); ODO.rot = cx.querySelector('.od-rot');
  })();
  function odoPor(n) {
    if (!ODO.el) return;
    var s = fmt(n, 0), forma = s.replace(/\d/g, '0');
    if (forma !== ODO.forma) {
      ODO.forma = forma; ODO.el.innerHTML = ''; ODO.strips = [];
      for (var i = 0; i < s.length; i++) {
        if (!/\d/.test(s[i])) { var sp = document.createElement('span'); sp.className = 'sep'; sp.textContent = s[i]; ODO.el.appendChild(sp); continue; }
        var dg = document.createElement('span'); dg.className = 'dg'; var sr = document.createElement('span'); sr.className = 'strip';
        for (var k = 0; k < 10; k++) { var e = document.createElement('span'); e.textContent = k; sr.appendChild(e); }
        sr.style.transitionDelay = (ODO.strips.length * 40) + 'ms'; dg.appendChild(sr); ODO.el.appendChild(dg); ODO.strips.push(sr);
      }
    }
    var j = 0; for (var x = 0; x < s.length; x++) if (/\d/.test(s[x])) { var tr = 'translateY(' + (-Number(s[x]) * 10) + '%)'; if (ODO.strips[j].style.transform !== tr) ODO.strips[j].style.transform = tr; j++; }
  }
  var CONT = {};
  function pintarFitaNumeros() {
    if (!ODO.fita) return;
    var it = [['REALIZADO HOJE', CONT.hoje], ['EM ABERTO', CONT.aberto], ['ACERTO', CONT.acerto], ['OPERAÇÕES', CONT.ops], ['POSIÇÕES', CONT.pos], ['GENES ROBUSTOS', CONT.rob], ['AVALIAÇÕES', CONT.aval], ['GERAÇÃO', CONT.ger], ['FAMÍLIAS', CONT.fam], ['GENES', CONT.genes], ['FUNCIONÁRIOS', CONT.censo]].filter(function (x) { return x[1] != null; });
    var ht = it.map(function (i) { return '<span>' + i[0] + ' <b>' + U.escH(i[1]) + '</b></span>'; }).join('');
    // 05/10 (ele: "corrija o carrossel em baixo que nao ta correndo"): andava um passo por evento da Estatistica - agora corre sempre
    if (ODO.fita.dataset.h !== ht) { ODO.fita.dataset.h = ht; ODO.fita.innerHTML = ht + ht; ODO.largura = 0; ODO.fita.classList.add('corre'); ODO.fita.style.setProperty('--dur', Math.max(20, Math.round(ht.length / 9)) + 's'); }
  }
  aoReagir('numeros', function () {
    if (!ODO.fita) return;
    if (ODO.el && ODO.el.animate && !calmo) ODO.el.animate([{ textShadow: '0 0 22px rgba(255,220,106,.95)' }, { textShadow: '0 0 16px rgba(251,191,36,.3)' }], { duration: 800 });
  });
  EXTRA.numeros = function () { return { fita_px: ODO.off, eventos: T3B.estado.vivoSeq }; };
  var seqVisto = null;
  // 05/10 (ele: "quero que mostre numeros mais importantes e relevantes"): o numero grande alterna de 6 em 6 s entre o acerto, as
  // operacoes, os genes robustos e as avaliacoes (os eventos continuam no mini)
  var ODO_K = 0, ODO_T = 0;
  function odoRelevante() {
    var lst = [['acerto (%)', CONT.acertoN, '%'], ['operações', CONT.opsN, ''], ['genes robustos', CONT.robN, ''], ['avaliações de genes', CONT.avalN, '']].filter(function (x) { return x[1] != null && isFinite(x[1]); });
    if (!lst.length) return false;
    if (Date.now() - ODO_T > 6000) { ODO_K = (ODO_K + 1) % lst.length; ODO_T = Date.now(); }
    var x = lst[ODO_K % lst.length]; odoPor(x[2] === '%' ? Math.round(x[1] * 10) / 10 : x[1]);
    var em = document.querySelector('#h_numeros .ht em'); if (em && em.textContent !== x[0]) em.textContent = x[0];
    if (ODO.rot && ODO.rot.textContent !== x[0]) ODO.rot.textContent = x[0];
    return true;
  }
  T3B.on('ritmo', function () {
    var s = T3B.estado.vivoSeq; if (!s) return;
    if (!odoRelevante()) { odoPor(s); if (ODO.rot && ODO.rot.textContent !== 'eventos reais') ODO.rot.textContent = 'eventos reais'; }
    if (seqVisto != null && s > seqVisto + 25) creditarHolo('numeros', 'numeros', 'eventos ' + fmt(s, 0));
    if (seqVisto == null || s > seqVisto + 25) seqVisto = s;
    mini('hm_numeros', [['eventos', fmt(s, 0)], ['ops', CONT.ops || '0'], ['genes', CONT.genes || '0']]);
  });
  T3B.on('torre', function (T) {
    var r = obj(T.reactor), je = obj(r.ja_entrou), ex = obj(T.extremis);
    CONT.ops = fmt(je.operacoes, 0); CONT.acerto = je.n_ganhos != null && je.operacoes ? fmt(je.n_ganhos / Math.max(1, je.n_ganhos + je.n_perdas) * 100, 1) + '%' : null;
    CONT.genes = fmt(ex.n_genes, 0); CONT.aval = fmt(ex.n_avaliacoes, 0); CONT.ger = ex.geracao_actual != null ? String(ex.geracao_actual) : null; CONT.fam = ex.n_familias != null ? fmt(ex.n_familias, 0) : null;
    CONT.pos = String(lista(r.posicoes).length);
    var g = obj(r.ganho); CONT.hoje = g.realizado_usd != null ? sinal(g.realizado_usd, 2) + ' US$' : null; CONT.aberto = r.aberto_total_usd != null ? sinal(r.aberto_total_usd, 2) + ' US$' : null;
    CONT.rob = ex.robustos_alguma_vez != null ? fmt(ex.robustos_alguma_vez, 0) : null;
    CONT.acertoN = je.n_ganhos != null ? je.n_ganhos / Math.max(1, je.n_ganhos + je.n_perdas) * 100 : null; CONT.opsN = Number(je.operacoes); CONT.robN = Number(ex.robustos_alguma_vez); CONT.avalN = Number(ex.n_avaliacoes);
    pintarFitaNumeros();
  });
  T3B.on('estrutura', function (d) { var pt = obj(obj(d.predio).totais); CONT.censo = fmt(pt.censo || obj(d.totais).peoes, 0); pintarFitaNumeros(); });

  // ================================================================ 8. MESA DE OPERACOES (G9, domBarras): barras que sobem do chao
  var BAR = { v: [], el: null, ult: 0 };
  (function () {
    var b = $('h_mesa_barras'); if (!b) return;
    registar('mesa', $('h_mesa'));
    for (var i = 0; i < 20; i++) b.appendChild(document.createElement('div'));
    BAR.el = b;
    var r = document.createElement('div'); r.className = 'barras-rot'; r.innerHTML = '<span>em aberto · <b id="h_mesa_ult">a ler…</b></span><span id="h_mesa_n"></span>'; b.parentElement.appendChild(r);
  })();
  function pintarBarras() {
    if (!BAR.el) return;
    var v = BAR.v, n = v.length, mn = Math.min.apply(null, v.concat([0])), mx = Math.max.apply(null, v.concat([0])), sp = (mx - mn) || 1;
    Array.prototype.forEach.call(BAR.el.children, function (d, i) {
      var k = i - (20 - n), x = k >= 0 ? v[k] : null;
      var tr = 'scaleY(' + (x == null ? 0.02 : (0.12 + 0.88 * (Math.abs(x - (mn < 0 && mx > 0 ? 0 : mn)) / sp))).toFixed(3) + ')';
      if (d.style.transform !== tr) d.style.transform = tr;
      d.classList.toggle('dn', x != null && x < 0);
    });
  }
  function amostraMesa(v, creditar) {
    if (!isFinite(v)) return;
    var agora = performance.now();
    if (BAR.v.length && BAR.v[BAR.v.length - 1] === v) return;
    if (agora - BAR.ult < 1400 && BAR.v.length) { BAR.v[BAR.v.length - 1] = v; pintarBarras(); return; }
    BAR.ult = agora; BAR.v.push(v); if (BAR.v.length > 20) BAR.v.shift();
    pintarBarras();
    var u = $('h_mesa_ult'); if (u) { u.textContent = sinal(v, 2) + ' US$'; u.style.color = v >= 0 ? C.ok : C.mau; }
    U.txt($('h_mesa_n'), BAR.v.length + ' leituras');
    if (creditar) creditarHolo('mesa', 'mesa', 'em aberto ' + sinal(v, 2));
  }
  T3B.on('aberto', function (v) { amostraMesa(v, false); });
  aoReagir('mesa', function () {
    var b = BAR.el && BAR.el.lastElementChild; if (!b || !b.animate || calmo) return;
    b.animate([{ filter: 'brightness(2.4)', opacity: 1 }, { filter: 'none' }], { duration: 900, easing: 'ease-out' });
  });
  T3B.on('torre', function (T) {
    var r = obj(T.reactor), pos = lista(r.posicoes);
    U.txt($('h_mesa_e'), pos.length + ' posições · ' + fmt(obj(r.alocacao).em_uso, 0) + ' US$ em uso');
    var mv = lista(r.movimentacoes).slice(-6), ass = mv.map(function (m) { return m.t + m.evento + m.simbolo; }).join('|');
    if (BAR.assMov && ass !== BAR.assMov) creditarHolo('mesa', 'mesa', 'movimentação ' + ((mv[mv.length - 1] || {}).evento || ''));
    BAR.assMov = ass;
    if (!BAR.v.length) amostraMesa(Number(r.aberto_total_usd), false);
    var v = BAR.v.length ? BAR.v[BAR.v.length - 1] : Number(r.aberto_total_usd);
    mini('hm_mesa', [['', String(pos.length), 'posições'], ['aberto', sinal(v, 2), '', v >= 0 ? 'up' : 'dn'], ['em uso', fmt(obj(r.alocacao).em_uso, 0)]]);
  });

  // ================================================================ 9. LIVRO DE OFERTAS VIVO (G24, D.livro) — na Mesa de Operacoes
  // A escada de compra e venda e o LIVRO REAL da Binance (10 niveis, de 1 em 1 s) do simbolo com a maior posicao em cripto
  // aberta (sem cripto: BTC). Liga-se so com o painel a vista e aberto, e fecha com a aba escondida. A FITA ao lado: as
  // execucoes em papel (torre.json -> movimentacoes) e cada evento da Mesa com o nome de quem o fez - o nivel mais perto do
  // preco pisca a cada um (a reaccao).
  var LIV = { sym: null, ws: null, b: [], a: [], mid: null, fita: [], fl: null, t: 0, falhas: 0, ultMsg: 0 };
  function simboloDaMesa() {
    var pos = lista(obj(obj(T3B.estado.T).reactor).posicoes).filter(function (p) { return p.cripto; }).sort(function (x, y) { return (Number(y.valor_usd) || 0) - (Number(x.valor_usd) || 0); })[0];
    return pos ? String(pos.simbolo).replace(/USD$/, 'USDT') : 'BTCUSDT';
  }
  function livroVisivel() { var h = $('h_livro'); return !!(h && !h.classList.contains('min') && !document.hidden && !gavetaAberta && !T3B.pequeno && !(T3B.estado.perto && !$('palco').classList.contains('holos-de-volta'))); }
  function aoLivro(d) { if (!d) return; LIV.b = (d.bids || []).slice(0, 6).map(function (x) { return [Number(x[0]), Number(x[1])]; }); LIV.a = (d.asks || []).slice(0, 6).map(function (x) { return [Number(x[0]), Number(x[1])]; }); if (LIV.b.length && LIV.a.length) LIV.mid = (LIV.b[0][0] + LIV.a[0][0]) / 2; LIV.ultMsg = Date.now(); LIV.falhas = 0; sujar(cenaLivro, 0); }
  function ligarLivro() {
    var quer = livroVisivel(), sym = simboloDaMesa();
    // 04/10: pela ligacao UNICA da pagina (t3b_ws.js) - mudar de simbolo ou esconder o painel e um SUBSCRIBE/UNSUBSCRIBE, nunca um
    // fecho (fechar uma ligacao a Binance deixa na consola "Ping received after close", um erro do servidor deles)
    if (window.T3BBinance) {
      var fl = quer ? sym.toLowerCase() + '@depth10@100ms' : null;
      if (LIV.fluxo && LIV.fluxo !== fl) { window.T3BBinance.largar(LIV.fluxo); LIV.fluxo = null; LIV.ws = null; }
      if (fl && !LIV.fluxo) { LIV.sym = sym; LIV.fluxo = fl; LIV.ws = true; window.T3BBinance.assinar(fl, aoLivro); }
      return;
    }
    // (fechar so uma ligacao ABERTA: fechar uma que ainda esta a ligar escreve um erro vermelho na consola do browser)
    if (LIV.ws && (!quer || LIV.sym !== sym)) { var w0 = LIV.ws; LIV.ws = null; w0.onclose = null; w0.onmessage = null; if (w0.readyState === 1) { try { w0.close(); } catch (e) { } } else w0.onopen = function () { try { w0.close(); } catch (e) { } }; }
    if (!quer || LIV.ws || LIV.falhas > 6) return;
    LIV.sym = sym;
    try {
      var ws = new WebSocket('wss://stream.binance.com:9443/ws/' + sym.toLowerCase() + '@depth10@100ms');
      ws.onmessage = function (m) { try { var d = JSON.parse(m.data); LIV.b = (d.bids || []).slice(0, 6).map(function (x) { return [Number(x[0]), Number(x[1])]; }); LIV.a = (d.asks || []).slice(0, 6).map(function (x) { return [Number(x[0]), Number(x[1])]; }); if (LIV.b.length && LIV.a.length) LIV.mid = (LIV.b[0][0] + LIV.a[0][0]) / 2; LIV.ultMsg = Date.now(); LIV.falhas = 0; sujar(cenaLivro, 0); } catch (e) { } };
      ws.onclose = function () { LIV.ws = null; LIV.falhas++; };
      ws.onerror = function () { if (ws.readyState === 1) { try { ws.close(); } catch (e) { } } };
      LIV.ws = ws;
    } catch (e) { LIV.falhas++; }
  }
  setInterval(ligarLivro, 3000);
  T3B.on('torre', function (T) {
    var mv = lista(obj(T.reactor).movimentacoes).slice(-6);
    mv.forEach(function (m) { var k = m.t + m.evento + m.simbolo; if (LIV.vistos && LIV.vistos[k]) return; LIV.vistos = LIV.vistos || {}; LIV.vistos[k] = 1; LIV.fita.unshift({ t: String(m.evento || '') + ' ' + String(m.simbolo || ''), p: Number(m.preco || m.preco_usd), c: /venda|sai|fech/i.test(m.evento || '') ? C.mau : C.ok, nossa: 1 }); });
    if (LIV.fita.length > 9) LIV.fita.length = 9;
    sujar(cenaLivro, 0);
  });
  aoReagir('livro', function (ev) {
    var quem = TX.cortar(TX.limpar(ev.quem || TX.nomeDeId(ev.id)), 16);
    LIV.fita.unshift({ t: quem + ' · ' + ({ escreveu: 'escreveu', mudou: 'mudou', falou: 'falou', recado: 'recado', visita: 'visita' })[ev.k] || ev.k, c: C.ouroHi });
    if (LIV.fita.length > 9) LIV.fita.length = 9;
    LIV.fl = { t0: agoraMs(), lado: /venda|perda|-/.test(ev.txt || '') ? 'a' : 'b' };
    sujar(cenaLivro, 900);
  });
  EXTRA.livro = function () { return { simbolo: LIV.sym, niveis: LIV.b.length + LIV.a.length, fita: LIV.fita.length, ligado: !!LIV.ws }; };
  var cenaLivro = null;
  (function () {
    var cv = canvasDe('h_livro'); if (!cv) return;
    registar('livro', $('h_livro'));
    // 05/10 (Q4 B3, ele: "vivo e suave"; a08 "parece que ta em fotograma"): o livro vinha da Binance de 1 em 1 s e as barras
    // saltavam para o valor novo a 12 q/s. Agora o livro chega de 100 em 100 ms, as barras DESLIZAM para cada valor (e respiram
    // um pouco entre dois), a linha do preco corre, cada ordem acende a sua linha e cada entrada nova da fita entra a deslizar.
    // Os precos sao uma camada guardada (refeita so quando um preco muda).
    var WA = [], WB = [];
    var px = function (v) { return v >= 1000 ? fmt(v, 1) : v >= 1 ? fmt(v, 3) : fmt(v, 5); };
    cenaLivro = cena(cv, { id: 'livro', holo: $('h_livro'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      // 07/10 (Q5 B3, li_lado): o livro a esquerda (46%), as nossas posicoes a direita
      var L0 = Math.max(110, w * 0.46), top = TOPO + 12, bot = h - 3, mid = (top + bot) / 2, n = clamp(Math.floor((bot - top) / 2 / 11), 2, 6), rh = (bot - top) / (n * 2), cx = L0 / 2, agora = agoraMs();
      if (!LIV.b.length) {
        // sem o livro (a ligar, ou a Binance fora): o melhor preco do reactor, se houver; nunca um painel vazio
        var cr = obj(obj(window.__md && window.__md.S).cr), sy = String(LIV.sym || simboloDaMesa()).replace(/USDT$/, 'USD'), c = obj(cr[sy]);
        rot(ctx, (LIV.sym || simboloDaMesa()) + ' · a ligar ao livro da Binance…', 8, mid, C.dim, 9, 'left', 500);
        if (c.bin != null) rot(ctx, 'último ' + px(c.bin), 8, mid + 14, C.ouroHi, 10, 'left', 600);
      } else {
        var mxq = 0; LIV.b.concat(LIV.a).forEach(function (x) { if (x[1] * x[0] > mxq) mxq = x[1] * x[0]; });
        for (var i = 0; i < n; i++) {
          var a = LIV.a[i], b = LIV.b[i], ya = mid - (i + 1) * rh, yb = mid + i * rh + 1;
          WA[i] = seguir(WA[i] || 0, a ? a[0] * a[1] / mxq * (L0 / 2 - 6) : 0, 9, dt);
          WB[i] = seguir(WB[i] || 0, b ? b[0] * b[1] / mxq * (L0 / 2 - 6) : 0, 9, dt);
          var ra = calmo ? 1 : 1 + 0.018 * Math.sin(t * 3.1 + i * 1.7), rb2 = calmo ? 1 : 1 + 0.018 * Math.sin(t * 2.7 + i * 2.3);
          ctx.fillStyle = 'rgba(255,90,95,' + (0.18 + 0.1 * (1 - i / n)).toFixed(2) + ')'; ctx.fillRect(cx, ya, WA[i] * ra, rh - 1);
          ctx.fillStyle = 'rgba(63,214,154,' + (0.18 + 0.1 * (1 - i / n)).toFixed(2) + ')'; ctx.fillRect(cx - WB[i] * rb2, yb, WB[i] * rb2, rh - 1);
        }
        if (LIV.fl && agora - LIV.fl.t0 < 900) { var fa = 1 - (agora - LIV.fl.t0) / 900; ctx.globalAlpha = fa * 0.85; ctx.fillStyle = LIV.fl.lado === 'a' ? C.mau : C.ok; ctx.fillRect(2, LIV.fl.lado === 'a' ? mid - rh : mid + 1, L0 - 4, rh - 2); ctx.globalAlpha = 1; luz(ctx, LIV.fl.lado === 'a' ? C.mau : C.ok, cx, LIV.fl.lado === 'a' ? mid - rh / 2 : mid + rh / 2, 18, fa * 0.6); }
        // os precos e o titulo: camada guardada (so muda quando um preco muda)
        var chave = n + '|' + LIV.sym + '|' + px(LIV.mid) + '|' + LIV.a.slice(0, n).map(function (x) { return x[0]; }).join(',') + '|' + LIV.b.slice(0, n).map(function (x) { return x[0]; }).join(',');
        porCamada(ctx, s, 'precos', chave, function (g) {
          for (var k = 0; k < n; k++) {
            var aa = LIV.a[k], bb = LIV.b[k], yya = mid - (k + 1) * rh, yyb = mid + k * rh + 1;
            if (aa) rot(g, px(aa[0]), cx - 4, yya + rh - 2, C.mau, 8.5, 'right', 500);
            if (bb) rot(g, px(bb[0]), cx + 4, yyb + rh - 2, C.ok, 8.5, 'left', 500);
          }
          rot(g, String(LIV.sym).replace(/USDT$/, '') + ' · ' + px(LIV.mid), 6, TOPO + 6, C.ouroHi, 8.5, 'left', 600);
        });
        // 05/10 (ele: "as apostas que tao em andamento... mais detalhes pra identificar melhor"): a NOSSA posicao neste simbolo - a
        // linha do preco a que entramos (no limite do livro, se estiver fora dele) e o ganho/perda dela ao preco do meio
        var P = lista(obj(obj(T3B.estado.T).reactor).posicoes).filter(function (x) { return String(x.simbolo).replace(/USD$/, 'USDT') === LIV.sym; })[0];
        if (P && isFinite(Number(P.entrada)) && LIV.a.length && LIV.b.length) {
          var ent = Number(P.entrada), topoP = LIV.a[Math.min(n, LIV.a.length) - 1][0], baseP = LIV.b[Math.min(n, LIV.b.length) - 1][0];
          var ye = ent >= LIV.mid ? mid - clamp((ent - LIV.mid) / Math.max(1e-9, topoP - LIV.mid), 0, 1.04) * (mid - top) : mid + clamp((LIV.mid - ent) / Math.max(1e-9, LIV.mid - baseP), 0, 1.04) * (bot - mid);
          var plP = (LIV.mid - ent) * Number(P.qty || 0);
          ctx.strokeStyle = C.vi; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(2, ye); ctx.lineTo(L0 - 2, ye); ctx.stroke(); ctx.setLineDash([]);
          rot(ctx, TX.cortar('entrada ' + px(ent) + ' · ' + sinal(plP, 2), Math.max(8, Math.floor((L0 - 8) / 4.6))), 4, clamp(ye - 3, TOPO + 18, h - 4), C.vi, 7.5, 'left', 700);   // (cabe no livro: nao invade a fita)
        }
        // a linha do preco: corre sempre (a marcha da linha tracejada) e brilha ao meio
        ctx.strokeStyle = C.ouro; ctx.setLineDash([4, 4]); ctx.lineDashOffset = calmo ? 0 : -t * 14; ctx.beginPath(); ctx.moveTo(2, mid); ctx.lineTo(L0 - 2, mid); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        luz(ctx, C.ouro, cx, mid, 10 + 2 * Math.sin(t * 2), 0.4);
      }
      // 07/10 (Q5 B3, li_lado: "a direita cada posicao com nome, sigla e ganho/perda a mexer"): as POSICOES abertas, o P&L a
      // deslizar para o valor novo; sem posicoes fica a fita da Mesa como antes
      var POS = lista(obj(obj(T3B.estado.T).reactor).posicoes);
      if (POS.length) {
        LIV.pv = LIV.pv || {};
        POS = POS.slice().sort(function (a, b) { return Math.abs(Number(b.pnl_aberto_usd) || 0) - Math.abs(Number(a.pnl_aberto_usd) || 0); });
        rot(ctx, 'AS NOSSAS POSIÇÕES · ' + POS.length, L0 + 8, TOPO + 6, C.dim, 8, 'left', 600);
        ctx.save(); ctx.beginPath(); ctx.rect(L0 + 4, TOPO + 9, w - L0 - 4, h - TOPO - 9); ctx.clip();
        var cP = Math.max(8, Math.floor((w - L0 - 12) / 4.8)), rhP = h - TOPO - 20 > POS.length * 22 ? 22 : 12;
        POS.forEach(function (ps, k) {
          var y = TOPO + 19 + k * rhP; if (y > h - 2) return;
          var sym = String(ps.simbolo || '?'), alvo = Number(ps.pnl_aberto_usd) || 0, v = LIV.pv[sym] = seguir(LIV.pv[sym] == null ? alvo : LIV.pv[sym], alvo, 3, dt);
          var cor = v >= 0 ? C.ok : C.mau, pct = Number(ps.pnl_aberto_pct);
          var linha = sym.replace(/USDT$/, '') + ' ' + sinal(v, 2) + ' US$' + (isFinite(pct) ? ' (' + sinal(pct, 1) + '%)' : '');
          rot(ctx, TX.cortar(linha, cP), L0 + 8, y, cor, 8.5, 'left', 700);
          if (rhP > 12) rot(ctx, TX.cortar(TX.limpar(ps.nome || '') + (ps.cripto ? ' · cripto' : ''), cP + 4), L0 + 8, y + 10, C.mute, 7, 'left', 500);
        });
        ctx.restore();
        return;
      }
      // a fita: cada entrada nova entra por cima a deslizar (0,35 s) e as outras descem
      if (LIV.fita[0] !== LIV._topo) { LIV._topo = LIV.fita[0]; LIV.tFita = agora; }
      var sl = calmo ? 0 : 1 - ease(clamp((agora - (LIV.tFita || 0)) / 350, 0, 1));
      rot(ctx, 'FITA', L0 + 8, TOPO + 6, C.dim, 8, 'left', 600);
      if (!LIV.fita.length) rot(ctx, 'à espera da Mesa…', L0 + 8, TOPO + 18, C.dim, 8, 'left', 500);
      ctx.save(); ctx.beginPath(); ctx.rect(L0 + 4, TOPO + 9, w - L0 - 4, h - TOPO - 9); ctx.clip();
      var larg = Math.max(8, Math.floor((w - L0 - 10) / 5.4));
      LIV.fita.forEach(function (f, k) {
        var y = TOPO + 18 + (k - sl) * 11; if (y > h - 2) return;
        ctx.globalAlpha = Math.max(0.25, 1 - k * 0.09) * (k === 0 ? 1 - sl : 1);
        if (!f._txt) f._txt = TX.cortar(f.t + (isFinite(f.p) && f.p ? ' ' + px(f.p) : ''), larg);
        rot(ctx, f._txt, L0 + 8, y, f.c, 8, 'left', 500);
      });
      ctx.globalAlpha = 1; ctx.restore();
    } });
  })();
  setInterval(function () { mini('hm_livro', [['', LIV.sym || simboloDaMesa()], ['meio', LIV.mid ? fmt(LIV.mid, LIV.mid >= 1000 ? 1 : 3) : 'a ligar'], ['fita', String(LIV.fita.length)]]); }, 2000);

  // ================================================================ 10. EQUALIZADOR DOS ANDARES (G28, D.equal) — na Mesa de Operacoes
  // Uma barra por andar: a altura de base e quem esta A TRABALHAR AGORA nesse andar (o censo da obra 2: turnos por andar /
  // registados); cada evento de um andar faz saltar a barra DESSE andar (e so essa - a reaccao); o pico fica marcado e
  // desce devagar.
  var EQ = { ns: [], base: {}, salto: {}, pico: {}, t: 0, ultimoAndar: null, agora: 0 };
  T3B.on('estrutura', function (d) {
    var ands = lista(d.andares).filter(function (a) { return a.obra !== 'em_obras'; }).sort(function (x, y) { return x.n - y.n; });
    EQ.ns = ands.map(function (a) { return a.n; }); EQ.agora = 0;
    ands.forEach(function (a) { var t = a.turnos || a.censo || {}, reg = Number(t.registados) || Number(a.n_peoes) || 0, ag = Number(t.a_trabalhar_agora) || 0; EQ.base[a.n] = reg ? clamp(ag / reg, 0, 1) : 0; EQ.agora += ag; });
    sujar(cenaEq, 0);
  });
  aoReagir('equalizador', function (ev, r) {
    var n = r.andar; if (n == null) return;
    EQ.salto[n] = Math.min(1, (EQ.salto[n] || 0) + 0.35 * (r.forca || 0.5)); EQ.ultimoAndar = n;
    sujar(cenaEq, 2500);
  });
  EXTRA.equalizador = function () { var o = {}; Object.keys(EQ.salto).forEach(function (n) { if (EQ.salto[n] > 0.01) o[n] = Math.round(EQ.salto[n] * 100) / 100; }); return { saltos: o, ultimo: EQ.ultimoAndar }; };
  var cenaEq = null;
  (function () {
    var cv = canvasDe('h_equalizador'); if (!cv) return;
    registar('equalizador', $('h_equalizador'));
    // 05/10 (Q4 B4, ele: "vivo e suave"; a09 "ta se travando, ta bugado"): o salto decaia por quadro (a 12 q/s, aos degraus) e a
    // barra ia direita ao valor novo. Agora cada barra SEGUE o seu alvo com suavidade, respira um pouco mesmo quieta (cada andar
    // ao seu ritmo, mais com actividade), salta com os eventos do seu andar e cai devagar; o pico fica 0,6 s e desce.
    // Uma so gradacao para as 56 barras (antes: 56 gradacoes novas por quadro); os rotulos sao uma camada guardada.
    var V = {}, FASE = {}, PK = {};
    cenaEq = cena(cv, { id: 'equalizador', holo: $('h_equalizador'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      var N = EQ.ns.length; if (!N) { rot(ctx, 'a ler os andares…', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      // 07/10 (Q5 B5, ele: "as legendas embaixo pode tirar que buga"): sem a linha de baixo, as barras ganham a altura
      var x0 = 6, bw = (w - 12) / N, base = h - 4, alt = base - TOPO - 14, act = (ACT.equalizador || {}).base || 0, larg = Math.max(1, bw - 1.2);
      if (!s.gEq || s.gEqH !== h) { var gq = ctx.createLinearGradient(0, base, 0, base - alt); gq.addColorStop(0, 'rgba(45,212,232,.2)'); gq.addColorStop(0.55, 'rgba(45,212,232,.78)'); gq.addColorStop(1, '#8af3ff'); s.gEq = gq; s.gEqH = h; }
      var quentes = [], picos = [], acimaSec = [];
      if (s.corEqChave !== EQ.ns.join(',')) { COR_EQ = {}; s.corEqChave = EQ.ns.join(','); }
      ctx.fillStyle = s.gEq;
      for (var i = 0; i < N; i++) {
        var n = EQ.ns[i], sl = (EQ.salto[n] || 0) * Math.exp(-dt * 0.9); EQ.salto[n] = sl < 0.004 ? 0 : sl;
        if (!FASE[n]) { var sm = U.semente('eq' + n); FASE[n] = [(sm % 628) / 100, 0.7 + ((sm >> 4) % 100) / 90, 1.6 + ((sm >> 9) % 100) / 70]; }
        var f = FASE[n], resp = calmo ? 0 : (0.022 + 0.05 * act) * (0.6 * Math.sin(t * f[1] + f[0]) + 0.4 * Math.sin(t * f[2] + f[0] * 1.7));
        var alvo = clamp((EQ.base[n] || 0) * 0.7 + sl * 0.8 + 0.035 + resp, 0.015, 1);
        var v = V[n] = seguir(V[n] == null ? alvo : V[n], alvo, 7, dt), hh = Math.max(1, v * alt), x = x0 + i * bw;
        ctx.fillStyle = COR_EQ[n] || (COR_EQ[n] = (U.corDoAndar ? U.corDoAndar(n) : '#2dd4e8')); ctx.globalAlpha = 0.86;   // 07/10 (Q5 B5, eq_sector)
        ctx.fillRect(x, base - hh, larg, hh); ctx.globalAlpha = 1;
        var pk = PK[n] || (PK[n] = { v: 0, t: 0 }); if (v >= pk.v) { pk.v = v; pk.t = t; } else if (t - pk.t > 0.6) pk.v = Math.max(v, pk.v - dt * 0.16);
        picos.push(x, base - pk.v * alt - 1.5);
        if (sl > 0.1) { quentes.push(x, base - hh, sl); acimaSec.push({ n: n, x: x + larg / 2, y: base - hh, sl: sl }); }
      }
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      for (var p = 0; p < picos.length; p += 2) ctx.fillRect(picos[p], picos[p + 1], larg, 1.3);
      // 05/10 (ele: "tem que mostrar mais informacoes relevantes"): os 3 andares mais activos agora, pelo nome
      var top3 = EQ.ns.slice().sort(function (a, b) { return ((EQ.salto[b] || 0) * 2 + (EQ.base[b] || 0)) - ((EQ.salto[a] || 0) * 2 + (EQ.base[a] || 0)); }).slice(0, 3);
      var col3 = (w - 12) / 3, max3 = Math.max(6, Math.floor((col3 - 6) / 4.6));
      top3.forEach(function (n, i) { var an = T3B.andar ? T3B.andar(n) : null; rot(ctx, TX.cortar((i ? '' : '▲ ') + n + (an && an.nome ? ' ' + TX.limpar(an.nome) : ''), max3), 6 + i * col3, TOPO + 9, i ? C.mute : C.ouroHi, 7.5, 'left', i ? 500 : 700); });   // (cada um na sua coluna)
      // 07/10 (Q5 B5, eq_sector: "a legenda pode aparecer conforme a reacao de cada setor acima do limite das barras"): o nome do
      // SECTOR por cima da barra que acabou de reagir - as 3 mais fortes, arrumadas para nao se taparem
      acimaSec.sort(function (a, b) { return b.sl - a.sl; });
      arrumarEtiquetas(ctx, 'equal_sec', acimaSec.slice(0, 3).map(function (e) {
        var an = T3B.andar ? T3B.andar(e.n) : null, nm = an ? TX.limpar(an.sector || an.nome || ('and. ' + e.n)) : 'and. ' + e.n;
        return { t: TX.cortar(nm, 18), x: e.x, y: Math.max(TOPO + 20, e.y - 4), dy: -9, cor: C.ouroHi, tam: 7.5 };
      }), w, h);
      for (var q = 0; q < quentes.length; q += 3) {                    // o andar que acabou de agir: a ponta a ouro e o brilho
        var qa = Math.min(1, quentes[q + 2] * 1.5);
        ctx.fillStyle = 'rgba(242,194,48,' + qa.toFixed(2) + ')'; ctx.fillRect(quentes[q], quentes[q + 1], larg, Math.min(10, base - quentes[q + 1]));
        luz(ctx, C.ouro, quentes[q] + larg / 2, quentes[q + 1], 9, qa * 0.8);
      }
    } });
  })();
  setInterval(function () { mini('hm_equalizador', [['', fmt(EQ.agora, 0), 'a trabalhar'], ['mais vivo', EQ.ultimoAndar != null ? 'and. ' + EQ.ultimoAndar : 'nenhum']]); }, 2000);

  // ================================================================ 11. RISCO (G8, D.aneis): tres aneis de progresso
  var RIS = { v: [null, null, null], d: [0, 0, 0], rot: ['trava', 'dia', 'capital'], pz: [0, 0, 0] };
  function lerRisco() {
    var S = obj(window.__md && window.__md.S), tr = obj(S.trava), n = function (x) { x = Number(x); return isFinite(x) ? x : null; };
    var trava = Math.max(n(tr.cripto_uso_pct) || 0, n(tr.acoes_uso_pct) || 0);
    var dA = (S.real == null || S.herd == null) ? null : S.real - S.herd, stop = (S.limite != null && S.limite < 0 && dA != null) ? Math.max(0, -dA) / -S.limite * 100 : null;
    var al = obj(S.aloc), cap = Number(S.capital || 0), uso = cap ? (Number(al.em_uso_cripto || 0) + Number(al.em_uso_acoes || 0)) / cap * 100 : null;
    return [trava, stop, uso];
  }
  var risPrimeira = true;
  function actualizarRisco(creditar) {
    var v = lerRisco(), mudou = false;
    for (var i = 0; i < 3; i++) if (v[i] != null && (RIS.v[i] == null || Math.abs(v[i] - RIS.v[i]) >= 0.5)) mudou = true;
    var p = function (x) { return x == null ? 'sem dado' : fmt(x, 0) + '%'; };
    mini('hm_risco', [['trava', p(v[0])], ['dia', p(v[1])], ['capital', p(v[2]), '', v[2] >= 85 ? 'dn' : '']]);
    if (!mudou) return;
    RIS.v = v; sujar(cenaRis, 1800);
    if (!risPrimeira && creditar) creditarHolo('risco', 'risco', 'risco ' + v.map(p).join(' · '));
    risPrimeira = false;
  }
  T3B.on('torre', function () { setTimeout(function () { actualizarRisco(true); }, 300); });
  setInterval(function () { actualizarRisco(false); }, 2000);
  aoReagir('risco', function () { RIS.pz = [1, 1, 1]; sujar(cenaRis, 1300); });
  var cenaRis = null;
  (function () {
    var cv = canvasDe('h_risco'); if (!cv) return;
    registar('risco', $('h_risco'));
    cenaRis = cena(cv, { id: 'risco', holo: $('h_risco'), fps: 15, vivo: function () { for (var i = 0; i < 3; i++) if (RIS.v[i] != null && Math.abs(RIS.v[i] - RIS.d[i]) > 0.3) return true; return false; }, desenhar: function (ctx, w, h, t, dt) {
      ctx.clearRect(0, 0, w, h);
      var ah = h - TOPO - 12, R = Math.min((w - 30) / 6.6, ah / 2.5), y = TOPO + ah / 2 + 2, etq = [], pz = pulsoDe('risco'), base = (ACT.risco || {}).base || 0;
      for (var i = 0; i < 3; i++) {
        var alvo = RIS.v[i] == null ? 0 : RIS.v[i]; RIS.d[i] += (alvo - RIS.d[i]) * (calmo ? 1 : 0.25);
        var v = RIS.d[i], x = 14 + R + i * (R * 2 + 10) + ((w - 28 - (R * 6 + 20)) / 2), c = RIS.v[i] == null ? C.dim : v >= 85 ? C.mau : v >= 60 ? C.am : C.ok;
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
        if (base > 0.05) { ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(242,194,48,' + (0.05 + 0.1 * base).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); }
        ctx.lineWidth = 5 + pz * 2.5; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(v / 100, 0, 1)); ctx.stroke();
        if (pz > 0.02) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,220,106,' + pz.toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, R + 4 + (1 - pz) * 8, 0, TAU); ctx.stroke(); }
        rot(ctx, RIS.v[i] == null ? 'sem dado' : Math.round(v) + '%', x, y + 4, c, RIS.v[i] == null ? 8 : Math.max(11, Math.min(15, R * 0.42)), 'center');
        etq.push({ t: RIS.rot[i], x: x, y: y + R + 12, cor: C.mute, tam: 8 });
      }
      ctx.lineWidth = 1;
      arrumarEtiquetas(ctx, 'risco', etq, w, h);
    } });
  })();

  var COR_EQ = {};   // 07/10 (Q5 B5): a cor da divisao de cada andar no equalizador (U.corDoAndar)
  // ================================================================ 12. RELOGIO DOS TURNOS (G27, D.turnos) — no Risco
  // O anel de 24 h com os 3 turnos (A 00-08, B 08-16, C 16-24; o da hora acende), o ponteiro na hora REAL de Brasilia (anda
  // uma vez por minuto - e um relogio) e um PONTO POR ANDAR: brilhante = gente a trabalhar no turno desse andar, violeta = a
  // evoluir no descanso, apagado = parado. Cada evento do Pessoal/Recrutamento e do Risco faz piscar os pontos; cada evento de
  // um andar com ponto faz piscar esse ponto. Os numeros: os da barra da obra 2 (enxame.json -> pessoal.turnos.barra).
  var TUR = { ands: [], barra: {}, flash: {}, todos: 0, carga: null };
  T3B.on('estrutura', function (d) {
    TUR.ands = lista(d.andares).filter(function (a) { var t = a.turnos || a.censo; return t && (t.registados || 0) > 0; }).map(function (a) { var t = a.turnos || a.censo; return { n: a.n, em: t.em_turno || 0, trab: t.a_trabalhar_no_turno || 0, evol: t.em_descanso_a_evoluir || 0, reg: t.registados || 0 }; });
    sujar(cenaTur, 0);
  });
  T3B.on('enxame', function (e) { var tb = obj(obj(e.pessoal).turnos); lista(tb.barra).forEach(function (x) { TUR.barra[x.id] = x.valor; }); TUR.carga = tb.carga_horaria_pct; sujar(cenaTur, 0); });
  T3B.on('eventos', function (evs) { evs.forEach(function (e) { if (e.andar != null && TUR.ands.length && e.k !== 'numero') { TUR.flash[e.andar] = agoraMs(); TUR.ult = e; } }); });
  aoReagir('turnos', function () { TUR.todos = agoraMs(); sujar(cenaTur, 1300); });
  EXTRA.turnos = function () { return { pulso_todos_ha_ms: TUR.todos ? Math.round(agoraMs() - TUR.todos) : null, andares: TUR.ands.length }; };
  var cenaTur = null;
  (function () {
    var cv = canvasDe('h_turnos'); if (!cv) return;
    registar('turnos', $('h_turnos'));
    // 05/10 (Q4 B2, ele: "vivo e suave"; a07 "ta parado, quero ele animado"): o relogio redesenhava uma vez por minuto. Agora o
    // ponteiro das horas anda continuo, um ponto da a volta ao aro a cada minuto, o arco do turno actual respira e mostra quanto
    // do turno ja passou, e os andares giram devagar a volta (quem trabalha no turno acende na cor do turno, quem evolui no
    // descanso respira a violeta, o resto fica baixo; cada evento de um andar pisca o seu ponto). O aro, os tracos e os numeros
    // sao uma camada guardada.
    var CORES = [C.az, C.ouro, C.vi], NOMES = ['A 00-08', 'B 08-16', 'C 16-24'];
    cenaTur = cena(cv, { id: 'turnos', holo: $('h_turnos'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      var agora = agoraMs(), d = new Date(Date.now() - 3 * 3600000), seg = d.getUTCSeconds() + d.getUTCMilliseconds() / 1000;
      var hr = d.getUTCHours() + d.getUTCMinutes() / 60 + seg / 3600, tur = Math.floor(hr / 8) % 3;
      var cx = Math.min(w * 0.33, (h - TOPO) * 0.62 + 6), cy = TOPO + (h - TOPO) / 2 + 2, R = Math.min(w * 0.28, (h - TOPO) * 0.44), pt = clamp(1 - (agora - TUR.todos) / 1200, 0, 1);
      var v = function (x) { return x == null ? 'a ler' : fmt(x, 0); };
      var itens = [['TURNO', NOMES[tur], CORES[tur]], ['EM TURNO', v(TUR.barra.em_turno), C.txt], ['A TRABALHAR', v(TUR.barra.a_trabalhar_agora), C.ok], ['A EVOLUIR', v(TUR.barra.a_evoluir), C.vi], ['FALTARAM', v(TUR.barra.faltaram), (TUR.barra.faltaram || 0) > 0 ? C.am : C.ok], ['CARGA', TUR.carga == null ? 'a ler' : fmt(TUR.carga, 0) + '%', C.mute]];
      porCamada(ctx, s, 'fundo', itens.map(function (x) { return x[1]; }).join('|'), function (g) {
        for (var i = 0; i < 3; i++) { g.strokeStyle = CORES[i]; g.globalAlpha = 0.2; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2 + i * TAU / 3 + 0.04, -Math.PI / 2 + (i + 1) * TAU / 3 - 0.04); g.stroke(); }
        g.globalAlpha = 1; g.lineWidth = 1;
        for (var k = 0; k < 24; k++) { var q = -Math.PI / 2 + k / 24 * TAU, l = k % 6 === 0 ? 7 : 4; g.strokeStyle = k % 6 === 0 ? 'rgba(239,237,232,.5)' : 'rgba(106,106,118,.7)'; g.beginPath(); g.moveTo(cx + Math.cos(q) * (R - 6), cy + Math.sin(q) * (R - 6)); g.lineTo(cx + Math.cos(q) * (R - 6 - l), cy + Math.sin(q) * (R - 6 - l)); g.stroke(); }
        // 07/10 (Q5 B4, ele: "adicionar marcadores dos outros horarios 19, 20, 21, 22 onde tem os tracinhos"): as horas no aro
        g.font = '600 ' + (R >= 40 ? 6.5 : 6) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (var k3 = 0; k3 < 24; k3++) {
          if (R < 34 && k3 % 3) continue;                   // aro pequeno: so de 3 em 3 horas
          var q3 = -Math.PI / 2 + k3 / 24 * TAU, rr = R - 17;
          g.fillStyle = k3 % 6 === 0 ? 'rgba(239,237,232,.9)' : 'rgba(150,150,162,.78)';
          g.fillText(String(k3), cx + Math.cos(q3) * rr, cy + Math.sin(q3) * rr);
        }
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        grelhaDeNumeros(g, cx + R + 12, w - 4, h, itens);
      });
      // o turno actual: o arco respira; por dentro, o que ja passou do turno (fino, branco)
      var a0 = -Math.PI / 2 + tur * TAU / 3 + 0.04, a1 = -Math.PI / 2 + (tur + 1) * TAU / 3 - 0.04, resp = 0.5 + 0.5 * Math.sin(t * 1.6), qh = -Math.PI / 2 + hr / 24 * TAU;
      ctx.lineCap = 'round'; ctx.strokeStyle = CORES[tur]; ctx.globalAlpha = 0.72 + 0.28 * resp; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
      ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R + 6, a0, Math.max(a0 + 0.001, qh)); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
      // o ponto dos segundos: uma volta ao aro por minuto
      var qs = -Math.PI / 2 + seg / 60 * TAU, sx = cx + Math.cos(qs) * (R + 6), sy = cy + Math.sin(qs) * (R + 6);
      luz(ctx, CORES[tur], sx, sy, 7, 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 1.7, 0, TAU); ctx.fill();
      // os andares: giram devagar a volta do centro
      var n = TUR.ands.length, r2 = R * 0.62, gi = calmo ? 0 : t * 0.05;
      for (var k2 = 0; k2 < n; k2++) {
        var a = TUR.ands[k2], an = -Math.PI / 2 + k2 / Math.max(1, n) * TAU + gi, fr = 0.78 + 0.22 * ((k2 * 7) % 5) / 4, x = cx + Math.cos(an) * r2 * fr, y = cy + Math.sin(an) * r2 * fr;
        // 07/10 (Q5 B4, "os pontos mais reagentes a torre e ao horario"): o tamanho segue quem trabalha, o piscar dura mais e
        // e mais forte, e quem esta no turno da hora respira com o ponteiro dos segundos
        var fl = clamp(1 - (agora - (TUR.flash[a.n] || 0)) / 1800, 0, 1), trab = a.em ? a.trab / a.em : 0, cor = trab > 0.25 ? CORES[tur] : a.evol > 0 ? C.vi : C.dim;
        var resp2 = 0.5 + 0.5 * Math.sin(t * 2.4 + k2 * 0.9 + seg / 60 * TAU);
        var al = trab > 0.25 ? 0.7 + 0.3 * resp2 : a.evol > 0 ? 0.5 + 0.3 * Math.sin(t * 2 + k2) : 0.3 + 0.12 * Math.sin(t * 1.4 + k2 * 0.7);
        ctx.globalAlpha = Math.min(1, al + fl * 0.6 + pt * 0.35); ctx.fillStyle = fl > 0.05 ? '#fff' : cor;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + 1.6 * clamp(trab, 0, 1) + fl * 2.6 + (trab > 0.25 ? 0.5 * resp2 : 0), 0, TAU); ctx.fill();
        if (fl > 0.05 || trab > 0.6) luz(ctx, cor, x, y, 7 + fl * 5, Math.max(fl, trab > 0.6 ? 0.35 * resp2 : 0));
      }
      ctx.globalAlpha = 1;
      // o ponteiro das horas (continuo) e a hora ao centro
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(qh) * (R - 4), cy + Math.sin(qh) * (R - 4)); ctx.stroke(); ctx.lineWidth = 1;
      var hAt = Math.floor(hr) % 24, qa = -Math.PI / 2 + hAt / 24 * TAU, xa = cx + Math.cos(qa) * (R - 17), ya = cy + Math.sin(qa) * (R - 17);
      luz(ctx, CORES[tur], xa, ya, 8, 0.55 + 0.25 * resp); rot(ctx, String(hAt), xa - 3.5, ya + 2.5, '#ffffff', 7.5, 'left', 800);   // a hora de agora acesa
      luz(ctx, '#ffffff', cx + Math.cos(qh) * (R - 4), cy + Math.sin(qh) * (R - 4), 5, 0.7);
      ctx.fillStyle = 'rgba(7,7,10,.82)'; ctx.beginPath(); ctx.arc(cx, cy + 3, Math.min(R * 0.42, 19), 0, TAU); ctx.fill();
      rot(ctx, String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'), cx, cy + 3, '#fff', 11, 'center', 700);
      rot(ctx, String(Math.floor(seg)).padStart(2, '0'), cx, cy + 13, C.mute, 7.5, 'center', 600);
      if (TUR.ult) rot(ctx, 'agora: ' + TX.cortar(TX.limpar(TUR.ult.quem || TX.nomeDeId(TUR.ult.id)), 20) + ' · and. ' + TUR.ult.andar, 4, h - 3, C.mute, 7.5, 'left', 500);
    } });
  })();
  setInterval(function () { mini('hm_turnos', [['em turno', fmt(TUR.barra.em_turno, 0)], ['a trab.', fmt(TUR.barra.a_trabalhar_agora, 0)], ['evoluir', fmt(TUR.barra.a_evoluir, 0)]]); }, 2000);

  // ================================================================ 13. LABORATORIO (G3, D.estrelas): cada estrela e um GENE de um lab
  // A regra (04/10 11:4x): "cada estrela/ponto = um gene DESSE lab; acende quando o gene calcula (previa da sombra de 15 em
  // 15 min, sombra diaria, revisao, evolucao), fica dourado quando e robusto e apaga a cinza quando e demitido". As estrelas
  // agrupam-se pelos labs (constelacoes: Macro, Celulas, Cripto, Volume/Preco, Reversao, Tendencia, Carteira da Mesa); a
  // amostra vem do /labs.json (os robustos primeiro) e os eventos "genes" (mercado/torre_vivo.py, por lab e por minuto) acendem
  // a estrela desse gene - se o gene nao estiver na amostra, a estrela mais antiga desse lab passa a ser ele. As
  // constelacoes so giram com actividade dos labs (a base dos ultimos 3 min); sem calculos, ficam quietas.
  // (as constelacoes sao pela ESPECIALIDADE do lab; os numeros dos andares vem do /estrutura.json e do /labs.json - mudam)
  var GRUPOS = [{ id: 'macro', nome: 'Macro', esps: ['macro'] }, { id: 'cel', nome: 'Células', esps: ['celulas'] }, { id: 'cri', nome: 'Cripto', esps: ['cripto'] },
    { id: 'vol', nome: 'Volume·Preço', esps: ['volume_fluxo', 'preco_accao'] }, { id: 'rev', nome: 'Reversão', esps: ['reversao_media'] }, { id: 'ten', nome: 'Tendência', esps: ['tendencia'] }, { id: 'mesa', nome: 'Mesa', esps: ['mesa'] }];
  var GRUPO_DA_ESP = {}; GRUPOS.forEach(function (g, i) { g.esps.forEach(function (e) { GRUPO_DA_ESP[e] = i; }); });
  var GRUPO_DO_ANDAR = {};
  T3B.on('estrutura', function (d) { GRUPO_DO_ANDAR = {}; lista(d.andares).forEach(function (a) { if (GRUPO_DA_ESP[a.esp] != null) GRUPO_DO_ANDAR[a.n] = GRUPO_DA_ESP[a.esp]; }); });
  var LAB = { est: [], porChave: {}, tot: {}, rob: {}, dem: {}, ger: null, nEv: 0, ultimo: null, carregado: false, ver: 0, nuvem: {}, bolhas: [] };
  function estrelaNova(gi, gene, i) {
    var sem = U.semente(gene.k + i);
    return { g: gi, k: gene.k, r: !!gene.r, d: !!gene.d, andar: gene.andar, ang: (sem % 6283) / 1000, raio: Math.sqrt(((sem >> 4) % 1000) / 1000), v: 0.12 + ((sem >> 9) % 300) / 1000, luz: 0, t: 0 };
  }
  function carregarLabs() {
    fetch('labs.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.labs) return;
      var porGrupo = GRUPOS.map(function () { return []; });
      LAB.tot = {}; LAB.rob = {}; LAB.dem = {};
      d.labs.forEach(function (l) { if (l.esp && GRUPO_DA_ESP[l.esp] != null) GRUPO_DO_ANDAR[l.n] = GRUPO_DA_ESP[l.esp]; var gi = GRUPO_DO_ANDAR[l.n]; if (gi == null) return; LAB.tot[gi] = (LAB.tot[gi] || 0) + l.total; LAB.rob[gi] = (LAB.rob[gi] || 0) + l.robustos; LAB.dem[gi] = (LAB.dem[gi] || 0) + l.demitidos; (l.amostra || []).forEach(function (s) { porGrupo[gi].push({ k: s.k, r: s.r, d: s.d, andar: l.n }); }); });
      // ate ~110 estrelas: cada constelacao com a sua parte (pelo numero de genes), no minimo 6
      var total = 0; GRUPOS.forEach(function (g, i) { total += LAB.tot[i] || 0; });
      var antigas = {}; LAB.est.forEach(function (s) { antigas[s.k] = s; });
      LAB.est = []; LAB.porChave = {};
      GRUPOS.forEach(function (g, gi) {
        var quota = Math.max(10, Math.round(170 * (LAB.tot[gi] || 0) / Math.max(1, total)));   // 05/10: 110 -> 170 (as nuvens precisam de corpo)
        porGrupo[gi].slice(0, quota).forEach(function (gene, i) { var s = antigas[gene.k] || estrelaNova(gi, gene, i); s.r = !!gene.r; s.d = !!gene.d; s.g = gi; LAB.est.push(s); LAB.porChave[s.k] = s; });
      });
      LAB.carregado = true; LAB.ver++; sujar(cenaLab, 0); pintarLegendaLab();
    }).catch(function () { });
  }
  setTimeout(carregarLabs, 1500); setInterval(function () { if (!document.hidden && !($('h_lab') || {}).classList.contains('min')) carregarLabs(); }, 60000);
  aoReagir('lab', function (ev, r) {
    var agora = agoraMs(); LAB.nEv++; LAB.ultimo = ev;
    if (ev.k === 'genes') {
      var gi = GRUPO_DO_ANDAR[ev.andar]; if (gi == null) return;
      var rob = {}; (ev.robustas || []).forEach(function (k) { rob[k] = 1; });
      (ev.chaves || []).slice(0, 16).forEach(function (k) {
        var s = LAB.porChave[k];
        if (!s) {   // o gene nao esta na amostra: a estrela mais antiga deste lab passa a ser ele
          var cand = LAB.est.filter(function (x) { return x.g === gi; }).sort(function (a, b) { return a.t - b.t; })[0];
          if (!cand) return; delete LAB.porChave[cand.k]; cand.k = k; cand.r = !!rob[k]; cand.d = false; cand.andar = ev.andar; LAB.porChave[k] = cand; s = cand;
        }
        if (rob[k]) s.r = true;
        s.luz = 1; s.t = agora; LAB.nuvem[gi] = 1;
        if (LAB.bolhas.length < 140) LAB.bolhas.push({ st: s, t0: agora, rob: s.r });   // 05/10: o gene que calcula solta uma bolha
      });
    } else {
      // um funcionario de um lab escreveu (o organismo, a sombra, a revisao): a constelacao desse andar brilha
      var g2 = GRUPO_DO_ANDAR[r.andar]; LAB.est.forEach(function (s) { if (g2 == null || s.g === g2) s.luz = Math.max(s.luz, 0.35); }); if (g2 != null) LAB.nuvem[g2] = Math.max(LAB.nuvem[g2] || 0, 0.6);
    }
    sujar(cenaLab, 2200); pintarLegendaLab();
  });
  EXTRA.lab = function () { var acesas = LAB.est.filter(function (s) { return s.luz > 0.05; }).length; return { estrelas: LAB.est.length, acesas: acesas, robustas: LAB.est.filter(function (s) { return s.r && !s.d; }).length, demitidas: LAB.est.filter(function (s) { return s.d; }).length, eventos: LAB.nEv }; };
  T3B.on('torre', function (T) { var ex = obj(T.extremis); if (ex.geracao_actual !== LAB.ger) { if (LAB.ger != null) creditarHolo('lab', 'lab', 'geração ' + ex.geracao_actual); LAB.ger = ex.geracao_actual; } U.txt($('h_lab_e'), 'geração ' + (ex.geracao_actual || '?') + ' · ' + fmt(ex.n_familias, 0) + ' famílias'); });
  function pintarLegendaLab() {
    var rob = 0, tot = 0; Object.keys(LAB.tot).forEach(function (g) { tot += LAB.tot[g] || 0; rob += LAB.rob[g] || 0; });
    mini('hm_lab', [['genes', fmt(tot, 0)], ['robustos', fmt(rob, 0)], ['acesos', String(LAB.est.filter(function (s) { return s.luz > 0.05; }).length)]]);
  }
  var cenaLab = null;
  (function () {
    var cv = canvasDe('h_lab'); if (!cv) return;
    registar('lab', $('h_lab'));
    // 05/10 (Q4 B5, ele escolheu as NUVENS DOURADAS POR LAB e escreveu: "tem que ser vivo e fluido, tem que se mexer
    // naturalmente e nao parecendo fotograma, tem que mexer as bolinhas igual ao que ta no tubo de ensaio"; a12 "nao ta
    // funcionando, nem sei o que e aquilo"): cada lab e uma NUVEM de pontos ligados (cada ponto = um gene real da amostra do
    // /labs.json; dourado forte = robusto, cinza = demitido). Os pontos flutuam sempre devagar; quando um gene CALCULA sai dele
    // uma BOLHA que sobe a ondular e se desfaz (como no tubo de ensaio; dourada e maior se o gene e robusto) e a nuvem acende;
    // com actividade do lab as bolhas sobem tambem sozinhas (mais actividade, mais bolhas). Os nomes e os numeros de cada lab
    // sao uma camada guardada.
    var LIG = { ver: -1, w: 0, h: 0, pares: [] }, AMB = {};
    function centros(w, h) {
      var ng = GRUPOS.length, cols = 4, cw = w / cols, ch = (h - TOPO - 14) / 2;
      return GRUPOS.map(function (g, i) { var c = i % cols, l = Math.floor(i / cols); return { x: cw * (c + 0.5) + (l ? cw / 2 : 0) * (ng - cols < cols ? 1 : 0), y: TOPO + 6 + ch * (l + 0.5), R: Math.min(cw, ch) * 0.44 }; });
    }
    function casa(st, c) { return [c.x + Math.cos(st.ang) * st.raio * c.R, c.y + Math.sin(st.ang) * st.raio * c.R * 0.7]; }
    // as ligacoes de cada nuvem: cada gene ao seu vizinho mais perto (e ao segundo, se estiver perto) - feitas uma vez
    function ligar(w, h) {
      var CS = centros(w, h), pares = [];
      GRUPOS.forEach(function (g, gi) {
        var es = LAB.est.filter(function (st) { return st.g === gi; }), P = es.map(function (st) { return casa(st, CS[gi]); });
        es.forEach(function (st, i) {
          var d = es.map(function (o, j) { return [j, (P[i][0] - P[j][0]) * (P[i][0] - P[j][0]) + (P[i][1] - P[j][1]) * (P[i][1] - P[j][1])]; }).filter(function (x) { return x[0] !== i; }).sort(function (a, b) { return a[1] - b[1]; });
          if (d[0]) pares.push([gi, st, es[d[0][0]]]);
          if (d[1] && d[1][1] < CS[gi].R * CS[gi].R * 0.12) pares.push([gi, st, es[d[1][0]]]);
        });
      });
      LIG = { ver: LAB.ver, w: w, h: h, pares: pares, vivos: GRUPOS.map(function (g, gi) { return LAB.est.filter(function (st) { return st.g === gi && !st.d; }); }) };
    }
    cenaLab = cena(cv, { id: 'lab', holo: $('h_lab'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      if (!LAB.carregado) { rot(ctx, 'a ler os genes dos labs…', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      if (LIG.ver !== LAB.ver || LIG.w !== w || LIG.h !== h) ligar(w, h);
      var CS = centros(w, h), agora = agoraMs(), base = (ACT.lab || {}).base || 0;
      // a posicao de cada gene agora: a casa + a flutuacao (cada um ao seu ritmo)
      // 05/10 (ele: "a movimentacao ta estranha, nao ta compativel com o que e"): cada ponto tremia sozinho; agora cada NUVEM gira
      // inteira e devagar a volta do seu centro (mais depressa quando os genes dela calculam) e respira um pouco
      LAB.giro = LAB.giro || {};
      GRUPOS.forEach(function (g, gi) { LAB.giro[gi] = (LAB.giro[gi] || 0) + (calmo ? 0 : dt * (0.035 + 0.3 * Math.min(1, LAB.nuvem[gi] || 0))); });
      // 07/10 (Q5 B6, ele: "a animacao e fluidez como o card de exemplo 'os labs em orbita'"): as nuvens ficam, mas cada gene tem
      // a SUA orbita (os de dentro mais depressa, como planetas), e o que calcula ACELERA e acende; os robustos a ouro
      LAB.est.forEach(function (st) {
        var c = CS[st.g], gr = LAB.giro[st.g] || 0, resp = 1 + 0.03 * Math.sin(t * 0.7 + st.g);
        if (st.ow == null) st.ow = (0.1 + 0.38 * (1 - Math.min(1, st.raio))) * (U.semente(String(st.k)) % 2 ? 1 : 0.82);
        st.fase = (st.fase || 0) + (calmo ? 0 : dt * (st.ow * (0.45 + 0.55 * base) + 1.8 * st.luz));
        st.x = c.x + Math.cos(st.ang + gr + st.fase) * st.raio * c.R * resp; st.y = c.y + Math.sin(st.ang + gr + st.fase) * st.raio * c.R * 0.7 * resp;
        st.luz *= Math.pow(0.45, dt);
      });
      // as nuvens: o brilho de cada uma (acende com os calculos dos seus genes) e as ligacoes
      GRUPOS.forEach(function (g, gi) { LAB.nuvem[gi] = (LAB.nuvem[gi] || 0) * Math.pow(0.5, dt); });
      // 08/10 (OBRA 11, ele: o laboratorio "nao foi atendido" - o exemplo era "os labs em orbita"): sem as linhas da rede (com as
      // orbitas esticavam e apagavam - parecia bugado); cada lab e um NUCLEO dourado a brilhar com o ANEL da orbita e os seus genes a
      // girar a volta; o lab que calcula acende o anel e o nucleo
      ctx.lineWidth = 1;
      GRUPOS.forEach(function (g, gi) {
        var c = CS[gi], nv = Math.min(1, LAB.nuvem[gi] || 0);
        ctx.strokeStyle = 'rgba(242,194,48,' + (0.1 + 0.28 * nv).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R * 1.02, c.R * 0.72, 0, 0, TAU); ctx.stroke();
        if (nv > 0.05) luz(ctx, C.ouro, c.x, c.y, c.R * 0.9, 0.22 * nv);
        luz(ctx, '#ffdc6a', c.x, c.y, 7 + 5 * nv + Math.sin(t * 1.3 + gi), 0.55 + 0.4 * nv);
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(c.x, c.y, 2.4 + 1.2 * nv, 0, TAU); ctx.fill();
      });
      // os genes: primeiro os brilhos todos de uma vez (um so modo de mistura), depois os pontos
      var spR = sprite(C.ouro, 5), spL = sprite('#fff3c4', 9);
      ctx.globalCompositeOperation = 'lighter';
      LAB.est.forEach(function (st) {
        if (st.r && !st.d) { ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 1.7 + st.ang); ctx.drawImage(spR, st.x - 5, st.y - 5, 10, 10); }
        if (st.luz > 0.08) { var rl = 6 + st.luz * 5; ctx.globalAlpha = st.luz * 0.9; ctx.drawImage(spL, st.x - rl, st.y - rl, rl * 2, rl * 2); }
      });
      ctx.globalCompositeOperation = 'source-over';
      LAB.est.forEach(function (st) {
        var cor = st.d ? '#55555e' : st.r ? '#ffd65a' : 'rgba(242,194,48,.62)', tam = st.d ? 1.2 : st.r ? 1.9 : 1.35;
        ctx.fillStyle = st.luz > 0.08 ? '#fff7d6' : cor; ctx.globalAlpha = st.d ? 0.7 : 1;
        ctx.fillRect(st.x - tam - st.luz, st.y - tam - st.luz, (tam + st.luz) * 2, (tam + st.luz) * 2);
      });
      ctx.globalAlpha = 1;
      // as bolhas ambiente: com actividade do lab, sobem sozinhas dos seus genes (0,15/s parado ate ~3/s com muita actividade)
      if (!calmo) GRUPOS.forEach(function (g, gi) {
        var es = LIG.vivos[gi]; if (!es || !es.length) return;
        AMB[gi] = (AMB[gi] || 0) + dt * (0.15 + 2.8 * base * (0.4 + 0.6 * Math.min(1, LAB.nuvem[gi] || 0)));
        while (AMB[gi] >= 1 && LAB.bolhas.length < 140) { AMB[gi] -= 1; var st0 = es[Math.floor(Math.random() * es.length)]; LAB.bolhas.push({ st: st0, t0: agora, rob: st0.r, amb: true }); }
        if (AMB[gi] > 1) AMB[gi] = 1;
      });
      // as bolhas: sobem a ondular e desfazem-se (tubo de ensaio)
      for (var b = LAB.bolhas.length - 1; b >= 0; b--) {
        var bo = LAB.bolhas[b], idade = (agora - bo.t0) / 1000, vida = bo.amb ? 1.8 : 2.4;
        if (bo.x0 == null) { bo.x0 = bo.st.x; bo.y0 = bo.st.y; bo.ph = Math.random() * TAU; bo.vy = (bo.amb ? 14 : 22) + Math.random() * 12; }
        if (idade > vida) { LAB.bolhas.splice(b, 1); continue; }
        var by = bo.y0 - idade * bo.vy, bx = bo.x0 + Math.sin(idade * 4.2 + bo.ph) * 2.6 * Math.min(1, idade * 2), fade = (1 - idade / vida) * Math.min(1, idade * 6);
        if (by < TOPO + 2) { LAB.bolhas.splice(b, 1); continue; }
        var r = (bo.rob ? 2.6 : bo.amb ? 1.3 : 1.9) * (1 + idade * 0.35);
        ctx.globalAlpha = fade * 0.85; ctx.strokeStyle = bo.rob ? C.ouroHi : 'rgba(230,251,255,.9)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = fade * 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - r * 0.45, by - r * 0.55, Math.max(0.8, r * 0.4), Math.max(0.8, r * 0.4));
        ctx.globalAlpha = 1;
        if (bo.rob) luz(ctx, C.ouro, bx, by, 6 + r, fade * 0.6);
      }
      // os nomes e os numeros de cada lab (camada guardada)
      porCamada(ctx, s, 'nomes', GRUPOS.map(function (g, i) { return (LAB.rob[i] || 0) + '/' + (LAB.tot[i] || 0); }).join('|'), function (g) {
        // 08/10 (OBRA 11): o nome curto do lab e os robustos (o total fica no titulo e na barra minimizada) - os nomes compridos batiam uns nos outros
        var etq = GRUPOS.map(function (gg, i) { return { t: gg.nome.toLowerCase() + ' ' + fmt(LAB.rob[i] || 0, 0), x: CS[i].x, y: CS[i].y + CS[i].R * 0.72 + 10, cor: 'rgba(242,194,48,.9)', tam: 7.5 }; });
        arrumarEtiquetas(g, 'lab', etq, w, h);
      });
    } });
  })();

  // ================================================================ 14. AMPULHETA DA COTA (G31, D.ampulheta) — perto da torre, no atico
  // A areia de cima e o que RESTA da semana (100 - semana%), a de baixo o que se gastou; o fio corre a velocidade do gasto
  // (o ritmo real contra o que cabe ate ao reinicio: dados/enxame/modo_cota.json pelo /vivo.json) e a cor e o modo do
  // regulador (verde/amarelo/vermelho). Cada evento de quem gasta ou mede a cota faz cair um grao (a reaccao).
  var AMP = { semana: null, sessao: null, modo: null, real: 0, cabe: 0, horas: null, graos: [], t: 0 };
  T3B.on('torre', function (T) { var j = obj(T.jarvis); if (j.semana_pct != null) AMP.semana = Number(j.semana_pct); if (j.sessao_pct != null) AMP.sessao = Number(j.sessao_pct); sujar(cenaAmp, 0); });
  var assCota = '';
  setInterval(function () { var c = obj(T3B.estado.cota); var a = JSON.stringify(c); if (a === assCota) return; assCota = a; AMP.modo = c.modo || AMP.modo; if (c.semana != null) AMP.semana = Number(c.semana); AMP.real = Number(c.real_h) || 0; AMP.cabe = Number(c.cabe_h) || 0; AMP.horas = c.horas_ate_reset != null ? Number(c.horas_ate_reset) : AMP.horas; sujar(cenaAmp, 0); }, 1000);
  aoReagir('ampulheta', function () { if (AMP.graos.length < 12) AMP.graos.push({ t: 0, x: (Math.random() - 0.5) * 0 }); sujar(cenaAmp, 1600); });
  EXTRA.ampulheta = function () { return { graos: AMP.graos.length, semana: AMP.semana, modo: AMP.modo }; };
  var cenaAmp = null;
  (function () {
    var cv = canvasDe('h_ampulheta'); if (!cv) return;
    registar('ampulheta', $('h_ampulheta'));
    cenaAmp = cena(cv, { id: 'ampulheta', holo: $('h_ampulheta'), fps: 12, vivo: function () { return AMP.graos.length > 0 || (AMP.real > 0 && ((ACT.ampulheta || {}).base || 0) > 0.02); }, desenhar: function (ctx, w, h, t, dt) {
      ctx.clearRect(0, 0, w, h);
      var cor = AMP.modo === 'vermelho' ? C.mau : AMP.modo === 'amarelo' ? C.am : C.ok, livre = AMP.semana == null ? null : clamp((100 - AMP.semana) / 100, 0, 1);
      var cx = Math.min(w * 0.26, 50), top = TOPO + 4, bot = h - 6, mid = (top + bot) / 2, L = Math.min(w * 0.17, (bot - top) * 0.34);
      ctx.strokeStyle = 'rgba(207,231,238,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - L, top); ctx.lineTo(cx + L, top); ctx.lineTo(cx + 4, mid); ctx.lineTo(cx + L, bot); ctx.lineTo(cx - L, bot); ctx.lineTo(cx - 4, mid); ctx.closePath(); ctx.stroke();
      if (livre != null) {
        var ht = (mid - top - 3) * livre, yt = mid - 3 - ht, wt = function (y) { return 4 + (L - 4) * ((mid - y) / (mid - top)); };
        ctx.fillStyle = cor; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(cx - wt(yt), yt); ctx.lineTo(cx + wt(yt), yt); ctx.lineTo(cx + 4, mid - 2); ctx.lineTo(cx - 4, mid - 2); ctx.closePath(); ctx.fill();
        var hb = (bot - mid - 3) * (1 - livre) * 0.92, yb = bot - hb, wb = function (y) { return 4 + (L - 4) * ((y - mid) / (bot - mid)); };
        ctx.beginPath(); ctx.moveTo(cx - L + 2, bot - 1); ctx.lineTo(cx + L - 2, bot - 1); ctx.lineTo(cx + wb(yb), yb); ctx.lineTo(cx - wb(yb), yb); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        // o fio: corre a velocidade do ritmo (gasto real / o que cabe); parado se nao se gasta
        var forca = AMP.cabe > 0 ? AMP.real / AMP.cabe : 0; AMP.t += dt * clamp(forca, 0, 6) * 18;
        ctx.strokeStyle = cor; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -AMP.t; ctx.beginPath(); ctx.moveTo(cx, mid); ctx.lineTo(cx, yb); ctx.stroke(); ctx.setLineDash([]);
        for (var k = AMP.graos.length - 1; k >= 0; k--) { var g = AMP.graos[k]; g.t += dt / 1.2; if (g.t >= 1) { AMP.graos.splice(k, 1); continue; } ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, lerp(mid, yb, g.t), 1.8, 0, TAU); ctx.fill(); }
      } else rot(ctx, 'a ler a cota…', cx, mid, C.dim, 8, 'center', 500);
      grelhaDeNumeros(ctx, cx + L + 10, w - 4, h, [['SEMANA LIVRE', livre == null ? 'a ler' : Math.round(livre * 100) + '%', cor], ['MODO', (AMP.modo || 'a ler').toUpperCase(), cor], ['SESSÃO', AMP.sessao == null ? 'a ler' : fmt(AMP.sessao, 0) + '%', C.txt], ['REINÍCIO', AMP.horas == null ? 'a ler' : (AMP.horas >= 24 ? fmt(AMP.horas / 24, 1) + ' d' : fmt(AMP.horas, 0) + ' h'), C.mute]]);
    } });
  })();
  setInterval(function () { mini('hm_ampulheta', [['semana', AMP.semana == null ? 'a ler' : fmt(100 - AMP.semana, 0) + '% livre', '', AMP.modo === 'vermelho' ? 'dn' : ''], ['sessão', AMP.sessao == null ? 'a ler' : fmt(AMP.sessao, 0) + '%'], ['', AMP.modo || 'a ler']]); }, 2000);

  // ================================================================ 15. O GLOBO (05/10, ele: "trazer aquele globo de novo, porem ele vai
  // mostrar todos os relogios que temos conectados... a sigla do pais com o relogio em cima com hora, minuto e segundo em tempo real
  // diretamente deles... na parte superior direita da torre perto do livro de ofertas, so o globo, mais fluido e otimizado").
  // As bolsas e mercados que a torre le ou negoceia, cada uma com a sigla do pais, a hora LOCAL ao segundo (o relogio do proprio
  // fuso, Intl) e a luz verde quando o pregao esta aberto (dias uteis, horario do pregao local). A esfera e as paralelas sao uma
  // camada guardada; os meridianos giram e os pinos andam a cada quadro.
  var MERCADOS = [['BR', 'B3', 'America/Sao_Paulo', -46.6, -23.5, 10, 17], ['US', 'NYSE', 'America/New_York', -74, 40.7, 9.5, 16], ['UK', 'LSE', 'Europe/London', -0.1, 51.5, 8, 16.5],
    ['DE', 'Xetra', 'Europe/Berlin', 8.7, 50.1, 9, 17.5], ['JP', 'TSE', 'Asia/Tokyo', 139.7, 35.7, 9, 15], ['HK', 'HKEX', 'Asia/Hong_Kong', 114.2, 22.3, 9.5, 16],
    ['CN', 'SSE', 'Asia/Shanghai', 121.5, 31.2, 9.5, 15], ['AU', 'ASX', 'Australia/Sydney', 151.2, -33.9, 10, 16]];
  // 07/10 (Q5 B10, ele: "tem que mostrar uma legenda ao lado com o nome pra quem nao souber o que significa cada sigla")
  var NOME_PAIS = { BR: 'Brasil', US: 'EUA', UK: 'Reino Unido', DE: 'Alemanha', JP: 'Japao', HK: 'Hong Kong', CN: 'China', AU: 'Australia' };
  function geoGlobo(w, h) {          // com espaco, o globo vai para a direita e a legenda fica a esquerda
    var leg = w >= 170, cx = leg ? w * 0.63 : w / 2, cy = TOPO + (h - TOPO) / 2;
    return { leg: leg, cx: cx, cy: cy, R: Math.min(leg ? w * 0.30 : w * 0.36, (h - TOPO) * 0.42) };
  }
  var RELOGIOS = {};
  function horaLocal(tz) {
    try {
      var f = RELOGIOS[tz] || (RELOGIOS[tz] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hour12: false }));
      var ps = {}; f.formatToParts(new Date()).forEach(function (x) { ps[x.type] = x.value; });
      return { txt: ps.hour + ':' + ps.minute + ':' + ps.second, h: Number(ps.hour) % 24 + Number(ps.minute) / 60, dia: ps.weekday };
    } catch (e) { return { txt: '--:--:--', h: 0, dia: 'Mon' }; }
  }
  function aberta(m, hl) { return hl.dia !== 'Sat' && hl.dia !== 'Sun' && hl.h >= m[5] && hl.h < m[6]; }
  var cenaGlobo = null;
  (function () {
    var cv = canvasDe('h_globo'); if (!cv) return;
    registar('globo', $('h_globo'));
    function base(g, w, h) {
      var G = geoGlobo(w, h), cx = G.cx, cy = G.cy, R = G.R;
      var gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R); gr.addColorStop(0, '#173a55'); gr.addColorStop(1, '#050a12');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(45,212,232,.16)'; g.lineWidth = 1;
      for (var k = -60; k <= 60; k += 30) { var yy = cy - Math.sin(k * Math.PI / 180) * R, rr2 = Math.cos(k * Math.PI / 180) * R; g.beginPath(); g.ellipse(cx, yy, rr2, rr2 * 0.1, 0, 0, TAU); g.stroke(); }
      g.strokeStyle = 'rgba(45,212,232,.55)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
      var at = g.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.12); at.addColorStop(0, 'rgba(45,212,232,.18)'); at.addColorStop(1, 'rgba(45,212,232,0)');
      g.fillStyle = at; g.beginPath(); g.arc(cx, cy, R * 1.12, 0, TAU); g.fill();
    }
    cenaGlobo = cena(cv, { id: 'globo', holo: $('h_globo'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      porCamada(ctx, s, 'base', '', base);
      var G = geoGlobo(w, h), cx = G.cx, cy = G.cy, R = G.R, giro = calmo ? -30 : -t * 6;   // (giro: 'rot' e a funcao do texto)
      ctx.strokeStyle = 'rgba(45,212,232,.13)'; ctx.lineWidth = 1;
      for (var m0 = 0; m0 < 180; m0 += 30) { var a = (m0 + giro) * Math.PI / 180; ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(Math.sin(a)) * R, R, 0, 0, TAU); ctx.stroke(); }
      var etq = [];
      MERCADOS.forEach(function (m, i) {
        var l = (m[3] + giro) * Math.PI / 180, ph = m[4] * Math.PI / 180, x = Math.cos(ph) * Math.sin(l), z = Math.cos(ph) * Math.cos(l), y = Math.sin(ph);
        var px = cx + x * R, py = cy - y * R, hl = horaLocal(m[2]), ab = aberta(m, hl), frente = z > -0.05;
        if (!frente) return;
        var cor = ab ? C.ok : C.ouro;
        luz(ctx, cor, px, py, 7 + (ab ? 2 * Math.sin(t * 3 + i) : 0), 0.8);
        ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill();
        etq.push({ t: m[0] + ' ' + hl.txt, x: px, y: py - 8, dy: -10, cor: ab ? '#b6f5da' : C.ouroHi, tam: 8 });
      });
      arrumarEtiquetas(ctx, 'globo', etq, w, h);
      if (G.leg) {                     // a legenda: sigla, nome do pais, bolsa; verde = pregao aberto agora
        // 07/10: num cartao baixo as 8 linhas tapavam a linha da cripto - o passo e a letra cabem na altura (a cripto foi para a direita)
        var passo = Math.max(7, Math.min(13, (h - TOPO - 14) / MERCADOS.length)), tamL = Math.min(7.5, passo - 0.8);
        MERCADOS.forEach(function (m, i) {
          var ab = aberta(m, horaLocal(m[2])), y = TOPO + 12 + i * passo;
          ctx.fillStyle = ab ? C.ok : 'rgba(212,175,55,.55)'; ctx.beginPath(); ctx.arc(8, y - 3, 2.2, 0, TAU); ctx.fill();
          rot(ctx, m[0] + ' ' + NOME_PAIS[m[0]] + ' · ' + m[1], 14, y, ab ? '#b6f5da' : C.mute, tamL, 'left', ab ? 700 : 500);
        });
      }
      var cr = horaLocal('UTC');
      rot(ctx, '₿ cripto 24 h · ' + cr.txt + ' UTC', G.leg ? w - 6 : 6, h - 4, C.mute, 7.5, G.leg ? 'right' : 'left', 600);
      if (s.desenhos % 60 === 0) {
        var abertas = MERCADOS.filter(function (m) { return aberta(m, horaLocal(m[2])); }).map(function (m) { return m[1]; });
        mini('hm_globo', [['abertas', abertas.length ? abertas.join(' · ') : 'nenhuma'], ['NY', horaLocal('America/New_York').txt.slice(0, 5)], ['B3', horaLocal('America/Sao_Paulo').txt.slice(0, 5)]]);
      }
    } });
  })();

  // ================================================================ OS HOLOGRAMAS A ALTURA DO SEU ANDAR, LIGADOS POR LINHAS (q25, ponto 3)
  // TRES colunas no palco (obra 4): a da esquerda, a de PERTO DA TORRE (os novos da Mesa, do Risco e a ampulheta; v03: "os da
  // direita podem ficar mais perto da torre") e a da direita. Cada painel quer ficar CENTRADO na altura do seu andar; os da
  // mesma coluna empurram-se (nunca saem da coluna); o tamanho de cada um e o seu peso (data-peso). O fio vai da aresta do
  // painel ao andar; um painel da coluna da direita que tem um COMPANHEIRO do mesmo andar na coluna de perto liga-se a ele
  // (o fio nao atravessa a coluna de perto).
  function andarDoHolo(chave) {
    var E = T3B.estado.EST, ands = E ? lista(E.andares) : [], porEsp = function (esp) { var a = ands.filter(function (x) { return x.esp === esp; }).sort(function (x, y) { return y.n - x.n; })[0]; return a ? a.n : null; };
    if (chave === 'topo') return ands.length ? ands[ands.length - 1].n : 59;
    if (chave === 'lab') { var p = T3B.estado.programas.organismo; return p && p.andar != null ? p.andar : porEsp('tendencia') || 26; }
    return porEsp(chave) || ({ pnl: 47, estatistica: 46, mesa: 49, risco: 50 })[chave] || null;
  }
  var fios = $('fios'), ultAnc = null, alvos = {}, svgFios = { ass: '' };
  // 04/10 (obra 4, "trava ao rodar"): os retangulos do palco e das colunas leem-se UMA vez por mudanca de layout (nao a cada
  // ancora, 12 vezes por segundo, logo depois de os rotulos escreverem os seus transforms - era layout forcado em cada volta)
  var rectsH = null;
  T3B.on('layout', function () { rectsH = null; });
  addEventListener('resize', function () { rectsH = null; });
  function rectsDasColunas(palco) {
    if (rectsH) return rectsH;
    rectsH = { pr: palco.getBoundingClientRect(), c: {} };
    ['.holos.esq', '.holos.perto', '.holos.dir'].forEach(function (sel) { var col = palco.querySelector(sel); if (col) rectsH.c[sel] = { el: col, cr: col.getBoundingClientRect(), H: col.clientHeight }; });
    setTimeout(function () { rectsH = null; }, 2000);               // (as colunas deslizam na gaveta: refresca-se de 2 em 2 s)
    return rectsH;
  }
  function posicionar(d) {
    var palco = $('palco'); if (!palco || T3B.pequeno) return;
    var fora = T3B.estado.perto && !palco.classList.contains('holos-de-volta');
    var R0 = rectsDasColunas(palco), anc = (d && d.anc) || {}, pr = R0.pr, linhas = [], presos = {}, colunas = {};
    [['.holos.esq', 'e'], ['.holos.perto', 'd'], ['.holos.dir', 'd']].forEach(function (par) {
      var C0 = R0.c[par[0]]; if (!C0) return;
      var col = C0.el, cr = C0.cr, Hc = C0.H, gap = 8;
      if (cr.width < 4) return;
      var hs = Array.prototype.slice.call(col.querySelectorAll(':scope > .holo'));
      var nMin = hs.filter(function (h) { return h.classList.contains('min'); }).length, pesos = 0;
      hs.forEach(function (h) { if (!h.classList.contains('min')) pesos += Number(h.dataset.peso || 1); });
      var unid = pesos ? Math.max(56, (Hc - gap * (hs.length - 1) - nMin * 42) / pesos) : 0;
      var itens = hs.map(function (h, i) {
        var n = andarDoHolo(h.dataset.andarChave), a = (!fora && n != null) ? anc[n + par[1]] : null, alt = h.classList.contains('min') ? 42 : Math.min(240, unid * Number(h.dataset.peso || 1));
        if (n != null) presos[n] = 1;
        var quer = a && a.ok ? (a.y + pr.top - cr.top) - alt / 2 : null;
        return { h: h, n: n, a: a && a.ok ? a : null, alt: alt, quer: quer, i: i };
      });
      var ord = itens.slice().sort(function (x, y) { var qx = x.quer == null ? x.i * (Hc / hs.length) : x.quer, qy = y.quer == null ? y.i * (Hc / hs.length) : y.quer; return qx - qy; });
      var y = 0;
      ord.forEach(function (it) { var q = it.quer == null ? y : it.quer; it.top = Math.max(y, q); y = it.top + it.alt + gap; });
      var fim = Hc;
      for (var k = ord.length - 1; k >= 0; k--) { var it = ord[k]; if (it.top + it.alt > fim) it.top = fim - it.alt; fim = it.top - gap; }
      ord.forEach(function (it) { if (it.top < 0) it.top = 0; });
      colunas[par[0]] = { cr: cr, itens: ord, lado: par[1] };
      ord.forEach(function (it) {
        var top = Math.round(it.top), alt = Math.round(it.alt), velho = alvos[it.h.id];
        // (por transform: o compositor move o painel; o top mexia no layout da pagina a cada quadro da transicao)
        if (!velho || Math.abs(velho.top - top) > 5 || velho.alt !== alt) { it.h.style.setProperty('--y', top + 'px'); if (!velho || velho.alt !== alt) it.h.style.height = alt + 'px'; alvos[it.h.id] = { top: top, alt: alt }; }
        it.h.classList.toggle('ancorado', !!it.a);
      });
    });
    if (!fora) Object.keys(colunas).forEach(function (sel) {
      var c = colunas[sel], cr = c.cr, perto = colunas['.holos.perto'];
      c.itens.forEach(function (it) {
        if (!it.a) return;
        var t = (alvos[it.h.id] || { top: it.top }).top, alt = (alvos[it.h.id] || { alt: it.alt }).alt, x0 = c.lado === 'e' ? cr.right - pr.left : cr.left - pr.left, y0 = cr.top - pr.top + t + Math.min(alt / 2, 30);
        if (sel === '.holos.dir' && perto) {
          var comp = perto.itens.filter(function (p) { return p.n === it.n; })[0];
          if (comp) { var tc = (alvos[comp.h.id] || comp).top, ac = (alvos[comp.h.id] || comp).alt; linhas.push([x0, y0, perto.cr.right - pr.left, perto.cr.top - pr.top + tc + Math.min(ac / 2, 30), 'comp']); return; }
        }
        linhas.push([x0, y0, it.a.x, it.a.y, '']);
      });
    });
    T3B.estado.andaresDosHolos = presos;
    // o SVG dos fios: os elementos reaproveitam-se (so mudam os atributos que mudaram) - nada de innerHTML a cada quadro
    var ass = linhas.map(function (l) { return l.map(function (v) { return typeof v === 'number' ? Math.round(v) : v; }).join(','); }).join('|');
    if (fios && ass !== svgFios.ass) {
      svgFios.ass = ass;
      var h = linhas.map(function (l) { return '<line class="' + l[4] + '" x1="' + l[0].toFixed(1) + '" y1="' + l[1].toFixed(1) + '" x2="' + l[2].toFixed(1) + '" y2="' + l[3].toFixed(1) + '"/><circle cx="' + l[0].toFixed(1) + '" cy="' + l[1].toFixed(1) + '" r="2"/>' + (l[4] ? '' : '<circle cx="' + l[2].toFixed(1) + '" cy="' + l[3].toFixed(1) + '" r="2.5"/><circle class="ponta" cx="' + l[2].toFixed(1) + '" cy="' + l[3].toFixed(1) + '" r="6"/>'); }).join('');
      fios.innerHTML = h;
    }
  }
  function posicionarJa() { posicionar(ultAnc); }
  T3B.on('ancoras', function (d) { ultAnc = d; if (d.nivel >= 2 && fios) { if (fios.innerHTML) { fios.innerHTML = ''; svgFios.ass = ''; } } posicionar(d); });
  T3B.on('layout', function () { setTimeout(posicionarJa, 30); });
  T3B.on('gaveta', function (a) { if (a && fios) { fios.innerHTML = ''; svgFios.ass = ''; } });
  T3B.on('nivel', function () { setTimeout(posicionarJa, 30); });
  T3B.on('estrutura', function () { setTimeout(posicionarJa, 50); });

  ligarMinimizar();
  posicionar(null);

  // ---------------------------------------------------------------- blocos do painel do andar (usados pelo t3b_vivo.js)
  window.T3BHolo = {
    blocoDoAndar: function (a) {
      var T = T3B.estado.T; if (!T) return '';
      var esp = String(a.esp || ''), r = obj(T.reactor), linha = function (x, y) { return '<tr><td>' + U.escH(x) + '</td><td>' + U.escH(y) + '</td></tr>'; };
      var tt = a.turnos || a.censo, extra = tt ? linha('A trabalhar agora', fmt(tt.a_trabalhar_agora, 0) + ' de ' + fmt(tt.registados, 0)) + linha('Em turno · a evoluir', fmt(tt.em_turno, 0) + ' · ' + fmt(tt.em_descanso_a_evoluir, 0)) : '';
      if (/sr_stark|conselho|socios/.test(esp)) { var c = obj(r.conta), g = obj(r.ganho); return '<table><tbody>' + linha('Resultado de hoje', sinal(c.pnl_hoje, 2) + ' US$') + linha('Realizado hoje', sinal(g.realizado_usd, 2) + ' US$') + linha('Acumulado em papel', sinal(c.acumulado_papel, 2) + ' US$') + extra + '</tbody></table>'; }
      if (esp === 'risco') { var v = obj(T.vingadores), k = obj(T.killian); return '<table><tbody>' + linha('N efectivo', fmt(v.n_ef, 2)) + linha('Posições', v.n_posicoes || 0) + linha('Rotações recusadas', k.rotacoes_recusadas || 0) + extra + '</tbody></table>'; }
      if (esp === 'mesa') return '<table><tbody>' + lista(r.posicoes).map(function (p) { return linha(p.simbolo, sinal(p.pnl_aberto_usd, 2) + ' US$ · ' + fmt(p.valor_usd, 2) + ' em uso'); }).join('') + extra + '</tbody></table>';
      if (/celulas|cripto|volume_fluxo|preco_accao|reversao_media|tendencia/.test(esp)) { var e = obj(T.extremis); return '<table><tbody>' + linha('Geração actual', e.geracao_actual) + linha('Genes na memória', fmt(e.n_genes, 0)) + linha('Famílias', e.n_familias) + extra + '</tbody></table>'; }
      return extra ? '<table><tbody>' + extra + '</tbody></table>' : '';
    }
  };
})();
