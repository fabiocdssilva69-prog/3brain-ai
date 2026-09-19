// predio_holo.js - OS SETE HOLOGRAMAS DA TORRE STARK v4/v5: velocimetro, trilho do dia, Sr. Stark, Risco, Mesa,
// Laboratorio e (v5d) os Numeros do Pointer. Cada um e uma funcao (ctx, W, H, dados, extra) que desenha num canvas e nada mais: sem DOM,
// sem three.js, sem fetch. E por isso que o mesmo desenho serve o Sprite 3D do predio.js E o separador do
// telemovel (um <canvas> plano), e que `fatia()` - o corte dos dados que cada holograma precisa - se testa
// em node (sala/testes_predio_geo.js chama-a com o torre.json real).
//
// A LINGUAGEM (O_QUE_ELE_QUER_v4.md, 5): ciano sobre transparente, linhas de varrimento, moldura com uma
// inclinacao leve, titulo em maiusculas pequenas espacadas, numeros grandes em monoespacada, a hora do dado
// (t_brt) e a idade em minutos quando passa de 2. As cores tem significado e nao decoracao: verde/vermelho e
// P&L, ambar e aviso ou obra, ciano e estrutura, cinza e o que esta parado.
//
// A REGRA DE SEMPRE: nada aqui calcula um numero que os .py ja calculam. O que se desenha e o que esta no
// torre.json e no predio.json; quando falta, escreve-se que falta ("sem dado"), nunca se inventa.
(function (raiz) {
  'use strict';

  var C = {
    ciano: '#5ac8fa', cianoF: 'rgba(90,200,250,.55)', cianoFF: 'rgba(90,200,250,.22)', cianoFill: 'rgba(90,200,250,.05)',
    ambar: '#e8b04b', verde: '#3ecf8e', vermelho: '#ff5a5f', azul: '#4aa3ff', cinza: '#8a94a3', cinzaF: '#5b6573',
    texto: '#e6edf6', textoM: '#b9c4d1', fundoLinha: 'rgba(0,0,0,.16)'
  };
  var MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace';
  var SANS = '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';

  function n(x) { x = Number(x); return isFinite(x) ? x : null; }
  function num(v, c) { v = Number(v); return isFinite(v) ? v.toFixed(c == null ? 2 : c) : '—'; }
  function sinal(v, c) { v = Number(v); if (!isFinite(v)) return '—'; return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(c == null ? 2 : c); }
  function lista(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && Object.prototype.toString.call(x) !== '[object Array]') ? x : {}; }
  function S(x) { return String(x == null ? '' : x); }
  function corPnl(v) { v = Number(v); return !isFinite(v) || Math.abs(v) < 0.005 ? C.cinza : (v > 0 ? C.verde : C.vermelho); }

  // ---------------------------------------------------------------- as fatias (o que cada holograma le)
  function fatia(nome, T, D) {
    T = obj(T); D = obj(D);
    var r = obj(T.reactor), m = obj(r.medidor), g = obj(r.ganho), lim = obj(r.limites), d = null;
    var base = { t_brt: S(T.t_brt), t_iso: S(T.t_iso) };
    switch (String(nome)) {
      case 'velocimetro':
        d = { agora: n(m.agora), pico: n(m.pico), pico_t: S(m.pico_t), vale: n(m.vale), vale_t: S(m.vale_t),
              esperado: n(r.previsao_total_usd), stop: n(lim.perda_dia_usd), realizado: n(g.realizado_usd),
              aberto: n(g.aberto_usd), liquido: n(g.liquido_realista_usd), dia: S(m.dia) };
        break;
      case 'trilho':
        d = { serie: lista(m.serie).map(function (p) { return [S(lista(p)[0]), n(lista(p)[1])]; })
                .filter(function (p) { return p[1] != null; }),
              pico_t: S(m.pico_t), vale_t: S(m.vale_t), pico: n(m.pico), vale: n(m.vale), agora: n(m.agora) };
        break;
      case 'sr_stark': {
        var L = obj(r.lados), a = obj(L.acoes), c = obj(L.cripto), al = obj(r.alocacao), ct = obj(r.conta), ss = obj(D.sr_stark);
        d = { acoes: { capital: n(a.capital), em_uso: n(a.em_uso), realizado: n(a.realizado), aberto: n(a.aberto) },
              cripto: { capital: n(c.capital), em_uso: n(c.em_uso), realizado: n(c.realizado), aberto: n(c.aberto) },
              livre: n(al.livre), capital_casa: n(ct.capital_escala), existe: ss.existe === true };
        break;
      }
      case 'risco': {
        var v = obj(T.vingadores), k = obj(T.killian), rec = obj(k.recusas_por_par_hoje), sp = obj(k.spread_pb);
        d = { realizado: n(g.realizado_usd), perda_dia: n(lim.perda_dia_usd), n_ef: n(v.n_ef), n_posicoes: n(v.n_posicoes),
              recusas: Object.keys(rec).map(function (p) { return [S(p), n(rec[p])]; }).filter(function (x) { return x[1] != null; })
                .sort(function (x, y) { return y[1] - x[1]; }).slice(0, 4),
              spread: Object.keys(sp).map(function (p) { return [S(p), n(sp[p])]; }).filter(function (x) { return x[1] != null; })
                .sort(function (x, y) { return y[1] - x[1]; }).slice(0, 1),
              cadeiras: lista(T.cadeiras).map(function (cd) { cd = obj(cd); return { nome: S(cd.nome), papel: S(cd.papel), estado: S(cd.estado), hoje: n(cd.hoje) }; }) };
        break;
      }
      case 'mesa': {
        var p = obj(T.pepper), tot = obj(obj(p.totais).estrategias);
        // 19/09: a FITA - as ultimas linhas do feed, que e o que corre na "live tape" do canal. Sao eventos reais
        // escritos pelos executores; aqui so se cortam os campos e se limita a 14.
        var fita = lista(T.feed).slice(0, 14).map(function (e) {
          e = obj(e);
          return { t: S(e.t_brt).slice(0, 5), origem: S(e.origem), tipo: S(e.tipo), simbolo: S(e.simbolo),
                   texto: S(e.texto_curto), valor: n(e.valor) };
        });
        var linhas = lista(p.linhas).map(function (l) { l = obj(l); return { nome: S(l.nome_curto || l.chave), classe: S(l.classe), realizado: n(l.realizado) || 0, n: n(l.n), elegivel: l.elegivel === true }; });
        linhas.sort(function (x, y) { return y.realizado - x.realizado; });
        d = { fita: fita, linhas: linhas.slice(0, 6), n_linhas: n(tot.n_linhas), n: n(tot.n), realizado: n(tot.realizado), aberto: n(tot.aberto),
              posicoes: lista(r.posicoes).map(function (q) { q = obj(q); return { simbolo: S(q.simbolo), pnl: n(q.pnl_aberto_usd), pct: n(q.pnl_aberto_pct), origem: S(q.origem), valor: n(q.valor_usd) }; }).slice(0, 7) };
        break;
      }
      case 'laboratorio': {
        var e = obj(T.extremis);
        var gs = lista(e.geracoes).map(function (x) { x = obj(x); return { geracao: n(x.geracao), avaliados: n(x.avaliados) || 0, robustos: n(x.robustos) || 0, familia_maior: S(x.familia_maior), monocultura_pct: n(x.monocultura_pct) }; })
          .filter(function (x) { return x.geracao != null; }).sort(function (x, y) { return x.geracao - y.geracao; });
        d = { geracao_actual: n(e.geracao_actual), geracoes: gs.slice(-8), n_genes: n(e.n_genes), n_familias: n(e.n_familias), robustos_alguma_vez: n(e.robustos_alguma_vez) };
        break;
      }
      case 'numeros': {
        // v5d (18/09): os numeros que ele quer ver ao vivo, todos JA calculados pelos .py (reactor.ganho, gv.garantido,
        // cartao_fechar, cartao_plano, patrimonio). Aqui so se corta a fatia.
        var gv = obj(obj(r.gv).garantido), cf = obj(r.cartao_fechar), cp = obj(r.cartao_plano), pat = obj(r.patrimonio), ptot = obj(pat.total);
        var te = n(cf.taxa_entrada_usd), ts = n(cf.taxa_saida_usd);
        d = { saldo_dia: n(g.realizado_usd), liquido_dia: n(g.liquido_realista_usd),
              desde_inicio: n(ptot.ja_entrou), valor_realizado: n(pat.valor_so_realizado), var_pct: n(pat.variacao_realizada_pct),
              fechasse: n(cf.liquido_usd), fechasse_bruto: n(cf.bruto_usd), fechasse_taxas: (te == null && ts == null) ? null : (te || 0) + (ts || 0),
              plano: n(cp.esperado_usd), plano_alvo: n(cp.no_alvo_usd), n_plano: n(cp.n_com_estimativa), n_alvo: n(cp.n_com_alvo),
              entrou: n(g.entrou_hoje_usd), n_entrou: n(g.n_entrou_hoje), saiu: n(g.saiu_hoje_usd), n_saiu: n(g.n_saiu_hoje),
              ganhos: n(gv.ganhos_usd), n_ganhos: n(gv.n_ganhos), ganho_medio: n(gv.ganho_medio_usd),
              perdas: n(gv.perdas_usd), n_perdas: n(gv.n_perdas), perda_media: n(gv.perda_media_usd),
              volatil: n(g.aberto_usd), acerto: n(gv.acerto_pct), operacoes: n(gv.operacoes) };
        break;
      }
      default: d = {};
    }
    d.t_brt = base.t_brt; d.t_iso = base.t_iso;
    return { dados: d, hash: JSON.stringify(d) };
  }

  var TITULOS = { velocimetro: 'Velocímetro · dia', trilho: 'Trilho do dia', sr_stark: 'Sr. Stark · Direcção',
                  risco: 'Risco', mesa: 'Mesa de Operações', laboratorio: 'Laboratório', numeros: 'Números' };   // v6: so os numeros, sem o nome
  var ANDAR_DO_HOLO = { velocimetro: 'Direccao', trilho: 'Direccao', sr_stark: 'Direccao', risco: 'Risco',
                        mesa: 'Mesa de Operacoes', laboratorio: 'Laboratorio', numeros: 'P&L' };

  // ---------------------------------------------------------------- a moldura comum
  function espacado(g, txt, x, y, sp) {
    if ('letterSpacing' in g) { g.letterSpacing = sp + 'px'; g.fillText(txt, x, y); g.letterSpacing = '0px'; }
    else g.fillText(txt, x, y);
  }
  function cantoRedondo(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  // Desenha a moldura e devolve o rectangulo util. `k` = pixeis de canvas por pixel de ecra (a nitidez).
  // `idadeMin` so aparece quando > 2: um dado com 20 min tem de dize-lo, um dado de agora nao precisa.
  function moldura(g, W, H, k, titulo, hora, idadeMin, alerta) {
    g.clearRect(0, 0, W, H);
    var m = 3 * k, inc = Math.round(W * 0.012);      // a inclinacao leve: o lado direito e um pouco mais curto
    g.save();
    g.beginPath();
    g.moveTo(m, m); g.lineTo(W - m, m + inc); g.lineTo(W - m, H - m - inc); g.lineTo(m, H - m); g.closePath();
    // um vidro ESCURO por tras: ao lado de uma laje clara (N2/N3) o ciano sobre transparente nao se lia
    g.fillStyle = 'rgba(6,10,16,.80)'; g.fill();
    g.fillStyle = C.cianoFill; g.fill();
    g.lineWidth = 1.2 * k; g.strokeStyle = C.cianoF; g.stroke();
    g.lineWidth = 5 * k; g.strokeStyle = 'rgba(90,200,250,.07)'; g.stroke();
    // cantos em L, mais vivos: e o que faz "holograma" e nao "caixa"
    var L = 9 * k;
    g.lineWidth = 2 * k; g.strokeStyle = 'rgba(90,200,250,.95)';
    [[m, m, 1, 1], [W - m, m + inc, -1, 1], [m, H - m, 1, -1], [W - m, H - m - inc, -1, -1]].forEach(function (c) {
      g.beginPath(); g.moveTo(c[0], c[1] + c[3] * L); g.lineTo(c[0], c[1]); g.lineTo(c[0] + c[2] * L, c[1]); g.stroke();
    });
    g.restore();
    // titulo e hora
    var tf = 9.5 * k;
    g.font = '600 ' + tf + 'px ' + SANS;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = 'rgba(90,200,250,.92)';
    espacado(g, S(titulo).toUpperCase(), m + 8 * k, m + 14 * k, 1.4 * k);
    g.textAlign = 'right';
    g.font = '500 ' + (8.5 * k) + 'px ' + MONO;
    var h = S(hora);
    var i = Number(idadeMin);
    if (isFinite(i) && i > 2) {
      g.fillStyle = C.ambar; g.fillText('há ' + Math.round(i) + ' min', W - m - 8 * k, m + 14 * k);
      if (h) { g.fillStyle = C.cinza; g.fillText(h, W - m - 8 * k - g.measureText('há ' + Math.round(i) + ' min').width - 8 * k, m + 14 * k); }
    } else if (h) { g.fillStyle = C.cinza; g.fillText(h, W - m - 8 * k, m + 14 * k); }
    if (alerta) { g.textAlign = 'left'; g.font = '600 ' + (8 * k) + 'px ' + SANS; g.fillStyle = C.ambar; g.fillText(S(alerta), m + 8 * k, m + 26 * k); }
    g.textAlign = 'left';
    return { x: m + 8 * k, y: m + 22 * k, w: W - 2 * m - 16 * k, h: H - 2 * m - 30 * k, m: m, inc: inc };
  }

  // as linhas de varrimento por cima do que ja esta desenhado (source-atop: so onde ha tinta, nunca no vazio).
  // 19/09: a fase ANDA (fase(v), chamada pelo predio.js a cada quadro) e ha uma BANDA mais clara a descer - e o
  // que faz um painel do canal parecer ligado mesmo quando nenhum numero mudou. Medido: sem isto, a nossa torre
  // movia 0,26 por fotograma contra os 2,10 do clipe.
  var _fase = 0;
  function fase(v) { v = Number(v); if (isFinite(v)) _fase = v - Math.floor(v); }
  function varrimento(g, W, H, k) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    var passo = Math.max(2, Math.round(3 * k)), desl = Math.round(_fase * passo);
    g.fillStyle = C.fundoLinha;
    for (var y = -passo; y < H; y += passo) g.fillRect(0, y + desl, W, Math.max(1, Math.round(k * 0.8)));
    var yb = (_fase * (H + 120 * k)) - 60 * k, gr = g.createLinearGradient(0, yb - 30 * k, 0, yb + 30 * k);
    gr.addColorStop(0, 'rgba(90,200,250,0)');
    gr.addColorStop(0.5, 'rgba(120,215,255,.085)');
    gr.addColorStop(1, 'rgba(90,200,250,0)');
    g.fillStyle = gr; g.fillRect(0, yb - 30 * k, W, 60 * k);
    g.restore();
  }

  function rotuloPequeno(g, k, txt, x, y, cor, alinh) {
    g.font = '500 ' + (8 * k) + 'px ' + SANS; g.textAlign = alinh || 'left'; g.fillStyle = cor || C.cinza;
    espacado(g, S(txt).toUpperCase(), x, y, 1.1 * k);
  }
  function numero(g, k, txt, x, y, px, cor, alinh, peso) {
    g.font = (peso || 700) + ' ' + (px * k) + 'px ' + MONO; g.textAlign = alinh || 'left'; g.fillStyle = cor || C.texto;
    g.fillText(S(txt), x, y);
  }
  function linhaMono(g, k, txt, x, y, px, cor, alinh) {
    g.font = '500 ' + (px * k) + 'px ' + MONO; g.textAlign = alinh || 'left'; g.fillStyle = cor || C.textoM;
    g.fillText(S(txt), x, y);
  }
  function corta(g, txt, larg) {
    var t = S(txt);
    if (g.measureText(t).width <= larg) return t;
    while (t.length > 1 && g.measureText(t + '…').width > larg) t = t.slice(0, -1);
    return t + '…';
  }

  // ---------------------------------------------------------------- 1. VELOCIMETRO
  // extra = { esc, angulo } - a escala e o angulo vem de fora (predio_geo.js), para que o arreio confira
  // o desenho contra a MESMA conta. Aqui so se desenha.
  function velocimetro(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.velocimetro, d.t_brt, extra.idadeMin);
    var esc = Number(extra.esc) > 0 ? Number(extra.esc) : 1;
    var ang = Number(extra.angulo); if (!isFinite(ang)) ang = 0;
    var cx = W / 2, R = Math.min(r0.w * 0.40, r0.h * 0.58), cy = r0.y + R + 8 * k;
    var th = function (v) { var u = Math.max(-1.04, Math.min(1.04, v / esc)); return -Math.PI / 2 + u * Math.PI / 2; };
    // pista e zonas: vermelho a esquerda (perdas), verde a direita (ganhos)
    g.lineCap = 'butt';
    g.lineWidth = R * 0.055; g.strokeStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(cx, cy, R * 0.92, th(-esc), th(esc)); g.stroke();
    g.lineWidth = R * 0.055; g.strokeStyle = 'rgba(255,90,95,.55)';
    g.beginPath(); g.arc(cx, cy, R * 0.92, th(-esc), th(0)); g.stroke();
    g.strokeStyle = 'rgba(62,207,142,.55)';
    g.beginPath(); g.arc(cx, cy, R * 0.92, th(0), th(esc)); g.stroke();
    // a banda do valor: do zero ate a agulha
    var vAg = ang / 90 * esc;
    g.lineWidth = R * 0.075; g.strokeStyle = vAg >= 0 ? C.verde : C.vermelho;
    g.beginPath();
    if (vAg >= 0) g.arc(cx, cy, R * 0.92, th(0), th(vAg)); else g.arc(cx, cy, R * 0.92, th(vAg), th(0));
    g.stroke();
    // marcas da escala
    g.strokeStyle = 'rgba(200,215,230,.8)'; g.lineWidth = 1.2 * k;
    for (var i = -4; i <= 4; i++) {
      var a = th(esc * i / 4), grande = (i % 2 === 0);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * R * (grande ? 0.80 : 0.84), cy + Math.sin(a) * R * (grande ? 0.80 : 0.84));
      g.lineTo(cx + Math.cos(a) * R * 0.87, cy + Math.sin(a) * R * 0.87);
      g.stroke();
      if (grande) {
        var v = esc * i / 4, tx = cx + Math.cos(a) * R * 0.68, ty = cy + Math.sin(a) * R * 0.68 + 3 * k;
        linhaMono(g, k, (v > 0 ? '+' : (v < 0 ? '−' : '')) + num(Math.abs(v), esc >= 10 ? 0 : 1), tx, ty, 7.5, C.cinza, 'center');
      }
    }
    // as quatro marcas: pico (verde), vale (vermelho), esperado (ambar), stop (vermelho)
    function marca(v, cor, forma, txt) {
      if (v == null || !isFinite(v)) return;
      var a = th(v), x = cx + Math.cos(a) * R * 1.02, y = cy + Math.sin(a) * R * 1.02;
      g.fillStyle = cor; g.strokeStyle = cor; g.lineWidth = 1.5 * k;
      if (forma === 'ponto') { g.beginPath(); g.arc(x, y, 2.6 * k, 0, Math.PI * 2); g.fill(); }
      else if (forma === 'tri') { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 0.4) * 5 * k, y + Math.sin(a - 0.4) * 5 * k); g.lineTo(x + Math.cos(a + 0.4) * 5 * k, y + Math.sin(a + 0.4) * 5 * k); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); g.lineTo(cx + Math.cos(a) * R * 1.06, cy + Math.sin(a) * R * 1.06); g.stroke(); }
      if (txt) linhaMono(g, k, txt, cx + Math.cos(a) * R * 1.13, cy + Math.sin(a) * R * 1.13 + 3 * k, 7, cor, Math.cos(a) > 0.2 ? 'left' : (Math.cos(a) < -0.2 ? 'right' : 'center'));
    }
    marca(d.stop, C.vermelho, 'barra', 'stop');
    marca(d.esperado, C.ambar, 'tri', 'esp.');
    marca(d.pico, C.verde, 'ponto', d.pico_t ? 'pico ' + d.pico_t : 'pico');
    marca(d.vale, C.vermelho, 'ponto', d.vale_t ? 'vale ' + d.vale_t : 'vale');
    // a agulha
    var aa = -Math.PI / 2 + ang * Math.PI / 180;
    g.strokeStyle = C.texto; g.lineWidth = 2 * k; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - Math.cos(aa) * R * 0.08, cy - Math.sin(aa) * R * 0.08);
    g.lineTo(cx + Math.cos(aa) * R * 0.86, cy + Math.sin(aa) * R * 0.86); g.stroke();
    g.fillStyle = C.ciano; g.beginPath(); g.arc(cx, cy, 3.2 * k, 0, Math.PI * 2); g.fill();
    // a leitura digital e as tres linhas
    var yv = cy + R * 0.02 + 20 * k;
    numero(g, k, d.agora == null ? '—' : sinal(d.agora, 2), cx, yv, 20, corPnl(d.agora), 'center');
    rotuloPequeno(g, k, 'US$ · agora' + (d.dia ? ' · ' + d.dia : ''), cx, yv + 11 * k, C.cinza, 'center');
    linhaMono(g, k, 'fechado ' + sinal(d.realizado, 2) + ' · aberto ' + sinal(d.aberto, 2) + ' · líquido realista ' + sinal(d.liquido, 2),
      cx, Math.min(H - r0.m - 8 * k, yv + 24 * k), 8, C.textoM, 'center');
    varrimento(g, W, H, k);
    return { esc: esc, angulo: ang, cx: cx, cy: cy, R: R };
  }

  // ============================================================================================
  // 19/09/2026 - OS OBJECTOS VIVOS, na linguagem do canal @atsmatrix (ordem dele: "substitui os nossos
  // graficos e hologramas pelos que tu ves la, quero os objetos vivos que ele fez"). Copiou-se a GRAMATICA -
  // area com ponto vivo, aneis de percentagem, barras de modulos activos, fita de operacoes a rolar, malha de
  // nos a rodar - e NUNCA os numeros: cada objecto desenha so o que existe nos ficheiros. Onde falta dado,
  // escreve-se "sem dado".
  // ============================================================================================

  // ---------------------------------------------------------------- 2. BALANCO DO DIA (era o trilho)
  // extra = { pulso: 0..1 ou null }. Area por baixo da linha, grelha com os valores a direita, e o PONTO VIVO
  // no fim - que e o que o canal usa para dizer "isto esta a acontecer agora".
  function trilho(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.trilho, d.t_brt, extra.idadeMin);
    var s = lista(d.serie);
    if (!s.length) { rotuloPequeno(g, k, 'sem dado', r0.x, r0.y + 14 * k, C.cinza); varrimento(g, W, H, k); return; }
    var vs = s.map(function (p) { return p[1]; }).concat([0]);
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    if (hi - lo < 0.2) { hi += 0.1; lo -= 0.1; }
    var pad = (hi - lo) * 0.12; hi += pad; lo -= pad;
    var x0 = r0.x + 2 * k, x1 = r0.x + r0.w - 30 * k, y0 = r0.y + 10 * k, y1 = r0.y + r0.h - 16 * k;
    var X = function (i) { return x0 + (x1 - x0) * (s.length < 2 ? 1 : i / (s.length - 1)); };
    var Y = function (v) { return y1 - (y1 - y0) * ((v - lo) / (hi - lo)); };
    g.lineWidth = k; g.strokeStyle = 'rgba(255,255,255,.055)';
    for (var i = 0; i <= 3; i++) {
      var v = lo + (hi - lo) * i / 3, yg = Y(v);
      g.beginPath(); g.moveTo(x0, yg); g.lineTo(x1, yg); g.stroke();
      linhaMono(g, k, sinal(v, 1), x1 + 4 * k, yg + 3 * k, 7, C.cinzaF, 'left');
    }
    var yZero = Y(0);
    g.setLineDash([3 * k, 3 * k]); g.strokeStyle = 'rgba(200,215,230,.30)';
    g.beginPath(); g.moveTo(x0, yZero); g.lineTo(x1, yZero); g.stroke(); g.setLineDash([]);
    var fim = s[s.length - 1][1], cor = corPnl(fim);
    var grd = g.createLinearGradient(0, Math.min(Y(fim), yZero), 0, yZero);
    grd.addColorStop(0, fim >= 0 ? 'rgba(62,207,142,.34)' : 'rgba(255,90,95,.34)');
    grd.addColorStop(1, 'rgba(62,207,142,0)');
    g.beginPath(); g.moveTo(X(0), yZero);
    s.forEach(function (p, i2) { g.lineTo(X(i2), Y(p[1])); });
    g.lineTo(X(s.length - 1), yZero); g.closePath(); g.fillStyle = grd; g.fill();
    g.beginPath(); s.forEach(function (p, i2) { i2 ? g.lineTo(X(i2), Y(p[1])) : g.moveTo(X(i2), Y(p[1])); });
    g.lineWidth = 1.8 * k; g.strokeStyle = cor; g.lineJoin = 'round'; g.stroke();
    [[d.pico, d.pico_t, C.verde], [d.vale, d.vale_t, C.vermelho]].forEach(function (m) {
      if (m[0] == null) return;
      var ym = Y(m[0]);
      g.strokeStyle = m[2]; g.lineWidth = k; g.beginPath(); g.moveTo(x0, ym); g.lineTo(x0 + 8 * k, ym); g.stroke();
      linhaMono(g, k, S(m[1]), x0 + 10 * k, ym + 3 * k, 6.5, m[2], 'left');
    });
    var px = X(s.length - 1), py = Y(fim);
    var pul = extra.pulso == null ? 0 : Math.sin(Number(extra.pulso) * Math.PI * 2) * 0.5 + 0.5;
    g.fillStyle = cor; g.globalAlpha = 0.25 + 0.35 * pul;
    g.beginPath(); g.arc(px, py, (4.5 + 3 * pul) * k, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1; g.beginPath(); g.arc(px, py, 2.6 * k, 0, Math.PI * 2); g.fill();
    var etq = sinal(fim, 2);
    g.font = '700 ' + (8.5 * k) + 'px ' + MONO;
    var wE = g.measureText(etq).width + 8 * k;
    var ex = Math.min(px + 6 * k, r0.x + r0.w - wE), ey = py - 9 * k;
    g.fillStyle = 'rgba(8,13,20,.92)'; cantoRedondo(g, ex, ey, wE, 12 * k, 3 * k); g.fill();
    g.strokeStyle = cor; g.lineWidth = k; g.stroke();
    numero(g, k, etq, ex + wE / 2, ey + 9 * k, 8.5, cor, 'center');
    linhaMono(g, k, s.length + ' pontos · ' + S(s[0][0]) + '→' + S(s[s.length - 1][0]), r0.x, r0.y + r0.h - 2 * k, 7, C.cinzaF, 'left');
    varrimento(g, W, H, k);
  }

  // ---------------------------------------------------------------- 3. ANEIS DO CAPITAL (era o Sr. Stark)
  // Os tres aneis de percentagem do canal, com o que ca importa: quanto do capital esta em uso e como se reparte.
  function anel(g, k, cx, cy, r, frac, cor, titulo, valor) {
    var a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(0, Math.min(1, frac || 0));
    g.lineCap = 'round';
    g.lineWidth = r * 0.26; g.strokeStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = cor; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    g.lineCap = 'butt';
    numero(g, k, (frac == null ? '—' : Math.round(frac * 100) + '%'), cx, cy + 4 * k, 11, C.texto, 'center');
    rotuloPequeno(g, k, titulo, cx, cy + r + 10 * k, C.cinza, 'center');
    if (valor) linhaMono(g, k, valor, cx, cy + r + 19 * k, 7, C.textoM, 'center');
  }
  function srStark(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.sr_stark, d.t_brt, extra.idadeMin);
    var ac = obj(d.acoes), cr = obj(d.cripto);
    var emUso = (n(ac.em_uso) || 0) + (n(cr.em_uso) || 0), cap = n(d.capital_casa);
    var r = Math.min(r0.w / 7.2, r0.h / 3.4);
    var cy = r0.y + r + 14 * k, passo = r0.w / 3;
    anel(g, k, r0.x + passo * 0.5, cy, r, cap ? emUso / cap : null, C.ciano, 'capital em uso', 'US$ ' + num(emUso, 2));
    anel(g, k, r0.x + passo * 1.5, cy, r, emUso ? (n(cr.em_uso) || 0) / emUso : null, C.verde, 'cripto', 'US$ ' + num(cr.em_uso, 2));
    anel(g, k, r0.x + passo * 2.5, cy, r, emUso ? (n(ac.em_uso) || 0) / emUso : null, C.ambar, 'acções', 'US$ ' + num(ac.em_uso, 2));
    var y = cy + r + 30 * k;
    if (y < r0.y + r0.h - 6 * k) {
      linhaMono(g, k, 'livre ' + num(d.livre, 2) + ' · casa ' + num(cap, 2) + ' US$', r0.x, y, 7.5, C.textoM, 'left');
      linhaMono(g, k, d.existe ? 'Sr. Stark aplica' : 'Sr. Stark não aplica — a fatia é do alocador',
        r0.x, Math.min(r0.y + r0.h - 2 * k, y + 10 * k), 7, C.cinzaF, 'left');
    }
    varrimento(g, W, H, k);
  }

  // ---------------------------------------------------------------- 4. MODULOS ACTIVOS (era o Risco)
  // As barras de "active modules" do canal, com as CADEIRAS reais e o medidor do tecto de perda do dia.
  function risco(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var real = n(d.realizado), perda = n(d.perda_dia);
    var alerta = (real != null && perda != null && perda !== 0 && real <= perda * 0.8) ? 'perto do tecto do dia' : '';
    var r0 = moldura(g, W, H, k, TITULOS.risco, d.t_brt, extra.idadeMin, alerta);
    var y = r0.y + (alerta ? 16 : 8) * k;
    var usado = (perda && real != null && real < 0) ? Math.min(1, real / perda) : 0;
    rotuloPequeno(g, k, 'uso do tecto do dia', r0.x, y, C.cinza);
    numero(g, k, Math.round(usado * 100) + '%', r0.x + r0.w, y, 9, usado > 0.6 ? C.vermelho : C.texto, 'right');
    y += 5 * k;
    g.fillStyle = 'rgba(255,255,255,.08)'; cantoRedondo(g, r0.x, y, r0.w, 5 * k, 2.5 * k); g.fill();
    g.fillStyle = usado > 0.6 ? C.vermelho : C.ambar;
    cantoRedondo(g, r0.x, y, Math.max(2 * k, r0.w * usado), 5 * k, 2.5 * k); g.fill();
    y += 10 * k;
    linhaMono(g, k, 'dia ' + sinal(real, 2) + ' · tecto ' + num(perda, 2) + ' US$ · ' + num(d.n_ef, 2) + ' apostas efectivas', r0.x, y, 7, C.textoM, 'left');
    y += 9 * k;
    var cs = lista(d.cadeiras).slice(0, 8);
    var maxH = Math.max.apply(null, cs.map(function (c) { return n(c.hoje) || 0; }).concat([1]));
    var alt = Math.max(9 * k, Math.min(14 * k, (r0.y + r0.h - y - 2 * k) / Math.max(1, cs.length)));
    cs.forEach(function (c) {
      if (y + alt > r0.y + r0.h) return;
      var activo = String(c.estado || '').toUpperCase() !== 'IDLE', h = n(c.hoje) || 0;
      g.fillStyle = activo ? C.verde : C.cinzaF;
      g.beginPath(); g.arc(r0.x + 2 * k, y + alt * 0.45, 1.8 * k, 0, Math.PI * 2); g.fill();
      linhaMono(g, k, corta(g, S(c.nome), 40 * k), r0.x + 7 * k, y + alt * 0.62, 7.5, activo ? C.texto : C.cinza, 'left');
      var bx = r0.x + 52 * k, bw = r0.w - 52 * k - 16 * k;
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(bx, y + alt * 0.28, bw, 3.4 * k);
      g.fillStyle = activo ? C.ciano : 'rgba(90,200,250,.35)';
      g.fillRect(bx, y + alt * 0.28, Math.max(1.5 * k, bw * (h / maxH)), 3.4 * k);
      linhaMono(g, k, String(h), r0.x + r0.w, y + alt * 0.62, 7.5, C.textoM, 'right');
      y += alt;
    });
    varrimento(g, W, H, k);
  }

  // ---------------------------------------------------------------- 5. FITA DE OPERACOES (era a Mesa)
  // A "live tape" do canal: as ultimas linhas do feed a rolar, a mais nova acesa e com barra a esquerda.
  var COR_TIPO = { entrada: '#3ecf8e', alvo: '#3ecf8e', saida: '#e8b04b', stop: '#ff5a5f', sinapse: '#5ac8fa',
                   batimento: '#5b6573', spread_acima_do_tecto: '#e8b04b', capital_esgotado: '#ff5a5f' };
  function mesa(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.mesa, d.t_brt, extra.idadeMin);
    var y = r0.y + 8 * k;
    rotuloPequeno(g, k, 'hora', r0.x, y, C.cinzaF);
    rotuloPequeno(g, k, 'quem', r0.x + 30 * k, y, C.cinzaF);
    rotuloPequeno(g, k, 'o que', r0.x + 74 * k, y, C.cinzaF);
    rotuloPequeno(g, k, 'valor', r0.x + r0.w, y, C.cinzaF, 'right');
    y += 4 * k;
    g.strokeStyle = 'rgba(90,200,250,.25)'; g.lineWidth = k;
    g.beginPath(); g.moveTo(r0.x, y); g.lineTo(r0.x + r0.w, y); g.stroke();
    y += 3 * k;
    var f = lista(d.fita), alt = 11 * k, desl = extra.desl == null ? 0 : (Number(extra.desl) || 0);
    g.save(); g.beginPath(); g.rect(r0.x - 2 * k, y, r0.w + 4 * k, Math.max(0, r0.y + r0.h - y - 10 * k)); g.clip();
    f.forEach(function (e, i) {
      var yy = y + i * alt + desl * alt;
      if (yy < y - alt || yy > r0.y + r0.h) return;
      var cor = COR_TIPO[e.tipo] || C.textoM, novo = i === 0;
      if (novo) { g.fillStyle = 'rgba(90,200,250,.10)'; g.fillRect(r0.x - 2 * k, yy, r0.w + 4 * k, alt); }
      g.fillStyle = cor; g.fillRect(r0.x - 2 * k, yy + 1.5 * k, 1.8 * k, alt - 3 * k);
      linhaMono(g, k, e.t, r0.x + 2 * k, yy + alt * 0.72, 7, novo ? C.texto : C.cinza, 'left');
      linhaMono(g, k, corta(g, S(e.origem).toUpperCase(), 40 * k), r0.x + 30 * k, yy + alt * 0.72, 7, C.textoM, 'left');
      var oque = S(e.simbolo) ? (S(e.simbolo) + ' ' + S(e.tipo).replace(/_/g, ' ')) : S(e.texto || e.tipo).replace(/_/g, ' ');
      linhaMono(g, k, corta(g, oque, r0.w - 108 * k), r0.x + 74 * k, yy + alt * 0.72, 7, novo ? C.texto : C.textoM, 'left');
      if (e.valor != null) linhaMono(g, k, num(e.valor, 2), r0.x + r0.w, yy + alt * 0.72, 7, cor, 'right');
    });
    g.restore();
    if (!f.length) rotuloPequeno(g, k, 'sem eventos', r0.x, y + 12 * k, C.cinza);
    linhaMono(g, k, 'Σ ' + sinal(d.realizado, 2) + ' US$ · ' + num(d.n, 0) + ' op · ' + num(d.n_linhas, 0) + ' estratégias',
      r0.x, r0.y + r0.h - 2 * k, 7, C.textoM, 'left');
    varrimento(g, W, H, k);
  }

  // ---------------------------------------------------------------- 6. MALHA DAS FAMILIAS (era o Laboratorio)
  // A "strategy lattice" do canal: os nos sao as FAMILIAS de genes, as arestas ligam vizinhos, e a malha RODA
  // sempre - e o objecto que continua vivo mesmo quando nenhum numero mudou. O no da familia dominante cresce
  // com a monocultura: a 100% ve-se uma bola gigante e o resto em pontos, que e exactamente o que se passa.
  function laboratorio(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.laboratorio, d.t_brt, extra.idadeMin);
    var nF = Math.max(3, Math.min(48, n(d.n_familias) || 8));
    var ang = Number(extra.angulo); if (!isFinite(ang)) ang = 0;
    var cx = r0.x + r0.w * 0.5, cy = r0.y + r0.h * 0.42, R = Math.min(r0.w * 0.36, r0.h * 0.30);
    var ug = lista(d.geracoes)[lista(d.geracoes).length - 1] || {};   // a monocultura vive na ULTIMA geracao,
    var mono = n(d.monocultura_pct); if (mono == null) mono = n(ug.monocultura_pct);   // nao no topo da fatia
    var famMaior = d.familia_maior || ug.familia_maior;
    var dom = Math.max(0, Math.min(1, (mono == null ? 0 : mono) / 100));
    var pts = [], i;
    for (i = 0; i < nF; i++) {
      var a = ang + i * Math.PI * 2 / nF;
      pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.42 - Math.sin(a * 2 + ang) * R * 0.16, z: Math.sin(a) });
    }
    g.lineWidth = 0.9 * k;
    for (i = 0; i < nF; i++) {
      [1, 5].forEach(function (salto) {
        var j = (i + salto) % nF, p = pts[i], q = pts[j], prof = (p.z + q.z) / 2;
        g.strokeStyle = 'rgba(90,200,250,' + (0.10 + 0.20 * (prof + 1) / 2).toFixed(3) + ')';
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
      });
    }
    for (i = 0; i < nF; i++) {
      var p2 = pts[i], grande = i === 0, rr = grande ? (2.2 + 5.5 * dom) * k : 1.7 * k;
      g.fillStyle = grande ? C.ambar : 'rgba(150,224,255,' + (0.45 + 0.4 * (p2.z + 1) / 2).toFixed(2) + ')';
      g.beginPath(); g.arc(p2.x, p2.y, rr, 0, Math.PI * 2); g.fill();
      if (grande) { g.globalAlpha = 0.25; g.beginPath(); g.arc(p2.x, p2.y, rr * 2.1, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    }
    if (famMaior) linhaMono(g, k, corta(g, S(famMaior), r0.w), cx, cy + R * 0.42 + 14 * k, 7.5, C.ambar, 'center');
    var yb = r0.y + r0.h - 20 * k;
    linhaMono(g, k, 'geração ' + num(d.geracao_actual, 0) + ' · ' + num(d.n_genes, 0) + ' genes · ' + nF + ' famílias', r0.x, yb, 7.5, C.textoM, 'left');
    linhaMono(g, k, 'monocultura ' + (mono == null ? 'sem dado' : num(mono, 0) + '%') + ' · robustas alguma vez ' + num(d.robustos_alguma_vez, 0),
      r0.x, yb + 9 * k, 7, mono != null && mono >= 90 ? C.vermelho : C.cinza, 'left');
    varrimento(g, W, H, k);
  }
  // ---------------------------------------------------------------- 7. NUMEROS (v5d, 18/09)
  // Ordem dele: "ganhos realizados, perdas realizadas, volatil, entrou hoje, saiu hoje, saldo do dia, saldo realizado
  // desde o inicio, se fechasse agora, plano ate a saida... cards animados e vivos, 3D holograficos".
  // extra = { valores: {k: valor em tween}, brilho: {k: 0..1 desde que mudou}, pulso: 0..1 ou null }.
  // Nove ladrilhos em 3x3; com pouca altura (N0/N1, por baixo do trilho) seis, e os outros tres numa linha em baixo.
  var LADRILHOS = [
    { k: 'saldo_dia', t: 'saldo do dia', sub: function (d) { return d.liquido_dia == null ? '' : 'líquido realista ' + sinal(d.liquido_dia, 2); } },
    { k: 'desde_inicio', t: 'desde o início', sub: function (d) { return d.valor_realizado == null ? '' : 'casa ' + num(d.valor_realizado, 2) + ' · ' + sinal(d.var_pct, 2) + '%'; } },
    { k: 'fechasse', t: 'se fechasse', sub: function (d) { return d.fechasse_bruto == null ? '' : 'bruto ' + sinal(d.fechasse_bruto, 2) + ' · taxas ' + num(d.fechasse_taxas, 2); } },
    { k: 'plano', t: 'plano · saída', sub: function (d) { return (d.n_plano == null ? '' : d.n_plano + ' c/ estimativa') + (d.plano_alvo == null ? '' : ' · no alvo ' + sinal(d.plano_alvo, 2)); } },
    { k: 'entrou', t: 'entrou hoje', sub: function (d) { return d.n_entrou == null ? '' : d.n_entrou + ' entrada(s)'; } },
    { k: 'saiu', t: 'saiu hoje', sub: function (d) { return d.n_saiu == null ? '' : d.n_saiu + ' saída(s)'; } },
    { k: 'ganhos', t: 'ganhos realiz.', sub: function (d) { return d.n_ganhos == null ? '' : d.n_ganhos + ' op · média ' + sinal(d.ganho_medio, 2); } },
    { k: 'perdas', t: 'perdas realiz.', sub: function (d) { return d.n_perdas == null ? '' : d.n_perdas + ' op · média ' + sinal(d.perda_media, 2); } },
    { k: 'volatil', t: 'volátil', sub: function (d) { return d.volatil == null ? '' : 'estimativa, ainda não é dinheiro'; } }
  ];
  function numeros(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.numeros, d.t_brt, extra.idadeMin);
    var vals = obj(extra.valores), bri = obj(extra.brilho);
    var cols = 3, linhas = r0.h >= 150 * k ? 3 : 2, nL = cols * linhas;
    var gx = 5 * k, gy = 5 * k, rodape = linhas === 2 ? 12 * k : 0;
    var lw = (r0.w - gx * (cols - 1)) / cols, lh = (r0.h - rodape - gy * (linhas - 1)) / linhas;
    LADRILHOS.slice(0, nL).forEach(function (L, i) {
      var c = i % cols, l = Math.floor(i / cols), x = r0.x + c * (lw + gx), y = r0.y + l * (lh + gy);
      var v = (L.k in vals) ? vals[L.k] : d[L.k], b = Number(bri[L.k]) || 0, cor = corPnl(d[L.k]);
      // o vidro do ladrilho; brilha quando o numero acabou de mudar
      g.fillStyle = 'rgba(90,200,250,' + (0.05 + 0.18 * b).toFixed(3) + ')'; cantoRedondo(g, x, y, lw, lh, 3 * k); g.fill();
      g.lineWidth = (1 + b) * k; g.strokeStyle = b > 0 ? cor : 'rgba(90,200,250,.35)'; g.stroke();
      g.font = '500 ' + (7.5 * k) + 'px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.cinza;
      espacado(g, corta(g, S(L.t).toUpperCase(), lw - 10 * k), x + 5 * k, y + 10 * k, 0.9 * k);
      var px = Math.min(16, lh / (2.6 * k)), txt = v == null ? '—' : sinal(v, 2);
      g.font = '700 ' + (px * k) + 'px ' + MONO;
      if (g.measureText(txt).width > lw - 10 * k) px *= (lw - 10 * k) / g.measureText(txt).width;
      numero(g, k, txt, x + 5 * k, y + 10 * k + px * k + 3 * k, px, cor, 'left');
      var sub = L.sub(d);
      if (sub && lh >= 40 * k) { g.font = '500 ' + (7 * k) + 'px ' + MONO; linhaMono(g, k, corta(g, sub, lw - 10 * k), x + 5 * k, y + lh - 5 * k, 7, C.textoM, 'left'); }
    });
    if (linhas === 2) {
      var resto = LADRILHOS.slice(nL).map(function (L) { return L.t + ' ' + (d[L.k] == null ? '—' : sinal(d[L.k], 2)); }).join(' · ');
      g.font = '500 ' + (7 * k) + 'px ' + MONO; linhaMono(g, k, corta(g, resto, r0.w), r0.x, r0.y + r0.h - 2 * k, 7, C.textoM, 'left');
    }
    // a linha de vida: um varrimento lento que so anda enquanto o dado e recente (< 2 min), como o pulso do trilho
    if (extra.pulso != null) { var yp = r0.y + Number(extra.pulso) * r0.h; g.fillStyle = 'rgba(90,200,250,.10)'; g.fillRect(r0.x, yp - 6 * k, r0.w, 12 * k); }
    varrimento(g, W, H, k);
    return { linhas: linhas, ladrilhos: nL };
  }

  function fraccaoOpaca(dados) {
    var d = dados && dados.data ? dados.data : dados;
    if (!d || !d.length) return 0;
    var n = 0, t = d.length / 4;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 16) n++;
    return t ? n / t : 0;
  }

  var DESENHOS = { velocimetro: velocimetro, trilho: trilho, sr_stark: srStark, risco: risco, mesa: mesa, laboratorio: laboratorio, numeros: numeros };
  var api = { fatia: fatia, DESENHOS: DESENHOS, TITULOS: TITULOS, ANDAR_DO_HOLO: ANDAR_DO_HOLO, moldura: moldura, fase: fase,
              fraccaoOpaca: fraccaoOpaca, COR: C, num: num, sinal: sinal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.PredioHolo = api;
})(typeof window !== 'undefined' ? window : globalThis);
