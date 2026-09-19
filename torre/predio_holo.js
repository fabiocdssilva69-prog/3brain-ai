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
        var linhas = lista(p.linhas).map(function (l) { l = obj(l); return { nome: S(l.nome_curto || l.chave), classe: S(l.classe), realizado: n(l.realizado) || 0, n: n(l.n), elegivel: l.elegivel === true }; });
        linhas.sort(function (x, y) { return y.realizado - x.realizado; });
        d = { linhas: linhas.slice(0, 6), n_linhas: n(tot.n_linhas), n: n(tot.n), realizado: n(tot.realizado), aberto: n(tot.aberto),
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

  // as linhas de varrimento por cima do que ja esta desenhado (source-atop: so onde ha tinta, nunca no vazio)
  function varrimento(g, W, H, k) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = C.fundoLinha;
    var passo = Math.max(2, Math.round(3 * k));
    for (var y = 0; y < H; y += passo) g.fillRect(0, y, W, Math.max(1, Math.round(k * 0.8)));
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

  // ---------------------------------------------------------------- 2. TRILHO DO DIA
  // extra = { pulso: 0..1 ou null } - o pulso do ponto actual so vem enquanto o dado tem < 2 min (a unica
  // animacao sem evento, e cala-se quando o dado envelhece). A conta de "esta vivo?" e do predio_geo.js.
  function trilho(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 260);
    var r0 = moldura(g, W, H, k, TITULOS.trilho, d.t_brt, extra.idadeMin);
    var serie = lista(d.serie).filter(function (p) { return lista(p).length === 2 && isFinite(Number(p[1])); });
    var x0 = r0.x + 4 * k, x1 = r0.x + r0.w - 4 * k, yTop = r0.y + 6 * k, yBot = r0.y + r0.h - 12 * k;
    // eixo das 00:00 as 24:00 BRT, marcas de 4 h
    g.strokeStyle = 'rgba(90,200,250,.25)'; g.lineWidth = 1 * k;
    for (var h = 0; h <= 24; h += 4) {
      var x = x0 + (x1 - x0) * h / 24;
      g.beginPath(); g.moveTo(x, yBot); g.lineTo(x, yBot + 3 * k); g.stroke();
      linhaMono(g, k, (h < 10 ? '0' : '') + h + 'h', x, yBot + 10 * k, 6.5, C.cinzaF, h === 0 ? 'left' : (h === 24 ? 'right' : 'center'));
    }
    g.beginPath(); g.moveTo(x0, yBot); g.lineTo(x1, yBot); g.stroke();
    if (!serie.length) { linhaMono(g, k, 'sem série do dia no torre.json', (x0 + x1) / 2, (yTop + yBot) / 2, 8, C.cinza, 'center'); varrimento(g, W, H, k); return { pontos: 0 }; }
    var vmin = 0, vmax = 0;
    serie.forEach(function (p) { var v = Number(p[1]); if (v < vmin) vmin = v; if (v > vmax) vmax = v; });
    if (vmax - vmin < 1e-9) { vmax += 1; vmin -= 1; }
    var folga = (vmax - vmin) * 0.12; vmin -= folga; vmax += folga;
    function X(t) { var f = fracaoDoDiaLocal(t); return f == null ? null : x0 + (x1 - x0) * f; }
    function Y(v) { return yBot - (yBot - yTop) * (v - vmin) / (vmax - vmin); }
    // a linha do zero
    var y0 = Y(0);
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.setLineDash([3 * k, 3 * k]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.stroke(); g.setLineDash([]);
    // area suave e linha
    var pts = [];
    serie.forEach(function (p) { var x = X(p[0]); if (x != null) pts.push([x, Y(Number(p[1])), Number(p[1])]); });
    if (pts.length) {
      var grad = g.createLinearGradient(0, yTop, 0, yBot);
      grad.addColorStop(0, 'rgba(90,200,250,.30)'); grad.addColorStop(1, 'rgba(90,200,250,.02)');
      g.fillStyle = grad; g.beginPath(); g.moveTo(pts[0][0], y0);
      pts.forEach(function (p) { g.lineTo(p[0], p[1]); });
      g.lineTo(pts[pts.length - 1][0], y0); g.closePath(); g.fill();
      g.strokeStyle = C.ciano; g.lineWidth = 1.6 * k; g.lineJoin = 'round'; g.beginPath();
      pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
      // pico e vale com a hora
      function ponto(t, v, cor, txt, acima) {
        var x = X(t); if (x == null || v == null) return;
        var y = Y(v);
        g.fillStyle = cor; g.beginPath(); g.arc(x, y, 2.4 * k, 0, Math.PI * 2); g.fill();
        linhaMono(g, k, txt, Math.min(x1 - 30 * k, Math.max(x0 + 30 * k, x)), acima ? y - 5 * k : y + 10 * k, 6.5, cor, 'center');
      }
      ponto(d.pico_t, d.pico, C.verde, 'pico ' + sinal(d.pico, 2) + ' ' + S(d.pico_t), true);
      ponto(d.vale_t, d.vale, C.vermelho, 'vale ' + sinal(d.vale, 2) + ' ' + S(d.vale_t), false);
      // o ponto actual: pulsa so quando o dado esta vivo
      var ult = pts[pts.length - 1];
      var pulso = Number(extra.pulso);
      if (isFinite(pulso)) {
        var rr = (3 + 6 * Math.abs(Math.sin(pulso * Math.PI))) * k;
        g.strokeStyle = 'rgba(90,200,250,' + (0.85 * (1 - Math.abs(Math.sin(pulso * Math.PI)))).toFixed(3) + ')';
        g.lineWidth = 1.2 * k; g.beginPath(); g.arc(ult[0], ult[1], rr, 0, Math.PI * 2); g.stroke();
      }
      g.fillStyle = corPnl(ult[2]); g.beginPath(); g.arc(ult[0], ult[1], 3 * k, 0, Math.PI * 2); g.fill();
      linhaMono(g, k, sinal(ult[2], 2), Math.min(x1 - 4 * k, ult[0] + 6 * k), ult[1] + 3 * k, 8, corPnl(ult[2]), ult[0] > x1 - 50 * k ? 'right' : 'left');
      linhaMono(g, k, S(serie[0][0]) + ' → ' + S(serie[serie.length - 1][0]) + ' · ' + serie.length + ' min', x1, yTop + 2 * k, 6.5, C.cinzaF, 'right');
    }
    varrimento(g, W, H, k);
    return { pontos: pts.length, pulsa: isFinite(Number(extra.pulso)) };
  }
  function fracaoDoDiaLocal(hhmm) {
    var m = S(hhmm).match(/(\d{1,2}):(\d{2})/); if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]); if (h > 24 || mi > 59) return null;
    return Math.max(0, Math.min(1, (h * 60 + mi) / 1440));
  }

  // ---------------------------------------------------------------- 3. SR. STARK (Direccao)
  function srStark(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 220);
    var r0 = moldura(g, W, H, k, TITULOS.sr_stark, d.t_brt, extra.idadeMin, d.existe ? null : 'Sr. Stark v1 não aplica — a fatia é do alocador');
    var a = obj(d.acoes), c = obj(d.cripto);
    var usoC = Math.max(0, Number(c.em_uso) || 0), usoA = Math.max(0, Number(a.em_uso) || 0);
    var livre = Number(d.livre), casa = Number(d.capital_casa);
    var livreDesenho = isFinite(livre) ? Math.max(0, livre) : 0;
    var total = usoC + usoA + livreDesenho;
    var yTop = r0.y + (d.existe ? 2 : 10) * k;
    var R = Math.min((r0.h - (d.existe ? 2 : 10) * k) * 0.36, r0.w * 0.19), cx = r0.x + R + 6 * k, cy = yTop + R + 4 * k;
    // o anel de capital: cripto em uso / accoes em uso / livre
    var fatias = [[usoC, C.ambar, 'cripto em uso'], [usoA, C.azul, 'acções em uso'], [livreDesenho, C.cinza, 'livre']];
    var a0 = -Math.PI / 2;
    g.lineWidth = R * 0.42; g.lineCap = 'butt';
    if (total > 0) fatias.forEach(function (f) {
      if (f[0] <= 0) return;
      var a1 = a0 + Math.PI * 2 * f[0] / total;
      g.strokeStyle = f[1]; g.beginPath(); g.arc(cx, cy, R * 0.78, a0, a1); g.stroke(); a0 = a1;
    });
    else { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(cx, cy, R * 0.78, 0, Math.PI * 2); g.stroke(); }
    numero(g, k, isFinite(casa) ? num(casa, 0) : '—', cx, cy + 4 * k, 11, C.texto, 'center');
    rotuloPequeno(g, k, 'US$ casa', cx, cy + 12 * k, C.cinzaF, 'center');
    // legenda
    var lx = cx + R + 10 * k, ly = yTop + 8 * k;
    fatias.forEach(function (f, i) {
      g.fillStyle = f[1]; g.fillRect(lx, ly + i * 13 * k - 6 * k, 6 * k, 6 * k);
      linhaMono(g, k, num(f[0], 2), lx + 10 * k, ly + i * 13 * k, 8.5, C.texto, 'left');
      rotuloPequeno(g, k, f[2], lx + 10 * k + g.measureText(num(f[0], 2)).width + 6 * k, ly + i * 13 * k, C.cinza, 'left');
    });
    if (isFinite(livre) && livre < 0) linhaMono(g, k, 'livre ' + sinal(livre, 2) + ' (em uso acima do capital)', lx, ly + 3 * 13 * k, 7, C.ambar, 'left');
    // realizado e aberto por lado
    var yb = cy + R + 12 * k;
    var col = r0.w / 2;
    [['acções', a], ['cripto', c]].forEach(function (par, i) {
      var x = r0.x + i * col + 2 * k;
      rotuloPequeno(g, k, par[0], x, yb, C.ciano, 'left');
      linhaMono(g, k, 'realizado ' + sinal(par[1].realizado, 2), x, yb + 11 * k, 8, corPnl(par[1].realizado), 'left');
      linhaMono(g, k, 'aberto ' + sinal(par[1].aberto, 2), x, yb + 21 * k, 8, corPnl(par[1].aberto), 'left');
      linhaMono(g, k, 'capital ' + (par[1].capital == null ? '—' : num(par[1].capital, 2)), x, yb + 31 * k, 7, C.cinza, 'left');
    });
    varrimento(g, W, H, k);
    return { total: total };
  }

  // ---------------------------------------------------------------- 4. RISCO
  function risco(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 220);
    var r0 = moldura(g, W, H, k, TITULOS.risco, d.t_brt, extra.idadeMin);
    var x = r0.x + 2 * k, y = r0.y + 6 * k, w = r0.w - 4 * k;
    // a barra "perda do dia usada": so quando o realizado e negativo
    var real = Number(d.realizado), stop = Number(d.perda_dia);
    rotuloPequeno(g, k, 'perda do dia usada', x, y, C.cinza, 'left');
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x, y + 4 * k, w, 6 * k);
    if (isFinite(real) && real < 0 && isFinite(stop) && stop < 0) {
      var f = Math.min(1, real / stop);
      g.fillStyle = f > 0.8 ? C.vermelho : C.ambar; g.fillRect(x, y + 4 * k, w * f, 6 * k);
      linhaMono(g, k, sinal(real, 2) + ' de ' + num(stop, 2) + ' (' + Math.round(f * 100) + '%)', x + w, y, 7.5, C.textoM, 'right');
    } else {
      g.fillStyle = 'rgba(62,207,142,.35)'; g.fillRect(x, y + 4 * k, 2 * k, 6 * k);
      linhaMono(g, k, (isFinite(real) ? 'realizado ' + sinal(real, 2) : 'sem realizado') + ' · stop ' + (isFinite(stop) ? num(stop, 2) : '—'), x + w, y, 7.5, C.textoM, 'right');
    }
    // N efectivo, recusas, spread
    var y2 = y + 24 * k;
    numero(g, k, d.n_ef == null ? '—' : num(d.n_ef, 2), x, y2 + 8 * k, 16, d.n_ef != null && d.n_ef < 1.5 ? C.ambar : C.ciano, 'left');
    rotuloPequeno(g, k, 'N efectivo', x, y2 + 17 * k, C.cinza, 'left');
    var xr = x + w * 0.36;
    rotuloPequeno(g, k, 'recusas hoje', xr, y2, C.cinza, 'left');
    var rec = lista(d.recusas);
    if (!rec.length) linhaMono(g, k, 'nenhuma', xr, y2 + 10 * k, 7.5, C.textoM, 'left');
    rec.slice(0, 2).forEach(function (p, i) { linhaMono(g, k, corta(g, S(p[0]), w * 0.28) + ' ' + num(p[1], 0), xr, y2 + 10 * k + i * 9 * k, 7.5, C.textoM, 'left'); });
    var xs = x + w * 0.70;
    rotuloPequeno(g, k, 'pior spread', xs, y2, C.cinza, 'left');
    var sp = lista(d.spread)[0];
    linhaMono(g, k, sp ? corta(g, S(sp[0]), w * 0.28) : 'sem dado', xs, y2 + 10 * k, 7.5, C.textoM, 'left');
    if (sp) linhaMono(g, k, num(sp[1], 1) + ' pb', xs, y2 + 19 * k, 8, sp[1] > 50 ? C.ambar : C.textoM, 'left');
    // as 8 cadeiras
    var y3 = y2 + 30 * k, cad = lista(d.cadeiras);
    rotuloPequeno(g, k, 'cadeiras', x, y3, C.cinza, 'left');
    var cw = w / 4, ch = 13 * k;
    cad.slice(0, 8).forEach(function (c, i) {
      var cx = x + (i % 4) * cw, cy = y3 + 5 * k + Math.floor(i / 4) * (ch + 2 * k);
      var alerta = String(c.estado).toUpperCase() === 'ALERT';
      var cor = alerta ? C.ambar : (String(c.estado).toUpperCase() === 'IDLE' ? C.cinzaF : C.ciano);
      g.fillStyle = alerta ? 'rgba(232,176,75,.16)' : 'rgba(90,200,250,.06)';
      g.fillRect(cx, cy, cw - 3 * k, ch);
      g.fillStyle = cor; g.fillRect(cx, cy, 2 * k, ch);
      linhaMono(g, k, corta(g, S(c.nome), cw - 22 * k), cx + 5 * k, cy + 9 * k, 6.5, alerta ? C.ambar : C.textoM, 'left');
      linhaMono(g, k, c.hoje == null ? '' : num(c.hoje, 0), cx + cw - 6 * k, cy + 9 * k, 6.5, cor, 'right');
    });
    varrimento(g, W, H, k);
    return { cadeiras: cad.length };
  }

  // ---------------------------------------------------------------- 5. MESA
  function mesa(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 220);
    var r0 = moldura(g, W, H, k, TITULOS.mesa, d.t_brt, extra.idadeMin);
    var x = r0.x + 2 * k, y = r0.y + 2 * k, w = r0.w - 4 * k;
    linhaMono(g, k, (d.n_linhas == null ? '—' : num(d.n_linhas, 0)) + ' estratégias · ' + sinal(d.realizado, 2) + ' realizado · ' +
      (d.n == null ? '—' : num(d.n, 0)) + ' op.', x, y + 6 * k, 7.5, C.textoM, 'left');
    // as 6 com mais realizado, em barras
    var ls = lista(d.linhas), maxAbs = 0.01;
    ls.forEach(function (l) { maxAbs = Math.max(maxAbs, Math.abs(Number(l.realizado) || 0)); });
    var yb = y + 12 * k, bh = 8 * k, larg = w * 0.42, xb = x + w * 0.40;
    ls.forEach(function (l, i) {
      var yy = yb + i * (bh + 2.4 * k), v = Number(l.realizado) || 0;
      g.font = '500 ' + (6.8 * k) + 'px ' + MONO;
      linhaMono(g, k, corta(g, S(l.nome), w * 0.30), x, yy + bh - 1.5 * k, 6.8, C.textoM, 'left');
      rotuloPequeno(g, k, S(l.classe).slice(0, 3), xb - 4 * k, yy + bh - 1.5 * k, C.cinzaF, 'right');
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(xb, yy, larg, bh);
      var f = Math.abs(v) / maxAbs;
      g.fillStyle = corPnl(v); g.fillRect(xb, yy, Math.max(1.5 * k, larg * f), bh);
      linhaMono(g, k, sinal(v, 2), xb + larg + 4 * k, yy + bh - 1.5 * k, 6.8, corPnl(v), 'left');
    });
    if (!ls.length) linhaMono(g, k, 'sem linhas da mesa no torre.json', x, yb + 8 * k, 7.5, C.cinza, 'left');
    // o livro de posicoes abertas
    var yp = yb + Math.max(ls.length, 1) * (bh + 2.4 * k) + 8 * k;
    rotuloPequeno(g, k, 'posições abertas · ' + lista(d.posicoes).length, x, yp, C.ciano, 'left');
    var cols = [x, x + w * 0.30, x + w * 0.52, x + w * 0.70, x + w];
    lista(d.posicoes).forEach(function (p, i) {
      var yy = yp + 9 * k + i * 8.4 * k;
      linhaMono(g, k, S(p.simbolo), cols[0], yy, 6.8, C.texto, 'left');
      linhaMono(g, k, sinal(p.pnl, 2), cols[1], yy, 6.8, corPnl(p.pnl), 'left');
      linhaMono(g, k, p.pct == null ? '' : sinal(p.pct, 2) + '%', cols[2], yy, 6.8, corPnl(p.pct), 'left');
      linhaMono(g, k, S(p.origem), cols[3], yy, 6.8, C.cinza, 'left');
      linhaMono(g, k, p.valor == null ? '' : num(p.valor, 0), cols[4], yy, 6.8, C.cinzaF, 'right');
    });
    if (!lista(d.posicoes).length) linhaMono(g, k, 'nenhuma posição aberta', x, yp + 9 * k, 6.8, C.cinza, 'left');
    varrimento(g, W, H, k);
    return { linhas: ls.length, posicoes: lista(d.posicoes).length };
  }

  // ---------------------------------------------------------------- 6. LABORATORIO
  function laboratorio(g, W, H, d, extra) {
    d = obj(d); extra = obj(extra);
    var k = Math.max(1, W / 220);
    var r0 = moldura(g, W, H, k, TITULOS.laboratorio, d.t_brt, extra.idadeMin);
    var x = r0.x + 2 * k, y = r0.y + 2 * k, w = r0.w - 4 * k;
    numero(g, k, d.geracao_actual == null ? 'MARK —' : 'MARK ' + num(d.geracao_actual, 0), x, y + 14 * k, 14, C.ciano, 'left');
    rotuloPequeno(g, k, 'geração actual', x, y + 23 * k, C.cinza, 'left');
    var gs = lista(d.geracoes), ult = gs[gs.length - 1];
    var xr = x + w * 0.42;
    linhaMono(g, k, (d.n_genes == null ? '—' : num(d.n_genes, 0)) + ' genes · ' + (d.n_familias == null ? '—' : num(d.n_familias, 0)) + ' famílias', xr, y + 8 * k, 7.5, C.textoM, 'left');
    linhaMono(g, k, (d.robustos_alguma_vez == null ? '—' : num(d.robustos_alguma_vez, 0)) + ' robustos alguma vez', xr, y + 17 * k, 7.5, C.textoM, 'left');
    if (ult) {
      var mono = Number(ult.monocultura_pct);
      linhaMono(g, k, 'monocultura ' + (isFinite(mono) ? num(mono, 0) + '%' : '—') + ' · ' + corta(g, S(ult.familia_maior) || '—', w * 0.34),
        xr, y + 26 * k, 7.5, isFinite(mono) && mono > 80 ? C.ambar : C.textoM, 'left');
    }
    // as ultimas 8 geracoes: pares de barras avaliados / robustos
    var yb = y + 34 * k, hb = r0.h - 40 * k, maxAv = 1;
    gs.forEach(function (gg) { maxAv = Math.max(maxAv, Number(gg.avaliados) || 0); });
    rotuloPequeno(g, k, 'avaliados', x, yb - 2 * k, C.cinzaF, 'left');
    g.fillStyle = C.ciano; g.fillRect(x + 40 * k, yb - 6 * k, 5 * k, 4 * k);
    rotuloPequeno(g, k, 'robustos', x + 48 * k, yb - 2 * k, C.cinzaF, 'left');
    var slot = w / Math.max(1, gs.length), bw = Math.max(2 * k, slot * 0.34);
    gs.forEach(function (gg, i) {
      var bx = x + i * slot + slot * 0.12, av = Number(gg.avaliados) || 0, rb = Number(gg.robustos) || 0;
      var hA = hb * av / maxAv, hR = hb * rb / maxAv;
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(bx, yb + hb - hA, bw, hA);
      var mono = Number(gg.monocultura_pct);
      g.fillStyle = isFinite(mono) && mono > 80 ? C.ambar : C.ciano; g.fillRect(bx + bw + 1 * k, yb + hb - hR, bw, hR);
      linhaMono(g, k, num(gg.geracao, 0), bx + bw, yb + hb + 8 * k, 6.5, C.cinza, 'center');
    });
    if (!gs.length) linhaMono(g, k, 'sem gerações no torre.json', x, yb + 12 * k, 7.5, C.cinza, 'left');
    varrimento(g, W, H, k);
    return { geracoes: gs.length };
  }

  // Quantos pixeis do canvas tem tinta (alfa > 16): a prova de "textura nao vazia" do arreio (>= 2%).
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
  var api = { fatia: fatia, DESENHOS: DESENHOS, TITULOS: TITULOS, ANDAR_DO_HOLO: ANDAR_DO_HOLO, moldura: moldura,
              fraccaoOpaca: fraccaoOpaca, COR: C, num: num, sinal: sinal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.PredioHolo = api;
})(typeof window !== 'undefined' ? window : globalThis);
