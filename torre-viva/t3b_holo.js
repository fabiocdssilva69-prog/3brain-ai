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
  // (22/10 00h30: SO no radar - ctx._cacheTexto; A/B na mesma pagina: nos outros hologramas as imagens pequenas custavam mais que o texto,
  //  stark 4,6 vs 1,8 ms, livro 4,8 vs 2,7: um canvas pequeno sobe para a placa a cada copia)
  // 21/10 23h55 (ele: "ta muito pesado e travando"; medido no radar: 7 fillText por quadro = 2,4 ms, ~330 us cada - a letra "JetBrains
  // Mono" mais a lista de recurso dos emoji, procurada a cada chamada para ● ▸ ·): um texto que aparece 3 vezes igual (mesma letra, cor e
  // escala do ecra) passa a ser uma imagem guardada e so se copia; o que muda a cada quadro (relogios, numeros a correr) vai direito.
  // (22/10 00h, medido: a 1.a medida/escrita depois de trocar de letra num canvas custava 2-7 ms - o browser resolve a lista de recurso
  //  outra vez. As imagens fazem-se num RASCUNHO partilhado: a letra so muda la, e o canvas do holograma nunca troca de letra.)
  var TXT_IMG = new Map(), TXT_RASC = null;
  function rascunhoTexto() { if (!TXT_RASC) { var c = document.createElement('canvas'); c.width = 1024; c.height = 96; TXT_RASC = c.getContext('2d'); TXT_RASC._f = null; } return TXT_RASC; }
  function rotDireito(ctx, t, x, y, cor, f, al) { if (ctx._f !== f) { ctx.font = f; ctx._f = f; } ctx.fillStyle = cor; ctx.textAlign = al || 'left'; ctx.fillText(t, x, y); }
  // o texto escrito no rascunho (letra, cor e escala do ecra); devolve a medida, ou null se nao cabe (entao vai direito)
  function textoNoRascunho(t, f, cor, sc, tam) {
    var r = rascunhoTexto(); r.setTransform(1, 0, 0, 1, 0, 0); if (r._f !== f) { r.font = f; r._f = f; }
    var mt = r.measureText(t), asc = Math.ceil(mt.fontBoundingBoxAscent || tam * 1.05), desc = Math.ceil(mt.fontBoundingBoxDescent || tam * 0.35);
    var w = Math.ceil(mt.width) + 2, alt = asc + desc + 2, W = Math.max(1, Math.ceil(w * sc)), H = Math.max(1, Math.ceil(alt * sc));
    if (W > 1024 || H > 96) return null;
    r.clearRect(0, 0, Math.min(1024, W + 2), Math.min(96, H + 2)); r.setTransform(sc, 0, 0, sc, 0, 0); r.fillStyle = cor; r.textAlign = 'left'; r.textBaseline = 'alphabetic'; r.fillText(t, 1, asc + 1);
    return { w: w, asc: asc + 1, alt: alt, W: W, H: H };
  }
  // 22/10 00h10 (medido no canvas do radar: ~6 ms por fillText no meio das imagens de brilho; num canvas a parte 20-70 us): o texto que
  // aparece 3 vezes igual fica numa imagem guardada (feita no rascunho) e so se copia; o resto escreve-se direito
  function rot(ctx, t, x, y, cor, tam, al, peso) {
    var f = fonte(peso, tam); t = String(t);
    if (SOFT || !ctx._cacheTexto || window.__t3bTextoDireito || !t || ctx.textBaseline !== 'alphabetic' || typeof cor !== 'string') return rotDireito(ctx, t, x, y, cor, f, al);
    var k = f + '|' + cor + '|' + t, e = TXT_IMG.get(k);
    if (!e) { if (TXT_IMG.size > 2500) TXT_IMG.clear(); TXT_IMG.set(k, e = { n: 0, cv: null, sc: 0, w: 0, asc: 0, alt: 0 }); }
    if (e.n < 0) return rotDireito(ctx, t, x, y, cor, f, al);                 // (enorme: sempre direito)
    var m = ctx.getTransform(), sc = Math.max(1, Math.round(Math.hypot(m.a, m.b) * 4) / 4);
    if (++e.n < 3) return rotDireito(ctx, t, x, y, cor, f, al);              // (22/10 00h20: o que ainda nao se repetiu vai direito - pelo rascunho cada copia obrigava a placa a sincronizar)
    if (!e.cv || e.sc !== sc) {
      var q2 = textoNoRascunho(t, f, cor, sc, tam);
      if (!q2) { e.n = -1e9; return rotDireito(ctx, t, x, y, cor, f, al); }
      e.w = q2.w; e.asc = q2.asc; e.alt = q2.alt; e.sc = sc;
      var cv = e.cv || document.createElement('canvas'); cv.width = q2.W; cv.height = q2.H;
      cv.getContext('2d').drawImage(TXT_RASC.canvas, 0, 0, q2.W, q2.H, 0, 0, q2.W, q2.H);
      e.cv = cv;
    }
    var x0 = al === 'center' ? x - (e.w - 2) / 2 : al === 'right' ? x - (e.w - 2) : x;
    ctx.drawImage(e.cv, x0 - 1, y - e.asc, e.w, e.alt);
  }
  // 07/10 (ele: "as informacoes no card do sr stark estao se sobrepondo... quero mostrar tudo"): o texto cabe na largura dada -
  // se nao couber, a letra encolhe (ate 6 px) em vez de cortar ou tapar o vizinho
  function rotCabe(ctx, t, x, y, cor, tam, al, peso, maxW) {
    var f = fonte(peso, tam); if (ctx._f !== f) { ctx.font = f; ctx._f = f; }
    var lw = ctx.measureText(String(t)).width;
    rot(ctx, t, x, y, cor, lw > maxW && maxW > 0 ? Math.max(6, Math.floor(tam * maxW / lw * 2) / 2) : tam, al, peso);   // (22/10: em meios pixeis)
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
      ctx.font = fonte(600, 7); ctx._f = null; var r0 = String(it[0]); while (r0.length > 3 && ctx.measureText(r0).width > cw - 4) r0 = r0.slice(0, -1);   // 21/10: o rotulo tambem cabe na coluna
      rot(ctx, r0, x, y, C.dim, 7, 'left', 600);
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
  // 21/10 23h45 (ele: "ta muito pesado e ta travando demais"; medido no ecra dele: 12 quadros/s, fio principal preso 260 ms por segundo,
  // os 10 hologramas a desenhar TODOS os quadros do relogio de 30 Hz - ~450 ms de desenho por segundo): cada holograma ao ritmo que o
  // olho precisa - os que pulsam a 30, os de numeros e texto a 10-20. Com a pagina lenta (quadro medio > 50 ms) todos descem a metade.
  var FPS_DO_HOLO = { vortex: 30, coracao: 30, radar: 30, equalizador: 30, livro: 20, globo: 20, lab: 15, stark: 15, turnos: 12, trilho: 10 };
  var emaQuadro = 33, msQuadroAnt = 0, cargaHolos = 1;

  // ================================================================ a maquinaria comum: cenas, tamanho, visibilidade
  var cenas = [], COLISOES = {};
  window.__t3bHoloColisoes = function () { return COLISOES; };
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { es.forEach(function (e) { cenas.forEach(function (s) { if (s.c === e.target) { s.vis = e.isIntersecting; if (s.vis) s.sujo = true; } }); }); }) : null;
  // uma cena: desenhar(ctx, w, h, t, dt, s); sempre (por omissao) = anda a 60 q/s enquanto esta a vista; vivo(agora) so para
  // as que ainda nao sao continuas
  function cena(canvas, opts) {
    var s = { c: canvas, ctx: canvas.getContext('2d', SOFT ? { willReadFrequently: true } : { alpha: true }), w: 0, h: 0, vis: true, ultimo: 0, fps: Math.min(FPS_MAX, opts.fps || FPS_DO_HOLO[opts.id] || FPS_MAX), desenhar: opts.desenhar,
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
  // 21/10 23h (ele: "so quero o brilho que fizeste no vortex da galaxia"): o brilho das estrelas do vortex - um degrade CHEIO do centro
  // ate a borda (o 'luz' normal cai depressa: a estrela via-se pequena); um sprite por raio, desenhado em 'lighter'
  var SPRITES_E = {};
  function luzEstrela(ctx, x, y, r, a) {
    if (!(a > 0.01) || !(r > 0.5)) return;
    var rr = Math.max(2, Math.min(32, Math.round(r))), sp = SPRITES_E[rr];
    if (!sp) { var d = 2, c = document.createElement('canvas'); c.width = c.height = rr * 2 * d; var g = c.getContext('2d'), gr = g.createRadialGradient(rr * d, rr * d, 0, rr * d, rr * d, rr * d); gr.addColorStop(0, 'rgba(219,232,255,0.95)'); gr.addColorStop(1, 'rgba(219,232,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); sp = SPRITES_E[rr] = c; }
    var ga = ctx.globalAlpha, op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sp, x - rr, y - rr, rr * 2, rr * 2); ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
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
  // 21/10 22h50 (ele: "quando mexemos no tamanho dos hologramas, a animacao de dentro nao aumenta"): o desenho de um holograma escala com
  // o cartao - a referencia e o cartao normal (280 x 230); maior que isso, tudo (letras, pontos, linhas) cresce na mesma proporcao, ate 2,4x
  // <escala-puro>
  function escalaDoHolo(w, h) { return Math.max(1, Math.min(2.4, Math.min((Number(w) || 0) / 280, (Number(h) || 0) / 230))); }
  // </escala-puro>
  function quadro(ms) {
    requestAnimationFrame(quadro);
    if (document.hidden || gavetaAberta) return;
    var t = ms / 1000; tAnt = t;
    if (msQuadroAnt) { var iq = ms - msQuadroAnt; if (iq > 0 && iq < 400) emaQuadro = emaQuadro * 0.94 + iq * 0.06; }
    msQuadroAnt = ms; cargaHolos = emaQuadro > 50 ? 0.5 : emaQuadro < 40 ? 1 : cargaHolos;
    for (var i = 0; i < cenas.length; i++) {
      var s = cenas[i];
      if (T3B.pequeno && s.holo) continue;
      if (!s.vis || escondido(s)) continue;
      var precisa = s.sujo || ms < s.ate || (s.sempre && !calmo) || (s.vivo && !calmo && s.vivo(ms));
      if (!precisa) continue;
      if (ms - s.ultimo < 1000 / (s.fps * cargaHolos) - 4) continue;            // (-4: num ecra de 60 Hz o quadro chega a 16,7 ms; com -2 um quadro adiantado saltava um)
      var dts = s.ultimo ? Math.min(0.1, (ms - s.ultimo) / 1000) : 1 / 60;
      s.ultimo = ms; s.sujo = false;
      if (s.precisaTam) medir(s);
      if (s.w < 20 || s.h < 20) continue;
      var t0 = performance.now();
      var escH = s.holo ? escalaDoHolo(s.w, s.h) : 1;
      try {
        if (escH > 1.02) {                                         // desenha no tamanho de referencia e amplia (as camadas guardadas a resolucao inteira)
          var w0 = s.w, h0 = s.h, d0 = s.d; s.w = w0 / escH; s.h = h0 / escH; s.d = d0 * escH; s.ctx.save(); s.ctx.scale(escH, escH);
          try { s.desenhar(s.ctx, s.w, s.h, t, dts, s); } finally { s.ctx.restore(); s.w = w0; s.h = h0; s.d = d0; }
        } else s.desenhar(s.ctx, s.w, s.h, t, dts, s);
        s.desenhos++;
      } catch (e) { if (window.console) console.warn('holo', e); }
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
  // 15/10: o radar, o laboratorio, o globo e os numeros passaram a representar mais sectores (t3b_ligacoes.js) - a escala do brilho
  // (eventos por minuto para o aro cheio) sobe na mesma proporcao, senao ficavam sempre no maximo
  var ACT = {}, CB = {}, ELS = {}, ESCALA = { coracao: 140, equalizador: 140, vortex: 30, numeros: 35, radar: 30, lab: 40, globo: 40, turnos: 15 };
  var JANELA_MS = 180000;
  // 16/10 (ele: "muito pouca actividade para tanto funcionario que cada um tem"): um evento pode juntar n accoes reais (os genes de um
  // lab num minuto, as regras de um ficheiro de testes, as linhas novas de um contratado) - o holograma conta as n, nao 1
  function nDe(e) { return T3B.nDoEvento ? T3B.nDoEvento(e) : (function (v) { return isFinite(v) && v >= 1 ? Math.floor(v) : 1; })(Number(e && e.n)); }
  function act(id) { return ACT[id] || (ACT[id] = { reacoes: 0, accoes: 0, janela: [], pulso: 0, tPulso: 0, ultimo: null, base: 0, porAndar: {} }); }
  function pulsoDe(id, agora) { var A = ACT[id]; if (!A || !A.tPulso) return 0; return clamp(1 - ((agora || agoraMs()) - A.tPulso) / 1200, 0, 1); }
  function reagir(id, ev, r) {
    var A = act(id), agora = agoraMs(), w = nDe(ev);
    A.reacoes++; A.accoes += w; A.janela.push([Date.now(), w]); A.tPulso = agora; A.ultimo = { t: ev.t || null, k: ev.k, quem: ev.quem || ev.id, andar: r && r.andar != null ? r.andar : ev.andar, n: w };
    if (r && r.andar != null) A.porAndar[r.andar] = (A.porAndar[r.andar] || 0) + w;
    if (A.janela.length > 1200) A.janela.splice(0, A.janela.length - 1200);
    // o aro do painel acende (opacidade animada pelo compositor: nao refaz o layout nem a pintura do painel)
    var el = ELS[id];
    // 16/10 (ele: "trava quando muitas actividades se activam"): numa rajada o aro acendia uma vez por evento no mesmo quadro - agora no
    // maximo 1 vez a cada 250 ms por holograma (o evento conta na mesma: o pulso, a janela e as reaccoes do holograma)
    if (el && !calmo && agora - (A.tAro || 0) > 250) { A.tAro = agora; var aro = el.querySelector(':scope > .aro'); if (aro && aro.animate) aro.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }); }
    (CB[id] || []).forEach(function (fn) { try { fn(ev, r || {}); } catch (e) { if (window.console) console.warn('reaccao ' + id, e); } });
    T3B.emit('holo:' + id, { ev: ev, r: r || {} });                  // os 3D (o globo, a fita) ouvem isto
  }
  function aoReagir(id, fn) { (CB[id] = CB[id] || []).push(fn); }
  function registar(id, el) { ELS[id] = el; act(id); if (el && !el.querySelector(':scope > .aro')) { var a = document.createElement('i'); a.className = 'aro'; a.setAttribute('aria-hidden', 'true'); el.appendChild(a); } }
  // 16/10 (ele: "trava quando muitas actividades se activam, causando lentidao"): uma rajada grande (o pulso, um lote de contratados)
  // e servida em fatias de 12 eventos por quadro - o ecra nunca fica um quadro inteiro a tratar dezenas de reaccoes
  var FILA_REAC = [], FATIA_REAC = 12, reacAgendada = false;
  function tratarFatia() {
    reacAgendada = false;
    var fatia = FILA_REAC.splice(0, FATIA_REAC);
    fatia.forEach(function (e) { LG.reacoes(e).forEach(function (par) { reagir(par[0], e, par[1]); }); });
    if (FILA_REAC.length) { reacAgendada = true; (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(tratarFatia); }
  }
  function receber(evs) {
    var l = evs || []; if (!l.length) return;
    if (!FILA_REAC.length && l.length <= FATIA_REAC) { l.forEach(function (e) { LG.reacoes(e).forEach(function (par) { reagir(par[0], e, par[1]); }); }); return; }
    Array.prototype.push.apply(FILA_REAC, l);
    if (FILA_REAC.length > 600) FILA_REAC.splice(0, FILA_REAC.length - 600);     // um atraso enorme nao se acumula sem fim
    if (!reacAgendada) { reacAgendada = true; (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(tratarFatia); }
  }
  T3B.on('eventos', receber);
  // a base: os ultimos 3 minutos do sector, de 0 a 1 (escala por holograma); vai para o CSS (--act) - o brilho do aro
  // 16/10: as ACCOES reais por minuto (soma dos n) e uma curva que satura devagar (1 - e^-x): quem tem mais funcionarios a trabalhar
  // brilha mais, e um lab com centenas de genes a calcular nao fica preso no maximo ao lado de um com dez. PURA: baseDaActividade.
  // <base-puro>
  function baseDaActividade(janela, agoraMs_, janelaMs, escala) {
    var soma = 0, corte = agoraMs_ - janelaMs;
    for (var i = 0; i < (janela || []).length; i++) { var x = janela[i]; if (x && x[0] >= corte) soma += x[1] || 1; }
    var porMin = soma / (janelaMs / 60000);
    return { porMin: porMin, base: Math.max(0, Math.min(1, 1 - Math.exp(-porMin / (escala || 8)))) };
  }
  // </base-puro>
  function bases() {
    var agora = Date.now(), corte = agora - JANELA_MS;
    Object.keys(ACT).forEach(function (id) {
      var A = ACT[id]; while (A.janela.length && A.janela[0][0] < corte) A.janela.shift();
      var r = baseDaActividade(A.janela, agora, JANELA_MS, ESCALA[id] || 8), b = r.base; A.porMin = r.porMin;
      if (Math.abs(b - A.base) > 0.02) { A.base = b; var el = ELS[id]; if (el) el.style.setProperty('--act', b.toFixed(2)); }
    });
  }
  setInterval(bases, 1000);
  // a prova (sala/sonda_t3b.js e a pagina de prova): o estado de cada holograma e a injeccao de eventos sinteticos
  window.__t3bHolo = {
    estado: function () { var o = {}; Object.keys(ACT).forEach(function (id) { var A = ACT[id]; o[id] = { reacoes: A.reacoes, accoes: A.accoes, accoes_min: Math.round((A.porMin || 0) * 10) / 10, base: Math.round(A.base * 100) / 100, pulso: Math.round(pulsoDe(id) * 100) / 100, ultimo: A.ultimo, porAndar: A.porAndar, desenhos: (cenas.filter(function (s) { return s.id === id; })[0] || {}).desenhos || 0, extra: EXTRA[id] ? EXTRA[id]() : null }; }); return o; },
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
  // 16/10 (medido: o predio tem 72 andares e o vortex assumia 59 - o P&L, a Mesa, o Risco e o executivo caiam no fundo da espiral ou
  // num ponto ao acaso): a altura e pelos andares de HOJE (/estrutura.json); o radar tambem
  var NMAX = 72;
  function yDoAndar(n) { n = Number(n); return isFinite(n) ? clamp(1 - (n - 1) / Math.max(1, NMAX - 1) * 2, -1, 1) : 0.8; }
  T3B.on('estrutura', function (d) {
    var m = 0; ((d && d.andares) || []).forEach(function (a) { m = Math.max(m, Number(a && a.n) || 0); });
    if (m && m !== NMAX) { NMAX = m; FAIXAS = null; }
    if (m && typeof RAD !== 'undefined' && RAD) RAD.maxAndar = Math.max(RAD.maxAndar || 0, m);
  });
  // 07/10 (Q5 B7, ele: "ela tem que reagir a cada pulso da torre... igual o coracao, cada pontinho brilha no momento em que reage e
  // com a cor do setor; a cada pulso tem que pulsar o nome do setor no coracao; esses 2 cards interligados e sincronizados"):
  // UMA lista de pulsos partilhada - o coracao escreve-a a cada batida, o vortex e o coracao desenham-na pela mesma hora
  // 08/10 (OBRA 11): chamava-se pulsoDe, como a funcao do pulso de cada holograma (mais acima) - a segunda escondia a primeira e o
  // pulso do velocimetro, do trilho e do risco dava NaN. Agora tem nome proprio.
  // 08/10 (OBRA 11, ele: "cada pontinho do vortex vai ser igual a cada 'batida' - as vezes mais de 1 pontinho vai reagir, as vezes
  // um ENXAME porque varias coisas na torre se mexem ao mesmo tempo"): cada evento escolhe UM ponto da espiral a altura do seu andar
  // (pelo numero do evento: eventos diferentes do mesmo andar acendem pontos diferentes)
  var PULSOS = [], FAIXAS = null, PULSOS_MAX = 500, COR_ESTRELA = '#dbe8ff';   // 21/10 22h: a cor das estrelas do vortex
  function pontoDoAndar(n, sem) {
    if (!FAIXAS) { FAIXAS = {}; for (var a = 1; a <= NMAX; a++) { var ya = yDoAndar(a), l = []; for (var i = 0; i < NUC.p.length; i++) if (Math.abs(NUC.p[i].y - ya) < 0.06) l.push(i); FAIXAS[a] = l; } }
    var fx = n != null ? FAIXAS[Math.round(n)] : null;
    return fx && fx.length ? fx[sem % fx.length] : sem % NUC.p.length;
  }
  // <importancia-puro>
  // 21/10 21h (ele: "quanto maior a importancia daquela batida, mais brilha e maior; normalmente sao pequenas"): o peso de um evento no
  // vortex - o dinheiro e as decisoes (executor, nucleos, conselho, balde, analistas, Stark, mesa, risco) pesam mais; avarias e
  // consertos tambem; muitas accoes juntas um pouco mais. O normal e pequeno.
  var RX_IMPORTANTE = /binance_real|executor|nucleos|conselho|central_sinais|analista|stark|decis|ordem|mesa|risco|trava|stop/;
  function importanciaDoEvento(e) {
    var k = String((e && e.k) || ''), id = String((e && e.id) || '').toLowerCase(), v = 0.15;
    if (RX_IMPORTANTE.test(id)) v += 0.45;
    if (k === 'avaria' || k === 'consertou') v += 0.35;
    if (k === 'claude' || k === 'visita' || k === 'batimento') v += 0.15;
    var n = Number(e && e.n); if (isFinite(n) && n > 1) v += Math.min(0.25, 0.06 * Math.log2(n));
    return Math.max(0.1, Math.min(1, v));
  }
  // 21/10 22h15 (ele: "pela importancia aumenta primeiro o BRILHO, nao o tamanho: de 5% brilha 10, de 10% brilha 15"): o brilho sobe em
  // degraus de 5% com a importancia (uma diferenca minima entre milhares de funcionarios)
  function brilhoDaImportancia(im) { var d = Math.round(Math.max(0, Math.min(1, Number(im) || 0)) * 20) / 20; return Math.max(0.1, Math.min(1, d + 0.05)); }
  // </importancia-puro>
  function pulsoDoEvento(ev, i) {   // 16/10: i = o funcionario i de um evento de grupo (cada um o seu ponto)
    var n = ev && ev.andar != null && isFinite(Number(ev.andar)) ? Number(ev.andar) : null, an = n != null && T3B.andar ? T3B.andar(n) : null;
    var div = n != null && U.divisaoDoAndar ? U.divisaoDoAndar(n) : '', nome = TX.limpar((an && (an.sector || an.nome)) || div || '');
    return { n: n, t: agoraMs(), ip: pontoDoAndar(n, U.semente(String(ev && ev.s) + '|' + (ev && ev.id) + (i ? '|' + i : ''))), cor: n != null && U.corDoAndar ? U.corDoAndar(n) : '#ffdc6a',
      nome: nome ? (div && nome !== div ? div + ' · ' + nome : nome) + (n != null ? ' · and. ' + n : '') : '' };
  }
  aoReagir('vortex', function (ev, r) {
    var tipo = ev.k === 'visita' ? 'visita' : ev.k === 'recado' ? 'recado' : (ev.k === 'escreveu' || ev.k === 'mudou') ? 'dados' : 'resposta';
    // 08/10 (OBRA 11): as passagens de DADOS (2 em cada 3 eventos) eram cordoes grossos que tapavam os pontos - ficam finos e apagados
    if (NUC.fios.length < 16) NUC.fios.push({ de: yDoAndar(r.de != null ? r.de : ev.andar), para: yDoAndar(r.para != null ? r.para : (ev.para != null ? ev.para : 59)), a0: (U.semente(String(ev.s) + ev.id) % 6283) / 1000, t: 0, cor: COR_NUC[tipo], fr: tipo === 'dados' ? 0.4 : 1, nn: tipo === 'dados' ? 8 : 14 });
    NUC.passagens.push(Date.now()); NUC.nFios++;
    NUC.giroAlvo = Math.min(1.0, NUC.giroAlvo + 0.04);         // 21/10 21h: um empurrao leve (sem a explosao que travava o vortex)
    if (tipo === 'visita') NUC.ouro = Math.min(1.5, NUC.ouro + 0.6);
    NUC.ultimo = ev; pintarLegendaNucleo();
  });
  EXTRA.vortex = function () { return { fios: NUC.fios.length, fios_lancados: NUC.nFios, giro: Math.round(NUC.giro * 100) / 100, pontos_acesos: NUC.acesos || 0, pulsos: PULSOS.length, pontos_lancados: NUC.nPontos || 0 }; };
  T3B.on('ritmo', function (r) { NUC.ritmo = r; NUC.brilho = 0.45 + Math.min(0.55, (r.quem || 0) / 60); NUC.porAndar = r.porAndar || {}; pintarLegendaNucleo(); });
  function pintarLegendaNucleo() {
    var corte = Date.now() - 60000; while (NUC.passagens.length && NUC.passagens[0] < corte) NUC.passagens.shift();
    var pm = NUC.passagens.length;
    NUC.giroMinuto = GIRO_BASE + Math.min(0.5, pm / 40);         // o ritmo do ultimo minuto: para onde o giro volta (21/10 21h: mais calmo)
    var r = NUC.ritmo || {}, u = NUC.ultimo, leg = $('nu_leg');
    var LT = ECG ? ECG.lotes : [], evm = r.n != null ? r.n : (ECG ? somaBat() : 0), enx = 0, corteE = Date.now() - 60000;   // (o ECG do coracao e declarado mais abaixo)
    while (LT.length && LT[0][0] < corteE) LT.shift();
    LT.forEach(function (x) { if (x[1] > enx) enx = x[1]; });
    U.txt($('nu_kn'), evm + ' eventos/min');
    // 08/10 (OBRA 11): o vortex passou a ser CADA evento (um ponto cada); as passagens continuam (os fios)
    // 16/10 17h: eventos/min na media de 5 min (cada evento uma batida); as accoes (os genes, as regras) ao lado
    if (leg) leg.innerHTML = '<i><b>' + (Number(evm) || 0) + '</b> eventos/min · ' + (Number(r.acoes != null ? r.acoes : evm) || 0) + ' acções/min</i><i>maior enxame <b>' + (Number(enx) || 0) + '</b> · ' + (Number(pm) || 0) + ' passagens</i><i>' + (Number(r.quem) || 0) + ' funcionários mexeram</i>' +
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
      // (21/10: o nucleo bate com o MARCA-PASSO do coracao - ECG, mais abaixo; os pontos de cada evento acendem a hora dele)
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
      // 21/10 21h: CONSTELACAO - cada ponto acende na batida do coracao, do tamanho e brilho da sua importancia (o normal e pequeno); so
      // os importantes tem brilho largo e anel; no maximo 160 desenhados por quadro (o vortex nao trava)
      var agP = agoraMs(), vivos = 0, VIDA_P = 1.8, desenhados = 0;
      ctx.lineWidth = 1.2;
      // 21/10 22h (ele: "o vortex e uma constelacao a rodar a volta de uma estrela; cada pontinho, mesmo com pouca intensidade, brilha um
      // pouco mais; uns como estrela, outros como estrela mais forte; nao precisa de cor diferente"): todas na mesma cor de estrela; o
      // brilho e o tamanho pela importancia, com um minimo que se ve; as mais fortes ganham a cruz de cintilar. Acendem NA batida.
      // 21/10 22h15 (ele: "cada funcionario e um pontinho bem pequenino; pela importancia sobe PRIMEIRO o brilho, nao o tamanho; uns 500
      // por minuto, tem de caber sem travar"): o ponto e sempre pequeno (1,2 px; 1,8 so nos de topo); o BRILHO sobe em degraus de 5%
      // (brilhoDaImportancia); os pouco importantes so desenham o pixel (barato), os outros um brilho pequeno; a cruz de cintilar so nos
      // de topo (>= 0,85). Ate 300 por quadro.
      for (var ip = PULSOS.length - 1; ip >= 0 && desenhados < 300; ip--) {
        var pu = PULSOS[ip], idP = (agP - pu.t) / 1000; if (idP > VIDA_P) break; if (idP < 0) continue;
        var pa = NUC.p[pu.ip]; if (!pa || pa.sx == null) continue;
        var fP = 1 - idP / VIDA_P, im = pu.imp == null ? 0.3 : pu.imp, tw = fP * (0.85 + 0.15 * Math.sin(t * 9 + ip)); desenhados++;
        // 21/10 22h30 (ele: "o vortex ainda nao brilha conforme os eventos por segundo"): o pixel branco SEMPRE bem visivel (>= 60%) e
        // um brilho pequeno em TODAS (o degrau de 5% por importancia sobre um minimo de 30%) - antes as pouco importantes nao se viam
        var brP = brilhoDaImportancia(im) * tw, tamP = im >= 0.85 ? 1.8 : 1.3;
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = Math.min(1, (0.6 + 0.4 * brP) * tw);
        ctx.fillRect(pa.sx - tamP / 2, pa.sy - tamP / 2, tamP, tamP);
        luzEstrela(ctx, pa.sx, pa.sy, im >= 0.85 ? 7 : 3.5, Math.min(1, 0.3 * tw + 0.7 * brP)); vivos++;   // 21/10 23h: o brilho da galaxia (a escolha dele)
        if (im >= 0.85) {                                               // a cruz de cintilar das estrelas fortes (so as de topo)
          var lc = 6 * tw; ctx.strokeStyle = COR_ESTRELA; ctx.globalAlpha = Math.min(1, 0.7 * tw);
          ctx.beginPath(); ctx.moveTo(pa.sx - lc, pa.sy); ctx.lineTo(pa.sx + lc, pa.sy); ctx.moveTo(pa.sx, pa.sy - lc); ctx.lineTo(pa.sx, pa.sy + lc); ctx.stroke();
        }
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
  var RAD_CONTACTOS_MAX = 8;   // 21/10 21h (ele: "a shield ficou a rastrear itens demais, poluicao visual")
  var RAD = { cont: {}, nCont: 0, nBlips: 0, pontos: {}, pings: [], tBat: 0, intervalo: 9000, seq: null, abertas: 0, verdes: 0, vermelhos: 0, volta: null, ang: -Math.PI / 2, corr: 0, maxAndar: 68 };
  // 10/10 (ele, print: "shield e essa luz de alerta nao estao sincronizados... a shield mostra uma coisa e ali mostra outra"):
  // a luz dizia o PROGRAMA (Sombra previa, Noticias chat...) pela ordem de chegada; a lista do radar dizia o FUNCIONARIO que o
  // tem (Analista Bruner...) pelo mais antigo e cortava em 3; e no radar 3 das 5 avarias (todas do andar 38) caiam no MESMO
  // ponto, e os andares acima de 59 davam a volta (o aro tinha 59 tracos e a torre tem 68 andares). Agora a luz, a lista e o
  // radar leem as contas deste bloco: os mesmos casos, pela mesma ordem (vermelhos primeiro, depois os mais antigos), com o
  // mesmo nome (o do programa) e o andar; os casos do mesmo andar abrem-se em leque; o aro vai ate ao andar mais alto.
  // <radar-puro> (sem DOM: testes_t3b.js corre este bloco)
  var ANDAR_MAX_RADAR = 68;
  function numAndar(n) { var v = parseInt(String(n == null ? '' : n).replace(/[^0-9]/g, ''), 10); return v > 0 && v < 1000 ? v : 1; }
  function anguloDoAndar(n, max) { var M = Math.max(59, Number(max) || RAD.maxAndar || ANDAR_MAX_RADAR); return (Math.min(numAndar(n), M) - 1) / M * TAU - Math.PI / 2; }
  function avariasAbertas(pontos) {
    return Object.keys(pontos || {}).map(function (id) { return pontos[id]; }).filter(function (p) { return p && !p.ok; }).sort(function (a, b) {
      return (a.sev === 'vermelho' ? 0 : 1) - (b.sev === 'vermelho' ? 0 : 1) || (a.t0 || 0) - (b.t0 || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
  }
  // o leque: {id: desvio} - a posicao de cada caso no grupo do seu andar menos o meio (-1, 0, +1 para tres no mesmo andar)
  function leques(pontos) {
    var g = {}, out = {};
    Object.keys(pontos || {}).sort().forEach(function (id) { var n = numAndar(pontos[id].andar); (g[n] = g[n] || []).push(id); });
    Object.keys(g).forEach(function (n) { var L = g[n]; L.forEach(function (id, i) { out[id] = i - (L.length - 1) / 2; }); });
    return out;
  }
  // </radar-puro>
  function nomeDaAvaria(p) { return TX.limpar(TX.nomeDeId(p.id)); }
  // 21/10 22h30 (ele: "a shield tem de brilhar numa intensidade diferente conforme o tamanho da avaria e a importancia do sector"): o
  // peso de um andar - o dinheiro e as decisoes 1, o controlo 0,7, o resto 0,45
  var ESP_DINHEIRO = { mesa: 1, risco: 1, pnl: 1, tesouraria_preco: 1, sr_stark: 1, conselho: 1, socios_directores: 1 };
  var ESP_CONTROLO = { auditoria: 1, vigilancia: 1, manutencao: 1, validacao: 1, estatistica: 1, continuidade: 1 };
  function pesoDoAndar(n) { var a = T3B.andar ? T3B.andar(numAndar(n)) : null, e = a && a.esp; return ESP_DINHEIRO[e] ? 1 : ESP_CONTROLO[e] ? 0.7 : 0.45; }
  // 21/10 (ele: "a shield nao pisca os pontinhos quando a pinca do radar passa em cima; melhor movimento e mais informacoes"):
  // MEDIDO - o radar so tinha pontos para as AVARIAS (2 agora; com tudo verde, nenhum) e nada piscava a passagem do feixe. Agora
  // cada andar que TRABALHOU nos ultimos 3 min e um CONTACTO (no angulo do seu andar, maior com mais accoes, na cor do sector):
  // acende a branco quando o feixe passa por cima, solta um anel (o 'blip') e esmorece ate a volta seguinte. As avarias piscam
  // do mesmo modo, mais fortes. Ao lado: os andares mais activos.
  T3B.on('eventos', function (evs) {
    var ag = Date.now();
    (evs || []).forEach(function (e) { if (e.andar == null || e.historia || e.k === 'numero') return; var n = numAndar(e.andar), c = RAD.cont[n] || (RAD.cont[n] = { j: [], blip: 0, n: 0 }); c.j.push([ag, nDe(e)]); if (c.j.length > 400) c.j.splice(0, c.j.length - 400); });
  });
  function difAng(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  T3B.on('enxame', function (e) {
    var b = obj(e.batimento); if (b.volta_ms) RAD.intervalo = clamp(Number(b.volta_ms) || 9000, 3000, 60000);
    var vistos = {};
    lista(e.fora_do_verde).forEach(function (f) {
      if (!f || !f.id) return; vistos[f.id] = 1;
      RAD.maxAndar = Math.max(RAD.maxAndar || ANDAR_MAX_RADAR, numAndar(f.andar));
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
    else if (ev.k === 'avaria') { RAD.maxAndar = Math.max(RAD.maxAndar || ANDAR_MAX_RADAR, numAndar(ev.andar)); RAD.pontos[ev.id] = { id: ev.id, andar: ev.andar, sev: ev.sev || 'vermelho', t0: agora, ok: 0, novo: 1 }; }
    else if (ev.k === 'consertou') { var p = RAD.pontos[ev.id]; if (p) p.ok = agora; else RAD.pontos[ev.id] = { id: ev.id, andar: ev.andar, sev: 'amarelo', t0: agora, ok: agora }; }
    else if (ev.k === 'visita' || ev.andar != null) { if (RAD.pings.length < 12) RAD.pings.push({ andar: ev.k === 'visita' ? ev.para : ev.andar, t0: agora }); }
    pintarLegendaRadar();
  });
  EXTRA.radar = function () { return { contactos: RAD.nCont || 0, blips: RAD.nBlips || 0, pontos: Object.keys(RAD.pontos).length, abertas: RAD.abertas, maxAndar: RAD.maxAndar, lista: avariasAbertas(RAD.pontos).map(function (p) { return p.id; }), pings: RAD.pings.length, batimento_ha_ms: RAD.tBat ? Math.round(agoraMs() - RAD.tBat) : null }; };
  function pintarLegendaRadar() {
    var abertas = avariasAbertas(RAD.pontos), ab = abertas.length; RAD.abertas = ab;
    U.txt($('ra_kn'), ab + ' avaria' + (ab === 1 ? '' : 's') + ' · ' + RAD.verdes + ' verdes');
    var leg = $('ra_leg');
    if (leg) leg.innerHTML = '<i><b style="color:' + (ab ? C.mau : C.ok) + '">' + ab + '</b> fora do verde</i><i><b>' + (RAD.nCont || 0) + '</b> andares a trabalhar</i><i>volta <b>' + U.escH(RAD.volta || '—') + '</b> do vigia</i>' + (abertas[0] ? '<i>pior: <b>' + U.escH(nomeDaAvaria(abertas[0])) + '</b> · and. ' + numAndar(abertas[0].andar) + (pesoDoAndar(abertas[0].andar) >= 1 ? ' · sector do dinheiro' : '') + '</i>' : '');
    mini('hm_radar', [['', fmt(ab, 0), 'avarias', ab ? 'dn' : 'up'], ['', fmt(RAD.verdes, 0), 'verdes'], ['volta', String(RAD.volta || '…')]]);
    // 09/10 (ele: "nao ta sincronizado a luz amarela/vermelha/verde com o radar da shield"): a luz do cabecalho sai DAQUI, dos
    // mesmos pontos do radar (vigia: fora_do_verde + avaria/consertou). Antes vinha dos 'programas em erro' da estrutura
    // (t3b_vivo.pintarHUDEstrutura: outra fonte, outro ritmo, so verde/vermelho) e discordava do radar.
    // 10/10: a MESMA lista e a MESMA ordem da lista do radar (avariasAbertas), o mesmo nome e o andar
    var nv = abertas.filter(function (p) { return p.sev === 'vermelho'; }).length, na = ab - nv;
    var nomes = abertas.slice(0, 6).map(function (p) { return nomeDaAvaria(p) + ' (andar ' + numAndar(p.andar) + ')'; });
    var led = $('b_led');
    if (led && (RAD.tBat || Object.keys(RAD.pontos).length || RAD.verdes)) {
      led.className = 'led pulsa ' + (nv ? 'mau' : na ? 'at' : 'ok');
      led.title = (nv + na) ? (nv + ' vermelho(s) e ' + na + ' amarelo(s) no radar da S.H.I.E.L.D.: ' + nomes.join(', ') + (ab > nomes.length ? ' e mais ' + (ab - nomes.length) : ''))
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
      for (var a = 1, M = Math.max(59, RAD.maxAndar || ANDAR_MAX_RADAR); a <= M; a++) {   // o aro: um traco por andar (ate ao mais alto), maior de 5 em 5
        var qa = anguloDoAndar(a), l = a % 5 === 0 ? 6 : 3;
        g.strokeStyle = a % 5 === 0 ? 'rgba(45,212,232,.55)' : 'rgba(45,212,232,.25)';
        g.beginPath(); g.moveTo(cx + Math.cos(qa) * (R + 2), cy + Math.sin(qa) * (R + 2)); g.lineTo(cx + Math.cos(qa) * (R + 2 + l), cy + Math.sin(qa) * (R + 2 + l)); g.stroke();
      }
      [1, 15, 30, 45, 60].filter(function (n) { return n <= Math.max(59, RAD.maxAndar || ANDAR_MAX_RADAR); }).forEach(function (n) { var qn = anguloDoAndar(n); rot(g, String(n), cx + Math.cos(qn) * (R + 14), cy + Math.sin(qn) * (R + 14) + 3, 'rgba(139,138,147,.85)', 7.5, 'center', 600); });
      g.setLineDash([2, 4]); g.strokeStyle = 'rgba(45,212,232,.16)'; g.beginPath(); g.arc(cx, cy, R * 0.5, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    cenaRadar = cena(cv, { id: 'radar', bloco: $('bl_radar'), desenhar: function (ctx, w, h, t, dt, s) {
      var agora = agoraMs(), GR = geoRadar(w, h), cx = GR.cx, cy = GR.cy, R = GR.R;
      ctx.clearRect(0, 0, w, h);
      porCamada(ctx, s, 'fundo', String(RAD.maxAndar), fundo);   // (o aro muda se a torre ganhar andares)
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
        for (var rs = 1; rs < 14; rs++) { var ar = -rs * 0.035; gc.strokeStyle = 'rgba(45,212,232,' + (0.3 * (1 - rs / 14)).toFixed(3) + ')'; gc.beginPath(); gc.moveTo(R, R); gc.lineTo(R + Math.cos(ar) * R, R + Math.sin(ar) * R); gc.stroke(); }   // 21/10 23h: o rasto de fosforo (23h45: na imagem, nao a cada quadro)
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
      // os pontos: FOSFORO - acendem quando o feixe passa e esmorecem ate a volta seguinte (nunca apagam de todo). 10/10: os do
      // mesmo andar em leque (angulo e raio) e uma avaria aberta nunca desce de 62% (a 35% sumia no fundo: 5 avarias, 2 pontos)
      // 21/10 22h30: o SONAR - a cada volta do vigia sai uma onda do centro (2,5 s); os contactos e as avarias ecoam quando ela passa
      var idOnda = RAD.tBat ? (agora - RAD.tBat) / 2500 : 9, rOnda = idOnda < 1 ? R * idOnda : -99;
      if (idOnda < 1) { ctx.strokeStyle = C.cy; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.55 * (1 - idOnda); ctx.beginPath(); ctx.arc(cx, cy, rOnda, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.25 * (1 - idOnda); ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, rOnda - 7), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
      RAD.rOnda = rOnda;
      // 21/10: os CONTACTOS - os andares a trabalhar (3 min); piscam quando o feixe passa
      // (23h45: a soma dos 3 min de cada andar e a ordem fazem-se 2,5 vezes por segundo, nao a cada quadro - medido: o radar era 5-9 ms)
      if (!RAD.agg || agora - RAD.agg.t > 400 || agora < RAD.agg.t) {
        var corteC = Date.now() - 180000, maxC0 = 1, contos0 = [];
        Object.keys(RAD.cont).forEach(function (n) { var c = RAD.cont[n]; while (c.j.length && c.j[0][0] < corteC) c.j.shift(); if (!c.j.length) { delete RAD.cont[n]; return; } var sm = 0; c.j.forEach(function (x) { sm += x[1]; }); c.n = sm; if (sm > maxC0) maxC0 = sm; contos0.push(n); if (c.rc == null) c.rc = (U.semente('rc' + n) % 100) / 100; });
        contos0.sort(function (p1, p2) { return RAD.cont[p2].n - RAD.cont[p1].n; });
        RAD.agg = { t: agora, contos: contos0, maxC: maxC0 };
      }
      var contos = RAD.agg.contos.filter(function (n) { return RAD.cont[n]; }), maxC = RAD.agg.maxC;
      RAD.nCont = contos.length;
      var topC = contos.slice(0, RAD_CONTACTOS_MAX);
      topC.forEach(function (n, iC) {
        var c = RAD.cont[n], q = anguloDoAndar(n), nr = Math.log(1 + c.n) / Math.log(1 + maxC);
        var rc = R * (0.3 + 0.6 * (c.rc != null ? c.rc : (U.semente('rc' + n) % 100) / 100)), xc = cx + Math.cos(q) * rc, yc = cy + Math.sin(q) * rc;
        var atr = (a - q) % TAU; if (atr < 0) atr += TAU;
        if (atr < 0.09 && agora - c.blip > RAD.intervalo * 0.5) { c.blip = agora; RAD.nBlips++; }
        var fos = Math.min(1, 0.14 + 0.86 * Math.exp(-atr * 2.4) + (Math.abs(rc - RAD.rOnda) < 6 ? 0.6 : 0)), corC = U.corDoAndar ? U.corDoAndar(Number(n)) : C.cy;   // + o eco da onda
        if (fos > 0.55) { ctx.globalAlpha = 0.35 + 0.6 * (fos - 0.55) / 0.45; rot(ctx, String(n), xc + 4, yc - 3, '#b8ffd9', 7, 'left', 600); ctx.globalAlpha = 1; }   // 21/10 23h: o andar, como no radar de aeroporto
        ctx.globalAlpha = fos; ctx.fillStyle = fos > 0.75 ? '#ffffff' : corC;
        ctx.beginPath(); ctx.arc(xc, yc, 0.9 + 1.5 * nr + 0.8 * Math.exp(-atr * 3), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        if (fos > 0.5) luz(ctx, corC, xc, yc, 4 + 4 * nr, fos * 0.5);
        var ib2 = (agora - c.blip) / 700; if (iC < 3 && ib2 < 1) { ctx.strokeStyle = corC; ctx.globalAlpha = (1 - ib2) * 0.8; ctx.beginPath(); ctx.arc(xc, yc, 2 + ib2 * 9, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      });
      var LQ = leques(RAD.pontos);
      Object.keys(RAD.pontos).forEach(function (id) {
        var p = RAD.pontos[id], dv = LQ[id] || 0, q = anguloDoAndar(p.andar) + dv * 0.24;
        var rr = clamp(R * ((p.sev === 'vermelho' ? 0.5 : 0.78) + dv * 0.1) + ((U.semente(id) % 9) - 4) * 0.3, R * 0.18, R * 0.96);
        var x = cx + Math.cos(q) * rr, y = cy + Math.sin(q) * rr, idade = (agora - p.t0) / 1000, atras = (a - q) % TAU; if (atras < 0) atras += TAU;
        var fosforo = p.ok ? 0.35 + 0.65 * Math.exp(-atras * 0.9) : 0.5 + 0.5 * Math.exp(-atras * 1.8), cor, base = 1;   // 21/10: pisca mais a passagem
        if (p.ok) { var ida = (agora - p.ok) / 1000; if (ida > 9) { delete RAD.pontos[id]; return; } base = 1 - ida / 9; cor = C.ok; }
        else cor = p.sev === 'vermelho' ? C.mau : C.am;
        // 21/10 22h30: a avaria brilha pela GRAVIDADE (vermelho > amarelo) e pela IMPORTANCIA do sector (o dinheiro pesa mais); pulsa mais
        // depressa e mais forte quanto mais pesa; ecoa quando a onda do sonar passa
        var gravA = p.ok ? 0.4 : (p.sev === 'vermelho' ? 1 : 0.6), pesoA = pesoDoAndar(p.andar), forcaA = gravA * (0.5 + 0.5 * pesoA);
        var pulsoA = p.ok ? 0 : 0.5 + 0.5 * Math.sin(t * (2 + 4 * forcaA)), ecoA = Math.abs(rr - (RAD.rOnda || -99)) < 6 ? 0.5 : 0;
        ctx.globalAlpha = Math.min(1, base * (fosforo + ecoA)); ctx.fillStyle = cor;
        ctx.beginPath(); ctx.arc(x, y, 2 + 2.4 * forcaA + 1.4 * Math.max(0, 1 - idade) + 0.8 * forcaA * pulsoA, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        luz(ctx, cor, x, y, 7 + 13 * forcaA + 4 * pulsoA * forcaA, Math.min(1, base * (fosforo + ecoA) * (0.45 + 0.55 * forcaA)));
        if (!p.ok) {                                                  // 21/10 23h: a avaria marcada em quadrado (radar de aeroporto), maior com mais peso
          var qd = 5 + 4 * forcaA;   // 22/10 (ele: "quadrados em volta das bolinhas, nao gostei"): sem o quadrado - fica o ponto, o brilho, o nome e o blip
          if (forcaA >= 0.55 || GR.lado) rot(ctx, TX.cortar(nomeDaAvaria(p), 14) + ' · ' + numAndar(p.andar), x + qd + 3, y + 3, cor, 7, 'left', 700);
        }
        if (idade < 3 && !p.ok) { ctx.strokeStyle = cor; ctx.globalAlpha = 1 - idade / 3; ctx.beginPath(); ctx.arc(x, y, 4 + idade * 5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        if (!p.ok && atras < 0.09 && agora - (p.blip || 0) > RAD.intervalo * 0.5) p.blip = agora;   // 21/10: o blip da avaria
        var ibp = (agora - (p.blip || 0)) / 800; if (!p.ok && ibp < 1) { ctx.strokeStyle = cor; ctx.globalAlpha = 1 - ibp; ctx.beginPath(); ctx.arc(x, y, 3 + ibp * 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
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
      rot(ctx, 'AVARIAS ' + RAD.abertas + ' · CONTACTOS ' + Math.min(RAD.nCont || 0, RAD_CONTACTOS_MAX) + '/' + (RAD.nCont || 0), 8, h - 6, RAD.abertas ? C.mau : C.ok, 9, 'left', 600);
      // 05/10 (ele: "mais detalhes e informacoes relevantes"): os 3 casos abertos mais antigos - quem e ha quanto tempo
      // 10/10: a MESMA lista da luz do cabecalho (avariasAbertas: vermelhos primeiro, depois os mais antigos), com o nome do
      // PROGRAMA e o andar (era o funcionario que o tem - "Analista Bruner" - e a luz dizia o programa: pareciam outros casos)
      var foraV = avariasAbertas(RAD.pontos);
      var xL = GR.lado ? w * 0.58 : 6, nL = GR.lado ? Math.max(1, Math.min(6, Math.floor((h - TOPO - 24) / 13))) : 3, cL = GR.lado ? Math.floor((w * 0.42 - 8) / 4.6) : 26;
      if (GR.lado) rot(ctx, foraV.length ? 'FORA DO VERDE · ' + foraV.length : 'TUDO VERDE', xL, TOPO + 10, foraV.length ? C.am : C.ok, 7.5, 'left', 700);
      var cabem = foraV.length > nL ? Math.max(1, nL - 1) : nL;          // a ultima linha diz quantos faltam, se nao couberem todos
      foraV.slice(0, cabem).forEach(function (p, i) {
        var min = Math.max(1, Math.round((agora - p.t0) / 60000));
        var ha = min < 60 ? min + ' min' : Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0');
        rot(ctx, TX.cortar('● ' + nomeDaAvaria(p) + ' · and. ' + numAndar(p.andar) + ' · há ' + ha, cL), xL, (GR.lado ? TOPO + 24 : 12) + i * (GR.lado ? 13 : 11), p.sev === 'vermelho' ? C.mau : C.am, 7.5, 'left', 600);
      });
      if (foraV.length > cabem) rot(ctx, '+ ' + (foraV.length - cabem) + ' (passe o mouse na luz do topo)', xL, (GR.lado ? TOPO + 24 : 12) + cabem * (GR.lado ? 13 : 11), C.am, 7, 'left', 600);
      // 21/10: por baixo, os andares mais activos (o que os contactos sao)
      if (GR.lado && contos.length) {
        var yA = TOPO + 24 + (Math.min(foraV.length, cabem) + (foraV.length > cabem ? 1 : 0)) * 13 + 8;
        var topA = contos;                                              // (ja vem por ordem)
        var cabeA = Math.floor((h - 14 - yA) / 12);
        if (cabeA >= 2) {
          rot(ctx, 'A TRABALHAR · ' + contos.length + ' andares', xL, yA, C.cy, 7.5, 'left', 700);
          topA.slice(0, Math.min(3, cabeA - 1)).forEach(function (n, i) { var an = T3B.andar ? T3B.andar(Number(n)) : null, nm = an ? TX.limpar(an.sector || an.nome || '') : '';
            rot(ctx, TX.cortar('▸ ' + (nm || 'and. ' + n) + ' · ' + fmt(RAD.cont[n].n, 0), cL), xL, yA + 12 + i * 12, U.corDoAndar ? U.corDoAndar(Number(n)) : C.cy, 7.5, 'left', 600); });
        }
      }
    } });
    cenaRadar.ctx._cacheTexto = true;   // 22/10 00h30 (A/B medido na mesma pagina: radar 1,85 ms com as imagens do texto, 4,95 sem; nos outros pior)
  })();

  // ================================================================ 3. O CORACAO DA TORRE (G22) — cada evento e uma batida
  // D.ecg: a linha de batimento. Real: CADA evento do /vivo.json e uma batida (a altura pela forca do evento: mudou > falou >
  // escreveu), o batimento do vigia e a batida forte; o numero e batidas por minuto (o ritmo real da torre).
  // 05/10 (Q4 B8, ele: "precisa otimizar e tambem deixar mais fluido, pode adicionar mais algum detalhe"): a linha andava aos
  // saltos (shift de N amostras por quadro, a 15 q/s) e parava 4 s depois do ultimo evento. Agora corre SEMPRE, com deslocamento
  // abaixo do pixel (amostras a 60 por segundo e o resto da conta empurra o desenho); a batida tem a forma PQRST; sem eventos a
  // linha fica quase plana mas viva (um ruido de 1-2%); o traco tem rasto (mais apagado a esquerda) e uma ponta que brilha; o
  // numero e o coracao pequeno batem a cada batida real; a grelha e uma camada guardada.
  var ECG = { seg: null, minuto: null, oxi: null, fase: 0, acum: 0, acumAndar: {}, pendentes: [], y: null, fila: [], bat: [], ultimo: 0, n: 0, acc: 0, tBat: 0, lote: null, lotes: [], nLotes: 0, normal: null, batT: [] };
  var PQRST = [0, 0.04, 0.08, 0.04, 0, 0, -0.1, 1, -0.42, -0.08, 0, 0.06, 0.12, 0.16, 0.12, 0.05, 0];
  var PQRST_CURTO = PQRST.filter(function (v, i) { return i % 2 === 0; });   // 16/10: a batida curta de uma rajada (9 amostras, 0,15 s)
  // 21/10 20h (ele: "a cada segundo o sistema tem que identificar quantas batidas da; o vortex e o coracao sao praticamente 1"):
  // o coracao bate NO COMPASSO (t3b_vivo.js: batidaDoCompasso) - uma batida por segundo em que alguma coisa aconteceu, na virada do
  // segundo, com a FORCA das accoes desse segundo; segundo vazio = linha plana. O nucleo do vortex bate na mesma batida, e os pontos
  // dos eventos acendem nesse mesmo instante (os eventos saem todos na virada do segundo). PURA (testes_t3b.js).
  // <coracao-puro>
  // 21/10 21h: a forca da batida do oximetro = o que entrou desde a anterior contra o esperado no basal (a 'perfusao')
  function perfusao(acum, esperado) { if (!(acum > 0)) return 0.4; return Math.max(0.45, Math.min(1.5, 0.55 + 0.45 * Math.sqrt(acum / Math.max(0.5, esperado || 1)))); }
  function forcaDaBatida(n, acoes) { n = Number(n) || 0; acoes = Number(acoes) || 0; if (n <= 0) return 0; return Math.min(1.55, 0.72 + 0.14 * Math.log2(1 + n) + (acoes > n ? 0.06 * Math.log2(acoes / n) : 0)); }
  // </coracao-puro>
  // 16/10 17h (ele: "o coracao bate errado, as vezes 300/min, as vezes 10/min"): CADA EVENTO E UMA BATIDA - ECG.bat guarda [hora,
  // 1] e o lote conta EVENTOS; as accoes de um evento (os 300 genes de um lab, as 30 regras de um ficheiro) fazem a batida mais FORTE,
  // nao mais batidas (um lote de 300 genes dava 8 batidas seguidas e o numero saltava para 345)
  function somaBat() { return ECG.bat.length; }
  aoReagir('coracao', function (ev, r) {
    var w = nDe(ev);
    if (ev.historia) { ECG.bat.push([ev.ms || Date.now(), 1]); ECG.n += 1; return; }   // o passado (a 1.a leitura): conta, mas nao bate nem acende
    // 16/10 18h: um evento que toca com mais de 3 s de atraso (o telemovel congelou os temporizadores com a pagina em segundo plano)
    // conta, mas nao bate: ao voltar a pagina, minutos de eventos acumulados disparavam de uma vez e o coracao ficava 'acelerado'
    if (ev.alvo_ms && Date.now() - ev.alvo_ms > 3000) { ECG.bat.push([ev.alvo_ms, 1]); ECG.n += 1; return; }
    var f = clamp(r.forca || 0.5, 0.2, 1) * (ev.k === 'batimento' ? 1.4 : 1), ag = agoraMs();
    // 08/10 (OBRA 11): o que chega JUNTO (o mesmo lote do /vivo.json) e UMA batida, mais forte quanto mais coisas mexem. Antes cada
    // evento punha uma batida inteira (0,3 s) na fila: uma rajada de 10 deixava o coracao 3,5 s atrasado do vortex e dos cartoes
    if (ECG.lote && ag - ECG.lote.t0 < 90) { ECG.lote.n += 1; ECG.lote.acoes += w; ECG.lote.f = Math.max(ECG.lote.f, f); }   // 16/10: 150 -> 90 ms (os segundos espalhados batem cada um)
    else { ECG.lote = { n: 1, acoes: w, f: f, t0: ag, feito: false }; ECG.lotes.push([Date.now(), 1]); }
    ECG.lotes[ECG.lotes.length - 1][1] = ECG.lote.n;
    ECG.bat.push([Date.now(), 1]); ECG.n += 1;
    // 21/10 21h (ele: "o vortex e o coracao sao 1; uma constelacao, o tamanho da estrela e a importancia"): o ponto deste evento ESPERA
    // a proxima batida do coracao (os dois acendem juntos); o tamanho e o brilho vem da importancia do evento (importanciaDoEvento)
    var np = Math.min(20, ev.grupo ? w : Math.max(1, Math.ceil(Math.sqrt(w))));   // 21/10 22h30: uma estrela por funcionario do grupo; num lote, mais estrelas com mais accoes (raiz, ate 20)
    for (var ipz = 0; ipz < np; ipz++) { var pz = pulsoDoEvento(ev, ipz); pz.f = f; pz.imp = importanciaDoEvento(ev); ECG.pendentes.push(pz); }
    if (ECG.pendentes.length > 400) ECG.pendentes.splice(0, ECG.pendentes.length - 400);
    ECG.acum += w; if (ev.andar != null) ECG.acumAndar[ev.andar] = (ECG.acumAndar[ev.andar] || 0) + w;
    NUC.nPontos = (NUC.nPontos || 0) + np;
  });
  EXTRA.coracao = function () { return { eventos: ECG.n, batidas: ECG.nLotes, na_fila: ECG.fila.length, bpm: somaBat(), ultimo_lote: ECG.lote ? ECG.lote.n : 0 }; };
  // o ritmo normal da torre (para a cor): 16/10 18h - so com 3+ min de medida (com a janela a encher comecava baixo e tudo parecia
  // 'acelerado' durante ~20 min); ate la a cor e a neutra
  T3B.on('ritmo', function (r) { if (ECG.normal == null && r && r.n > 0 && (r.janela_min || 0) >= 3) ECG.normal = Math.max(20, r.n); });
  // 21/10 20h: a batida do compasso (a desenhar no proximo quadro: o mesmo instante dos eventos)
  T3B.on('compasso', function (c) {
    ECG.seg = c && c.segundo; ECG.minuto = c && c.minuto; ECG.oxi = c ? { bpm: c.bpm, taxa: c.taxa, basal: c.basal } : null;   // 21/10 21h: o oximetro
    // 21/10 22h: cada valor de mercado que mudou neste segundo e uma estrela pequena no vortex (sai na proxima batida, com as outras)
    var nv = Math.min(6, (c && c.segundo && c.segundo.valores) || 0);
    for (var iv2 = 0; iv2 < nv && ECG.pendentes.length < 400; iv2++) ECG.pendentes.push({ n: null, t: 0, ip: Math.floor(Math.random() * NUC.p.length), cor: COR_ESTRELA, nome: '', imp: 0.12 });
  });
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
      // 21/10 21h (ele: "o coracao detecta quantas accoes por segundo a torre faz, como um oximetro"): o MARCA-PASSO do oximetro - a
      // frequencia vem do compasso (freqDoOximetro: as accoes/s da torre inteira contra o BASAL dela; 72 bpm no basal); cada batida leva
      // o que entrou desde a anterior: os pontos do vortex acendem NESTA batida e o equalizador salta nesta batida
      var bpm = NUC.ritmo && NUC.ritmo.n != null ? NUC.ritmo.n : somaBat();
      if (ECG.lote && !ECG.lote.feito) ECG.lote.feito = true;
      var bpmO = ECG.oxi && ECG.oxi.bpm ? ECG.oxi.bpm : 72;
      if (!calmo) ECG.fase += dt * bpmO / 60;
      if (ECG.fase >= 1) {
        ECG.fase = ECG.fase >= 2 ? 0 : ECG.fase - 1;
        var esperado = Math.max(0.5, (ECG.oxi && ECG.oxi.basal ? ECG.oxi.basal : 1) * 60 / bpmO);
        var ampA = perfusao(ECG.acum, esperado), agB = agoraMs(), pend = ECG.pendentes; ECG.pendentes = [];
        pend.forEach(function (pz) { pz.t = agB; PULSOS.push(pz); });
        if (PULSOS.length > PULSOS_MAX) PULSOS.splice(0, PULSOS.length - PULSOS_MAX);
        T3B.emit('batida', { acoes: ECG.acum, porAndar: ECG.acumAndar, pontos: pend.length, amp: ampA });
        ECG.acum = 0; ECG.acumAndar = {};
        ECG.nLotes += 1; ECG.ultimo = agB; ECG.batT.push(Date.now());
        NUC.bate = Math.min(1.3, (NUC.bate || 0) + 0.45 * Math.min(1.2, ampA));   // o nucleo do vortex bate com o coracao
        if (ECG.fila.length > 30) ECG.fila.length = 30;
        PQRST.forEach(function (v) { ECG.fila.push(v * ampA); });
      }
      ECG.acc += dt * AMOSTRAS_S;
      while (ECG.acc >= 1) {
        ECG.acc -= 1; ECG.y.shift();
        ECG.y.push(ECG.fila.length ? ECG.fila.shift() : 0.012 * Math.sin(t * 9.1) + 0.008 * Math.sin(t * 23.7) + 0.006 * Math.sin(t * 2.3));
      }
      var corte = Date.now() - 60000; while (ECG.bat.length && ECG.bat[0][0] < corte) ECG.bat.shift();
      while (ECG.batT.length && ECG.batT[0] < corte) ECG.batT.shift();
      ctx.clearRect(0, 0, w, h);
      porCamada(ctx, s, 'grelha', '', grelha);
      var base = h * 0.6, amp = h * 0.46, sub = ECG.acc * PASSO, ult = ECG.y.length - 1;
      var xDe = function (i) { return X0 + (i - (ult - Math.ceil((w - X0) / PASSO))) * PASSO - sub; };
      // 05/10 (ele: "vai mudar de cores quando a velocidade muda"): verde calmo, ouro activo, vermelho acelerado (batidas por minuto)
      // 08/10 (OBRA 11): a cor pela MUDANCA de velocidade (ele: "vai mudar de cores quando a velocidade muda") - contra o ritmo normal da
      // torre (media dos ultimos ~20 min), nao contra numeros fixos (de dia a torre fica sempre acima de 90/min e era sempre vermelho)
      if (ECG.normal != null) ECG.normal += (Math.max(20, bpm) - ECG.normal) * Math.min(1, dt / 1200);
      var bpmH = ECG.oxi && ECG.oxi.bpm ? ECG.oxi.bpm : 72, estado = bpmH > 130 ? 2 : bpmH >= 100 ? 1 : 0,   // 21/10 21h: as faixas do corpo humano
       RGB3 = ['63,214,154', '242,194,48', '255,90,95'], g = ECG.grad;
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
      rot(ctx, String(bpmH), 8, h * 0.5 + 6, 'rgb(' + RGB3[estado] + ')', 20, 'left', 700);
      rot(ctx, 'bpm · ' + ['normal', 'activo', 'acelerado'][estado], 46, h * 0.5 + 5, 'rgba(' + RGB3[estado] + ',.85)', 7.5, 'left', 600);
      var sgE = ECG.seg, mnE = ECG.minuto;   // 21/10 20h: o compasso - este segundo e o ultimo minuto, por tipo
      var ox = ECG.oxi || {}, spo2 = (RAD.verdes || 0) + (RAD.abertas || 0) > 0 ? Math.round(100 * (RAD.verdes || 0) / ((RAD.verdes || 0) + (RAD.abertas || 0))) : null;
      rot(ctx, '♥ oxímetro · ' + String((ox.taxa || 0).toFixed(1)).replace('.', ',') + ' acções/s (normal da torre ' + (ox.basal ? String(ox.basal.toFixed(1)).replace('.', ',') : '…') + (ox.basal ? ' · ' + Math.round(100 * (ox.taxa || 0) / ox.basal) + '% do normal' : '') + ') · SpO₂ ' + (spo2 == null ? '…' : spo2 + '%') + (mnE ? ' · min: trabalho ' + mnE.porTipo.trabalho + ' · chat ' + mnE.porTipo.chat + ' · mercado ' + mnE.porTipo.mercado : ''), 8, 12, 'rgba(255,123,127,.9)', 7.5, 'left', 700);
      var ulP = PULSOS[PULSOS.length - 1];                                     // (Q5 B7) o nome do sector pulsa a cada batida
      if (ulP && ulP.nome) { var idU = (agoraMs() - ulP.t) / 1000; if (idU < 2.2) { ctx.globalAlpha = 1 - idU / 2.2; rot(ctx, TX.cortar(ulP.nome, 24), 8, h * 0.5 + 20, ulP.cor, 8 + 2.5 * Math.max(0, 1 - idU * 3), 'left', 700);
        if (ECG.lote && (ECG.lote.n > 1 || ECG.lote.acoes > 1)) rot(ctx, ECG.lote.n > 1 ? ECG.lote.n + ' ao mesmo tempo' : ECG.lote.acoes + ' acções num evento', 8, h * 0.5 + 31, 'rgba(255,255,255,.75)', 7.5, 'left', 600);   // o enxame
        ctx.globalAlpha = 1; } }
      var hx = 70, hy = h * 0.5 - 2, hs = 5.2 * esc;
      ctx.fillStyle = bt > 0.05 ? '#ff7b7f' : 'rgba(255,90,95,.75)';
      ctx.beginPath(); ctx.moveTo(hx, hy + hs * 0.9); ctx.bezierCurveTo(hx - hs * 1.6, hy - hs * 0.2, hx - hs * 0.6, hy - hs * 1.3, hx, hy - hs * 0.45); ctx.bezierCurveTo(hx + hs * 0.6, hy - hs * 1.3, hx + hs * 1.6, hy - hs * 0.2, hx, hy + hs * 0.9); ctx.fill();
      if (bt > 0.05) luz(ctx, C.mau, hx, hy, 11, bt * 0.8);
      // 16/10 (medido: 24 eventos/min davam 11 batidas - os do mesmo segundo batem juntos): as batidas aparecem ao lado dos eventos
      if (s.desenhos % 30 === 0) { var nbt = ECG.batT.length, acm = NUC.ritmo && NUC.ritmo.acoes != null ? NUC.ritmo.acoes : 0;   // 16/10: as batidas que se veem (cada evento bate)
        mini('hm_coracao', [['', fmt(bpmH, 0), 'bpm'], ['', String(((ECG.oxi || {}).taxa || 0).toFixed(1)).replace('.', ','), 'acções/s'], ['', fmt(bpm, 0), 'eventos/min']]);
        var blc = $('bl_coracao'); if (blc) blc.title = bpm + ' eventos por minuto (média dos últimos ' + ((NUC.ritmo && NUC.ritmo.janela_min) || 5) + ' min; cada evento é uma batida) · ' + acm + ' acções/min (um lote de genes conta cada um) · ' + nbt + ' batidas no último minuto (numa rajada, até 8 batidas curtas)'; }
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
    var r = obj(T && T.reactor), md = obj(r.medidor), S = obj(window.__md && window.__md.S), rl = realDaCasa(T);
    var n = function (x) { x = Number(x); return isFinite(x) ? x : null; }, v;
    if (rl) {
      // 10/10 21:3x (ordem dele: "nada dos numeros de simulacao"): com a conta real activa o dia e o DELA - ao vivo quando ha preco
      // (t3b_vivo.js: realHoje), senao o da ultima volta do executor; sem as marcas do plano do papel (stop, meta, esperado)
      v = n(T3B.estado.realHoje); if (v == null) v = n(rl.hoje_usd); if (v == null) return;
      VEL.stop = null; VEL.meta = null; VEL.esp = null; VEL.real = true;
    } else {
      v = lerAgoraDoInstrumento(); if (v == null) v = Number(md.agora);
      if (!isFinite(v)) return;
      VEL.real = false;
      VEL.stop = n(obj(r.limites).perda_dia_usd); VEL.meta = n(S.meta); VEL.esp = n(S.esp != null ? S.esp : obj(r.cartao_plano).esperado_usd);
    }
    var vals = [v, 0, VEL.stop, VEL.meta, VEL.esp].filter(function (x) { return x != null; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), folga = Math.max(1, (mx - mn) * 0.15);
    VEL.min = mn - folga; VEL.max = mx + folga;
    if (VEL.a !== v) { var mudou = VEL.a != null; VEL.a = v; if (VEL.v == null) VEL.v = v; if (mudou && creditar) creditarHolo('velocimetro', 'velocimetro', 'resultado do dia → ' + sinal(v, 2)); T3B.estado.resultadoDia = v; T3B.emit('resultadoDia', v); sujar(cenaVel, 1500); }
    // c02 "painel vazio ou —": sem meta definida diz-se "sem meta", nunca um traco
    mini('hm_velocimetro', VEL.real ? [['', sinal(v, 2), 'US$', v >= 0 ? 'up' : 'dn'], ['conta', 'real · Binance'], ['desde o início', T3B.estado.realIni != null ? sinal(T3B.estado.realIni, 2) : (rl && rl.desde_o_inicio_usd != null ? sinal(rl.desde_o_inicio_usd, 2) : '—')]]
      : [['', sinal(v, 2), 'US$', v >= 0 ? 'up' : 'dn'], ['stop', VEL.stop != null ? sinal(VEL.stop, 2) : 'sem stop'], ['meta', VEL.meta != null ? sinal(VEL.meta, 2) : 'sem meta']]);
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
  // 10/10 21:3x (ordem dele): com a conta real activa o trilho do dia e o da CONTA REAL - a serie que o t3b_vivo.js escreve na
  // pagina (um ponto por minuto, a partir do "hoje" ao vivo); o pico e o vale saem dela. Sem conta real, o medidor do papel.
  function serieDoDia(T) {
    var md = obj(obj(T.reactor).medidor), rl = realDaCasa(T);
    if (!rl) return { serie: lista(md.serie), agora: Number(md.agora), pico: md.pico, vale: md.vale, real: false };
    var s = lista(T3B.estado.serieReal), vs = s.map(function (p) { return Number(p[1]); }).filter(isFinite);
    var ag = T3B.estado.realHoje != null ? Number(T3B.estado.realHoje) : Number(rl.hoje_usd);
    return { serie: s, agora: ag, pico: vs.length ? Math.max.apply(null, vs.concat([0])) : null, vale: vs.length ? Math.min.apply(null, vs.concat([0])) : null, real: true };
  }
  function actualizarTrilho(T) {
    var sd = serieDoDia(T), serie = sd.serie, pico = sd.pico != null ? sinal(sd.pico, 2) : '—', vale = sd.vale != null ? sinal(sd.vale, 2) : '—';
    var ass = serie.length + ':' + (serie.length ? serie[serie.length - 1].join(',') : '');
    var ult = serie.length ? Number(serie[serie.length - 1][1]) : sd.agora;
    mini('hm_trilho', [['agora', isFinite(ult) ? sinal(ult, 2) : 'sem pontos', '', ult >= 0 ? 'up' : 'dn'], ['pico', pico], ['vale', vale]]);
    U.txt($('h_trilho_e'), (sd.real ? 'conta real · ' : '') + 'pico ' + pico + ' · vale ' + vale);
    if (ass === TRI.ass) return;
    var novo = TRI.ass !== '' && serie.length > TRI.d.length;
    TRI.ass = ass;
    var vals = serie.map(function (p) { return Number(p[1]); }).filter(isFinite);
    if (vals.length > 90) { var passo = vals.length / 90, out = []; for (var i = 0; i < 90; i++) out.push(vals[Math.min(vals.length - 1, Math.round(i * passo))]); out[89] = vals[vals.length - 1]; vals = out; }
    TRI.d = vals;
    if (!TRI.t0) TRI.t0 = performance.now() / 1000;
    if (novo) { TRI.sl = performance.now() / 1000; creditarHolo('trilho', 'trilho', 'trilho +1 ponto ' + (serie[serie.length - 1] || [])[0]); }
    sujar(cenaTri, 1700);
  }
  T3B.on('torre', actualizarTrilho);
  T3B.on('serieReal', function () { if (T3B.estado.T) actualizarTrilho(T3B.estado.T); });
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
    // 16/10 (ele: "os hologramas nao mostram os dados certos"): o parecer em vigor ainda falava do PAPEL ("o dinheiro em papel vai bem:
    // +72,59") - o briefing do Stark so lhe dava o papel. Com a conta real activa, um parecer do papel nao se mostra como se fosse real
    if (realDaCasa(T3B.estado.T) && /\bem papel\b|\bpapel\b.{0,40}(liquid|vai bem|positivo)|dinheiro em papel/i.test(p)) {
      p = 'O meu último parecer ainda era sobre a simulação em papel, que acabou a 12/10. O próximo já vem com a conta real da Binance.';
    }
    ROBO.mod = s.modelo || ROBO.mod; ROBO.t = s.t_iso || ROBO.t;
    if (p === ROBO.parecer) return;
    var primeira = !ROBO.parecer; ROBO.parecer = p;
    ROBO.decisao = primeiraFrase(TX.semMarkdown(TX.limpar(String(s.decisao || ''))) || p);
    if (!primeira) { ROBO.tf = agoraMs() / 1000; ROBO.olho = 1; creditarHolo('stark', 'stark', 'parecer novo do Sr. Stark'); }
  });
  aoReagir('stark', function (ev) { ROBO.fala = agoraMs() / 1000; ROBO.aceno = 1; ROBO.olho = Math.max(ROBO.olho, ev.k === 'mudou' || ev.k === 'falou' ? 1 : 0.6); });
  // 05/10 (ele: "mais interacoes... mostrar alguma estatistica interessante"): a estatistica real da casa a rodar de 3,5 em 3,5 s
  // 10/10 (ordem dele): com a conta real activa os numeros de dinheiro dos hologramas sao os DELA (torre.json -> real)
  function realDaCasa(T) { var rl = obj(T && T.real); return rl.ativo && rl.patrimonio != null && isFinite(Number(rl.patrimonio)) ? rl : null; }
  function statsDoStark() {
    var T = obj(T3B.estado.T), r = obj(T.reactor), g = obj(r.ganho), je = obj(r.ja_entrou), ex = obj(T.extremis), o = [], rl = realDaCasa(T);
    if (rl) {
      if (rl.hoje_usd != null) o.push(['HOJE · REAL', sinal(rl.hoje_usd, 2) + ' US$', rl.hoje_usd >= 0 ? C.ok : C.mau]);
      if (rl.aberto_usd != null) o.push(['EM ABERTO · REAL', sinal(rl.aberto_usd, 2) + ' US$ · ' + lista(rl.posicoes).length + ' posições', rl.aberto_usd >= 0 ? C.ok : C.mau]);
      if (rl.desde_o_inicio_usd != null) o.push(['DESDE O INÍCIO · REAL', sinal(rl.desde_o_inicio_usd, 2) + ' US$ (' + sinal(rl.desde_o_inicio_pct, 2) + '%)', rl.desde_o_inicio_usd >= 0 ? C.ok : C.mau]);
      // 16/10: o 'realizado hoje' mostrava o realizado DESDE O INICIO - agora o de hoje (as vendas fechadas desde as 00h11) e o acumulado
      if (rl.realizado_hoje_usd != null) o.push(['REALIZADO HOJE · REAL', sinal(rl.realizado_hoje_usd, 2) + ' US$', rl.realizado_hoje_usd >= 0 ? C.ok : C.mau]);
      if (rl.realizado_usd != null) o.push(['REALIZADO · DESDE O INÍCIO', sinal(rl.realizado_usd, 2) + ' US$', rl.realizado_usd >= 0 ? C.ok : C.mau]);
      if (ex.geracao_actual != null) o.push(['EVOLUÇÃO', 'geração ' + ex.geracao_actual + ' · ' + fmt(ex.n_familias, 0) + ' famílias', C.ouroHi]);
      return o;
    }
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
    var it = [[CONT.hojeRot || 'REALIZADO HOJE', CONT.hoje], ['EM ABERTO', CONT.aberto], ['ACERTO', CONT.acerto], ['OPERAÇÕES', CONT.ops], ['POSIÇÕES', CONT.pos], ['GENES ROBUSTOS', CONT.rob], ['AVALIAÇÕES', CONT.aval], ['GERAÇÃO', CONT.ger], ['FAMÍLIAS', CONT.fam], ['GENES', CONT.genes], ['FUNCIONÁRIOS', CONT.censo]].filter(function (x) { return x[1] != null; });
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
    mini('hm_numeros', [['eventos', fmt(s, 0)], ['ops', CONT.ops != null ? CONT.ops : '—'], ['genes', CONT.genes || '0']]);
  });
  T3B.on('torre', function (T) {
    var r = obj(T.reactor), je = obj(r.ja_entrou), ex = obj(T.extremis);
    CONT.ops = fmt(je.operacoes, 0); CONT.acerto = je.n_ganhos != null && je.operacoes ? fmt(je.n_ganhos / Math.max(1, je.n_ganhos + je.n_perdas) * 100, 1) + '%' : null;
    CONT.genes = fmt(ex.n_genes, 0); CONT.aval = fmt(ex.n_avaliacoes, 0); CONT.ger = ex.geracao_actual != null ? String(ex.geracao_actual) : null; CONT.fam = ex.n_familias != null ? fmt(ex.n_familias, 0) : null;
    CONT.pos = String(lista(r.posicoes).length);
    var g = obj(r.ganho); CONT.hoje = g.realizado_usd != null ? sinal(g.realizado_usd, 2) + ' US$' : null; CONT.aberto = r.aberto_total_usd != null ? sinal(r.aberto_total_usd, 2) + ' US$' : null;
    var rlC = realDaCasa(T);                                // 10/10: a conta real, quando activa
    if (rlC) { CONT.pos = String(lista(rlC.posicoes).length); CONT.hoje = rlC.hoje_usd != null ? sinal(rlC.hoje_usd, 2) + ' US$' : null; CONT.aberto = rlC.aberto_usd != null ? sinal(rlC.aberto_usd, 2) + ' US$' : null; }
    CONT.hojeRot = rlC ? 'HOJE · REAL' : 'REALIZADO HOJE';   // 16/10: o valor e o hoje (com o aberto), nao so o realizado
    CONT.rob = ex.robustos_alguma_vez != null ? fmt(ex.robustos_alguma_vez, 0) : null;
    CONT.acertoN = je.n_ganhos != null ? je.n_ganhos / Math.max(1, je.n_ganhos + je.n_perdas) * 100 : null; CONT.opsN = Number(je.operacoes); CONT.robN = Number(ex.robustos_alguma_vez); CONT.avalN = Number(ex.n_avaliacoes);
    if (rlC) { CONT.ops = null; CONT.acerto = null; CONT.acertoN = null; CONT.opsN = NaN; }   // 10/10 21:3x (ordem dele): operacoes e acerto sao do papel - fora com a conta real
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
    // 10/10 21:3x (ordem dele): com a conta real activa a mesa lista as posicoes REAIS (torre.json -> real.posicoes)
    var r = obj(T.reactor), rlB = realDaCasa(T), pos = rlB ? lista(rlB.posicoes) : lista(r.posicoes);
    var emUso = rlB ? pos.reduce(function (a, p) { return a + (Number(p.custo_usdt) || 0); }, 0) : obj(r.alocacao).em_uso, abertoT = rlB ? Number(rlB.aberto_usd) : Number(r.aberto_total_usd);
    U.txt($('h_mesa_e'), pos.length + ' posições · ' + fmt(emUso, 0) + ' US$ em uso' + (rlB ? ' · conta real' : ''));
    var mv = lista(r.movimentacoes).slice(-6), ass = mv.map(function (m) { return m.t + m.evento + m.simbolo; }).join('|');
    if (BAR.assMov && ass !== BAR.assMov) creditarHolo('mesa', 'mesa', 'movimentação ' + ((mv[mv.length - 1] || {}).evento || ''));
    BAR.assMov = ass;
    if (!BAR.v.length) amostraMesa(abertoT, false);
    var v = BAR.v.length ? BAR.v[BAR.v.length - 1] : abertoT;
    mini('hm_mesa', [['', String(pos.length), 'posições'], ['aberto', sinal(v, 2), '', v >= 0 ? 'up' : 'dn'], ['em uso', fmt(emUso, 0)]]);
  });

  // ================================================================ 9. LIVRO DE OFERTAS VIVO (G24, D.livro) — na Mesa de Operacoes
  // A escada de compra e venda e o LIVRO REAL da Binance (10 niveis, de 1 em 1 s) do simbolo com a maior posicao em cripto
  // aberta (sem cripto: BTC). Liga-se so com o painel a vista e aberto, e fecha com a aba escondida. A FITA ao lado: as
  // execucoes em papel (torre.json -> movimentacoes) e cada evento da Mesa com o nome de quem o fez - o nivel mais perto do
  // preco pisca a cada um (a reaccao).
  var LIV = { sym: null, ws: null, b: [], a: [], mid: null, fita: [], ordens: [], fl: null, t: 0, falhas: 0, ultMsg: 0 };
  // <livro-puro>
  // 16/10 20h (ele: "o livro de ofertas... nao esta mostrando os dados do seu sector, nao esta sincronizado - PRINCIPALMENTE O
  // LIVRO DE OFERTAS"). MEDIDO na pagina: "AS NOSSAS POSICOES" eram MSTR e INDA (accoes do PAPEL, reactor.posicoes) e, sem cripto
  // no papel, o livro era o do BTC por omissao; a fita lia as execucoes do papel (vazias desde 12/10). O sector dele e a Mesa de
  // Operacoes (and. 63), e a Mesa e a CONTA REAL: as posicoes do executor (torre.json -> real.posicoes) com o ganho/perda ao preco
  // AO VIVO (o mesmo calculo do cartao "em aberto": quantidade x preco - custo com a comissao), o livro da Binance de CADA uma em
  // roda (15 s cada) e as ordens reais (real.ordens). Sem conta real activa: nenhuma posicao (nunca o papel). PURAS (testes_t3b.js).
  function posicoesDaMesa(T, precoDe) {
    var rl = (T && T.real) || {}, fora = [];
    if (!rl.ativo || !Array.isArray(rl.posicoes)) return fora;
    rl.posicoes.forEach(function (p) {
      var q = Number(p && p.qty), cu = Number(p && p.custo_usdt), e = Number(p && p.entrada), s = String((p && p.simbolo) || '');
      if (!s || !(q > 0)) return;
      if (!(e > 0) && cu > 0) e = cu / q;
      if (!(e > 0)) return;
      var vivo = precoDe ? Number(precoDe(s)) : NaN, ag = Number(p.agora), px = vivo > 0 ? vivo : (ag > 0 ? ag : e);
      var custo = cu > 0 ? cu : q * e, pnl = q * px - custo;
      fora.push({ sym: s, base: s.replace(/USDT$/, ''), qty: q, entrada: e, custo: custo, nucleo: String(p.nucleo || ''), preco: px,
        vivo: vivo > 0, pnl: pnl, pct: custo > 0 ? pnl / custo * 100 : 0 });
    });
    return fora.sort(function (a, b) { return b.custo - a.custo; });
  }
  function simboloEmRoda(pos, agoraMs, rodaMs) {
    if (!pos || !pos.length) return null;
    return pos[Math.floor(Number(agoraMs) / (rodaMs || 15000)) % pos.length].sym;
  }
  // (16/10 20h40, ele: "as informacoes tao aparecendo tudo amontoadas"): curta - "13:41 +BTC 11,42" (compra), "20:11 −ZEC adiada ×7"
  function textoOrdem(o) {
    if (!o) return '';
    var hh = String(o.t || '').slice(11, 16), sinalO = o.lado === 'BUY' ? '+' : o.lado === 'SELL' ? '−' : '';
    var b = String(o.simbolo || '').replace(/USDT$/, ''), u = Number(o.usdt);
    var est = /preench|feita|fill/i.test(o.estado || '') ? '' : ' ' + ({ saltada: 'adiada', recusada: 'recusada', falhou: 'falhou' }[o.estado] || o.estado);
    return (hh ? hh + ' ' : '') + sinalO + b + (u > 0 && !est ? ' ' + u.toFixed(2).replace('.', ',') : '') + est + (o.vezes > 1 ? ' ×' + o.vezes : '');
  }
  // </livro-puro>
  var LIVRO_RODA_MS = 15000;
  var BALDE = null;                                     // 21/10: o balde de sinais (evolucao.json -> balde)
  T3B.on('balde', function (b) { BALDE = b; sujar(cenaLivro, 0); sujar(cenaLab, 0); });
  function precoVivoDe(s) { return T3B.precoVivo ? T3B.precoVivo(s) : (s === LIV.sym ? LIV.mid : null); }
  function posMesa() { return posicoesDaMesa(T3B.estado.T, precoVivoDe); }
  function simboloDaMesa() { return simboloEmRoda(posMesa(), Date.now(), LIVRO_RODA_MS) || 'BTCUSDT'; }
  function livroVisivel() { var h = $('h_livro'); return !!(h && !h.classList.contains('min') && !document.hidden && !gavetaAberta && !T3B.pequeno && !(T3B.estado.perto && !$('palco').classList.contains('holos-de-volta'))); }
  function aoLivro(d) { if (!d) return; LIV.b = (d.bids || []).slice(0, 10).map(function (x) { return [Number(x[0]), Number(x[1])]; }); LIV.a = (d.asks || []).slice(0, 10).map(function (x) { return [Number(x[0]), Number(x[1])]; }); if (LIV.b.length && LIV.a.length) LIV.mid = (LIV.b[0][0] + LIV.a[0][0]) / 2; LIV.ultMsg = Date.now(); LIV.falhas = 0; sujar(cenaLivro, 0); }
  function trocarSimbolo(sym) { if (LIV.sym !== sym) { LIV.b = []; LIV.a = []; LIV.mid = null; LIV.tTroca = agoraMs(); } LIV.sym = sym; }
  function ligarLivro() {
    var quer = livroVisivel(), sym = simboloDaMesa();
    // 04/10: pela ligacao UNICA da pagina (t3b_ws.js) - mudar de simbolo ou esconder o painel e um SUBSCRIBE/UNSUBSCRIBE, nunca um
    // fecho (fechar uma ligacao a Binance deixa na consola "Ping received after close", um erro do servidor deles)
    if (window.T3BBinance) {
      var fl = quer ? sym.toLowerCase() + '@depth10@100ms' : null;
      if (LIV.fluxo && LIV.fluxo !== fl) { window.T3BBinance.largar(LIV.fluxo); LIV.fluxo = null; LIV.ws = null; }
      if (fl && !LIV.fluxo) { trocarSimbolo(sym); LIV.fluxo = fl; LIV.ws = true; window.T3BBinance.assinar(fl, aoLivro); }
      return;
    }
    // (fechar so uma ligacao ABERTA: fechar uma que ainda esta a ligar escreve um erro vermelho na consola do browser)
    if (LIV.ws && (!quer || LIV.sym !== sym)) { var w0 = LIV.ws; LIV.ws = null; w0.onclose = null; w0.onmessage = null; if (w0.readyState === 1) { try { w0.close(); } catch (e) { } } else w0.onopen = function () { try { w0.close(); } catch (e) { } }; }
    if (!quer || LIV.ws || LIV.falhas > 6) return;
    trocarSimbolo(sym);
    try {
      var ws = new WebSocket('wss://stream.binance.com:9443/ws/' + sym.toLowerCase() + '@depth10@100ms');
      ws.onmessage = function (m) { try { aoLivro(JSON.parse(m.data)); } catch (e) { } };
      ws.onclose = function () { LIV.ws = null; LIV.falhas++; };
      ws.onerror = function () { if (ws.readyState === 1) { try { ws.close(); } catch (e) { } } };
      LIV.ws = ws;
    } catch (e) { LIV.falhas++; }
  }
  setInterval(ligarLivro, 1000);
  // 21/10 22h (ele: "os numeros do livro nao mexem em tempo real"): numa rede que corta o fluxo da Binance (porta 9443) o livro ficava
  // parado no ultimo valor - sem mensagem ha 4 s, o livro publico por REST (data-api.binance.vision) de 2 em 2 s, ate o fluxo voltar
  var LIVRO_REST_EM_VOO = false;
  setInterval(function () {
    if (LIVRO_REST_EM_VOO || !window.fetch || !livroVisivel()) return;
    var sym = LIV.sym || simboloDaMesa(); if (!sym || (LIV.ultMsg && Date.now() - LIV.ultMsg < 4000)) return;
    LIVRO_REST_EM_VOO = true;
    fetch('https://data-api.binance.vision/api/v3/depth?limit=10&symbol=' + encodeURIComponent(sym), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.bids && d.asks && (LIV.sym || sym) === sym) { aoLivro(d); LIV.fonte = 'rest'; } })
      .catch(function () { }).then(function () { LIVRO_REST_EM_VOO = false; });
  }, 2000);
  // as ordens REAIS do executor (torre.json -> real.ordens, mercado/numeros_reais.py): a fita. Uma ordem nova acende o livro.
  T3B.on('torre', function (T) {
    var ords = lista(obj(T.real).ordens), topo = ords[0] ? (ords[0].t + ords[0].simbolo + ords[0].lado + ords[0].vezes) : '';
    if (LIV._topoOrd && topo && topo !== LIV._topoOrd) LIV.fl = { t0: agoraMs(), lado: ords[0].lado === 'SELL' ? 'a' : 'b' };
    LIV._topoOrd = topo; LIV.ordens = ords;
    sujar(cenaLivro, 0);
  });
  aoReagir('livro', function (ev) {
    var quem = TX.cortar(TX.limpar(ev.quem || TX.nomeDeId(ev.id)), 16);
    LIV.fita.unshift({ t: quem + ' · ' + ({ escreveu: 'escreveu', mudou: 'mudou', falou: 'falou', recado: 'recado', visita: 'visita' })[ev.k] || ev.k, c: C.ouroHi, t0: agoraMs() });
    if (LIV.fita.length > 9) LIV.fita.length = 9;
    LIV.fl = { t0: agoraMs(), lado: /venda|perda|-/.test(ev.txt || '') ? 'a' : 'b' };
    sujar(cenaLivro, 900);
  });
  EXTRA.livro = function () { var P = posMesa(); return { simbolo: LIV.sym, niveis: LIV.b.length + LIV.a.length, posicoes: P.map(function (p) { return p.base; }), real: P.length > 0, ordens: LIV.ordens.length, fita: LIV.fita.length, ligado: !!LIV.ws }; };
  var cenaLivro = null;
  (function () {
    var cv = canvasDe('h_livro'); if (!cv) return;
    registar('livro', $('h_livro'));
    // 05/10 (Q4 B3, ele: "vivo e suave"; a08 "parece que ta em fotograma"): o livro vinha da Binance de 1 em 1 s e as barras
    // saltavam para o valor novo a 12 q/s. Agora o livro chega de 100 em 100 ms, as barras DESLIZAM para cada valor (e respiram
    // um pouco entre dois), a linha do preco corre, cada ordem acende a sua linha e cada entrada nova da fita entra a deslizar.
    // Os precos sao uma camada guardada (refeita so quando um preco muda).
    var WA = [], WB = [];
    // 21/10: as moedas de preco minusculo (PEPE 0,0000081) davam 0,00000 - abaixo de 0,01, as casas que mostram 4 algarismos
    var px = function (v) { return v >= 1000 ? fmt(v, 2) : v >= 1 ? fmt(v, 3) : v >= 0.01 || !(v > 0) ? fmt(v, 5) : fmt(v, Math.min(12, 3 - Math.floor(Math.log10(v)))); };
    cenaLivro = cena(cv, { id: 'livro', holo: $('h_livro'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      // 07/10 (Q5 B3, li_lado): o livro a esquerda (46%), a Mesa (a conta real) a direita
      var L0 = Math.max(120, w * 0.46), top = TOPO + 28, bot = h - 3, mid = (top + bot) / 2, n = clamp(Math.floor((bot - top) / 2 / 13), 2, 10), rh = (bot - top) / (n * 2), cx = L0 / 2, agora = agoraMs();
      var POS = posMesa(), P = POS.filter(function (x) { return x.sym === LIV.sym; })[0], iP = POS.indexOf(P);
      if (!LIV.b.length) {
        // sem o livro (a ligar, a trocar de moeda, ou a Binance fora): o ultimo preco que a pagina tem; nunca um painel vazio
        var sy = LIV.sym || simboloDaMesa(), ult = P ? P.preco : null;
        rot(ctx, sy.replace(/USDT$/, '') + (POS.length ? ' · ' + (iP + 1) + '/' + POS.length : '') + ' · a ligar ao livro…', 8, mid, C.dim, 9, 'left', 500);
        if (ult) rot(ctx, 'último ' + px(ult), 8, mid + 14, C.ouroHi, 10, 'left', 600);
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
        var chave = n + '|' + LIV.sym + '|' + iP + '/' + POS.length + '|' + px(LIV.mid) + '|' + LIV.a.slice(0, n).map(function (x) { return x[0]; }).join(',') + '|' + LIV.b.slice(0, n).map(function (x) { return x[0]; }).join(',');
        porCamada(ctx, s, 'precos', chave, function (g) {
          for (var k = 0; k < n; k++) {
            var aa = LIV.a[k], bb = LIV.b[k], yya = mid - (k + 1) * rh, yyb = mid + k * rh + 1;
            if (aa) rot(g, px(aa[0]), cx - 4, yya + rh - 2, C.mau, 10.5, 'right', 600);   // 21/10 22h: legivel
            if (bb) rot(g, px(bb[0]), cx + 4, yyb + rh - 2, C.ok, 10.5, 'left', 600);
          }
          rot(g, String(LIV.sym).replace(/USDT$/, '') + (POS.length ? ' ' + (iP + 1) + '/' + POS.length : '') + ' · ' + px(LIV.mid), 6, TOPO + 7, C.ouroHi, 10.5, 'left', 700);
        });
        // 05/10 (ele: "as apostas que tao em andamento... mais detalhes pra identificar melhor"): a NOSSA posicao REAL neste simbolo -
        // a linha do preco a que entramos (no limite do livro, se estiver fora dele) e o ganho/perda dela ao preco do meio
        if (P && LIV.a.length && LIV.b.length) {
          var ent = P.entrada, topoP = LIV.a[Math.min(n, LIV.a.length) - 1][0], baseP = LIV.b[Math.min(n, LIV.b.length) - 1][0];
          var ye = ent >= LIV.mid ? mid - clamp((ent - LIV.mid) / Math.max(1e-9, topoP - LIV.mid), 0, 1.04) * (mid - top) : mid + clamp((LIV.mid - ent) / Math.max(1e-9, LIV.mid - baseP), 0, 1.04) * (bot - mid);
          var plP = P.qty * LIV.mid - P.custo;
          ctx.strokeStyle = C.vi; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(2, ye); ctx.lineTo(L0 - 2, ye); ctx.stroke(); ctx.setLineDash([]);
          // (16/10 20h40: "amontoado" - a etiqueta comprida pisava os precos) curta, e no lado SEM precos: os de compra estao a direita
          // do centro (cx+4) e os de venda a esquerda (ate cx-4) - abaixo do meio vai a esquerda, acima vai a direita
          var vE = ent >= 1000 ? fmt(ent, 0) : px(ent), etqE = ('ent. ' + vE).length * 4.4 <= cx - 4 ? 'ent. ' + vE : vE, yE = clamp(ye - 2.5, TOPO + 18, h - 4);   // (sem lugar para 'ent.': so o preco - a linha violeta ja diz que e a entrada)
          if (ye > mid) rot(ctx, etqE, 4, yE, C.vi, 7.5, 'left', 700); else rot(ctx, etqE, L0 - 4, yE, C.vi, 7.5, 'right', 700);
        }
        // 21/10 (ele: "o livro de ofertas poderia ser maior e com mais informacoes"): o spread e a forca de compra do livro
        var sB = 0, sA = 0; for (var kq = 0; kq < n; kq++) { if (LIV.b[kq]) sB += LIV.b[kq][0] * LIV.b[kq][1]; if (LIV.a[kq]) sA += LIV.a[kq][0] * LIV.a[kq][1]; }
        if (LIV.a[0] && LIV.b[0] && LIV.mid) { var pcB = sA + sB > 0 ? Math.round(100 * sB / (sA + sB)) : 50, spr = (LIV.a[0][0] - LIV.b[0][0]) / LIV.mid * 100;
          rot(ctx, 'spread ' + spr.toFixed(3).replace('.', ',') + '% · compra ' + pcB + '%', 6, TOPO + 20, pcB >= 55 ? C.ok : pcB <= 45 ? C.mau : C.mute, 9, 'left', 600); }
        // a linha do preco: corre sempre (a marcha da linha tracejada) e brilha ao meio
        ctx.strokeStyle = C.ouro; ctx.setLineDash([4, 4]); ctx.lineDashOffset = calmo ? 0 : -t * 14; ctx.beginPath(); ctx.moveTo(2, mid); ctx.lineTo(L0 - 2, mid); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        luz(ctx, C.ouro, cx, mid, 10 + 2 * Math.sin(t * 2), 0.4);
      }
      // A DIREITA, A MESA (16/10 20h40, ele: "as informacoes tao aparecendo tudo amontoadas"): DUAS colunas alinhadas - a moeda a
      // esquerda, o ganho/perda a direita (a % so se couber) -, a do livro de agora com a seta e o fundo de ouro; por baixo, so as
      // ordens reais que cabem inteiras (formato curto). A reaccao (quem da Mesa mexeu) e o aro de ouro e o lampejo no livro.
      var xR = L0 + 8, xD = w - 5, larR = xD - xR, y = TOPO + 6, totP = 0;
      POS.forEach(function (ps) { totP += ps.pnl; });
      ctx.save(); ctx.beginPath(); ctx.rect(L0 + 4, TOPO, w - L0 - 4, h - TOPO); ctx.clip();
      rot(ctx, POS.length ? 'CONTA REAL' : 'CONTA REAL · sem posições', xR, y, C.dim, 9, 'left', 700);
      if (POS.length) rot(ctx, sinal(totP, 2), xD, y, totP >= 0 ? C.ok : C.mau, 7.5, 'right', 700);
      LIV.pv = LIV.pv || {};
      ctx.font = fonte(700, 8); ctx._f = ctx.font;
      var cabePct = larR >= 140;
      var linhasMax = Math.max(1, Math.floor((h - y - 6) / 13));
      var nOrd = Math.min((LIV.ordens || []).length, 4), sobra = linhasMax - POS.length;
      if (sobra < 3) nOrd = 0; else nOrd = Math.min(nOrd, Math.floor((sobra * 13 - 15) / 12));
      POS.forEach(function (ps, k) {
        if (k >= linhasMax) return;
        y += 13;
        var v = LIV.pv[ps.sym] = seguir(LIV.pv[ps.sym] == null ? ps.pnl : LIV.pv[ps.sym], ps.pnl, 3, dt);
        var esta = ps.sym === LIV.sym, cor = v >= 0 ? C.ok : C.mau;
        if (esta) { ctx.fillStyle = 'rgba(242,194,48,.14)'; ctx.fillRect(L0 + 4, y - 10, w - L0 - 6, 13); }
        rot(ctx, (esta ? '▶' : ' ') + ps.base, xR - 2, y, esta ? C.ouroHi : C.txt, 10, 'left', esta ? 800 : 600);
        rot(ctx, sinal(v, 2), xD, y, cor, 10, 'right', 700);
        if (cabePct) rot(ctx, sinal(ps.pct, 1) + '%', xD - 42, y, cor, 8.5, 'right', 600);
      });
      // 21/10: o BALDE desta moeda - quantas fontes dizem alta/baixa hoje, a nota do conselho e porque o preco mexeu
      var bm = BALDE && LIV.sym ? String(LIV.sym).replace(/USDT$/, '') : null, bv = bm ? ((BALDE.moedas || {})[bm] || null) : null, bc = bm ? (BALDE.conselho || {})[bm] : null;
      var bx = bm ? (BALDE.explicacoes || []).filter(function (e) { return e.base === bm; })[0] : null;
      var ba = bm ? (BALDE.analistas || {})[bm] : null;   // 21/10 19h: o analista desta moeda
      var linhasLivres = Math.floor((h - y - 6) / 11) - (nOrd > 0 ? nOrd + 2 : 0);
      if (bm && linhasLivres >= 2) {
        y += 13; rot(ctx, TX.cortar('BALDE ' + bm + (bv ? ' · ' + bv.alta + '↑ ' + bv.baixa + '↓' : ' · nenhuma fonte hoje') + (bc != null ? ' · conselho ' + sinal(bc, 2) : ''), Math.floor(larR / 4.3)), xR, y, C.cy, 7, 'left', 700);
        if (ba && linhasLivres >= 3) { y += 10; linhasLivres--; rot(ctx, TX.cortar('analista: ' + (ba.direcao > 0 ? '▲ bate o mercado' : ba.direcao < 0 ? '▼ fica atrás' : '— sem sinal') + ' · ' + Math.round((ba.confianca || 0) * 100) + '% · ' + (ba.horizonte_d || 3) + ' d', Math.floor(larR / 4.2)), xR, y, ba.direcao > 0 ? C.ok : ba.direcao < 0 ? C.mau : C.mute, 7, 'left', 700); }
        if (bx && bx.explicacao) { var cX = Math.max(10, Math.floor(larR / 4.1)), txX = String(bx.explicacao), nl = Math.min(3, linhasLivres - 1);
          for (var lx = 0; lx < nl && txX; lx++) { var corte = txX.length <= cX ? txX.length : (txX.lastIndexOf(' ', cX) > 8 ? txX.lastIndexOf(' ', cX) : cX); y += 10; rot(ctx, (lx === nl - 1 && txX.length > corte ? TX.cortar(txX, cX) : txX.slice(0, corte)), xR, y, C.mute, 7, 'left', 500); txX = txX.slice(corte).trim(); } }
      }
      if (nOrd > 0) {
        y += 15; rot(ctx, 'ORDENS REAIS', xR, y, C.dim, 8.5, 'left', 700);
        var cO = Math.max(8, Math.floor(larR / 5.2));
        LIV.ordens.slice(0, nOrd).forEach(function (o, k) {
          y += 12;
          var novaO = k === 0 && LIV.fl && agora - LIV.fl.t0 < 1500;
          rot(ctx, TX.cortar(textoOrdem(o), cO), xR, y, novaO ? C.ouroHi : (o.lado === 'SELL' ? '#e88a8d' : '#7fd8b4'), 8.5, 'left', 600);
        });
      }
      ctx.restore();
    } });
  })();
  setInterval(function () { var P = posMesa(), tot = 0; P.forEach(function (p) { tot += p.pnl; }); mini('hm_livro', [['', (LIV.sym || simboloDaMesa()).replace(/USDT$/, '')], ['meio', LIV.mid ? fmt(LIV.mid, LIV.mid >= 1000 ? 1 : 3) : 'a ligar'], ['em aberto', P.length ? sinal(tot, 2) : '—', '', tot < 0 ? 'dn' : '']]); }, 2000);

  // ================================================================ 10. EQUALIZADOR DOS ANDARES (G28, D.equal) — na Mesa de Operacoes
  // Uma barra por andar: a altura de base e quem esta A TRABALHAR AGORA nesse andar (o censo da obra 2: turnos por andar /
  // registados); cada evento de um andar faz saltar a barra DESSE andar (e so essa - a reaccao); o pico fica marcado e
  // desce devagar.
  // 16/10 20h (ele: "o equalizador... nao esta mostrando os dados do seu sector, nao esta sincronizado"). MEDIDO: a altura de cada
  // barra era a FRACCAO de gente escalada nesse andar (a trabalhar agora / registados, do censo de 60 em 60 s) e os 3 nomes de cima
  // eram os de maior fraccao - andares pequenos (Validacao, Continuidade, Compras) com 1 de 2 escalado ficavam no topo enquanto o
  // trabalho estava noutros (o Atrio, os Macro, a Mesa). Agora a barra e o TRABALHO REAL do andar: as accoes por minuto dos ultimos
  // 3 min (os mesmos eventos que fazem bater o coracao, com o n de cada um), a escala pela raiz do andar mais activo, e os 3 nomes
  // de cima sao os andares com mais accoes agora (com o numero). Ao abrir a pagina, antes de haver 3 min, conta tambem o que o
  // servidor viu no ultimo minuto (vivo.json -> por_andar_60s). Cada evento continua a fazer saltar a barra DESSE andar.
  // <equalizador-puro>
  var EQ_JANELA_MS = 180000;
  function ritmoPorAndar(janelas, agoraMs_, janelaMs, semente, desdeMs) {
    var fora = {}, jm = janelaMs || EQ_JANELA_MS, corte = agoraMs_ - jm;
    var vidaMin = Math.max(1, Math.min(jm, agoraMs_ - (Number(desdeMs) || (agoraMs_ - jm))) / 60000);
    Object.keys(janelas || {}).forEach(function (n) {
      var soma = 0; (janelas[n] || []).forEach(function (x) { if (x && x[0] >= corte) soma += x[1] || 1; });
      if (soma > 0) fora[n] = soma / vidaMin;
    });
    // com menos de 3 min de pagina, o ultimo minuto do servidor completa (o maior dos dois: nunca soma o mesmo trabalho 2 vezes)
    if (semente && vidaMin < jm / 60000) Object.keys(semente).forEach(function (n) { var v = Number(semente[n]) || 0; if (v > (fora[n] || 0)) fora[n] = v; });
    return fora;
  }
  function nomeCurtoAndar(nm) { return String(nm || '').replace(/^Lab\.?\s+/i, '').replace(/\s+e\s+Mundo\b/i, '').replace(/^Laborat\S*\s+(de\s+|da\s+)?/i, '').trim(); }
  function alturaDoAndar(porMin, maxPorMin, salto) {
    var r = maxPorMin > 0 ? Math.sqrt(Math.max(0, porMin) / maxPorMin) : 0;
    return Math.max(0.02, Math.min(1, 0.03 + 0.85 * r + 0.35 * (salto || 0)));
  }
  // </equalizador-puro>
  // 21/10 22h30 (ele: "o equalizador nao se move conforme o sector, esta estranho"): 76 barras de 3 px (uma por andar) - nao se via
  // nenhum sector mexer. Agora 12 BANDAS, uma por sector (como um equalizador de som): cada uma sobe NA HORA em que o seu sector
  // age (as accoes dos ultimos 10 s, raiz, contra o maior dos ultimos minutos) e desce devagar; o pico fica marcado.
  // <bandas-puro>
  var BANDAS = [['Direção', ['atrio', 'socios_directores', 'conselho', 'sr_stark', 'gerentes_operacoes', 'supervisores_operacoes']],
    ['Dados', ['antenas_arquivo', 'aquisicao_dados', 'inventario_fontes', 'imprensa']], ['Pesquisa', ['pesquisa', 'ideias', 'inovacao', 'comite_produto']],
    ['Macro', ['macro']], ['Células', ['celulas']], ['Cripto', ['cripto']], ['Tendência', ['tendencia', 'reversao_media', 'volume_fluxo', 'preco_accao']],
    ['Validação', ['validacao', 'estatistica', 'registo_ensaios', 'ciclo_vida']], ['Mesa', ['mesa', 'pnl', 'tesouraria_preco']], ['Risco', ['risco', 'vigilancia']],
    ['Auditoria', ['auditoria']], ['Pessoal', ['recrutamento', 'pessoal', 'formacao', 'treinamento', 'logistica', 'compras', 'continuidade', 'manutencao']]];
  var BANDA_DA_ESP = {}; BANDAS.forEach(function (b, i) { b[1].forEach(function (e) { BANDA_DA_ESP[e] = i; }); });
  function bandaDoEsp(esp) { return BANDA_DA_ESP[esp] != null ? BANDA_DA_ESP[esp] : null; }
  function nivelDaBanda(soma10s, maxRef) { return maxRef > 0 ? Math.max(0, Math.min(1, Math.sqrt(Math.max(0, soma10s) / maxRef))) : 0; }
  // 21/10 22h50: a ENERGIA da banda (cada accao soma, esquece com meia-vida 1,5 s) contra o pico dos ultimos minutos, em escala log -
  // um equalizador que sobe e desce com o trabalho (o de 10 s ia ao maximo com 4 accoes e ficava parado)
  function nivelDaEnergia(e, maxE) { return maxE > 0 ? Math.max(0, Math.min(1, Math.log(1 + Math.max(0, e)) / Math.log(1 + maxE))) : 0; }
  // </bandas-puro>
  var EQ = { bandas: BANDAS.map(function () { return { jan: [], v: 0, pk: 0, tPk: 0, salto: 0 }; }), maxRef: 4, pend: {}, ns: [], base: {}, salto: {}, pico: {}, t: 0, ultimoAndar: null, agora: 0, jan: {}, rit: {}, max: 0, tot: 0, desde: Date.now() };
  T3B.on('estrutura', function (d) {
    var ands = lista(d.andares).filter(function (a) { return a.obra !== 'em_obras'; }).sort(function (x, y) { return x.n - y.n; });
    EQ.ns = ands.map(function (a) { return a.n; }); EQ.agora = 0;
    ands.forEach(function (a) { var t = a.turnos || a.censo || {}, reg = Number(t.registados) || Number(a.n_peoes) || 0, ag = Number(t.a_trabalhar_agora) || 0; EQ.base[a.n] = reg ? clamp(ag / reg, 0, 1) : 0; EQ.agora += ag; });
    sujar(cenaEq, 0);
  });
  aoReagir('equalizador', function (ev, r) {
    var n = r.andar; if (n == null) return;
    var w = nDe(ev);
    (EQ.jan[n] = EQ.jan[n] || []).push([Date.now(), w]);
    // 21/10 21h (ele: "o equalizador nao mexe conforme o coracao"): o andar junta o que fez e SALTA NA BATIDA do coracao (abaixo)
    // 21/10 22h (ele: "o equalizador nao se move conforme a accao dos sectores"): volta a SALTAR NA HORA da accao do andar (log das accoes)
    EQ.salto[n] = Math.min(1, (EQ.salto[n] || 0) + 0.3 * (r.forca || 0.5) * Math.min(4, 1 + Math.log2(w)));
    EQ.pend[n] = (EQ.pend[n] || 0) + w * (r.forca || 0.5); EQ.ultimoAndar = n; sujar(cenaEq, 2500);
    var anB = T3B.andar ? T3B.andar(Number(n)) : null, bi = bandaDoEsp(anB && anB.esp);   // 21/10 22h30: a banda do sector
    if (bi != null && !ev.historia) { var B0 = EQ.bandas[bi]; B0.jan.push([Date.now(), w]); B0.e = (B0.e || 0) + w; B0.salto = Math.min(1, B0.salto + 0.25 * Math.min(4, 1 + Math.log2(w)) / 4 + 0.12); B0.ult = Date.now(); }
  });
  T3B.on('batida', function () {
    // 16/10: o salto cresce com as accoes reais (log: 1 -> x1, 8 -> x4 no maximo); 21/10 21h: na batida, com o que o andar fez desde a anterior
    Object.keys(EQ.pend).forEach(function (n) { EQ.salto[n] = Math.min(1, (EQ.salto[n] || 0) + 0.06); });   // 21/10 22h: so respira na batida
    EQ.pend = {}; sujar(cenaEq, 2500);
  });
  function recalcularEq() {
    var agora = Date.now(), corte = agora - EQ_JANELA_MS;
    Object.keys(EQ.jan).forEach(function (n) { var j = EQ.jan[n]; while (j.length && j[0][0] < corte) j.shift(); if (!j.length) delete EQ.jan[n]; });
    EQ.rit = ritmoPorAndar(EQ.jan, agora, EQ_JANELA_MS, obj(obj(T3B.estado.ritmoServidor).porAndar), EQ.desde);
    var mx = 0, tot = 0; Object.keys(EQ.rit).forEach(function (n) { var v = EQ.rit[n]; tot += v; if (v > mx) mx = v; });
    EQ.max = Math.max(5, mx); EQ.tot = tot;
    sujar(cenaEq, 0);
  }
  setInterval(recalcularEq, 1000);
  EXTRA.equalizador = function () { var o = {}; Object.keys(EQ.salto).forEach(function (n) { if (EQ.salto[n] > 0.01) o[n] = Math.round(EQ.salto[n] * 100) / 100; }); var top = Object.keys(EQ.rit).sort(function (a, b) { return EQ.rit[b] - EQ.rit[a]; }).slice(0, 5).map(function (n) { return [Number(n), Math.round(EQ.rit[n] * 10) / 10]; }); return { saltos: o, ultimo: EQ.ultimoAndar, accoes_min: Math.round(EQ.tot * 10) / 10, mais_activos: top }; };
  var cenaEq = null;
  (function () {
    var cv = canvasDe('h_equalizador'); if (!cv) return;
    registar('equalizador', $('h_equalizador'));
    // 05/10 (Q4 B4, ele: "vivo e suave"; a09 "ta se travando, ta bugado"): o salto decaia por quadro (a 12 q/s, aos degraus) e a
    // barra ia direita ao valor novo. Agora cada barra SEGUE o seu alvo com suavidade, respira um pouco mesmo quieta (cada andar
    // ao seu ritmo, mais com actividade), salta com os eventos do seu andar e cai devagar; o pico fica 0,6 s e desce.
    // Uma so gradacao para as barras; os rotulos sao uma camada guardada.
    var V = {}, FASE = {}, PK = {};
    cenaEq = cena(cv, { id: 'equalizador', holo: $('h_equalizador'), desenhar: function (ctx, w, h, t, dt, s) {
      // 22/10 (ele: "nao era para trocar as barras do equalizador, era so para mudar a reaccao das barrinhas"): volta UMA BARRA
      // POR ANDAR (o desenho de 16/10: cor do andar, pico marcado, os 3 mais activos e o sector por cima da barra que reagiu).
      // A reaccao e a nova: a altura e o ritmo do andar no ultimo minuto (servidor + eventos, raiz contra o maior) e a barra
      // SALTA NA HORA da accao desse andar (EQ.salto, log das accoes), a descer devagar. As 12 bandas por sector saem.
      ctx.clearRect(0, 0, w, h);
      var N = EQ.ns.length; if (!N) { rot(ctx, 'a ler os andares…', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      var x0 = 6, bw = (w - 12) / N, base = h - 4, alt = base - TOPO - 14, larg = Math.max(1, bw - 1.2), rit = EQ.rit || {}, mx = EQ.max || 5;
      var quentes = [], picos = [], acimaSec = [];
      if (s.corEqChave !== EQ.ns.join(',')) { COR_EQ = {}; s.corEqChave = EQ.ns.join(','); }
      for (var i = 0; i < N; i++) {
        var n = EQ.ns[i], sl = (EQ.salto[n] || 0) * Math.exp(-dt * 0.9); EQ.salto[n] = sl < 0.004 ? 0 : sl;
        if (!FASE[n]) { var sm = U.semente('eq' + n); FASE[n] = [(sm % 628) / 100, 0.7 + ((sm >> 4) % 100) / 90, 1.6 + ((sm >> 9) % 100) / 70]; }
        var f = FASE[n], resp = 0.02 * (0.6 * Math.sin(t * f[1] + f[0]) + 0.4 * Math.sin(t * f[2] + f[0] * 1.7));
        var alvo = clamp(alturaDoAndar(rit[n] || 0, mx, sl) + resp, 0.015, 1);
        var v = V[n] = seguir(V[n] == null ? alvo : V[n], alvo, 7, dt), hh = Math.max(1, v * alt), x = x0 + i * bw;
        ctx.fillStyle = COR_EQ[n] || (COR_EQ[n] = (U.corDoAndar ? U.corDoAndar(n) : '#2dd4e8')); ctx.globalAlpha = 0.86;
        ctx.fillRect(x, base - hh, larg, hh); ctx.globalAlpha = 1;
        var pk = PK[n] || (PK[n] = { v: 0, t: 0 }); if (v >= pk.v) { pk.v = v; pk.t = t; } else if (t - pk.t > 0.6) pk.v = Math.max(v, pk.v - dt * 0.16);
        picos.push(x, base - pk.v * alt - 1.5);
        if (sl > 0.1) { quentes.push(x, base - hh, sl); acimaSec.push({ n: n, x: x + larg / 2, y: base - hh, sl: sl }); }
      }
      ctx.fillStyle = 'rgba(255,255,255,.82)';
      for (var p = 0; p < picos.length; p += 2) ctx.fillRect(picos[p], picos[p + 1], larg, 1.3);
      for (var q = 0; q < quentes.length; q += 3) { ctx.fillStyle = 'rgba(242,194,48,' + (0.35 + 0.6 * quentes[q + 2]).toFixed(2) + ')'; ctx.fillRect(quentes[q], quentes[q + 1] - 1.5, larg, 2.5); }
      var top3 = EQ.ns.slice().sort(function (a, b) { return ((EQ.salto[b] || 0) * 2 + (rit[b] || 0) / mx) - ((EQ.salto[a] || 0) * 2 + (rit[a] || 0) / mx); }).slice(0, 3);
      var col3 = (w - 12) / 3, max3 = Math.max(6, Math.floor((col3 - 6) / 4.6));
      top3.forEach(function (n, i) { var an = T3B.andar ? T3B.andar(n) : null; rot(ctx, TX.cortar((i ? '' : '▲ ') + n + (an && an.nome ? ' ' + TX.limpar(nomeCurtoAndar(an.nome)) : ''), max3), 6 + i * col3, TOPO + 19, i ? C.mute : C.ouroHi, 7.5, 'left', 600); });
      acimaSec.sort(function (a, b) { return b.sl - a.sl; });
      arrumarEtiquetas(ctx, 'equal_sec', acimaSec.slice(0, 3).map(function (e) {
        var an = T3B.andar ? T3B.andar(e.n) : null, nm = an ? TX.limpar(an.sector || an.nome || ('and. ' + e.n)) : 'and. ' + e.n;
        return { t: TX.cortar(nm, 18), x: e.x, y: Math.max(TOPO + 20, e.y - 4), dy: -9, cor: C.ouroHi, tam: 7.5 };
      }), w, h);
      var tot = 0; Object.keys(rit).forEach(function (k) { tot += rit[k]; });
      rot(ctx, 'todos: ' + fmt(tot, 0) + ' acções/min', w - 6, TOPO + 19, C.mute, 7.5, 'right', 600);
    } });
  })();
  setInterval(function () { var top = Object.keys(EQ.rit).sort(function (a, b) { return EQ.rit[b] - EQ.rit[a]; })[0], an = top != null && T3B.andar ? T3B.andar(Number(top)) : null; mini('hm_equalizador', [['', fmt(EQ.tot, 0), 'acções/min'], ['mais ativo', top != null ? (an && (an.sector || an.nome) ? TX.cortar(TX.limpar(an.sector || an.nome), 16) : 'and. ' + top) : 'nenhum']]); }, 2000);

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
  var TUR = { ands: [], barra: {}, flash: {}, jan: {}, todos: 0, carga: null };
  T3B.on('estrutura', function (d) {
    TUR.ands = lista(d.andares).filter(function (a) { var t = a.turnos || a.censo; return t && (t.registados || 0) > 0; }).map(function (a) { var t = a.turnos || a.censo; return { n: a.n, em: t.em_turno || 0, trab: t.a_trabalhar_no_turno || 0, evol: t.em_descanso_a_evoluir || 0, reg: t.registados || 0 }; });
    sujar(cenaTur, 0);
  });
  T3B.on('enxame', function (e) { var tb = obj(obj(e.pessoal).turnos); lista(tb.barra).forEach(function (x) { TUR.barra[x.id] = x.valor; }); TUR.carga = tb.carga_horaria_pct; TUR.noTurno = tb.a_trabalhar_no_turno; TUR.esp = obj(tb.por_especie); sujar(cenaTur, 0); });
  // cada andar acende o SEU ponto quando la alguem trabalha (todos os eventos com andar)
  // 21/10 22h (ele: "o relogio nao mostra como os funcionarios realmente trabalham; as bolinhas nao acendem com sincronia"): cada andar
  // guarda as accoes do ultimo minuto - o ponto fica aceso enquanto o andar trabalha (mais forte com mais accoes), nao so 1,8 s
  T3B.on('eventos', function (evs) { var ag = Date.now(); evs.forEach(function (e) { if (e.andar != null && TUR.ands.length && e.k !== 'numero' && !e.historia) { TUR.flash[e.andar] = agoraMs(); (TUR.jan[e.andar] = TUR.jan[e.andar] || []).push(ag); } }); });
  // 16/10 20h (ele: "o relogio do turno nao mostra os dados do seu sector"): o "agora:" de baixo era o ULTIMO evento da torre inteira
  // (um analista do Macro, da Mesa...). Agora e quem trabalhou nos sectores do relogio (Pessoal, Recrutamento, Formacao, Compras,
  // Logistica, Continuidade, os turnos, a frota dos contratados) - os mesmos eventos que o fazem reagir
  aoReagir('turnos', function (ev) { TUR.todos = agoraMs(); TUR.ult = ev; TUR.tUlt = agoraMs(); sujar(cenaTur, 1300); });
  // <turnos-puro>
  // quem faltou ao turno, por especie (enxame.json -> pessoal.turnos.por_especie): "genes 1.541 · regras 853 · contratados 789"
  var NOME_ESP_TURNO = { algoritmo: 'genes', regra: 'regras', agente: 'contratados', posto: 'postos', script: 'scripts' };
  // 21/10 22h: quem esta a trabalhar AGORA por especie (genes, regras, contratados...): os funcionarios que o relogio mostra
  function aTrabalharPorEspecie(esp) {
    return Object.keys(esp || {}).map(function (e) { return [NOME_ESP_TURNO[e] || e, Number((esp[e] || {}).agora) || 0]; })
      .filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function faltasPorEspecie(esp) {
    return Object.keys(esp || {}).map(function (e) { return [NOME_ESP_TURNO[e] || e, Number((esp[e] || {}).faltou) || 0]; })
      .filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  // </turnos-puro>
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
      var itens = [['TURNO', NOMES[tur], CORES[tur]], ['EM TURNO', v(TUR.barra.em_turno), C.txt], ['A TRABALHAR', v(TUR.noTurno), C.ok], ['EXTRA',  TUR.noTurno == null || TUR.barra.a_trabalhar_agora == null ? 'a ler' : fmt(Math.max(0, TUR.barra.a_trabalhar_agora - TUR.noTurno), 0), C.az], ['ANDARES ATIVOS', (TUR.ativos == null ? 'a ler' : fmt(TUR.ativos, 0) + '/' + fmt(TUR.ands.length, 0)), C.cy], ['FALTARAM', v(TUR.barra.faltaram), (TUR.barra.faltaram || 0) > 0 ? C.am : C.ok], ['CARGA', TUR.carga == null ? 'a ler' : fmt(TUR.carga, 0) + '%', C.mute]];
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
      var n = TUR.ands.length, r2 = R * 0.62, gi = calmo ? 0 : t * 0.05, corteJ = Date.now() - 60000, ativos = 0;
      for (var k2 = 0; k2 < n; k2++) {
        var a = TUR.ands[k2], an = -Math.PI / 2 + k2 / Math.max(1, n) * TAU + gi, fr = 0.78 + 0.22 * ((k2 * 7) % 5) / 4, x = cx + Math.cos(an) * r2 * fr, y = cy + Math.sin(an) * r2 * fr;
        // 07/10 (Q5 B4, "os pontos mais reagentes a torre e ao horario"): o tamanho segue quem trabalha, o piscar dura mais e
        // e mais forte, e quem esta no turno da hora respira com o ponteiro dos segundos
        var jA = TUR.jan[a.n] || []; while (jA.length && jA[0] < corteJ) jA.shift(); var actA = Math.min(1, jA.length / 4); if (jA.length) ativos++;
        var fl = clamp(1 - (agora - (TUR.flash[a.n] || 0)) / 1800, 0, 1), trab = Math.max(a.em ? a.trab / a.em : 0, actA), cor = actA > 0 ? CORES[tur] : trab > 0.25 ? CORES[tur] : a.evol > 0 ? C.vi : C.dim;
        var resp2 = 0.5 + 0.5 * Math.sin(t * 2.4 + k2 * 0.9 + seg / 60 * TAU);
        var al = trab > 0.25 ? 0.7 + 0.3 * resp2 : a.evol > 0 ? 0.5 + 0.3 * Math.sin(t * 2 + k2) : 0.3 + 0.12 * Math.sin(t * 1.4 + k2 * 0.7);
        ctx.globalAlpha = Math.min(1, al + fl * 0.6 + pt * 0.35); ctx.fillStyle = fl > 0.05 ? '#fff' : cor;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + 1.6 * clamp(trab, 0, 1) + fl * 2.6 + (trab > 0.25 ? 0.5 * resp2 : 0), 0, TAU); ctx.fill();
        if (fl > 0.05 || trab > 0.6) luz(ctx, cor, x, y, 7 + fl * 5, Math.max(fl, trab > 0.6 ? 0.35 * resp2 : 0));
      }
      ctx.globalAlpha = 1; if (TUR.ativos !== ativos) { TUR.ativos = ativos; sujar(cenaTur, 0); }
      // o ponteiro das horas (continuo) e a hora ao centro
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(qh) * (R - 4), cy + Math.sin(qh) * (R - 4)); ctx.stroke(); ctx.lineWidth = 1;
      var hAt = Math.floor(hr) % 24, qa = -Math.PI / 2 + hAt / 24 * TAU, xa = cx + Math.cos(qa) * (R - 17), ya = cy + Math.sin(qa) * (R - 17);
      luz(ctx, CORES[tur], xa, ya, 8, 0.55 + 0.25 * resp); rot(ctx, String(hAt), xa - 3.5, ya + 2.5, '#ffffff', 7.5, 'left', 800);   // a hora de agora acesa
      luz(ctx, '#ffffff', cx + Math.cos(qh) * (R - 4), cy + Math.sin(qh) * (R - 4), 5, 0.7);
      ctx.fillStyle = 'rgba(7,7,10,.82)'; ctx.beginPath(); ctx.arc(cx, cy + 3, Math.min(R * 0.42, 19), 0, TAU); ctx.fill();
      rot(ctx, String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'), cx, cy + 3, '#fff', 11, 'center', 700);
      rot(ctx, String(Math.floor(seg)).padStart(2, '0'), cx, cy + 13, C.mute, 7.5, 'center', 600);
      var at3 = aTrabalharPorEspecie(TUR.esp);   // 21/10 22h: os funcionarios a trabalhar agora, por especie
      if (at3.length) rot(ctx, TX.cortar('a trabalhar agora: ' + at3.slice(0, 3).map(function (x) { return x[0] + ' ' + fmt(x[1], 0); }).join(' · '), Math.floor((w - 8) / 4.4)), 4, h - 13, C.ok, 7.5, 'left', 600);
      if (TUR.ult) { ctx.globalAlpha = clamp(1 - (agora - (TUR.tUlt || 0)) / 60000, 0.45, 1); rot(ctx, TX.cortar('agora: ' + TX.limpar(TUR.ult.quem || TX.nomeDeId(TUR.ult.id)) + (TUR.ult.andar != null ? ' · and. ' + TUR.ult.andar : ''), Math.floor((w - 8) / 4.4)), 4, h - 3, C.mute, 7.5, 'left', 500); ctx.globalAlpha = 1; }
    } });
  })();
  setInterval(function () { mini('hm_turnos', [['em turno', fmt(TUR.barra.em_turno, 0)], ['no turno', fmt(TUR.noTurno, 0)], ['evoluir', fmt(TUR.barra.a_evoluir, 0)]]); }, 2000);

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
  // (10/10: labs/labPorAndar/chamas = a Nebulosa espiral - os labs todos com a sua amostra e as explosoes; ver o bloco <nebulosa>)
  var LAB = { est: [], porChave: {}, tot: {}, rob: {}, dem: {}, ger: null, nEv: 0, ultimo: null, carregado: false, ver: 0, nuvem: {}, bolhas: [], labs: [], labPorAndar: {}, chamas: [] };
  function estrelaNova(gi, gene, i) {
    var sem = U.semente(gene.k + i);
    return { g: gi, k: gene.k, r: !!gene.r, d: !!gene.d, andar: gene.andar, ang: (sem % 6283) / 1000, raio: Math.sqrt(((sem >> 4) % 1000) / 1000), v: 0.12 + ((sem >> 9) % 300) / 1000, luz: 0, t: 0 };
  }
  function carregarLabs() {
    fetch('labs.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.labs) return;
      LAB.tLabs = String(d.t_iso || '').slice(11, 16) || LAB.tLabs;   // 21/10: a hora da amostra (o estado do cartao)
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
      amostraDosLabs(d.labs);   // 10/10: a Nebulosa espiral (um aglomerado por lab: as estrelas acima so chegam aos 1.os labs de cada grupo)
      LAB.carregado = true; LAB.ver++; sujar(cenaLab, 0); pintarLegendaLab();
    }).catch(function () { });
  }
  setTimeout(carregarLabs, 1500); setInterval(function () { if (!document.hidden && !($('h_lab') || {}).classList.contains('min')) carregarLabs(); }, 60000);
  aoReagir('lab', function (ev, r) {
    var agora = agoraMs(); LAB.nEv++; LAB.ultimo = ev;
    if (ev.k === 'genes') {
      // 21/10: a hora do PROPRIO evento (o passado que a 1.a leitura traz dizia 'agora mesmo'; sem ele, 'a espera' ate 15 min)
      LAB.tGenes = agora - Math.max(0, Date.now() - (Number(ev.ms) > 0 ? Number(ev.ms) : Date.now())); LAB.genesUlt = { n: nDe(ev), quem: ev.quem || '', tipo: ev.tipo || '' };   // 16/10 20h: o estado do cartao
      var gi = GRUPO_DO_ANDAR[ev.andar]; if (gi == null) return;
      // 21/10 22h: os tubos - a contagem por grupo (genes/min) e as bolhas (no maximo 12 por evento)
      ((LAB.janG = LAB.janG || {})[gi] = LAB.janG[gi] || []).push([Date.now(), nDe(ev)]);
      if (LAB.tubosB && !ev.historia) { var robs = {}; (ev.robustas || []).forEach(function (k) { robs[k] = 1; }); var nbo = Math.min(12, nDe(ev)), chs = ev.chaves || [];
        for (var ibo = 0; ibo < nbo && LAB.tubosB.length < 300; ibo++) LAB.tubosB.push({ gi: gi, y: 0, jx: Math.random() * 2 - 1, v: 0.22 + 0.3 * Math.random(), r: 1.2 + 1.4 * Math.random(), rob: !!robs[chs[ibo]] }); }
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
      genesNoLab(ev, rob, agora);   // 10/10: a Nebulosa espiral (a amostra do lab inteira, a energia e a explosao do aglomerado)
    } else {
      // um funcionario de um lab escreveu (o organismo, a sombra, a revisao): a constelacao desse andar brilha
      var g2 = GRUPO_DO_ANDAR[r.andar]; LAB.est.forEach(function (s) { if (g2 == null || s.g === g2) s.luz = Math.max(s.luz, 0.35); }); if (g2 != null) LAB.nuvem[g2] = Math.max(LAB.nuvem[g2] || 0, 0.6);
      if (g2 != null && LAB.tubosB && !ev.historia && LAB.tubosB.length < 300) LAB.tubosB.push({ gi: g2, y: 0, jx: Math.random() * 2 - 1, v: 0.35, r: 1, rob: false });   // 21/10 22h: o lab mexeu
    }
    sujar(cenaLab, 2200); pintarLegendaLab();
  });
  EXTRA.lab = function () { var acesas = LAB.est.filter(function (s) { return s.luz > 0.05; }).length; return { estrelas: LAB.est.length, acesas: acesas, robustas: LAB.est.filter(function (s) { return s.r && !s.d; }).length, demitidas: LAB.est.filter(function (s) { return s.d; }).length, eventos: LAB.nEv, modelo: EXTRA.lab_modelo ? EXTRA.lab_modelo() : null }; };
  T3B.on('torre', function (T) { var ex = obj(T.extremis); if (ex.geracao_actual !== LAB.ger) { if (LAB.ger != null) creditarHolo('lab', 'lab', 'geração ' + ex.geracao_actual); LAB.ger = ex.geracao_actual; } U.txt($('h_lab_e'), 'geração ' + (ex.geracao_actual || '?') + ' · ' + fmt(ex.n_familias, 0) + ' famílias'); });
  function pintarLegendaLab() {
    var rob = 0, tot = 0; Object.keys(LAB.tot).forEach(function (g) { tot += LAB.tot[g] || 0; rob += LAB.rob[g] || 0; });
    var ha = LAB.tGenes ? Math.floor((agoraMs() - LAB.tGenes) / 60000) : null;
    mini('hm_lab', [['genes', fmt(tot, 0)], ['robustos', fmt(rob, 0)], ['calculou', ha == null ? '—' : ha < 1 ? 'agora' : 'há ' + ha + ' min', '', ha != null && ha > 30 ? 'dn' : '']]);
  }
  setInterval(pintarLegendaLab, 20000);
  // 16/10 20h (ele: "o laboratorio nao mostra os dados do seu sector"): MEDIDO - as 19h51 a previa da sombra saiu pelo vigia interno e
  // deixou 2 trabalhadores orfaos com o log aberto; todas as corridas seguintes sairam com 1 sem calcular nada e o cartao ficou com as
  // estrelas paradas, sem dizer porque. O cartao diz agora o estado do trabalho dos genes: a calcular (o lab e quantos), ou ha quanto
  // tempo foi o ultimo calculo - a ambar passados 30 min (a previa corre de 15 em 15 min).
  function estadoDoLab(ctx, w, agora) {
    var ha = LAB.tGenes ? agora - LAB.tGenes : null, g = LAB.genesUlt || {}, txt, cor;
    if (ha != null && ha < 12000) { txt = 'a calcular: ' + TX.limpar(g.quem || 'lab') + ' · ' + fmt(g.n || 1, 0) + ' genes'; cor = C.ouroHi; }
    else if (ha != null) { var m = Math.floor(ha / 60000); txt = 'último cálculo ' + (m < 1 ? 'agora mesmo' : 'há ' + m + ' min'); cor = m > 30 ? C.am : C.dim; }
    else { txt = 'genes lidos' + (LAB.tLabs ? ' às ' + LAB.tLabs : '') + ' · o próximo cálculo vem na prévia (de 15 em 15 min)'; cor = C.dim; }
    rot(ctx, TX.cortar(txt, Math.max(8, Math.floor((w - 12) / 4.6))), 6, TOPO + 9, cor, 7.5, 'left', 600);
    // 21/10 (ele: "o laboratorio esta bugado"; "tudo tem que ser do balde"): o que o laboratorio produz e posto a prova - o balde de
    // sinais (todas as fontes e os algoritmos da fabrica), quantos o juiz ja conferiu e a melhor fonte do placar
    if (BALDE) {
      var cB = Math.max(8, Math.floor((w - 12) / 4.6)), pl = (BALDE.placar || [])[0];
      rot(ctx, TX.cortar('balde: ' + fmt(BALDE.n_fontes || 0, 0) + ' fontes · ' + fmt(BALDE.sinais_hoje || 0, 0) + ' sinais hoje · ' + (BALDE.provadas || []).length + ' com prova', cB), 6, TOPO + 19, C.cy, 7.5, 'left', 600);
      rot(ctx, TX.cortar(pl ? 'melhor: ' + pl.fonte + ' h' + pl.h + ' · acerto ' + Math.round((pl.acerto || 0) * 100) + '% (acaso ' + Math.round((pl.acaso || 0) * 100) + '%) · t ' + sinal(pl.t || 0, 1) : 'o juiz confere os 1.os sinais amanhã (1, 3 e 7 dias)', cB), 6, TOPO + 29, pl && pl.prova ? C.ok : C.dim, 7, 'left', 500);
    }
  }
  // ---------------------------------------------------------------- <nebulosa> 10/10: A NEBULOSA ESPIRAL, o modelo aprovado
  // Ele (10/10, depois da 2.a pagina de testes, sala/lab_modelos2.html): "gostei do nebulosa espiral pode aprovar esse por
  // enquanto". E o modelo 7 do sala/lab_modelos2.js trazido para o cartao com os dados que o cartao JA tem (o mesmo pedido ao
  // /labs.json e os mesmos eventos "genes"; nada de outro pedido nem de outro relogio): uma galaxia em 3D a rodar devagar e a
  // balancar a inclinacao. Cada BRACO e uma especialidade (GRUPOS) e cada AGLOMERADO ao longo dele e um lab (o 1.o perto do
  // nucleo, o ultimo na ponta); as estrelas sao os genes da amostra do lab (ate NEB_POR_LAB, os robustos primeiro): douradas =
  // robustas, cinza = demitidas, ciano = novas (tocadas por uma evolucao: meia-vida de 25 s ate 0,08, como na pagina de testes).
  // Quando um lab calcula, o aglomerado dele ACENDE numa explosao (um anel que se abre no plano do disco) e as estrelas que
  // calcularam brilham; o nucleo acende com a actividade dos labs (3 min), o po do braco com a da sua especialidade, e com mais
  // actividade a galaxia roda mais depressa. Com prefers-reduced-motion fica parada e sem explosoes (so acende).
  // Leve para o portatil (UHD 620): ~20 pinturas por quadro (o po e as estrelas vao em lotes de uma cor so: um fill por lote).
  // As provas (sala/testes_t3b.js) extraem este bloco e desenham-no num canvas falso.
  var NEB_POR_LAB = 24;          // metade da amostra do /labs.json (48): o cartao tem 252 px de largura e o portatil e fraco
  var NEB_NOVO_MS = 91000, NEB_MEIA_E = 1600, NEB_MEIA_P = 450;   // gene novo ~91 s; energia do lab 1,6 s e pulso 0,45 s de meia-vida
  var NEB_COR = { rob: '#ffd65a', gene: 'rgba(242,194,48,.62)', novo: '#2dd4e8', dem: '#5c5c66', flash: '#fff3c4' };
  // a energia do lab agora (cada calculo soma 0,55 a 1,45, ate 4) e o pulso (1 no calculo): contas pelo relogio, nao por quadro
  function energiaLab(L, agora) { var v = L && L.e > 0 ? L.e * Math.pow(0.5, Math.max(0, agora - L.tE) / NEB_MEIA_E) : 0; return v > 1e-4 && isFinite(v) ? v : 0; }
  function pulsoLab(L, agora) { if (!L || !(L.tP > 0)) return 0; var v = Math.pow(0.5, Math.max(0, agora - L.tP) / NEB_MEIA_P); return v > 1e-3 ? v : 0; }
  // os labs do /labs.json (o mesmo pedido do cartao) com a sua amostra: um aglomerado por lab. O mesmo lab (pelo andar) guarda a
  // energia e o mesmo gene (pelo lab e pela chave) guarda quando calculou
  function amostraDosLabs(dlabs) {
    var labsV = LAB.labPorAndar || {}, genesV = {};
    (LAB.labs || []).forEach(function (L) { L.genes.forEach(function (g) { genesV[L.n + '|' + g.k] = g; }); });
    LAB.labs = []; LAB.labPorAndar = {};
    (Array.isArray(dlabs) ? dlabs : []).forEach(function (l) {
      var gi = l ? GRUPO_DO_ANDAR[l.n] : null; if (gi == null || LAB.labPorAndar[l.n]) return;
      var L = labsV[l.n] || { n: l.n, e: 0, tE: 0, tP: 0, cor: NEB_COR.flash };
      L.g = gi; L.genes = []; L.porChave = {};
      (Array.isArray(l.amostra) ? l.amostra : []).forEach(function (s) {
        if (!s || s.k == null || L.porChave[s.k] || L.genes.length >= NEB_POR_LAB) return;
        var g = genesV[l.n + '|' + s.k] || { k: s.k, t: 0, tn: 0 }; g.r = !!s.r; g.d = !!s.d; L.genes.push(g); L.porChave[s.k] = g;
      });
      LAB.labs.push(L); LAB.labPorAndar[l.n] = L;
    });
    LAB.labs.sort(function (a, b) { return a.g - b.g || a.n - b.n; });
  }
  // o lab que calcula (evento "genes"): os genes dele acendem (o que nao esta na amostra fica no lugar do mais antigo nao
  // robusto, como na pagina de testes), a energia e o pulso do lab sobem e fica marcada a explosao do aglomerado
  function genesNoLab(ev, rob, agora) {
    var L = ev ? LAB.labPorAndar[ev.andar] : null; if (!L) return;
    var ch = Array.isArray(ev.chaves) ? ev.chaves : [], n = Number(ev.n), evo = ev.tipo === 'evolucao';
    if (!isFinite(n) || n < ch.length) n = ch.length;
    ch.slice(0, 32).forEach(function (k) {
      if (k == null) return;
      var g = L.porChave[k], i;
      if (!g) {
        for (i = 0; i < L.genes.length; i++) { var x = L.genes[i]; if (x.r && !x.d) continue; if (!g || x.t < g.t) g = x; }
        if (!g) for (i = 0; i < L.genes.length; i++) if (!g || L.genes[i].t < g.t) g = L.genes[i];
        if (!g) return;
        delete L.porChave[g.k]; g.k = k; g.r = false; g.d = false; g.tn = 0; L.porChave[k] = g;
      }
      if (rob && rob[k]) g.r = true;
      g.t = agora; if (evo) g.tn = agora;
    });
    var forca = clamp(Math.log(1 + n) / Math.log(65), 0.18, 1);
    L.e = Math.min(4, energiaLab(L, agora) + 0.55 + 0.9 * forca); L.tE = agora; L.tP = agora;
    L.cor = evo ? NEB_COR.novo : ev.tipo === 'revisao' ? C.ouroHi : NEB_COR.flash;
    if (!calmo) { LAB.chamas.push({ n: L.n, t0: agora, cor: L.cor, forca: forca }); if (LAB.chamas.length > 40) LAB.chamas.shift(); }
  }
  // muitos quadradinhos da mesma cor num so fill (um Float32Array reaproveitado: nada de lixo por quadro)
  function LoteNeb(n) { this.cap = Math.max(1, n); this.b = new Float32Array(this.cap * 3); this.n = 0; }
  LoteNeb.prototype.por = function (x, y, s) { if (this.n >= this.cap) return; var i = this.n++ * 3; this.b[i] = x - s; this.b[i + 1] = y - s; this.b[i + 2] = s * 2; };
  LoteNeb.prototype.pintar = function (ctx, cor, a) {
    if (this.n) { ctx.globalAlpha = a; ctx.fillStyle = cor; ctx.beginPath(); for (var i = 0; i < this.n; i++) { var k = i * 3; ctx.rect(this.b[k], this.b[k + 1], this.b[k + 2], this.b[k + 2]); } ctx.fill(); ctx.globalAlpha = 1; }
    this.n = 0;
  };
  // o modelo: { nome, desenhar(ctx, w, h, t, dt, agora, base), estado() } - desenha o cartao inteiro (uma galaxia so)
  function criarNebulosa() {
    var PASSO = 1.8;                                             // 1/tan(inclinacao do braco): ~210 graus de volta do nucleo a ponta
    var CORES = [NEB_COR.rob, NEB_COR.gene, NEB_COR.novo, NEB_COR.dem], ALFA = [0.42, 0.7, 1], TAM = [0.6, 0.85, 1.15];
    var S = { chave: '', ag: [], porN: {}, bracos: [], gas: new Float32Array(0), nGas: 0, b0: 0, R: 6, cx: 0, cy: 0, til0: 0.55, rot: 0.4, estrelas: 0 };
    var lotes = [], lGas = new LoteNeb(64), acesas = [], q;
    for (q = 0; q < 12; q++) lotes.push(new LoteNeb(64));       // [robusto, gene, novo, demitido] x [longe, meio, perto]
    // um gerador com semente (mulberry32): o mesmo lab desenha sempre o mesmo aglomerado
    function aleatorio(s) {
      var a = (Number(s) >>> 0) || 0x9e3779b9;
      return function () { a = (a + 0x6d2b79f5) >>> 0; var t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    function gauss(rnd) { return (rnd() + rnd() + rnd() + rnd() - 2) * 1.73; }   // ~ normal(0, 1), sem caudas infinitas
    function angulo(th0, r) { return th0 + Math.log(Math.max(0.05, r) / 0.12) * PASSO; }
    // o gene acende 0,35 s depois do calculo (a onda chega) e apaga-se em ~1 s; sem movimento, acende ja
    function aceso(g, agora) { if (!(g.t > 0)) return 0; var d = agora - g.t - (calmo ? 0 : 350); return d >= 0 && d <= 6000 ? Math.exp(-d / 900) : 0; }
    function arrumar(w, h) {
      var top = TOPO + 2, hh = Math.max(1, h - 12 - top), pad = 6, i;   // entre a faixa do titulo e a linha dos botoes
      S.til0 = clamp(0.32 + 0.38 * (hh / Math.max(1, w)), 0.45, 1.25);
      var st = Math.sin(Math.min(1.45, S.til0 + 0.1));
      S.R = Math.max(6, Math.min((w - 2 * pad) / 2, (hh - 2 * pad) / (2 * st + 0.1)));
      S.cx = w / 2; S.cy = top + hh / 2; S.ag = []; S.porN = {}; S.bracos = []; S.estrelas = 0;
      var porG = {}, gs = [];
      LAB.labs.forEach(function (L) { if (!porG[L.g]) { porG[L.g] = []; gs.push(L.g); } porG[L.g].push(L); });
      var G = Math.max(1, gs.length);
      gs.forEach(function (gi, bi) {
        var th0 = bi / G * TAU, ls = porG[gi], m = ls.length;
        S.bracos.push({ g: gi, th0: th0, i0: 0, i1: 0 });
        ls.forEach(function (L, j) {
          var r = m > 1 ? 0.27 + 0.62 * j / (m - 1) : 0.52, th = angulo(th0, r), rnd = aleatorio(U.semente('nebulosa ' + L.n)), am = L.genes.length, k;
          var tx = Math.cos(th) - PASSO * Math.sin(th), tz = Math.sin(th) + PASSO * Math.cos(th), tl = Math.sqrt(tx * tx + tz * tz) || 1;
          tx /= tl; tz /= tl;
          var st3 = new Float32Array(Math.max(1, am) * 3);
          for (k = 0; k < am; k++) {                              // em volta do centro, esticado ao longo do braco
            var a1 = gauss(rnd) * 0.055, a2 = gauss(rnd) * 0.026;
            st3[k * 3] = tx * a1 - tz * a2; st3[k * 3 + 1] = gauss(rnd) * 0.013; st3[k * 3 + 2] = tz * a1 + tx * a2;
          }
          S.porN[L.n] = S.ag.length; S.estrelas += am;
          S.ag.push({ L: L, b: bi, x: r * Math.cos(th), z: r * Math.sin(th), st: st3, n: am, sx: S.cx, sy: S.cy, e: 0, p: 0 });
        });
      });
      // o po dos bracos e o bojo do nucleo (estrutura do desenho, nao sao dados); a densidade da pagina de testes no tamanho do cartao
      var kd = clamp(w * hh / (360 * 212), 0.45, 1), porB = Math.round(85 * kd), nB = Math.round(80 * kd), rnd2 = aleatorio(U.semente('nebulosa po')), pts = [];
      S.bracos.forEach(function (b) {
        b.i0 = pts.length / 3;
        for (i = 0; i < porB; i++) {
          var r2 = 0.1 + 0.92 * Math.pow(rnd2(), 0.8), th2 = angulo(b.th0, r2) + gauss(rnd2) * 0.06, sp = gauss(rnd2) * 0.025 * (0.6 + r2);
          pts.push(r2 * Math.cos(th2) - Math.sin(th2) * sp, gauss(rnd2) * 0.008, r2 * Math.sin(th2) + Math.cos(th2) * sp);
        }
        b.i1 = pts.length / 3;
      });
      S.b0 = pts.length / 3;
      for (i = 0; i < nB; i++) pts.push(gauss(rnd2) * 0.05, gauss(rnd2) * 0.03, gauss(rnd2) * 0.05);
      S.gas = new Float32Array(pts); S.nGas = pts.length / 3;
      if (lGas.cap < S.nGas) lGas = new LoteNeb(S.nGas + 16);
      if (lotes[0].cap < S.estrelas) for (q = 0; q < 12; q++) lotes[q] = new LoteNeb(S.estrelas + 16);
    }
    return {
      nome: 'Nebulosa espiral',
      desenhar: function (ctx, w, h, t, dt, agora, base) {
        if (!LAB.labs.length) { rot(ctx, 'o labs.json não trouxe laboratórios', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
        var chave = w + 'x' + h + '|' + LAB.ver; if (S.chave !== chave) { arrumar(w, h); S.chave = chave; }
        var R = S.R, cx = S.cx, cy = S.cy, gas = S.gas, tt = isFinite(t) ? t : 0, i, j, soma = 0;
        for (i = 0; i < S.ag.length; i++) { var a0 = S.ag[i], e0 = energiaLab(a0.L, agora); soma += e0; a0.e = Math.min(1, e0); a0.p = pulsoLab(a0.L, agora); }
        // mais actividade, mais depressa: 0,05 rad/s parada, ate 0,21 com os labs a calcular
        if (!calmo && dt > 0) S.rot = (S.rot + dt * (0.05 + 0.16 * clamp(soma / 3, 0, 1))) % TAU;
        var til = S.til0 + (calmo ? 0 : 0.1 * Math.sin(tt * 0.06)), st = Math.sin(til), ct = Math.cos(til), cr = Math.cos(S.rot), sr = Math.sin(S.rot);
        // o nucleo: acende com a actividade dos labs nos ultimos 3 min
        luz(ctx, C.ouro, cx, cy, R * 0.24, 0.2 + 0.32 * clamp(base || 0, 0, 1));
        luz(ctx, '#ffe9a8', cx, cy, R * 0.07, 0.55);
        // o po: um lote por braco (o braco acende com a actividade da sua especialidade, LAB.nuvem) e um para o bojo
        for (i = 0; i <= S.bracos.length; i++) {
          var b = S.bracos[i], j0 = b ? b.i0 : S.b0, j1 = b ? b.i1 : S.nGas;
          for (j = j0; j < j1; j++) { var gx = gas[j * 3], gy = gas[j * 3 + 1], gz = gas[j * 3 + 2], x1 = gx * cr - gz * sr, z1 = gx * sr + gz * cr; lGas.por(cx + x1 * R, cy + (z1 * st - gy * ct) * R, 0.6); }
          lGas.pintar(ctx, 'rgb(242,194,48)', 0.22 + (b ? 0.3 * clamp(LAB.nuvem[b.g] || 0, 0, 1) : 0));
        }
        // as estrelas (os genes): cor pela classe, tamanho e opacidade pela profundidade (longe, meio, perto)
        for (i = 0; i < S.ag.length; i++) {
          var a = S.ag[i], gs = a.L.genes, inch = calmo ? 1 : 1 + 0.2 * a.e, nn = Math.min(a.n, gs.length);
          var ax1 = a.x * cr - a.z * sr, az1 = a.x * sr + a.z * cr;
          a.sx = cx + ax1 * R; a.sy = cy + az1 * st * R;
          for (j = 0; j < nn; j++) {
            var g = gs[j], ox = a.x + a.st[j * 3] * inch, oy = a.st[j * 3 + 1] * inch, oz = a.z + a.st[j * 3 + 2] * inch;
            var x2 = ox * cr - oz * sr, z2 = ox * sr + oz * cr, X = cx + x2 * R, Y = cy + (z2 * st - oy * ct) * R, prof = z2 * ct + oy * st;
            var bin = prof < -0.25 ? 0 : prof < 0.25 ? 1 : 2, cls = g.d ? 3 : g.r ? 0 : g.tn > 0 && agora - g.tn < NEB_NOVO_MS ? 2 : 1;
            var ac = aceso(g, agora), s = TAM[bin] * (cls === 0 ? 1.35 : 1) * (1 + 0.7 * ac);
            lotes[cls * 3 + bin].por(X, Y, s);
            if (ac > 0.05) acesas.push(X, Y, ac, cls === 2 ? 1 : 0);
          }
        }
        for (var bn = 0; bn < 3; bn++) { lotes[3 + bn].pintar(ctx, CORES[1], ALFA[bn]); lotes[9 + bn].pintar(ctx, CORES[3], ALFA[bn]); lotes[6 + bn].pintar(ctx, CORES[2], ALFA[bn]); lotes[bn].pintar(ctx, CORES[0], ALFA[bn]); }
        // o aglomerado de quem calcula acende; a explosao abre um anel no plano do disco
        for (i = 0; i < S.ag.length; i++) { var a2 = S.ag[i]; if (a2.e < 0.05 && a2.p < 0.03) continue; luz(ctx, a2.L.cor || NEB_COR.flash, a2.sx, a2.sy, R * 0.07 * (1 + a2.e), Math.min(1, 0.25 * a2.e + 0.6 * a2.p)); }
        for (i = LAB.chamas.length - 1; i >= 0; i--) {
          var ch = LAB.chamas[i], a3 = S.ag[S.porN[ch.n]], u = (agora - ch.t0) / 1600;
          if (!a3 || !(u <= 1) || u < -0.5) { LAB.chamas.splice(i, 1); continue; }
          if (u < 0) continue;
          var rr = R * (0.015 + 0.09 * ease(u)) * (0.6 + 0.4 * ch.forca);
          ctx.strokeStyle = ch.cor; ctx.globalAlpha = 0.85 * (1 - u); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(a3.sx, a3.sy, Math.max(0.1, rr), Math.max(0.1, rr * st), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          luz(ctx, ch.cor, a3.sx, a3.sy, R * 0.035 * (1 + ch.forca), 1 - u);
        }
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? NEB_COR.novo : NEB_COR.flash, acesas[i], acesas[i + 1], 4.5, acesas[i + 2]);
        acesas.length = 0;
      },
      estado: function () { return { aglomerados: S.ag.length, bracos: S.bracos.length, estrelas: S.estrelas, po: S.nGas, chamas: LAB.chamas.length, rot: Math.round(S.rot * 1e4) / 1e4, R: Math.round(S.R) }; }
    };
  }
  // </nebulosa>
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
    // 09/10 (ele: "o card de visualizacao do laboratorio ta bugado, quero outros: mais 5 modelos ou ate mais, parecidos mas com
    // a movimentacao e animacao diferentes"): os MESMOS dados e o mesmo desenho de base (cada ponto = um gene real da amostra do
    // /labs.json: dourado forte = robusto, cinza = demitido, acende quando calcula; cada lab um nucleo dourado; as bolhas sobem
    // de quem calcula) com SEIS movimentos. Escolhe-se nos botoes do cartao e fica guardado neste navegador.
    // 10/10: + a NEBULOSA ESPIRAL (a que ele aprovou na 2.a pagina de testes; bloco <nebulosa> acima): e o botao 1 e o modelo por
    // omissao; os seis de 09/10 ficam nos botoes 2-7. A escolha guarda-se agora em t3b_lab_modelo2 (a chave t3b_lab_modelo, de
    // 09/10, fica como estava e ja ninguem a le): assim quem tinha escolhido outro passa uma vez a nebulosa.
    var ONDAS = {}, ULT_NV = {}, PROX_ONDA = {}, VIDA_ONDA = 2600;
    function noAnel(cx, cy, rx, ry, rot, q) { var x = Math.cos(q) * rx, y = Math.sin(q) * ry, cr = Math.cos(rot), sr = Math.sin(rot); return [cx + x * cr - y * sr, cy + x * sr + y * cr]; }
    function nucleoLab(ctx, gi, c, nv, t) {
      if (nv > 0.05) luz(ctx, C.ouro, c.x, c.y, c.R * 0.9, 0.22 * nv);
      luz(ctx, '#ffdc6a', c.x, c.y, 7 + 5 * nv + Math.sin(t * 1.3 + gi), 0.55 + 0.4 * nv);
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(c.x, c.y, 2.4 + 1.2 * nv, 0, TAU); ctx.fill();
    }
    // 21/10 22h (ele: "o laboratorio nao funciona direito, nao mostra a accao por minuto, esta totalmente bugado; fazer um tipo
    // totalmente diferente, com outras accoes e outras animacoes"): OS TUBOS DE ENSAIO - um tubo por especialidade; o nivel do liquido
    // dourado e a fraccao de genes ROBUSTOS do grupo; cada gene calculado sobe como uma BOLHA (dourada se robusto); por baixo de cada
    // tubo, os genes por minuto (3 min) desse grupo; no rodape, o total. O modelo por omissao passa a ser este.
    // 21/10 23h (ele escolheu na pagina dos modelos: "o laboratorio pode ser o placar ao vivo do juiz completo"): cada fonte ou estrategia
    // com o t do juiz (acima do mercado), a historia (acumula enquanto a pagina esta aberta), o acerto contra o acaso, n e dias, as duas
    // metades do ano (estavel = as duas positivas), setas de quem subiu ou desceu, a porta do dinheiro (t = 3) e as ultimas conferencias.
    // Os dados: o balde do /evolucao.json (placar_completo, juiz_recentes, juiz_vivo). O unico modelo do cartao.
    function criarPlacar() {
      var HIST = {}, ORDEM = [], SETA = {}, VER = null;
      function desenhar(ctx, w, h, t) {
        var b = BALDE || {}, L = (b.placar_completo || []).slice(0, Math.max(3, Math.floor((h - TOPO - 58) / 19))), jv = b.juiz_vivo || {}, rec = b.juiz_recentes || [];
        if (!L.length) { rot(ctx, 'à espera do placar do juiz…', w / 2, h / 2, C.dim, 9, 'center', 500); return; }
        var chaveV = L.map(function (r) { return r.fonte + r.horizonte_d + ':' + r.t; }).join('|');
        if (chaveV !== VER) {
          VER = chaveV;
          var nova = L.map(function (r) { return r.fonte + '|' + r.horizonte_d; });
          nova.forEach(function (k, i) { var a = ORDEM.indexOf(k); if (a >= 0 && a !== i) SETA[k] = { d: a > i ? 1 : -1, t0: t }; });
          ORDEM = nova;
          L.forEach(function (r) { var k = r.fonte + '|' + r.horizonte_d, hs = HIST[k] = HIST[k] || []; hs.push(r.t || 0); if (hs.length > 40) hs.shift(); });
        }
        var largo = w >= 420, top = TOPO + 30, lh = Math.max(15, Math.min(22, (h - top - 30) / L.length));
        var xn = 8, xb = Math.max(118, w * (largo ? 0.27 : 0.43)), xe = largo ? w - 220 : w - 46, esc = (xe - xb - 30) / 3.6, xl = xb + 3 * esc;
        rot(ctx, 'juiz: ' + fmt(jv.conferidos || 0, 0) + ' ao vivo' + (jv.conferidos ? '' : (jv.proxima ? ' · 1.ª às ' + String(jv.proxima).slice(11, 16) + ' UTC' : '')) + ' · ' + fmt(((((b.placar_completo || [])[0] || {}).n) || 0), 0) + ' no topo', 8, TOPO + 9, C.mute, 7.5, 'left', 600);
        rot(ctx, '● ● = as duas metades do ano · ouro = estável', 8, TOPO + 19, C.dim, 7, 'left', 500);
        ctx.strokeStyle = 'rgba(63,214,154,.75)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xl, top - 4); ctx.lineTo(xl, top + lh * L.length); ctx.stroke(); ctx.setLineDash([]);
        rot(ctx, 't=3 dinheiro', xl, top - 6, C.ok, 7, 'center', 700);
        L.forEach(function (r, i) {
          var k = r.fonte + '|' + r.horizonte_d, y = top + i * lh, yc = y + lh * 0.66, est = !!r.estavel || (r.ao_vivo && r.prova), tv = Number(r.t) || 0, bw = Math.max(2, Math.min(xe - xb - 26, tv * esc));
          var s = SETA[k]; if (s && t - s.t0 < 4) rot(ctx, s.d > 0 ? '▲' : '▼', xn, yc, s.d > 0 ? C.ok : C.mau, 8, 'left', 700);
          var nm = String(r.fonte || '').replace(/^classica:/, '').replace(/_/g, ' ');
          rot(ctx, TX.cortar(nm, Math.max(8, Math.floor((xb - xn - 30) / 4.6))) + ' ' + r.horizonte_d + 'd', xn + 10, yc, est ? C.txt : C.dim, 8, 'left', 600);
          ctx.fillStyle = r.t1 > 0 ? C.ok : C.mau; ctx.beginPath(); ctx.arc(xb - 14, y + lh * 0.48, 2.3, 0, TAU); ctx.fill();
          ctx.fillStyle = r.t2 > 0 ? C.ok : C.mau; ctx.beginPath(); ctx.arc(xb - 7, y + lh * 0.48, 2.3, 0, TAU); ctx.fill();
          var gr = ctx.createLinearGradient(xb, 0, xb + bw, 0); gr.addColorStop(0, est ? 'rgba(242,194,48,.35)' : 'rgba(90,90,100,.35)'); gr.addColorStop(1, est ? C.ouro : '#5b5b66');
          ctx.fillStyle = gr; ctx.fillRect(xb, y + lh * 0.22, bw, lh * 0.52);
          if (tv >= 2.6) luz(ctx, C.ouroHi, xb + bw, y + lh * 0.48, 8 + 3 * Math.sin(t * 4), 0.55);
          rot(ctx, fmt(tv, 2) + (r.ao_vivo ? ' ●' : ''), xb + bw + 4, yc, est ? C.ouroHi : C.mute, 8, 'left', 700);
          var hs = HIST[k] || [], hx = xe + 4, hw = largo ? 70 : 34;
          if (hs.length > 1) { var mn = Math.min.apply(null, hs), mx = Math.max.apply(null, hs); ctx.strokeStyle = est ? C.ouro : C.mute; ctx.beginPath(); hs.forEach(function (v, j) { var px = hx + j * hw / (hs.length - 1), py = y + lh * 0.75 - (v - mn) / Math.max(0.05, mx - mn) * lh * 0.5; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
          else { ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(hx, y + lh * 0.5); ctx.lineTo(hx + hw, y + lh * 0.5); ctx.stroke(); }
          if (largo) {
            var ax = xe + 82, aw = 70, ac = Number(r.acerto) || 0, aa = Number(r.acaso) || 0;
            ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(ax, y + lh * 0.3, aw, lh * 0.4);
            ctx.fillStyle = ac >= aa ? 'rgba(63,214,154,.7)' : 'rgba(255,90,95,.6)'; ctx.fillRect(ax, y + lh * 0.3, aw * ac, lh * 0.4);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(ax + aw * aa, y + lh * 0.2, 1.5, lh * 0.6);
            rot(ctx, Math.round(ac * 100) + '/' + Math.round(aa * 100) + '% · ' + fmt(r.n || 0, 0) + '·' + (r.dias || 0) + 'd', w - 6, yc, C.mute, 7.5, 'right', 500);
          }
        });
        var yt = top + lh * L.length + 12;
        if (rec.length) rec.slice(0, Math.max(1, Math.floor((h - yt) / 11))).forEach(function (rr, i) { rot(ctx, TX.cortar((rr.acerto ? '✓ ' : '✗ ') + 'juiz: ' + String(rr.fonte).replace(/^classica:/, '') + ' ' + rr.moeda + ' ' + rr.h + 'd ' + (rr.ganho_pct >= 0 ? '+' : '') + fmt(rr.ganho_pct, 1) + '%', Math.floor((w - 12) / 4.4)), 8, yt + i * 11, rr.acerto ? C.ok : C.mau, 7.5, 'left', 600); });
        else rot(ctx, 'o juiz começa a conferir ao vivo de madrugada (6 h depois dos sinais)', 8, yt, C.dim, 7.5, 'left', 500);
      }
      return { nome: 'Placar vivo do juiz', desenhar: desenhar, estado: function () { return { linhas: ((BALDE || {}).placar_completo || []).length, historia: Object.keys(HIST).length }; } };
    }
    function criarTubos() {
      var B = LAB.tubosB = [];
      function desenhar(ctx, w, h, t, dt) {
        var n = GRUPOS.length, top = TOPO + 42, bot = h - 62, esp = (w - 16) / n, tw = Math.max(10, Math.min(26, esp * 0.55)), alt = Math.max(30, bot - top);
        var corte = Date.now() - 180000, totPm = 0, rob = 0, tot = 0, CX = [];
        GRUPOS.forEach(function (g, gi) {
          var j = (LAB.janG = LAB.janG || {})[gi] || []; while (j.length && j[0][0] < corte) j.shift();
          var pm = 0; j.forEach(function (x) { pm += x[1]; }); pm /= 3; totPm += pm; rob += LAB.rob[gi] || 0; tot += LAB.tot[gi] || 0;
          var cx = 8 + esp * (gi + 0.5), x0 = cx - tw / 2, tg = LAB.tot[gi] || 0, nivel = tg ? Math.max(0.06, Math.min(0.94, (LAB.rob[gi] || 0) / tg)) : 0.06;
          var ativo = clamp(pm / 30, 0, 1); CX[gi] = { cx: cx, ly: bot - nivel * alt };
          ctx.save(); ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, bot - tw / 2); ctx.arc(cx, bot - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(x0 + tw, top); ctx.closePath(); ctx.clip();
          var ly = CX[gi].ly, gr = ctx.createLinearGradient(0, ly, 0, bot);
          gr.addColorStop(0, 'rgba(242,194,48,' + (0.55 + 0.35 * ativo).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(242,194,48,.18)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - 2, bot + 2);
          for (var k = 0; k <= 8; k++) { var xx = x0 - 2 + (tw + 4) * k / 8; ctx.lineTo(xx, ly + (calmo ? 0 : 1.6 * Math.sin(t * 2.2 + gi + k * 0.9))); }
          ctx.lineTo(x0 + tw + 2, bot + 2); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = 'rgba(190,225,255,' + (0.38 + 0.4 * ativo).toFixed(2) + ')'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, bot - tw / 2); ctx.arc(cx, bot - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(x0 + tw, top); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0 - 3, top); ctx.lineTo(x0 + tw + 3, top); ctx.stroke();
          if (ativo > 0.05) luz(ctx, C.ouro, cx, ly, 8 + 6 * ativo, 0.35 * ativo);
          rot(ctx, TX.cortar(g.nome, Math.max(4, Math.floor(esp / 4.6))), cx, bot + 12, C.mute, 7.5, 'center', 600);
          rot(ctx, fmt(pm, 0) + '/min', cx, bot + 23, pm >= 1 ? C.ouroHi : C.dim, 8.5, 'center', 700);
        });
        ctx.lineWidth = 1;
        for (var ib = B.length - 1; ib >= 0; ib--) {
          var b = B[ib], c = CX[b.gi]; if (!c) { B.splice(ib, 1); continue; }
          b.y += (calmo ? 0 : dt) * b.v;
          var by = bot - tw / 2 - b.y * (alt - tw / 2), bx = c.cx + b.jx * tw * 0.32 + (calmo ? 0 : 1.2 * Math.sin(t * 5 + ib));
          if (by < c.ly - 2 || b.y > 1) { if (b.rob) luz(ctx, C.ouroHi, bx, c.ly, 6, 0.6); B.splice(ib, 1); continue; }
          ctx.globalAlpha = 0.85; ctx.fillStyle = b.rob ? C.ouroHi : 'rgba(200,235,255,.9)';
          ctx.beginPath(); ctx.arc(bx, by, b.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        }
        rot(ctx, fmt(totPm, 0) + ' genes/min · robustos ' + fmt(rob, 0) + ' de ' + fmt(tot, 0), 8, bot + 35, totPm >= 1 ? C.ouroHi : C.dim, 8, 'left', 700);
      }
      return { nome: 'Tubos de ensaio', desenhar: desenhar, estado: function () { return { bolhas: B.length }; } };
    }
    var ORDEM_LAB = ['placar', 'tubos', 'nebulosa', 'orbita', 'espiral', 'atomo', 'pulsar', 'enxame', 'relogio'];
    var MODELOS_LAB = {
      placar: criarPlacar(),
      tubos: criarTubos(),
      // 0. NEBULOSA ESPIRAL (10/10, a aprovada): desenha o cartao inteiro (o "desenhar" substitui o mover/quadro dos outros)
      nebulosa: criarNebulosa(),
      // 1. ORBITAS (o de 07-08/10): cada gene na sua orbita, os de dentro mais depressa; quem calcula acelera
      orbita: { nome: 'Órbitas',
        mover: function (st, c, gr, t, dm, base) {
          var resp = 1 + 0.03 * Math.sin(t * 0.7 + st.g);
          if (st.ow == null) st.ow = (0.1 + 0.38 * (1 - Math.min(1, st.raio))) * (U.semente(String(st.k)) % 2 ? 1 : 0.82);
          st.fase = (st.fase || 0) + dm * (st.ow * (0.45 + 0.55 * base) + 1.8 * st.luz);
          st.x = c.x + Math.cos(st.ang + gr + st.fase) * st.raio * c.R * resp; st.y = c.y + Math.sin(st.ang + gr + st.fase) * st.raio * c.R * 0.7 * resp; st.z = 1;
        },
        quadro: function (ctx, gi, c, nv) {
          ctx.strokeStyle = 'rgba(242,194,48,' + (0.1 + 0.28 * nv).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R * 1.02, c.R * 0.72, 0, 0, TAU); ctx.stroke();
        } },
      // 2. GALAXIA: dois bracos em espiral a rodar (rotacao diferencial: o centro anda mais depressa); quem calcula escorrega para dentro
      espiral: { nome: 'Galáxia',
        mover: function (st, c, gr, t, dm, base) {
          var sem = U.semente(String(st.k)), braco = sem % 2, r = Math.max(0.08, Math.min(1, st.raio)) * (1 - 0.22 * st.luz);
          st.fx = (st.fx || 0) + dm * 0.9 * st.luz;
          var a = braco * Math.PI + 2.4 * Math.log(1 + 5 * r) + gr * 3 * (1.5 - r) + st.fx + ((sem >> 3) % 100) / 400;
          st.x = c.x + Math.cos(a) * r * c.R; st.y = c.y + Math.sin(a) * r * c.R * 0.62; st.z = 0.75 + 0.25 * Math.sin(a);
        },
        quadro: function (ctx, gi, c, nv) {
          var gr = LAB.giro[gi] || 0;
          ctx.strokeStyle = 'rgba(242,194,48,' + (0.07 + 0.2 * nv).toFixed(3) + ')';
          for (var b = 0; b < 2; b++) {
            ctx.beginPath();
            for (var i = 0; i <= 18; i++) { var r = 0.08 + i / 18 * 0.95, a = b * Math.PI + 2.4 * Math.log(1 + 5 * r) + gr * 3 * (1.5 - r); var x = c.x + Math.cos(a) * r * c.R, y = c.y + Math.sin(a) * r * c.R * 0.62; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
            ctx.stroke();
          }
        } },
      // 3. ATOMO: tres orbitas inclinadas (0, 60 e 120 graus), cada gene numa, a passar por tras (mais pequeno e apagado) e pela frente
      atomo: { nome: 'Átomo',
        mover: function (st, c, gr, t, dm, base) {
          var sem = U.semente(String(st.k)), k = sem % 3, dir = (sem >> 3) % 2 ? 1 : -1;
          if (st.fa == null) st.fa = st.ang;
          st.fa += dm * dir * (0.5 + 0.7 * base + 2.2 * st.luz) * (0.8 + 0.04 * ((sem >> 5) % 10));
          var rx = c.R * [0.66, 0.84, 1.0][k], q = noAnel(c.x, c.y, rx, rx * 0.3, k * Math.PI / 3, st.fa);
          st.x = q[0]; st.y = q[1]; st.z = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(st.fa));
        },
        quadro: function (ctx, gi, c, nv) {
          ctx.strokeStyle = 'rgba(242,194,48,' + (0.1 + 0.25 * nv).toFixed(3) + ')';
          for (var k = 0; k < 3; k++) { var rx = c.R * [0.66, 0.84, 1.0][k]; ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, rx * 0.3, k * Math.PI / 3, 0, TAU); ctx.stroke(); }
        } },
      // 4. PULSAR: o nucleo solta ondas (sozinho devagar; mais depressa com actividade; uma logo que um gene do lab calcula) e os
      // genes sobem na crista da onda e acendem quando ela passa
      pulsar: { nome: 'Pulsar',
        antes: function (CS, t, dm, base, agora) {
          GRUPOS.forEach(function (g, gi) {
            var nv = Math.min(1, LAB.nuvem[gi] || 0), os = ONDAS[gi] || (ONDAS[gi] = []);
            if (dm && (nv > (ULT_NV[gi] || 0) + 0.25 || agora >= (PROX_ONDA[gi] || 0))) {
              if (os.length < 6) os.push(agora);
              PROX_ONDA[gi] = agora + 1000 * (4.5 - 3.2 * Math.min(1, base + nv));
            }
            ULT_NV[gi] = nv;
            while (os.length && agora - os[0] > VIDA_ONDA) os.shift();
          });
        },
        mover: function (st, c, gr, t, dm, base, agora) {
          var r0 = (0.18 + 0.78 * Math.min(1, st.raio)) * c.R, a = st.ang + gr * 0.6, d = 0, os = ONDAS[st.g] || [];
          for (var i = 0; i < os.length; i++) { var id = (agora - os[i]) / VIDA_ONDA, q = (id * c.R * 1.15 - r0) / (0.14 * c.R); d += 0.11 * c.R * Math.exp(-q * q) * (1 - id); }
          st.brilho = Math.min(1, d / (0.09 * c.R));
          st.x = c.x + Math.cos(a) * (r0 + d); st.y = c.y + Math.sin(a) * (r0 + d) * 0.7; st.z = 1;
        },
        quadro: function (ctx, gi, c, nv, t, agora) {
          var os = ONDAS[gi] || [];
          for (var i = 0; i < os.length; i++) {
            var id = (agora - os[i]) / VIDA_ONDA, rw = Math.max(0.5, id * c.R * 1.15);
            ctx.strokeStyle = 'rgba(242,194,48,' + (0.42 * (1 - id)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(c.x, c.y, rw, rw * 0.7, 0, 0, TAU); ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(242,194,48,.08)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.R, c.R * 0.7, 0, 0, TAU); ctx.stroke();
        } },
      // 5. ENXAME: os genes voam juntos a volta do nucleo (atracao + redemoinho + vaguear, sem se encostarem uns aos outros); quem
      // calcula dispara para fora e volta ao bando
      enxame: { nome: 'Enxame',
        antes: function (CS, t, dm, base) {
          if (!dm) return;
          var por = {};
          LAB.est.forEach(function (st) {
            if (st.px == null) { st.px = Math.cos(st.ang) * st.raio; st.py = Math.sin(st.ang) * st.raio * 0.7; st.vx = 0; st.vy = 0; }
            (por[st.g] || (por[st.g] = [])).push(st);
          });
          Object.keys(por).forEach(function (gk) {
            var es = por[gk];
            es.forEach(function (st) {
              var sem = U.semente(String(st.k)), fx = -1.1 * st.px, fy = -1.1 * st.py / 0.49;
              fx += -st.py * 0.9; fy += st.px * 0.9;
              fx += 0.35 * Math.sin(t * (0.7 + (sem % 7) / 10) + sem); fy += 0.35 * Math.cos(t * (0.6 + (sem % 5) / 10) + sem * 0.5);
              var dd = Math.sqrt(st.px * st.px + st.py * st.py) || 1e-3; fx += st.luz * 3.2 * st.px / dd; fy += st.luz * 3.2 * st.py / dd;
              for (var j = 0; j < es.length; j++) { var o = es[j]; if (o === st) continue; var ex = st.px - o.px, ey = st.py - o.py, d2 = ex * ex + ey * ey; if (d2 < 0.012 && d2 > 1e-6) { fx += ex / d2 * 0.004; fy += ey / d2 * 0.004; } }
              var k = 0.6 + 0.6 * base, am = Math.pow(0.35, dm);
              st.vx = (st.vx + fx * dm * k) * am; st.vy = (st.vy + fy * dm * k) * am;
              st.px += st.vx * dm; st.py += st.vy * dm;
              var rr = Math.sqrt(st.px * st.px + (st.py / 0.7) * (st.py / 0.7)); if (rr > 1.05) { st.px *= 1.05 / rr; st.py *= 1.05 / rr; }
            });
          });
        },
        mover: function (st, c) {
          if (st.px == null) { st.px = Math.cos(st.ang) * st.raio; st.py = Math.sin(st.ang) * st.raio * 0.7; st.vx = 0; st.vy = 0; }
          st.x = c.x + st.px * c.R; st.y = c.y + st.py * c.R; st.z = 1;
        },
        quadro: function (ctx, gi, c, nv) { if (nv > 0.05) luz(ctx, C.ouro, c.x, c.y, c.R * 1.1, 0.12 * nv); } },
      // 6. PLANETARIO: quatro aneis concentricos a rodar em sentidos alternados, os de dentro mais depressa (como um relogio de
      // planetas); quem calcula salta para o anel de dentro e volta ao seu
      relogio: { nome: 'Planetário',
        mover: function (st, c, gr, t, dm, base) {
          var anel = Math.min(3, Math.floor(Math.min(0.999, st.raio) * 4)), dir = anel % 2 ? -1 : 1;
          st.fa = (st.fa == null ? st.ang : st.fa) + dm * dir * (0.55 / (anel + 1)) * (0.5 + 0.8 * base);
          var r = (0.32 + 0.22 * Math.max(0, anel - 1.6 * st.luz)) * c.R;
          st.x = c.x + Math.cos(st.fa) * r; st.y = c.y + Math.sin(st.fa) * r * 0.7; st.z = 1;
        },
        quadro: function (ctx, gi, c, nv) {
          for (var a = 0; a < 4; a++) { var r = (0.32 + 0.22 * a) * c.R; ctx.strokeStyle = 'rgba(242,194,48,' + ((a ? 0.1 : 0.22) + 0.2 * nv).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.7, 0, 0, TAU); ctx.stroke(); }
        } }
    };
    var CHAVE_LAB = 't3b_lab_modelo4', LAB_OMISSAO = 'placar';   // 21/10 23h: o placar vivo do juiz (a escolha dele)
    try { LAB.modelo = window.localStorage.getItem(CHAVE_LAB) || LAB_OMISSAO; } catch (e) { LAB.modelo = LAB_OMISSAO; }
    if (!MODELOS_LAB[LAB.modelo]) LAB.modelo = LAB_OMISSAO;
    LAB.modelo = LAB_OMISSAO;   // 21/10 22h45 (ele: "nao quero ficar a escolher opcoes; um so"): sem botoes ate ele escolher o modelo novo
    EXTRA.lab_modelo = function () { return { modelo: LAB.modelo, modelos: ORDEM_LAB.length, nebulosa: MODELOS_LAB.nebulosa.estado(), tubos: MODELOS_LAB.tubos.estado(), placar: MODELOS_LAB.placar.estado() }; };
    (function () {          // os botoes 1-7 no canto do cartao (a pega de arrastar e so o titulo: nao chocam)
      var hl = $('h_lab'); if (!hl || hl.querySelector('.lab-mod')) return;
      var bar = document.createElement('div'); bar.className = 'lab-mod'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'modelo do laboratorio');
      ORDEM_LAB.forEach(function (id, i) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = String(i + 1); b.title = (i + 1) + ' · ' + MODELOS_LAB[id].nome; b.dataset.m = id;
        if (id === LAB.modelo) b.className = 'on';
        b.addEventListener('click', function (ev) {
          ev.stopPropagation(); LAB.modelo = id;
          try { window.localStorage.setItem(CHAVE_LAB, id); } catch (e2) { }
          Array.prototype.forEach.call(bar.children, function (x) { x.className = x.dataset.m === id ? 'on' : ''; });
          LAB.est.forEach(function (st) { st.px = null; });
          sujar(cenaLab, 4000);
        });
        bar.appendChild(b);
      });
      hl.appendChild(bar);
    })();
    cenaLab = cena(cv, { id: 'lab', holo: $('h_lab'), desenhar: function (ctx, w, h, t, dt, s) {
      ctx.clearRect(0, 0, w, h);
      if (!LAB.carregado) { rot(ctx, 'a ler os genes dos labs…', w / 2, h / 2 + 8, C.dim, 9, 'center', 500); return; }
      var MOV = MODELOS_LAB[LAB.modelo] || MODELOS_LAB[LAB_OMISSAO], agora = agoraMs(), base = (ACT.lab || {}).base || 0;
      if (MOV.desenhar) {
        // 10/10: a Nebulosa espiral desenha o cartao inteiro (uma galaxia: um braco por especialidade, um aglomerado por lab). A luz
        // das estrelas do cartao e o brilho das nuvens continuam a apagar-se como nos outros modelos; as bolhas nao entram aqui
        MOV.desenhar(ctx, w, h, t, dt, agora, base);
        if (LAB.modelo !== 'placar') estadoDoLab(ctx, w, agora);
        LAB.est.forEach(function (st) { st.luz *= Math.pow(0.45, dt); });
        GRUPOS.forEach(function (g, gi) { LAB.nuvem[gi] = (LAB.nuvem[gi] || 0) * Math.pow(0.5, dt); });
        LAB.bolhas.length = 0;
        rot(ctx, MOV.nome.toUpperCase(), w - 24, h - 6, C.dim, 7, 'right', 600);
        return;
      }
      if (LIG.ver !== LAB.ver || LIG.w !== w || LIG.h !== h) ligar(w, h);
      var CS = centros(w, h);
      // a posicao de cada gene agora: a casa + a flutuacao (cada um ao seu ritmo)
      // 05/10 (ele: "a movimentacao ta estranha, nao ta compativel com o que e"): cada ponto tremia sozinho; agora cada NUVEM gira
      // inteira e devagar a volta do seu centro (mais depressa quando os genes dela calculam) e respira um pouco
      LAB.giro = LAB.giro || {};
      GRUPOS.forEach(function (g, gi) { LAB.giro[gi] = (LAB.giro[gi] || 0) + (calmo ? 0 : dt * (0.035 + 0.3 * Math.min(1, LAB.nuvem[gi] || 0))); });
      // 07/10 (Q5 B6, ele: "a animacao e fluidez como o card de exemplo 'os labs em orbita'"): as nuvens ficam, mas cada gene tem
      // a SUA orbita (os de dentro mais depressa, como planetas), e o que calcula ACELERA e acende; os robustos a ouro
      var dm = calmo ? 0 : dt;
      if (MOV.antes) MOV.antes(CS, t, dm, base, agora);
      LAB.est.forEach(function (st) {
        st.brilho = 0;
        MOV.mover(st, CS[st.g], LAB.giro[st.g] || 0, t, dm, base, agora);
        st.luz *= Math.pow(0.45, dt);
      });
      // as nuvens: o brilho de cada uma (acende com os calculos dos seus genes)
      GRUPOS.forEach(function (g, gi) { LAB.nuvem[gi] = (LAB.nuvem[gi] || 0) * Math.pow(0.5, dt); });
      // 08/10 (OBRA 11): sem as linhas da rede; cada lab um NUCLEO dourado com o desenho do modelo (anel, bracos, orbitas, ondas)
      ctx.lineWidth = 1;
      GRUPOS.forEach(function (g, gi) { var c = CS[gi], nv = Math.min(1, LAB.nuvem[gi] || 0); MOV.quadro(ctx, gi, c, nv, t, agora); nucleoLab(ctx, gi, c, nv, t); });
      // os genes: primeiro os brilhos todos de uma vez (um so modo de mistura), depois os pontos
      var spR = sprite(C.ouro, 5), spL = sprite('#fff3c4', 9);
      ctx.globalCompositeOperation = 'lighter';
      LAB.est.forEach(function (st) {
        if (st.r && !st.d) { ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 1.7 + st.ang); ctx.drawImage(spR, st.x - 5, st.y - 5, 10, 10); }
        var lz = Math.max(st.luz, st.brilho || 0);
        if (lz > 0.08) { var rl = 6 + lz * 5; ctx.globalAlpha = lz * 0.9 * (st.z == null ? 1 : st.z); ctx.drawImage(spL, st.x - rl, st.y - rl, rl * 2, rl * 2); }
      });
      ctx.globalCompositeOperation = 'source-over';
      LAB.est.forEach(function (st) {
        var cor = st.d ? '#55555e' : st.r ? '#ffd65a' : 'rgba(242,194,48,.62)', z = st.z == null ? 1 : st.z, lz2 = Math.max(st.luz, st.brilho || 0);
        var tam = (st.d ? 1.2 : st.r ? 1.9 : 1.35) * (0.65 + 0.35 * z);
        ctx.fillStyle = lz2 > 0.08 ? '#fff7d6' : cor; ctx.globalAlpha = (st.d ? 0.7 : 1) * (0.5 + 0.5 * z);
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
      rot(ctx, MOV.nome.toUpperCase(), w - 24, h - 6, C.dim, 7, 'right', 600);
      // os nomes e os numeros de cada lab (camada guardada)
      porCamada(ctx, s, 'nomes', GRUPOS.map(function (g, i) { return (LAB.rob[i] || 0) + '/' + (LAB.tot[i] || 0); }).join('|'), function (g) {
        // 08/10 (OBRA 11): o nome curto do lab e os robustos (o total fica no titulo e na barra minimizada) - os nomes compridos batiam uns nos outros
        var etq = GRUPOS.map(function (gg, i) { return { t: gg.nome.toLowerCase() + ' ' + fmt(LAB.rob[i] || 0, 0), x: CS[i].x, y: CS[i].y + CS[i].R * 0.72 + 10, cor: 'rgba(242,194,48,.9)', tam: 7.5 }; });
        arrumarEtiquetas(g, 'lab', etq, w, h);
      });
      estadoDoLab(ctx, w, agora);
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
  // 21/10 19h (ele: "em algumas paginas nao se ajusta a resolucao e deixa cards espremidos e pequenos; a prioridade e aparecer
  // melhor os cards"): MEDIDO no print dele (janela com barra de favoritos e o aviso do Comet) - o livro (peso 2,3) comia a coluna
  // de perto e o globo e o relogio ficavam com ~90 px. Agora cada cartao recebe PRIMEIRO o seu minimo legivel (data-min, 150 por
  // omissao) e SO o que sobra vai pelo peso ate ao maximo (data-max); sem lugar para os minimos, todos encolhem por igual
  // (nunca abaixo de 56). PURA: alturasDaColuna (testes_t3b.js).
  // <alturas-puro>
  var ALT_MIN_HOLO = 150;
  function alturasDaColuna(specs, livre) {
    var out = specs.map(function (s) { return s ? Math.min(s.max, s.min) : 42; });
    var abertos = []; specs.forEach(function (s, i) { if (s) abertos.push(i); });
    var somaMin = 0; abertos.forEach(function (i) { somaMin += out[i]; });
    if (somaMin >= livre) { var f = livre / Math.max(1, somaMin); abertos.forEach(function (i) { out[i] = Math.max(56, out[i] * f); }); return out; }
    var sobra = livre - somaMin;
    for (var volta = 0; volta < 6 && sobra > 0.5; volta++) {
      var ativos = abertos.filter(function (i) { return out[i] < specs[i].max - 0.5; }); if (!ativos.length) break;
      var pesos = 0; ativos.forEach(function (i) { pesos += specs[i].peso; });
      var usado = 0; ativos.forEach(function (i) { var d = Math.min(specs[i].max - out[i], sobra * specs[i].peso / pesos); out[i] += d; usado += d; });
      sobra -= usado;
    }
    return out;
  }
  // </alturas-puro>
  var fios = $('fios'), ultAnc = null, alvos = {}, svgFios = { ass: '' };
  // 21/10 22h50 (ele: "so precisam de mostrar o andar num numero"): cada holograma diz o seu andar
  setInterval(function () {
    Array.prototype.forEach.call(document.querySelectorAll('.holo[data-andar-chave]'), function (h) {
      var n = andarDoHolo(h.dataset.andarChave); if (n == null) return;
      var b = h.querySelector(':scope > .and-n'); if (!b) { b = document.createElement('span'); b.className = 'and-n'; h.appendChild(b); }
      var tx = 'and. ' + n; if (b.textContent !== tx) b.textContent = tx;
    });
  }, 3000);
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
      var alts = alturasDaColuna(hs.map(function (h) { return h.classList.contains('min') ? null : { peso: Number(h.dataset.peso || 1), min: Number(h.dataset.min || ALT_MIN_HOLO), max: Number(h.dataset.max || 240) }; }),
        Hc - gap * (hs.length - 1));
      var itens = hs.map(function (h, i) {
        var n = andarDoHolo(h.dataset.andarChave), a = (!fora && n != null) ? anc[n + par[1]] : null, alt = alts[i];   // 21/10: o minimo legivel primeiro, o resto pelo peso (alturasDaColuna)
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
        if (!velho || Math.abs(velho.top - top) > 5 || velho.alt !== alt || !it.h.style.height) { it.h.style.setProperty('--y', top + 'px'); if (!velho || velho.alt !== alt || !it.h.style.height) it.h.style.height = alt + 'px'; alvos[it.h.id] = { top: top, alt: alt }; }
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

  // 21/10 22h: AMPLIAR - duplo clique num holograma abre-o grande no meio do ecra (o canvas mede-se sozinho pelo ResizeObserver)
  document.addEventListener('dblclick', function (ev) {
    var h = ev.target && ev.target.closest ? ev.target.closest('.holo') : null; if (!h) return;
    var ja = h.classList.contains('grande');
    Array.prototype.forEach.call(document.querySelectorAll('.holo.grande'), function (x) { x.classList.remove('grande'); });
    if (!ja) { h.classList.add('grande'); h.title = 'duplo clique ou Esc para fechar'; }
    cenas.forEach(function (s2) { s2.precisaTam = true; s2.sujo = true; });
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') Array.prototype.forEach.call(document.querySelectorAll('.holo.grande'), function (x) { x.classList.remove('grande'); cenas.forEach(function (s2) { s2.precisaTam = true; }); }); });
  // ---------------------------------------------------------------- blocos do painel do andar (usados pelo t3b_vivo.js)
  window.T3BHolo = {
    blocoDoAndar: function (a) {
      var T = T3B.estado.T; if (!T) return '';
      var esp = String(a.esp || ''), r = obj(T.reactor), linha = function (x, y) { return '<tr><td>' + U.escH(x) + '</td><td>' + U.escH(y) + '</td></tr>'; };
      var tt = a.turnos || a.censo, extra = tt ? linha('A trabalhar agora', fmt(tt.a_trabalhar_agora, 0) + ' de ' + fmt(tt.registados, 0)) + linha('Em turno · a evoluir', fmt(tt.em_turno, 0) + ' · ' + fmt(tt.em_descanso_a_evoluir, 0)) : '';
      if (/sr_stark|conselho|socios/.test(esp)) { var c = obj(r.conta), g = obj(r.ganho), rlS = realDaCasa(T); if (rlS) return '<table><tbody>' + linha('Hoje · conta real', sinal(rlS.hoje_usd, 2) + ' US$') + linha('Realizado hoje · real', sinal(rlS.realizado_hoje_usd != null ? rlS.realizado_hoje_usd : 0, 2) + ' US$') + linha('Realizado desde o início · real', sinal(rlS.realizado_usd, 2) + ' US$') + linha('Desde o início · real', sinal(rlS.desde_o_inicio_usd, 2) + ' US$') + extra + '</tbody></table>'; return '<table><tbody>' + linha('Resultado de hoje', sinal(c.pnl_hoje, 2) + ' US$') + linha('Realizado hoje', sinal(g.realizado_usd, 2) + ' US$') + linha('Acumulado em papel', sinal(c.acumulado_papel, 2) + ' US$') + extra + '</tbody></table>'; }
      if (esp === 'risco') { var v = obj(T.vingadores), k = obj(T.killian); return '<table><tbody>' + linha('N efectivo', fmt(v.n_ef, 2)) + linha('Posições', v.n_posicoes || 0) + linha('Rotações recusadas', k.rotacoes_recusadas || 0) + extra + '</tbody></table>'; }
      if (esp === 'mesa' && realDaCasa(T)) return '<table><tbody>' + lista(realDaCasa(T).posicoes).map(function (p) { return linha(p.simbolo, fmt(p.custo_usdt != null ? p.custo_usdt : Number(p.qty) * Number(p.entrada), 2) + ' US$ em uso · conta real'); }).join('') + extra + '</tbody></table>';
      if (esp === 'mesa') return '<table><tbody>' + lista(r.posicoes).map(function (p) { return linha(p.simbolo, sinal(p.pnl_aberto_usd, 2) + ' US$ · ' + fmt(p.valor_usd, 2) + ' em uso'); }).join('') + extra + '</tbody></table>';
      if (/celulas|cripto|volume_fluxo|preco_accao|reversao_media|tendencia/.test(esp)) { var e = obj(T.extremis); return '<table><tbody>' + linha('Geração actual', e.geracao_actual) + linha('Genes na memória', fmt(e.n_genes, 0)) + linha('Famílias', e.n_familias) + extra + '</tbody></table>'; }
      return extra ? '<table><tbody>' + extra + '</tbody></table>' : '';
    }
  };
})();
