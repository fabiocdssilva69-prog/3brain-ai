// predio_geo.js - AS CONTAS PURAS DA TORRE STARK v4: niveis, helice, escala do velocimetro, agulha, tweens,
// a ordem vertical dos 100 andares e o empilhar dos hologramas. Sem DOM, sem three.js: corre em node
// (sala/testes_predio_geo.js) e no browser (window.PredioGeo), no mesmo molde do predio_feed.js.
//
// PORQUE existe (18/09/2026, v4): o que decide O QUE SE VE a cada zoom e uma conta - "quantos pixeis de ecra
// tem um andar" - e se essa conta vive dentro do predio.js so se prova a olho. Aqui cada regra e uma funcao
// sem estado, e o arreio de aceitacao (prova_predio.js) chama as MESMAS funcoes para conferir o ecra: o angulo
// da agulha que o holograma desenha tem de ser o que anguloDaAgulha() devolve para o numero do torre.json,
// com 0,5 grau de tolerancia. Duas contas do mesmo numero e a unica maneira de as ver divergir.
(function (raiz) {
  'use strict';

  // ---------------------------------------------------------------- constantes da planta
  // Os NIVEIS pela regua de pixeis por andar (O_QUE_ELE_QUER_v4.md, 4): abaixo de 14 px os 35 nomes nao
  // cabem sem se pisarem (11 px de texto + folga), logo a torre le-se so pelas fitas e pelos 5 marcos.
  // 24/09 (lote 5): a fronteira N0/N1 desce de 14 para 13 px por andar. MEDIDO a 1400x900: a torre passou a 52
  // andares (um 3.o andar de Auditoria: as regras testadas passaram de 596 para 654, e o andar leva 300) e no N1, a
  // 14,05 px por andar, torre + coroa mediam 828 px num palco de 800 - o nome do ATRIO saia 1 px por baixo e a base
  // 28 px. A 13,05 cabem (757 px). Os nomes do N1 ficam a 12 px (o minimo legivel e 11). E um remendo com prazo: cada
  // andar novo come 13 px; a proxima vez, a decisao e de desenho (o N1 mostrar uma janela de andares, ou as obras
  // encolherem), nao outro px a menos.
  var NIVEIS = { andar: 13, sector: 70, funcionario: 220 };
  var NOMES_NIVEL = ['torre', 'andar', 'sector', 'funcionario'];
  var TORCAO_GRAUS = 3.6;            // 100 andares = uma volta inteira (a torre torcida, Cayan/Turning Torso)
  var ESCADA = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];   // a regua do reactor.js: o proximo numero "bonito"
  var FOLGA_ESCALA = 1.15;           // a escala fica 15% acima do maior valor, para a agulha nunca encostar
  var LIMITE_AGULHA = 1.04;          // a agulha pode passar 4% do fim da escala e para ai (o reactor faz o mesmo)
  var VARRE_GRAUS = 90;              // +-esc = +-90 graus a partir da vertical: um mostrador semicircular
  var TECTO_PX_N0 = 12.3;            // 24/09 (lote 5): era 13,2 com a fronteira a 14; fica abaixo dos 13            // no N0 a torre nunca passa disto por andar: 13,2 < 14 em qualquer ecra.
                                     // Sem o tecto, um palco alto punha o enquadramento por omissao DENTRO do
                                     // N1 (a 1400x900 o palco tem ~532 px e 35 andares dao 14,0 px - a
                                     // fronteira exacta) e a vista "torre" nunca aparecia.
  var MARGEM_N0 = 0.08;              // os 35 nomeados cabem em altura com 8% de margem (spec 3)
  var PX_MIN_N1 = 13.05;            // 24/09 (lote 5): era 14,05 - ver NIVEIS: 52 andares a 1400x900 ja nao cabiam a 14,05            // 18/09 noite: com 47 andares a 1400x900 so cabem a 14,1 px; 14,05 ainda e N1 (>= 14)              // o alvo do botao "Andar": logo acima da fronteira (a 1400x900 o palco tem ~537 px
                                     // e 35 nomes a 14,2 px ocupam 483: a 15 px o topo da torre saia do ecra, medido)
  var PX_N2 = 110, PX_N3 = 230;      // os alvos dos botoes "Sector" e "Funcionario" (dentro das bandas)
  var PULSO_MAX_MIN = 2;             // o ponto actual do trilho pulsa enquanto o dado tem < 2 min

  function n(x, d) { x = Number(x); return isFinite(x) ? x : d; }
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }

  // ---------------------------------------------------------------- niveis
  // Quantos pixeis de ecra separam dois andares: uma subida de ALTURA no mundo vale ALTURA*sin(phi) no eixo
  // vertical do ecra de uma camara ortografica inclinada (phi = angulo polar; com elevacao de 30 graus,
  // phi = 60 e sin = 0,866).
  function pxPorAndar(altura, phi, mundoPorPx) {
    var a = n(altura, 0), p = n(phi, Math.PI / 3), m = n(mundoPorPx, 0);
    if (a <= 0 || m <= 0) return 0;
    return a * Math.abs(Math.sin(p)) / m;
  }

  // a inversa: que mundoPorPx e preciso para ter `px` pixeis por andar
  function mundoPorPxPara(px, altura, phi) {
    var q = n(px, 0), a = n(altura, 0), p = n(phi, Math.PI / 3);
    if (q <= 0 || a <= 0) return 0;
    return a * Math.abs(Math.sin(p)) / q;
  }

  function nivelDe(px) {
    var p = n(px, 0);
    if (p < NIVEIS.andar) return 0;
    if (p < NIVEIS.sector) return 1;
    if (p < NIVEIS.funcionario) return 2;
    return 3;
  }

  // O enquadramento por omissao: pixeis por andar para os `nomeados` andares caberem em `alturaPx` com a
  // margem, mas nunca acima do tecto do N0. O +1 conta a espessura do andar de cima e do de baixo (a caixa
  // de um andar projecta-se para alem do passo entre andares).
  // `extra` = quantos andares de ecra a laje acrescenta (a projeccao do footprint em isometrico; ~4,2 na planta
  // actual). Por omissao 1.
  function pxN0(alturaPx, nomeados, margem, tecto, extra) {
    var h = n(alturaPx, 0), k = Math.max(1, Math.floor(n(nomeados, 1))), mg = n(margem, MARGEM_N0), t = n(tecto, TECTO_PX_N0), ex = Math.max(0, n(extra, 1));
    if (h <= 0) return Math.min(t, 1);
    var cabe = h * (1 - clamp(mg, 0, 0.9)) / (k + ex);
    return Math.max(0.5, Math.min(t, cabe));
  }

  // O alvo de cada botao do HUD, em pixeis por andar. `cabe35` e o que o palco actual da aos 35 andares SEM
  // o tecto do N0 (o N1 quer os 35 nomes todos em vista quando cabem, e nunca abaixo de PX_MIN_N1).
  function alvoDoNivel(k, alturaPx, nomeados, extra) {
    var h = n(alturaPx, 0), q = Math.max(1, Math.floor(n(nomeados, 1))), ex = Math.max(0, n(extra, 1));
    var cabe = h > 0 ? h * 0.96 / (q + ex) : PX_MIN_N1;
    switch (Math.floor(n(k, 0))) {
      // nunca acima da fronteira do N2: um palco alto com poucos andares dava 71 px (apanhado pela propriedade)
      case 1: return Math.min(NIVEIS.sector - 1, Math.max(PX_MIN_N1, cabe));
      case 2: return PX_N2;
      case 3: return PX_N3;
      default: return pxN0(h, q, MARGEM_N0, TECTO_PX_N0, ex);
    }
  }

  // ---------------------------------------------------------------- a helice (o DNA)
  // O ponto da fita na `ordem` (fraccionaria): o andar roda `torcao` graus por ordem, e a fita segue o canto
  // da laje (fase = o angulo do canto no andar 0). Duas fitas = duas fases a 180 graus.
  function helice(ordem, torcaoGraus, raio, altura, fase) {
    var o = n(ordem, 0), t = n(torcaoGraus, TORCAO_GRAUS) * Math.PI / 180, r = Math.max(0, n(raio, 0));
    var a = n(altura, 0), f = n(fase, 0);
    var ang = f + o * t;
    return { x: r * Math.cos(ang), y: o * a, z: r * Math.sin(ang), ang: ang };
  }

  // Um pacote do feed que vai da ordem `de` a ordem `para`, na fraccao t do caminho. Sobe pela fita dos
  // dados (faseSobe), desce pela das decisoes (faseDesce). No mesmo andar nao ha fita: devolve null e quem
  // desenha atravessa o proprio andar.
  function pontoNaFita(de, para, t, geo) {
    var g = geo || {};
    var a = n(de, NaN), b = n(para, NaN), u = clamp(n(t, 0), 0, 1);
    if (!isFinite(a) || !isFinite(b) || a === b) return null;
    var sobe = b > a;
    var p = helice(a + (b - a) * u, g.torcao, g.raio, g.altura, sobe ? n(g.faseSobe, 0) : n(g.faseDesce, Math.PI));
    p.sobe = sobe;
    return p;
  }

  // ---------------------------------------------------------------- o velocimetro
  function escalaBonita(x) {
    var v = n(x, 0);
    if (!(v > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    for (var i = 0; i < ESCADA.length; i++) if (ESCADA[i] * p >= v) return ESCADA[i] * p;
    return 10 * p;
  }

  // A escala do mostrador: o proximo numero bonito acima de 1,15 x max(|agora|, |pico|, |vale|, |esperado|,
  // |stop|). Um valor que nao e numero nao conta - nao inventa escala, mas tambem nao rebenta.
  function escalaDoVelocimetro(valores) {
    var lista = Object.prototype.toString.call(valores) === '[object Array]' ? valores : [valores];
    var m = 0;
    for (var i = 0; i < lista.length; i++) { var v = Math.abs(n(lista[i], NaN)); if (isFinite(v) && v > m) m = v; }
    return escalaBonita(m * FOLGA_ESCALA);
  }

  // Graus a partir da vertical (0 = meio-dia), positivo para a direita (ganhos), negativo para a esquerda.
  function anguloDaAgulha(v, esc) {
    var e = n(esc, 0);
    if (!(e > 0)) return 0;
    var u = clamp(n(v, 0) / e, -LIMITE_AGULHA, LIMITE_AGULHA);
    return u * VARRE_GRAUS;
  }

  // ---------------------------------------------------------------- tweens
  function suave(t) { t = clamp(n(t, 0), 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function tween(v0, v1, t) {
    var a = n(v0, 0), b = n(v1, a);
    return a + (b - a) * suave(t);
  }

  // ---------------------------------------------------------------- o tempo
  function idadeEmMinutos(tIso, agoraMs) {
    var ms = Date.parse(String(tIso == null ? '' : tIso));
    var ag = n(agoraMs, NaN);
    if (!isFinite(ms) || !isFinite(ag)) return null;
    return Math.max(0, (ag - ms) / 60000);
  }
  function pulsa(tIso, agoraMs) { var i = idadeEmMinutos(tIso, agoraMs); return i != null && i < PULSO_MAX_MIN; }

  // "HH:MM" -> fraccao do dia (0..1); ilegivel -> null
  function fracaoDoDia(hhmm) {
    var m = String(hhmm == null ? '' : hhmm).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]);
    if (h > 24 || mi > 59) return null;
    return clamp((h * 60 + mi) / 1440, 0, 1);
  }

  // ---------------------------------------------------------------- a ordem vertical dos 100 andares
  // Dos `andares` (14, com `ordem`) e dos `andares_planeados` (21, com `ordem`) sai a lista dos 100: os
  // nomeados na sua ordem, os restantes ate `alvo` como reservados. Dois nomeados com a MESMA ordem sao um
  // conflito: ficam os dois na lista (nada se esconde) e o conflito conta-se, para o arreio acusar.
  function ordemDosAndares(andares, planeados, alvo) {
    var A = Object.prototype.toString.call(andares) === '[object Array]' ? andares : [];
    var P = Object.prototype.toString.call(planeados) === '[object Array]' ? planeados : [];
    var alvoN = Math.floor(n(alvo, 100)); if (!(alvoN >= 1)) alvoN = 100; if (alvoN > 10000) alvoN = 10000;
    var lista = [], porOrdem = {}, conflitos = 0, semOrdem = 0;
    function mete(a, tipoBase) {
      if (!a || typeof a !== 'object') return;
      var o = Math.floor(n(a.ordem, NaN));
      if (!isFinite(o) || o < 0) { semOrdem++; return; }
      var tipo = tipoBase === 'nomeado' ? (a.obra === 'rua' ? 'rua' : 'habitado') : 'em_obras';
      var it = { ordem: o, tipo: tipo, nome: String(a.nome == null ? '' : a.nome), n: (a.n == null ? null : Number(a.n)),
                 dados: a, conflito: false };
      if (porOrdem[o]) { it.conflito = true; conflitos++; }
      else porOrdem[o] = it;
      lista.push(it);
    }
    for (var i = 0; i < A.length; i++) mete(A[i], 'nomeado');
    for (var j = 0; j < P.length; j++) mete(P[j], 'planeado');
    var maxOrdem = alvoN - 1;
    for (var k = 0; k < lista.length; k++) if (lista[k].ordem > maxOrdem) maxOrdem = lista[k].ordem;
    for (var o2 = 0; o2 <= maxOrdem; o2++) if (!porOrdem[o2]) {
      var r = { ordem: o2, tipo: 'reservado', nome: '', n: null, dados: null, conflito: false };
      porOrdem[o2] = r; lista.push(r);
    }
    lista.sort(function (x, y) { return (x.ordem - y.ordem) || ((x.conflito ? 1 : 0) - (y.conflito ? 1 : 0)); });
    var c = { habitado: 0, rua: 0, em_obras: 0, reservado: 0 };
    lista.forEach(function (it) { c[it.tipo]++; });
    return { lista: lista, total: lista.length, nomeados: c.habitado + c.rua + c.em_obras, habitados: c.habitado,
             rua: c.rua, em_obras: c.em_obras, reservados: c.reservado, conflitos: conflitos, sem_ordem: semOrdem,
             alvo: alvoN };
  }

  // ---------------------------------------------------------------- empilhar caixas (hologramas ao lado da laje)
  // Caixas com a posicao DESEJADA (topo, fundo) no ecra: devolve o dy de cada uma para que nenhuma se sobreponha
  // na vertical e todas fiquem dentro de [0, alt]. Quem ja esta livre nao se mexe. Passagem para baixo e
  // depois para cima: se o monte passar do fundo, sobe inteiro.
  function empilhar(caixas, folga, alt) {
    var cs = Object.prototype.toString.call(caixas) === '[object Array]' ? caixas : [];
    var g = Math.max(0, n(folga, 0)), H = n(alt, Infinity);
    var idx = [], saida = [];
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i] || {};
      var t = n(c.topo, NaN), f = n(c.fundo, NaN);
      saida.push({ dy: 0 });
      if (!isFinite(t) || !isFinite(f) || f < t) continue;
      idx.push({ i: i, topo: t, fundo: f, h: f - t });
    }
    idx.sort(function (a, b) { return (a.topo - b.topo) || (a.i - b.i); });
    var y = -Infinity;
    for (var k = 0; k < idx.length; k++) {
      var it = idx[k], topo = Math.max(it.topo, y === -Infinity ? it.topo : y + g);
      if (topo < 0) topo = 0;
      it.novoTopo = topo; y = topo + it.h;
    }
    // se o monte saiu por baixo, sobe de tras para a frente
    if (isFinite(H)) {
      var lim = H;
      for (var q = idx.length - 1; q >= 0; q--) {
        var jt = idx[q];
        if (jt.novoTopo + jt.h > lim) jt.novoTopo = Math.max(0, lim - jt.h);
        lim = jt.novoTopo - g;
      }
    }
    for (var z = 0; z < idx.length; z++) saida[idx[z].i].dy = idx[z].novoTopo - idx[z].topo;
    return saida;
  }

  // ---------------------------------------------------------------- o alvo do zoom
  // Zoom "em direccao ao andar sob o cursor": a coordenada vertical do MUNDO que esta debaixo do cursor, na
  // vertical do eixo da torre, e alvoY + dy_px * mundoPorPx / sin(phi) (dy positivo para cima). Ao mudar o
  // zoom por um factor f, o alvo anda para que esse ponto fique parado no ecra.
  function alvoDepoisDoZoom(alvoY, dyPx, mundoPorPx, phi, factor) {
    var a = n(alvoY, 0), d = n(dyPx, 0), m = n(mundoPorPx, 0), p = n(phi, Math.PI / 3), f = n(factor, 1);
    var s = Math.abs(Math.sin(p)); if (s < 1e-6 || m <= 0 || !(f > 0)) return a;
    var yCursor = a + d * m / s;
    return yCursor - (yCursor - a) * f;
  }

  // ---------------------------------------------------------------- luminancia (para as provas de tinta)
  function luminancia(r, g, b) { return 0.2126 * n(r, 0) + 0.7152 * n(g, 0) + 0.0722 * n(b, 0); }

  var api = {
    NIVEIS: NIVEIS, NOMES_NIVEL: NOMES_NIVEL, TORCAO_GRAUS: TORCAO_GRAUS, ESCADA: ESCADA, FOLGA_ESCALA: FOLGA_ESCALA,
    LIMITE_AGULHA: LIMITE_AGULHA, VARRE_GRAUS: VARRE_GRAUS, TECTO_PX_N0: TECTO_PX_N0, MARGEM_N0: MARGEM_N0,
    PX_MIN_N1: PX_MIN_N1, PX_N2: PX_N2, PX_N3: PX_N3, PULSO_MAX_MIN: PULSO_MAX_MIN,
    pxPorAndar: pxPorAndar, mundoPorPxPara: mundoPorPxPara, nivelDe: nivelDe, pxN0: pxN0, alvoDoNivel: alvoDoNivel,
    helice: helice, pontoNaFita: pontoNaFita,
    escalaBonita: escalaBonita, escalaDoVelocimetro: escalaDoVelocimetro, anguloDaAgulha: anguloDaAgulha,
    suave: suave, tween: tween,
    idadeEmMinutos: idadeEmMinutos, pulsa: pulsa, fracaoDoDia: fracaoDoDia,
    ordemDosAndares: ordemDosAndares, empilhar: empilhar, alvoDepoisDoZoom: alvoDepoisDoZoom, luminancia: luminancia,
    clamp: clamp
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.PredioGeo = api;
})(typeof window !== 'undefined' ? window : globalThis);
