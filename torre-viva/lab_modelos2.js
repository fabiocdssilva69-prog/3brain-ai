// lab_modelos2.js — MAIS SEIS MODELOS DO LABORATORIO, da familia dos dois de que ele gostou (sala/lab_modelos2.html). 10/10/2026.
//
// O PEDIDO DELE (10/10, depois de ver a 1.a pagina): "sobre o laboratório gostei da arvore e da esfera entao gera mais 6 pra mim
// ver se aprovo algum". A pagina mostra a ARVORE e a ESFERA (os mesmos objectos do registo do lab_modelos.js - nada copiado -,
// para ele comparar) e SEIS novos da mesma familia: crescimento organico (ramos, raizes, folhas, frutos, seiva) e volume 3D
// leve em canvas 2D (pontos numa superficie, faixas, rotacao, aneis):
//   FLORESTA   uma arvore por lab, uma especie por especialidade, em socalcos; a altura conta o que o lab calculou na ultima hora
//   MICELIO    a rede debaixo do chao: a luz corre pelos fios ate aos labs vizinhos e o cogumelo do lab brota a superficie
//   CORAL      a colonia vista de cima: um braco fractal por lab, os genes sao os polipos das pontas
//   SATURNO    um anel fino por lab a volta de um planeta; os robustos sao luas douradas
//   NEBULOSA   uma galaxia espiral em 3D: um braco por especialidade, um aglomerado de estrelas por lab
//   BONSAI     uma arvore em 3D a rodar: um ramo grosso por especialidade, uma almofada de folhas por lab
//
// OS DADOS e o resto vem da MESMA infraestrutura (lab_modelos.js): labs.json, os eventos "genes" do vivo.json, o modo publicado,
// a repeticao, o relogio unico (30 quadros/s no maximo), a pausa com o separador escondido e o prefers-reduced-motion. Este
// ficheiro so REGISTA os seis desenhos (LabModelos.registar, com as ajudas de LabModelos.kit) e diz a infraestrutura quais
// mostrar (LabModelos.arrancar). Nada e simulado: o que se mexe sozinho e so a rotacao e o vento, lentos; cada luz, onda,
// seiva, cogumelo e crescimento vem de um evento "genes" real (ou da repeticao, que a pagina marca REPETICAO).
// Provas: node --test sala/testes_lab_modelos2.js
'use strict';
(function (raiz) {
  var LM = raiz && raiz.LabModelos;
  if (!LM && typeof require === 'function') { try { LM = require('./lab_modelos.js'); } catch (e) { LM = null; } }
  if (!LM || !LM.kit || typeof LM.registar !== 'function') {
    if (typeof console !== 'undefined' && console && console.warn) console.warn('lab_modelos2.js: falta o lab_modelos.js (tem de ser carregado antes)');
    return;
  }
  var K = LM.kit, TAU = K.TAU, C = K.C, num = K.num, clamp = K.clamp, seguir = K.seguir, ease = K.ease, frac = K.frac,
    semente = K.semente, corTipo = K.corTipo, novoCanvas = K.novoCanvas, rgbDe = K.rgbDe, cor = K.cor, luz = K.luz,
    escrever = K.escrever, escreverCabe = K.escreverCabe, Lote = K.Lote, pronto = K.pronto, Arrumador = K.Arrumador,
    maisPerto = K.maisPerto, fmtInt = K.fmtInt, HORA_MS = K.HORA_MS || 3600000;

  var NOVOS = ['floresta', 'micelio', 'coral', 'saturno', 'nebulosa', 'bonsai'];
  var MOSTRAR = ['arvore', 'esfera'].concat(NOVOS);            // 1-2 os que ele aprovou, 3-8 os novos
  var MARCAS = { arvore: 'aprovado', esfera: 'aprovado' };
  NOVOS.forEach(function (id) { MARCAS[id] = 'novo'; });
  // a legenda das duas paginas: robusto ouro, gene da amostra ouro translucido, gene novo ciano, demitido cinza
  var CORES = [C.rob, 'rgba(242,194,48,.62)', C.novo, C.dem];
  var FOLHA = 'rgba(214,180,74,.62)';                           // a cor da folha da Arvore

  // ================================================================ PURAS (testadas em Node)
  // um gerador com semente (mulberry32): o mesmo lab desenha sempre a mesma arvore, o mesmo coral, o mesmo aglomerado
  function aleatorio(s) {
    var a = (Number(s) >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { return (rnd() + rnd() + rnd() + rnd() - 2) * 1.73; }   // ~ normal(0, 1), sem caudas infinitas
  // genes calculados por lab numa janela (a ultima hora) no relogio dos eventos: ao vivo e agora, na repeticao o cursor
  function genesNaJanela(E, relogio, janela) {
    relogio = num(relogio, 0); janela = Math.max(0, num(janela, HORA_MS));
    var por = {}, max = 0, h = E && Array.isArray(E.hist) ? E.hist : [], ini = relogio - janela;
    for (var i = 0; i < h.length; i++) {
      var e = h[i]; if (!e || !(e.ms > ini) || e.ms > relogio) continue;
      var v = (por[e.andar] || 0) + Math.max(0, num(e.n)); por[e.andar] = v; if (v > max) max = v;
    }
    return { por: por, max: max };
  }
  // 0..1 em escala logaritmica (1 gene ja se ve; milhares nao rebentam a escala)
  function escalaLog(v, topo) { v = Math.max(0, num(v)); topo = Math.max(1, num(topo, 100)); return clamp(Math.log(1 + v) / Math.log(1 + topo), 0, 1); }
  function classe(g) { return !g ? 1 : g.d ? 3 : g.r ? 0 : g.novo > 0.08 ? 2 : 1; }   // indice em CORES
  // o gene acende quando a seiva/onda chega (atraso em ms depois do calculo) e apaga-se devagar; sem movimento, acende ja
  function aceso(g, agora, atraso, calmo) {
    if (!g || !(g.t > 0)) return 0;
    var d = num(agora) - g.t - (calmo ? 0 : atraso);
    return d < 0 || d > 6000 ? 0 : Math.exp(-d / 900);
  }
  function unidades(gs) { var u = 0; gs.forEach(function (g) { u += g.labs.length; }); return u + Math.max(0, gs.length - 1) * 0.9; }
  // os grupos (por ordem) em R filas seguidas, com a fila mais larga o mais estreita possivel (forca bruta: <= 56 cortes)
  function repartir(grupos, R) {
    grupos = Array.isArray(grupos) ? grupos : [];
    var G = grupos.length; R = Math.max(1, Math.min(Math.floor(num(R, 1)), G));
    if (!G) return [[]];
    var melhor = null, cortes = [];
    (function rec(ini, falta) {
      if (falta === 1) {
        var partes = cortes.concat([[ini, G]]), m = 0;
        partes.forEach(function (p) { m = Math.max(m, unidades(grupos.slice(p[0], p[1]))); });
        if (!melhor || m < melhor.m - 1e-9) melhor = { m: m, partes: partes };
        return;
      }
      for (var c = ini + 1; c <= G - falta + 1; c++) { cortes.push([ini, c]); rec(c, falta - 1); cortes.pop(); }
    })(0, R);
    return melhor.partes.map(function (p) { return grupos.slice(p[0], p[1]); });
  }
  function mdc(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function passoPrimo(n) { if (n <= 2) return 1; var s = Math.max(1, Math.round(n * 0.618)); while (s > 1 && mdc(s, n) !== 1) s--; return s; }
  function inverterBits(i, bits) { var r = 0; for (var b = 0; b < bits; b++) { r = (r << 1) | (i & 1); i >>= 1; } return r; }
  // polilinhas: os comprimentos acumulados e o ponto a uma fraccao s do comprimento
  function acumular(pts) {
    var n = pts.length >> 1, acc = new Float32Array(Math.max(1, n));
    for (var i = 1; i < n; i++) { var dx = pts[i * 2] - pts[i * 2 - 2], dy = pts[i * 2 + 1] - pts[i * 2 - 1]; acc[i] = acc[i - 1] + Math.sqrt(dx * dx + dy * dy); }
    return acc;
  }
  function naPolilinha(pts, acc, s, out) {
    var n = pts.length >> 1;
    if (n < 2) { out[0] = pts[0] || 0; out[1] = pts[1] || 0; return out; }
    var alvo = clamp(s, 0, 1) * acc[n - 1], i = 1;
    while (i < n - 1 && acc[i] < alvo) i++;
    var a = acc[i - 1], b = acc[i], q = b > a ? (alvo - a) / (b - a) : 0;
    out[0] = pts[i * 2 - 2] + (pts[i * 2] - pts[i * 2 - 2]) * q; out[1] = pts[i * 2 - 1] + (pts[i * 2 + 1] - pts[i * 2 - 1]) * q;
    return out;
  }
  // um fio organico de A a B (n pontos): ondula para o lado, com as pontas no sitio
  function fioOrganico(ax, ay, bx, by, n, rnd, ampK) {
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len;
    var f1 = 0.8 + rnd() * 0.9, f2 = 2.2 + rnd() * 1.4, p1 = rnd() * TAU, p2 = rnd() * TAU, amp = len * ampK * (0.6 + 0.8 * rnd()) * (rnd() < 0.5 ? -1 : 1);
    var pts = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) {
      var s = i / (n - 1), o = amp * Math.sin(Math.PI * s) * (0.7 * Math.sin(s * Math.PI * f1 + p1) + 0.3 * Math.sin(s * TAU * f2 + p2) + 0.4);
      pts[i * 2] = ax + dx * s + nx * o; pts[i * 2 + 1] = ay + dy * s + ny * o;
    }
    return { pts: pts, acc: acumular(pts), len: 0 };
  }
  function tracar(ctx, pts) { var n = pts.length >> 1; if (n < 2) return; ctx.moveTo(pts[0], pts[1]); for (var i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]); }

  // ================================================================ 3. FLORESTA
  // Uma arvore pequena por lab, em bosques por especialidade, e cada especialidade com a sua ESPECIE (carvalho, betula, pinheiro,
  // choupo, chorao, acacia, arbusto): o bosque reconhece-se de longe. Em socalcos (1 a 4, os que enchem melhor o cartao; os de
  // tras mais pequenos). Folhas = genes da amostra, frutos dourados = robustos, folhas cinza = demitidos. A ALTURA e o tamanho do
  // lab (genes no total) mais o que ele CALCULOU NA ULTIMA HORA: quem calcula cresce. Um calculo faz subir a seiva pelo tronco,
  // acende as folhas dos genes que calcularam e da um esticao a arvore; um gene novo (evolucao) nasce ciano.
  var ESPECIES = {
    macro: { tronco: 0.34, ang: 0.6, varA: 0.26, razao: 0.72, prof: 4, ramos: 2, queda: 0, folha: 0.075 },   // carvalho
    cel: { tronco: 0.46, ang: 0.32, varA: 0.16, razao: 0.76, prof: 4, ramos: 2, queda: 0, folha: 0.055 },    // betula
    cri: { conica: true, folha: 0.06 },                                                                     // pinheiro
    vol: { tronco: 0.22, ang: 0.14, varA: 0.07, razao: 0.86, prof: 4, ramos: 2, queda: 0, folha: 0.05 },     // choupo
    rev: { tronco: 0.42, ang: 0.6, varA: 0.2, razao: 0.7, prof: 3, ramos: 3, queda: 0.42, folha: 0.06, pende: true },   // chorao
    ten: { tronco: 0.56, ang: 1.02, varA: 0.16, razao: 0.6, prof: 4, ramos: 2, queda: 0, folha: 0.055 },     // acacia
    mesa: { tronco: 0.05, ang: 0.9, varA: 0.3, razao: 0.64, prof: 3, ramos: 4, queda: 0, folha: 0.07 },      // arbusto
    outro: { tronco: 0.34, ang: 0.52, varA: 0.26, razao: 0.72, prof: 4, ramos: 2, queda: 0, folha: 0.07 }
  };
  var NOME_ESPECIE = { macro: 'carvalho', cel: 'bétula', cri: 'pinheiro', vol: 'choupo', rev: 'chorão', ten: 'acácia', mesa: 'arbusto', outro: 'carvalho' };
  // a arvore em unidades (base em 0,0; o ponto mais alto em y = 1): a madeira por nivel e as pontas (onde nascem as folhas)
  function gerarArvore(esp, sem) {
    var rnd = aleatorio(sem), segs = [], pontas = [], i;
    if (esp.conica) {                                           // pinheiro: o tronco ate ao topo e 6 andares de ramos a descer
      segs.push(0, 0, 0, 1, 1, 0);
      for (var k = 0; k < 6; k++) {
        var yk = 0.2 + k * 0.135, L = 0.33 * (1 - k / 6.4) + 0.05;
        for (var lado = -1; lado <= 1; lado += 2) {
          var a = lado * (1.92 + (rnd() - 0.5) * 0.22), x1 = Math.sin(a) * L, y1 = yk + Math.cos(a) * L;
          segs.push(0, yk, x1, y1, 0.3, 1);
          pontas.push(x1, y1, a, x1 * 0.55, yk + (y1 - yk) * 0.55, a);
        }
      }
      pontas.push(0, 1, 0);
    } else {
      var ramo = function (x, y, ang, len, nivel) {
        var x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(ang) * len;
        segs.push(x, y, x2, y2, 1, nivel);
        if (nivel >= esp.prof) { pontas.push(x2, y2, ang); return; }
        for (var j = 0; j < esp.ramos; j++) {
          var f = esp.ramos === 1 ? 0 : (j / (esp.ramos - 1)) * 2 - 1;
          var a2 = ang + f * esp.ang + (rnd() - 0.5) * esp.varA;
          if (esp.queda) a2 += (f || (rnd() - 0.5)) * esp.queda * nivel;
          ramo(x2, y2, a2, len * esp.razao * (0.88 + rnd() * 0.24), nivel + 1);
        }
      };
      ramo(0, 0, (rnd() - 0.5) * 0.1, esp.tronco, 0);
    }
    var ymax = 0.05, xmax = 0.05, maxN = 0;
    for (i = 0; i < segs.length; i += 6) { ymax = Math.max(ymax, segs[i + 1], segs[i + 3]); xmax = Math.max(xmax, Math.abs(segs[i]), Math.abs(segs[i + 2])); maxN = Math.max(maxN, segs[i + 5]); }
    var k2 = 1 / ymax, niveis = [], larg = [];
    for (i = 0; i <= maxN; i++) { niveis.push([]); larg.push(esp.conica ? (i ? 0.3 : 1) : Math.pow(0.6, i)); }
    for (i = 0; i < segs.length; i += 6) niveis[segs[i + 5]].push(segs[i] * k2, segs[i + 1] * k2, segs[i + 2] * k2, segs[i + 3] * k2);
    for (i = 0; i < pontas.length; i += 3) { pontas[i] *= k2; pontas[i + 1] *= k2; }
    return { niveis: niveis.map(function (a3) { return new Float32Array(a3); }), larg: larg, pontas: pontas, meia: xmax * k2 + (esp.folha || 0.05) };
  }
  // cada gene da amostra numa ponta (os robustos, que vem primeiro, espalhados pela copa toda): posicao e o traco da folha
  function folhasDe(lab, geo, esp, sem) {
    var m = lab.amostra.length, nP = Math.max(1, Math.floor(geo.pontas.length / 3)), passo = passoPrimo(nP), out = new Float32Array(Math.max(1, m) * 4);
    for (var k = 0; k < m; k++) {
      var ti = (k * passo + (sem % nP)) % nP, px = geo.pontas[ti * 3] || 0, py = geo.pontas[ti * 3 + 1] || 0, pa = geo.pontas[ti * 3 + 2] || 0;
      var aa = k * 2.39996 + (sem % 97) / 15, rr = esp.folha * (0.25 + 0.75 * frac(k * 0.618 + 0.13));
      var da = esp.pende ? Math.PI + (frac(k * 0.41) - 0.5) * 0.25 : pa + (frac(k * 0.37) - 0.5) * 1.8, len = esp.folha * (esp.pende ? 1.7 : 0.75);
      out[k * 4] = px + Math.cos(aa) * rr; out[k * 4 + 1] = py + Math.sin(aa) * rr * 0.85; out[k * 4 + 2] = Math.sin(da) * len; out[k * 4 + 3] = Math.cos(da) * len;
    }
    return out;
  }
  LM.registar(function () {
    var S = { chave: '', soc: [], arv: [], ordem: [], porN: {}, grande: false, uw: 1, hora: { por: {}, max: 0 }, horaK: '', alt: {}, seiva: [] };
    var lFolha = new Lote(2600), lDem = new Lote(2600), lNovo = new Lote(2600), lFruto = new Lote(2600), lRobT = new Lote(2600), acesas = [];
    function chao(soc, x) {
      for (var i = 0; i < soc.bosques.length; i++) { var b = soc.bosques[i]; if (x >= b.x0 && x <= b.x1 && b.x1 > b.x0) return soc.yb - soc.hm * Math.sin(Math.PI * (x - b.x0) / (b.x1 - b.x0)); }
      return soc.yb;
    }
    function arrumar(w, h, E) {
      var grande = w >= 560, pad = grande ? 26 : 8, topo = grande ? 26 : 8, fundo = grande ? 34 : 5, melhor = null, Gn = Math.max(1, E.grupos.length);
      S.grande = grande;
      for (var R = 1; R <= Math.min(4, Gn); R++) {             // em quantos socalcos a floresta enche melhor o cartao
        var partes = repartir(E.grupos, R), unid = 0;
        partes.forEach(function (gs) { unid = Math.max(unid, unidades(gs)); });
        // (+1,4 unidades: a copa da primeira e da ultima arvore passa ~0,7 da sua faixa - assim nao sai do cartao)
        var uw = Math.max(1, (w - 2 * pad) / Math.max(1, unid + 1.4)), alt = Math.max(4, (h - topo - fundo) / R), H = Math.max(2, Math.min(uw * 3.1, alt * 0.94));
        if (!melhor || H > melhor.H * 1.04) melhor = { R: R, partes: partes, uw: uw, alt: alt, H: H };
      }
      var maxT = 1; E.labs.forEach(function (l) { if (l.total > maxT) maxT = l.total; });
      S.uw = melhor.uw; S.soc = []; S.arv = []; S.ordem = []; S.porN = {};
      melhor.partes.forEach(function (gs, p) {
        var sc = 1 - 0.09 * (melhor.R - 1 - p), yb = topo + melhor.alt * (p + 1) - (grande ? 4 : 2), u = unidades(gs), x = (w - u * melhor.uw) / 2;
        var soc = { yb: yb, sc: sc, hm: Math.min(grande ? 7 : 3, melhor.alt * 0.05), bosques: [], H: Math.max(2, melhor.H * sc), arv: [] };
        gs.forEach(function (g, gi) {
          if (gi) x += melhor.uw * 0.9;
          var x0 = x, esp = ESPECIES[g.id] || ESPECIES.outro;
          g.labs.forEach(function (lab, j) {
            var sem = semente('floresta ' + lab.n), geo = gerarArvore(esp, sem), fila = g.labs.length > 1 ? j % 2 : 0;
            var a = { lab: lab, p: p, fila: fila, x: x + melhor.uw / 2, yb: yb, geo: geo, folhas: folhasDe(lab, geo, esp, sem), fase: (sem % 628) / 100,
              tam: escalaLog(lab.total, maxT), H: soc.H * (fila ? 0.84 : 1), Hc: 0, sw: 0, fx: 1, pende: !!esp.pende, esp: NOME_ESPECIE[g.id] || '' };
            soc.arv.push(a); S.arv.push(a); S.porN[lab.n] = a;
            x += melhor.uw;
          });
          soc.bosques.push({ nome: g.nome, x0: x0, x1: x });
        });
        var sobe = Math.min(grande ? 8 : 3, melhor.alt * 0.045);
        soc.arv.forEach(function (a) { a.yb = chao(soc, a.x) - (a.fila ? sobe : 0); a.Hc = a.H; });
        S.soc.push(soc);
        soc.arv.filter(function (a) { return a.fila; }).concat(soc.arv.filter(function (a) { return !a.fila; })).forEach(function (a) { S.ordem.push(a); });
      });
    }
    return {
      id: 'floresta', nome: 'Floresta',
      descricao: 'Uma árvore por laboratório, em bosques por especialidade (cada uma com a sua espécie). Folhas = genes da amostra, frutos dourados = robustos, cinza = demitidos. Quando o lab calcula, a seiva sobe, as folhas acendem e a árvore cresce: a altura conta o que calculou na última hora.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, ref = E.relogio || agora, gr = S.grande, i, j, q;
        var hk = E.histVer + '|' + Math.floor(ref / 2000) + '|' + E.versao;
        if (S.horaK !== hk) { S.hora = genesNaJanela(E, ref, HORA_MS); S.horaK = hk; }
        acesas.length = 0;
        ctx.lineCap = 'round';
        for (var p = 0; p < S.soc.length; p++) {
          var soc = S.soc[p];
          // o chao do socalco (um montinho debaixo de cada bosque)
          ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, soc.yb);
          for (var xx = 0; xx <= w; xx += 6) ctx.lineTo(xx, chao(soc, xx));
          ctx.lineTo(w, soc.yb); ctx.lineTo(w, h); ctx.closePath();
          ctx.fillStyle = 'rgba(14,12,8,.9)'; ctx.fill();
          ctx.strokeStyle = 'rgba(242,194,48,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, soc.yb);
          for (xx = 0; xx <= w; xx += 6) ctx.lineTo(xx, chao(soc, xx));
          ctx.lineTo(w, soc.yb); ctx.stroke();
          for (var fila = 1; fila >= 0; fila--) {               // a fila de tras primeiro (mais pequena e mais escura)
            lFolha.n = lDem.n = lNovo.n = lFruto.n = lRobT.n = 0;
            for (q = 0; q < soc.arv.length; q++) {
              var a = soc.arv[q]; if (a.fila !== fila) continue;
              var lab = a.lab, e = Math.min(1, lab.energia), alvo = 0.5 + 0.3 * a.tam + 0.22 * escalaLog(S.hora.por[lab.n] || 0, 150);
              var al = S.alt[lab.n];
              al = al == null || E.calmo ? alvo : dt > 0 ? seguir(al, alvo, alvo > al ? 2.4 : 0.4, dt) : al;
              S.alt[lab.n] = al;
              var H = a.H * al, sw = E.calmo ? 0 : 0.016 * Math.sin(t * 0.8 + a.fase) + 0.07 * e * Math.sin(t * 6.3 + a.fase);
              // as copas largas (carvalho, acacia) estreitam para nao invadirem tres vizinhas nem sairem do cartao
              var fx = Math.min(1, S.uw * 1.25 / Math.max(1e-3, a.geo.meia * H)), Hx = H * fx;
              a.Hc = H; a.sw = sw; a.fx = fx;
              // a madeira, nivel a nivel (o tronco grosso, os raminhos finos); acende com o calculo
              ctx.strokeStyle = e > 0.04 ? cor('242,194,48', 0.42 + 0.5 * e) : fila ? 'rgba(92,70,14,.92)' : 'rgba(126,98,16,.95)';
              for (var nv = 0; nv < a.geo.niveis.length; nv++) {
                var sg = a.geo.niveis[nv]; if (!sg.length) continue;
                ctx.lineWidth = clamp(Hx * 0.055 * a.geo.larg[nv], 0.5, 9); ctx.beginPath();
                for (j = 0; j < sg.length; j += 4) {
                  ctx.moveTo(a.x + (sg[j] + sw * sg[j + 1] * sg[j + 1]) * Hx, a.yb - sg[j + 1] * H);
                  ctx.lineTo(a.x + (sg[j + 2] + sw * sg[j + 3] * sg[j + 3]) * Hx, a.yb - sg[j + 3] * H);
                }
                ctx.stroke();
              }
              // as folhas: um gene da amostra cada (no chorao, os robustos pendem dourados em vez de frutos redondos)
              var am = lab.amostra, fo = a.folhas, fr = Math.max(0.9, Hx * 0.024);
              for (j = 0; j < am.length; j++) {
                var g = am[j], lx = fo[j * 4], ly = fo[j * 4 + 1], X = a.x + (lx + sw * ly * ly) * Hx, Y = a.yb - ly * H;
                var cresce = g.nasceu ? ease((agora - g.nasceu) / 900) : 1, dx = fo[j * 4 + 2] * Hx * cresce, dy = -fo[j * 4 + 3] * H * cresce;
                if (g.d) lDem.por(X, Y, X + dx, Y + dy);
                else if (g.r) { if (a.pende) lRobT.por(X, Y, X + dx, Y + dy); else lFruto.por(X, Y, fr * (g.rT ? ease((agora - g.rT) / 700) : 1), 0); }
                else (g.novo > 0.08 ? lNovo : lFolha).por(X, Y, X + dx, Y + dy);
                var ac = aceso(g, agora, 750, E.calmo);
                if (ac > 0.05) acesas.push(X, Y, ac, g.novo > 0.3 ? 1 : 0, Math.max(3, H * 0.06));
              }
            }
            var lw = Math.max(1, soc.H * (fila ? 0.84 : 1) * 0.02), alf = fila ? 0.72 : 1;
            lFolha.tracos(ctx, FOLHA, lw, alf); lDem.tracos(ctx, C.dem, lw, alf); lRobT.tracos(ctx, C.rob, lw * 1.2, fila ? 0.85 : 1);
            lNovo.tracos(ctx, C.novo, lw * 1.15, 1); lFruto.bolas(ctx, C.rob, fila ? 0.85 : 1);
          }
        }
        ctx.lineCap = 'butt'; ctx.lineWidth = 1;
        for (i = 0; i < acesas.length; i += 5) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], acesas[i + 4], acesas[i + 2]);
        // a seiva: do chao ao meio da copa (~0,85 s), depois acendem as folhas
        for (i = S.seiva.length - 1; i >= 0; i--) {
          var sv = S.seiva[i], a2 = S.porN[sv.n], u = (t - sv.t0) / 0.85;
          if (!a2 || u > 1.35 || u < -0.3) { S.seiva.splice(i, 1); continue; }
          if (u < 0) continue;
          var uy = clamp(u, 0, 1) * 0.62, H2 = a2.Hc || a2.H, fade = u > 1 ? (1.35 - u) / 0.35 : 1;
          luz(ctx, sv.cor, a2.x + a2.sw * uy * uy * H2 * a2.fx, a2.yb - uy * H2, Math.max(3, H2 * 0.08) * (0.8 + 0.5 * sv.forca), 0.95 * fade);
          luz(ctx, sv.cor, a2.x, a2.yb - Math.max(0, uy - 0.1) * H2, Math.max(2, H2 * 0.04), 0.4 * fade);
        }
        if (gr) {                                               // ampliado: o nome de cada bosque e de quem esta a crescer
          var arr = new Arrumador();
          S.soc.forEach(function (soc2) {
            soc2.bosques.forEach(function (b) {
              var nome = b.nome.toUpperCase(), y = arr.tentar(ctx, nome, (b.x0 + b.x1) / 2, soc2.yb + 14, 9.5, 'center', 600, true, [0, 10]);
              if (y != null) escreverCabe(ctx, nome, (b.x0 + b.x1) / 2, y, 'rgba(242,194,48,.85)', 9.5, 'center', 600, true, Math.max(30, b.x1 - b.x0 + 8), true);
            });
          });
          S.arv.slice().sort(function (x1, x2) { return x2.lab.energia - x1.lab.energia; }).forEach(function (a3) {
            var hora = S.hora.por[a3.lab.n] || 0; if (!(a3.lab.energia > 0.08) && !hora) return;
            var txt = a3.lab.curto + (hora ? ' · ' + fmtInt(hora) : ''), y = arr.tentar(ctx, txt, a3.x, a3.yb - a3.Hc - 5, 9.5, 'center', 500, false, [0, -11, -22]);
            if (y != null) escreverCabe(ctx, txt, a3.x, y, a3.lab.energia > 0.08 ? C.ouroHi : 'rgba(239,237,232,.75)', 9.5, 'center', 500, false, 0, true);
          });
          escrever(ctx, 'altura = tamanho do lab + genes que calculou na última hora (o número ao lado do nome) · uma espécie por especialidade', 14, h - 8, C.dim, 9.5, 'left', 500, true);
        }
      },
      aoEvento: function (r, E) {
        var n = r.lab.n, a = S.porN[n]; if (!a) return;
        if (S.alt[n] != null) S.alt[n] = Math.min(1.15, S.alt[n] + 0.04 + 0.05 * r.forca);   // o esticao (depois assenta)
        if (!E.calmo) { S.seiva.push({ n: n, t0: E.t, cor: corTipo(r.tipo), forca: r.forca }); if (S.seiva.length > 40) S.seiva.shift(); }
      },
      quem: function (x, y) {
        var best = null;
        for (var i = 0; i < S.ordem.length; i++) {                 // pela ordem do desenho: o ultimo que contem o ponto e o da frente
          var a = S.ordem[i], H = a.Hc || a.H, mw = a.geo.meia * H * (a.fx || 1);
          if (x >= a.x - mw && x <= a.x + mw && y >= a.yb - H - 4 && y <= a.yb + 3) best = a;
        }
        if (!best) { var bd = S.uw * 0.6; S.arv.forEach(function (a2) { var d = Math.abs(a2.x - x); if (d < bd && Math.abs(a2.yb - y) < Math.max(12, a2.Hc)) { bd = d; best = a2; } }); }
        return best ? { lab: best.lab, txt: (best.esp ? best.esp + ' · ' : '') + fmtInt(S.hora.por[best.lab.n] || 0) + ' genes na última hora' } : null;
      },
      limpar: function () { S.seiva = []; }
    };
  });

  // ================================================================ 4. MICELIO
  // Um corte do chao. Cada lab e um NO da rede subterranea (os da mesma especialidade no mesmo bairro, ligados pela arvore minima;
  // os bairros ligados entre si pelos pares mais perto). As contas nas franjas de cada no sao os genes da amostra (ouro = robusto,
  // cinza = demitido, ciano = novo). Quando um lab calcula, a LUZ corre pelos fios ate aos vizinhos (com muitos genes, salta mais
  // um no) e sobe pela raiz ate a superficie, onde o COGUMELO do lab brota; fica de pe enquanto o lab calcular (ultimos 3 min).
  LM.registar(function () {
    var S = { chave: '', nos: [], fios: [], grupos: [], idx: {}, y0: 0, yMax: 0, slot: 1, grande: false, pulsos: [], cog: {}, salto: {}, brilho: {}, estratos: [] };
    var lGene = new Lote(2600), lRob = new Lote(2600), lDem = new Lote(2600), lNovo = new Lote(2600), P = [0, 0], acesas = [];
    function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
    function ligar(a, b, tipo) {
      if (a === b || a == null || b == null) return;
      for (var i = 0; i < S.fios.length; i++) { var f = S.fios[i]; if ((f.a === a && f.b === b) || (f.a === b && f.b === a)) return; }
      var na = S.nos[a], nb = S.nos[b], fo = fioOrganico(na.x, na.y, nb.x, nb.y, 12, aleatorio((na.sem * 31) ^ nb.sem ^ 0x51ed), 0.14);
      fo.len = fo.acc[fo.acc.length - 1]; fo.a = a; fo.b = b; fo.tipo = tipo;
      na.fios.push(S.fios.length); nb.fios.push(S.fios.length); S.fios.push(fo);
    }
    function arrumar(w, h, E) {
      var grande = w >= 560, pad = grande ? 34 : 8, N = E.labs.length, G = Math.max(1, E.grupos.length), i;
      S.grande = grande;
      var unid = N + Math.max(0, E.grupos.length - 1) * 0.8, slot = Math.max(1, (w - 2 * pad) / Math.max(1, unid)), xs = pad + slot / 2;
      // o ar so tem a altura que os cogumelos precisam (no telemovel ao alto sobrava meio ecra vazio por cima do chao)
      var y0 = Math.round(Math.min(h * (grande ? 0.3 : 0.32), slot * 0.42 * 5.8 + (grande ? 44 : 22)));
      var yMin = y0 + (grande ? 34 : 13), yMax = Math.max(yMin + 4, h - (grande ? 40 : 8));
      S.y0 = y0; S.yMax = yMax; S.nos = []; S.fios = []; S.grupos = []; S.idx = {};
      var largG = (w - 2 * pad) / G, altS = yMax - yMin, maxT = 1;
      S.slot = slot;
      E.labs.forEach(function (l) { if (l.total > maxT) maxT = l.total; });
      E.grupos.forEach(function (g, gi) {
        if (gi) xs += slot * 0.8;
        var gx = pad + (gi + 0.5) * largG, gy = yMin + altS * (gi % 2 ? 0.68 : 0.32), m = g.labs.length, rho = Math.max(2, Math.min(largG * 0.4, altS * 0.32));
        var ini = S.nos.length, xs0 = xs;
        g.labs.forEach(function (lab, j) {
          var sem = semente('micelio ' + lab.n), rnd = aleatorio(sem), rr = m > 1 ? rho * Math.sqrt((j + 0.5) / m) : 0, aa = j * 2.39996 + gi * 1.3;
          var x = gx + Math.cos(aa) * rr + (rnd() - 0.5) * rho * 0.2, y = clamp(gy + Math.sin(aa) * rr * 0.85 + (rnd() - 0.5) * rho * 0.2, yMin, yMax);
          S.idx[lab.n] = S.nos.length;
          S.nos.push({ lab: lab, g: gi, x: x, y: y, mx: xs, sem: sem, tam: escalaLog(lab.total, maxT), fios: [], raiz: null, franjas: [], contas: null });
          xs += slot;
        });
        S.grupos.push({ nome: g.nome, ini: ini, fim: S.nos.length, x: gx, y: gy, rho: rho, x0: xs0 - slot / 2, x1: xs - slot / 2 });
      });
      // dentro de cada especialidade: a arvore minima (Prim) - cada lab ligado ao vizinho mais perto
      S.grupos.forEach(function (grp) {
        if (grp.fim - grp.ini < 2) return;
        var dentro = [grp.ini], fora = [];
        for (var a = grp.ini + 1; a < grp.fim; a++) fora.push(a);
        while (fora.length) {
          var best = null;
          dentro.forEach(function (a2) { fora.forEach(function (b, kk) { var d = dist2(S.nos[a2], S.nos[b]); if (!best || d < best.d) best = { a: a2, b: b, k: kk, d: d }; }); });
          ligar(best.a, best.b, 0); dentro.push(best.b); fora.splice(best.k, 1);
        }
      });
      // entre especialidades: o par mais perto de cada duas vizinhas, e de duas em duas (fecha voltas na rede)
      var par = function (g1, g2) {
        var A = S.grupos[g1], B = S.grupos[g2], best = null;
        for (var a = A.ini; a < A.fim; a++) for (var b = B.ini; b < B.fim; b++) { var d = dist2(S.nos[a], S.nos[b]); if (!best || d < best.d) best = { a: a, b: b, d: d }; }
        if (best) ligar(best.a, best.b, 1);
      };
      for (i = 0; i + 1 < S.grupos.length; i++) par(i, i + 1);
      for (i = 0; i + 2 < S.grupos.length; i += 2) par(i, i + 2);
      // a raiz de cada cogumelo e as franjas com as contas (os genes)
      S.nos.forEach(function (no) {
        var rnd = aleatorio(no.sem ^ 0x2f), fo = fioOrganico(no.x, no.y, no.mx, y0, 10, rnd, 0.08);
        fo.len = fo.acc[fo.acc.length - 1]; no.raiz = fo;
        var am = no.lab.amostra, F = grande ? 6 : 8, porF = Math.max(1, Math.ceil(am.length / F)), L = (grande ? 36 : 13) * (0.6 + 0.4 * no.tam);
        no.franjas = []; no.contas = new Float32Array(Math.max(1, am.length) * 2);
        for (var f = 0; f < F; f++) {
          var ang = (f + 0.5) / F * TAU + (rnd() - 0.5) * 0.6 + 0.4, comp = L * (0.7 + 0.6 * rnd());
          no.franjas.push(fioOrganico(no.x, no.y, no.x + Math.cos(ang) * comp, clamp(no.y + Math.sin(ang) * comp * 0.8, y0 + 3, h - 2), 8, rnd, 0.42));
        }
        for (var kk = 0; kk < am.length; kk++) {
          var fi = no.franjas[kk % F], b = Math.floor(kk / F);
          naPolilinha(fi.pts, fi.acc, 0.3 + 0.7 * (b + 0.5) / porF, P); no.contas[kk * 2] = P[0]; no.contas[kk * 2 + 1] = P[1];
        }
      });
      // os estratos do chao (so desenho, nao sao dados)
      S.estratos = [0.3, 0.56, 0.82].map(function (fy, s) {
        var pts = [], rnd = aleatorio(77 + s), yy = y0 + (h - y0) * fy, f1 = 1 + rnd() * 2, p1 = rnd() * TAU;
        for (var x = 0; x <= w + 8; x += 8) pts.push(x, yy + Math.sin(x / Math.max(1, w) * TAU * f1 + p1) * 3);
        return new Float32Array(pts);
      });
      S.pulsos = []; S.brilho = {};
    }
    return {
      id: 'micelio', nome: 'Micélio',
      descricao: 'Uma rede debaixo do chão: cada nó é um laboratório e os fios ligam os da mesma especialidade (e os bairros entre si). As contas nos fios são os genes da amostra (ouro = robustos, cinza = demitidos). Quando o lab calcula, a luz corre pelos fios até aos vizinhos e o cogumelo dele brota à superfície.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, gr = S.grande, i, j, no, lab;
        // o chao: a superficie e os estratos
        ctx.fillStyle = 'rgba(20,16,8,.6)'; ctx.fillRect(0, S.y0, w, h - S.y0);
        ctx.strokeStyle = 'rgba(242,194,48,.05)'; ctx.lineWidth = 1; ctx.beginPath(); S.estratos.forEach(function (pts) { tracar(ctx, pts); }); ctx.stroke();
        ctx.strokeStyle = 'rgba(242,194,48,.34)'; ctx.beginPath(); ctx.moveTo(0, S.y0 + 0.5); ctx.lineTo(w, S.y0 + 0.5); ctx.stroke();
        // as franjas, as raizes dos cogumelos e os fios entre labs (os de quem calcula mais claros)
        ctx.strokeStyle = 'rgba(242,194,48,.12)'; ctx.beginPath();
        for (i = 0; i < S.nos.length; i++) for (j = 0; j < S.nos[i].franjas.length; j++) tracar(ctx, S.nos[i].franjas[j].pts);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(242,194,48,.2)'; ctx.beginPath(); for (i = 0; i < S.nos.length; i++) tracar(ctx, S.nos[i].raiz.pts); ctx.stroke();
        ctx.strokeStyle = 'rgba(242,194,48,.24)'; ctx.lineWidth = gr ? 1.4 : 1; ctx.beginPath(); for (i = 0; i < S.fios.length; i++) tracar(ctx, S.fios[i].pts); ctx.stroke();
        for (i = 0; i < S.fios.length; i++) {
          var f = S.fios[i], ea = Math.min(1, Math.max(S.nos[f.a].lab.energia, S.nos[f.b].lab.energia)); if (ea < 0.05) continue;
          ctx.strokeStyle = cor('255,220,106', 0.14 + 0.5 * ea); ctx.lineWidth = gr ? 1.9 : 1.3; ctx.beginPath(); tracar(ctx, f.pts); ctx.stroke();
        }
        ctx.lineWidth = 1;
        // as contas (genes da amostra)
        lGene.n = lRob.n = lDem.n = lNovo.n = 0; acesas.length = 0;
        var tc = gr ? 1.25 : 0.8;
        for (i = 0; i < S.nos.length; i++) {
          no = S.nos[i]; var am = no.lab.amostra;
          for (j = 0; j < am.length; j++) {
            var g = am[j], x = no.contas[j * 2], y = no.contas[j * 2 + 1], cls = classe(g), ac = aceso(g, agora, 200, E.calmo), s = tc * (cls === 0 ? 1.35 : 1) * (1 + 0.7 * ac);
            [lRob, lGene, lNovo, lDem][cls].por(x - s, y - s, s * 2, s * 2);
            if (ac > 0.05) acesas.push(x, y, ac, cls === 2 ? 1 : 0);
          }
        }
        lGene.rects(ctx, CORES[1]); lDem.rects(ctx, C.dem); lNovo.rects(ctx, C.novo); lRob.rects(ctx, C.rob);
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], gr ? 6 : 4, acesas[i + 2]);
        // os nos (o lab): acendem com o calculo; um anel quando a luz chega de um vizinho
        for (i = 0; i < S.nos.length; i++) {
          no = S.nos[i]; lab = no.lab; var e = Math.min(1, lab.energia), rn = (gr ? 3.4 : 1.9) * (0.75 + 0.35 * no.tam) + 1.6 * e;
          if (lab.pulso > 0.04) luz(ctx, lab.corPulso || C.flash, no.x, no.y, rn * 4, Math.min(1, lab.pulso));
          ctx.fillStyle = e > 0.05 ? '#fff3c4' : 'rgba(242,194,48,.85)'; ctx.beginPath(); ctx.arc(no.x, no.y, rn, 0, TAU); ctx.fill();
          var bri = S.brilho[i];
          if (bri) {
            var ub = (t - bri.t0) / 0.8;
            if (ub > 1 || ub < -1) delete S.brilho[i];
            else if (ub >= 0) { ctx.strokeStyle = bri.cor; ctx.globalAlpha = (1 - ub) * 0.8; ctx.beginPath(); ctx.arc(no.x, no.y, rn + 2 + ub * (gr ? 14 : 7), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
          }
        }
        // a luz a correr pelos fios (e pela raiz ate ao cogumelo)
        for (i = S.pulsos.length - 1; i >= 0; i--) {
          var pu = S.pulsos[i], cam = pu.raiz ? (S.nos[pu.de] && S.nos[pu.de].raiz) : S.fios[pu.f];
          if (!cam) { S.pulsos.splice(i, 1); continue; }
          var dur = clamp(cam.len / (gr ? 240 : 110), 0.45, 1.6), u = (t - pu.t0) / dur;
          if (u > 1.25 || u < -1) { S.pulsos.splice(i, 1); continue; }
          if (u < 0) continue;
          var ida = pu.raiz || cam.a === pu.de;
          if (u >= 1 && !pu.chegou) {
            pu.chegou = true;
            if (!pu.raiz) {
              var outro = cam.a === pu.de ? cam.b : cam.a;
              S.brilho[outro] = { t0: t, cor: pu.cor };
              if (!pu.salto && pu.forca > 0.4) S.nos[outro].fios.forEach(function (fi) { if (fi !== pu.f) S.pulsos.push({ f: fi, de: outro, t0: t, cor: pu.cor, forca: pu.forca * 0.6, salto: 1 }); });
            }
          }
          if (u > 1) continue;
          naPolilinha(cam.pts, cam.acc, ida ? u : 1 - u, P);
          luz(ctx, pu.cor, P[0], P[1], (gr ? 7 : 4) * (0.7 + 0.5 * pu.forca) * (pu.salto ? 0.75 : 1), pu.salto ? 0.55 : 0.95);
          naPolilinha(cam.pts, cam.acc, ida ? Math.max(0, u - 0.08) : Math.min(1, 1 - u + 0.08), P);
          luz(ctx, pu.cor, P[0], P[1], gr ? 4 : 2.5, 0.35);
        }
        if (S.pulsos.length > 160) S.pulsos.splice(0, S.pulsos.length - 160);
        // os cogumelos: brotam quando a luz chega pela raiz e ficam de pe enquanto o lab calcula (ultimos 3 min); o chapeu e maior
        // quanto mais robustos tem o lab
        var hMax = Math.max(4, S.y0 - (gr ? 30 : 8)), cwMax = Math.max(1.5, S.slot * 0.42);
        ctx.lineCap = 'round';
        for (i = 0; i < S.nos.length; i++) {
          no = S.nos[i]; lab = no.lab;
          var alvo = escalaLog(lab.g3, 60), cg = S.cog[lab.n];
          cg = cg == null || E.calmo ? alvo : dt > 0 ? seguir(cg, alvo, alvo > cg ? 1.6 : 0.22, dt) : cg;
          S.cog[lab.n] = cg;
          var sa = S.salto[lab.n], jump = 0;
          if (sa) { var dd = t - sa.t0; if (dd > 12 || dd < -4) delete S.salto[lab.n]; else if (dd > 0) jump = ease(dd / 0.6) * (0.45 + 0.45 * sa.forca) * Math.exp(-Math.max(0, dd - 0.6) / 6); }
          var c2 = Math.max(cg, jump), e2 = Math.min(1, lab.energia), x2 = no.mx, yb = S.y0;
          // proporcoes de cogumelo: o chapeu quase toca os vizinhos quando cresce e o pe nunca passa de ~4 chapeus de altura
          var cw = Math.max(gr ? 2 : 1.2, cwMax * (0.3 + 0.7 * c2) * (0.75 + 0.25 * lab.fr)), hs = (gr ? 3 : 1.5) + c2 * Math.min(hMax * 0.78, cwMax * 4.2), ch = cw * 0.72;
          ctx.strokeStyle = cor('255,236,190', 0.36 + 0.36 * c2); ctx.lineWidth = Math.max(0.9, cw * 0.42);
          ctx.beginPath(); ctx.moveTo(x2, yb); ctx.quadraticCurveTo(x2 + cw * 0.15, yb - hs * 0.5, x2, yb - hs); ctx.stroke();
          ctx.fillStyle = e2 > 0.05 ? cor(rgbDe(lab.corPulso || C.flash), 0.45 + 0.5 * e2) : cor('242,194,48', 0.3 + 0.45 * lab.fr + 0.2 * c2);
          ctx.beginPath(); ctx.moveTo(x2 - cw, yb - hs); ctx.quadraticCurveTo(x2 - cw * 0.92, yb - hs - ch * 1.3, x2, yb - hs - ch);
          ctx.quadraticCurveTo(x2 + cw * 0.92, yb - hs - ch * 1.3, x2 + cw, yb - hs); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,243,196,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x2 - cw * 0.85, yb - hs + 0.5); ctx.lineTo(x2 + cw * 0.85, yb - hs + 0.5); ctx.stroke();
          if (e2 > 0.1) luz(ctx, lab.corPulso || C.flash, x2, yb - hs - ch * 0.5, cw * 2.2, e2 * 0.6);
        }
        ctx.lineCap = 'butt'; ctx.lineWidth = 1;
        if (gr) {                                               // ampliado: os bairros, os andares a superficie e quem calcula
          var arr = new Arrumador();
          S.grupos.forEach(function (grp) {
            var nome = grp.nome.toUpperCase(), y3 = arr.tentar(ctx, nome, grp.x, S.yMax + 26, 9.5, 'center', 600, true, [0, -11]);
            if (y3 != null) escreverCabe(ctx, nome, grp.x, y3, 'rgba(242,194,48,.85)', 9.5, 'center', 600, true, 0, true);
          });
          S.nos.forEach(function (no2) { escrever(ctx, String(no2.lab.n), no2.mx, S.y0 + 12, no2.lab.energia > 0.08 || no2.lab.g3 > 0 ? C.ouroHi : C.dim, 8, 'center', 600, true); });
          S.nos.slice().sort(function (a, b) { return b.lab.energia - a.lab.energia; }).forEach(function (no2) {
            if (!(no2.lab.energia > 0.08)) return;
            var y4 = arr.tentar(ctx, no2.lab.curto, no2.x + 9, no2.y + 3, 10, 'left', 500, false, [0, -12, 12]);
            if (y4 != null) escreverCabe(ctx, no2.lab.curto, no2.x + 9, y4, C.ouroHi, 10, 'left', 500, false, 0, true);
          });
        }
      },
      aoEvento: function (r, E) {
        var i = S.idx[r.lab.n]; if (i == null || !S.nos[i]) return;
        if (E.calmo) return;                                     // sem movimento: o no acende e o cogumelo cresce pelo estado
        var c = corTipo(r.tipo), no = S.nos[i];
        no.fios.forEach(function (fi) { S.pulsos.push({ f: fi, de: i, t0: E.t, cor: c, forca: r.forca, salto: 0 }); });
        S.pulsos.push({ raiz: true, de: i, t0: E.t, cor: c, forca: r.forca, salto: 0 });
        S.salto[r.lab.n] = { t0: E.t + clamp(no.raiz.len / (S.grande ? 240 : 110), 0.45, 1.6), forca: r.forca };
      },
      quem: function (x, y) {
        if (y < S.y0 + 4) {
          for (var i = 0; i < S.nos.length; i++) if (Math.abs(x - S.nos[i].mx) <= S.slot / 2) return { lab: S.nos[i].lab, txt: 'o cogumelo: ' + fmtInt(S.nos[i].lab.g3) + ' genes nos últimos 3 min' };
          return null;
        }
        var no = maisPerto(S.nos, x, y, S.grande ? 20 : 13);
        return no ? { lab: no.lab, txt: no.fios.length + (no.fios.length === 1 ? ' fio' : ' fios') + ' na rede' } : null;
      },
      limpar: function () { S.pulsos = []; S.salto = {}; S.brilho = {}; }
    };
  });

  // ================================================================ 5. CORAL
  // A colonia vista de cima. Do disco do centro sai um BRACO FRACTAL por lab (em sectores por especialidade, e os bracos vizinhos
  // entrelacam-se como num coral de verdade); cada braco abre-se quatro vezes em dois (16 pontas) e cada ponta e um CACHO de
  // polipos: cada polipo e um gene da amostra (ouro = robusto, cinza = demitido, ciano = novo). Quando o lab calcula, uma ONDA de
  // luz corre do centro as pontas, os polipos dos genes que calcularam abrem e acendem, e o braco CRESCE com o que o lab calculou
  // na ultima hora. Os bracos ondulam devagar (agua).
  LM.registar(function () {
    // cinco niveis de garfos largos (como os chifres de um coral-veado); 16 pontas por braco, e cada ponta um cacho de ate 4 polipos
    var NIV = 5, NSEG = (1 << NIV) - 1, NPONTAS = 1 << (NIV - 1), ESP = [0, 0.5, 0.44, 0.4, 0.36], RAZ = 0.8;
    var CORES_NIV = ['#5a450d', '#6b520f', '#86680f', 'rgba(170,132,26,.92)', 'rgba(222,178,52,.85)'], LARG = [3.6, 2.7, 2.0, 1.45, 1.05];
    var CACHO = [[0.6, 0], [-0.2, 1.05], [-0.2, -1.05], [-1.1, 0]];   // o lugar de cada polipo no cacho (ao longo, ao lado da ponta)
    var S = { chave: '', bracos: [], porN: {}, setores: [], cx: 0, cy: 0, R: 1, r0: 1, grande: false, hora: { por: {}, max: 0 }, horaK: '', ondas: [], alt: {} };
    var lNiv = [], lPol = [new Lote(1800), new Lote(1800), new Lote(1800), new Lote(1800)], acesas = [];
    for (var q = 0; q < NIV; q++) lNiv.push(new Lote((1 << q) * 32 + 16));
    var cosD = new Float32Array(NIV), sinD = new Float32Array(NIV);
    // os vectores em repouso de cada segmento: o pe curto, garfos largos com um tremido, e o braco a enrolar um pouco para um lado
    // (como um coral de verdade); espK aperta os garfos para o braco nao invadir mais do que o vizinho
    function gerar(sem, ang, espK) {
      var rnd = aleatorio(sem), vx = new Float32Array(NSEG), vy = new Float32Array(NSEG), dir = new Float32Array(NSEG), enrola = (sem & 1 ? 1 : -1) * 0.07 * espK;
      for (var l = 0; l < NIV; l++) {
        var n = 1 << l, base = n - 1;
        for (var j = 0; j < n; j++) {
          var gi = base + j, d = l === 0 ? ang + (rnd() - 0.5) * 0.1 : dir[(n >> 1) - 1 + (j >> 1)] + (j & 1 ? 1 : -1) * ESP[l] * espK * (0.65 + 0.7 * rnd()) + enrola + (rnd() - 0.5) * 0.14 * espK;
          var len = (l === 0 ? 0.7 : Math.pow(RAZ, l)) * (0.82 + 0.36 * rnd());
          dir[gi] = d; vx[gi] = Math.cos(d) * len; vy[gi] = Math.sin(d) * len;
        }
      }
      return { vx: vx, vy: vy };
    }
    function posicoes(b, kk, out) {                             // as pontas de cada segmento, com a ondulacao (cosD/sinD por nivel)
      for (var l = 0; l < NIV; l++) {
        var n = 1 << l, base = n - 1, c = cosD[l], s = sinD[l];
        for (var j = 0; j < n; j++) {
          var gi = base + j, pg = (n >> 1) - 1 + (j >> 1), sx = l ? out[pg * 2] : b.bx, sy = l ? out[pg * 2 + 1] : b.by, vx = b.v.vx[gi] * kk, vy = b.v.vy[gi] * kk;
          out[gi * 2] = sx + vx * c - vy * s; out[gi * 2 + 1] = sy + vx * s + vy * c;
        }
      }
    }
    function arrumar(w, h, E) {
      var grande = w >= 560, pad = grande ? 46 : 5, N = E.labs.length, G = E.grupos.length, gap = 0.8, i, l;
      S.grande = grande; S.cx = w / 2; S.cy = h / 2;
      S.R = Math.max(8, Math.min(w, h) / 2 - pad); S.r0 = S.R * 0.13;
      var slots = N + G * gap, passo = TAU / Math.max(1, slots), a = -Math.PI / 2 + passo * gap / 2, maxT = 1;
      E.labs.forEach(function (lb) { if (lb.total > maxT) maxT = lb.total; });
      for (l = 0; l < NIV; l++) if (lNiv[l].cap < (1 << l) * (N + 2)) lNiv[l] = new Lote((1 << l) * (N + 8));
      S.bracos = []; S.porN = {}; S.setores = [];
      var r0u = 0.5, permitido = passo * 0.5 * 3.0, alcMax = 0.01;
      E.grupos.forEach(function (g) {
        var a0 = a;
        g.labs.forEach(function (lab) {
          var ang = a + passo / 2, sem = semente('coral ' + lab.n), v = gerar(sem, 0, 1), th = 0, alc = 0, px = 0, py = 0, tmp = { bx: 0, by: 0, v: v };
          for (l = 0; l < NIV; l++) { cosD[l] = 1; sinD[l] = 0; }
          var pos = new Float32Array(NSEG * 2);
          posicoes(tmp, 1, pos);
          for (i = (1 << (NIV - 1)) - 1; i < NSEG; i++) { px = pos[i * 2]; py = pos[i * 2 + 1]; th = Math.max(th, Math.abs(Math.atan2(py, r0u + px))); }
          var espK = th > 0 ? clamp(permitido / th, 0.25, 1.6) : 1;
          tmp.v = gerar(sem, 0, espK); posicoes(tmp, 1, pos);
          for (i = 0; i < NSEG; i++) alc = Math.max(alc, pos[i * 2]);
          alcMax = Math.max(alcMax, alc);
          var b = { lab: lab, ang: ang, v: gerar(sem, ang, espK), bx: S.cx + Math.cos(ang) * S.r0, by: S.cy + Math.sin(ang) * S.r0, pos: new Float32Array(NSEG * 2),
            fase: (sem % 628) / 100, tam: escalaLog(lab.total, maxT), kk: 1,
            // os genes pelas 16 pontas (por bits invertidos: os robustos, que vem primeiro, espalham-se pelo leque todo)
            ponta: lab.amostra.map(function (x, kx) { return NPONTAS - 1 + inverterBits(kx % NPONTAS, NIV - 1); }),
            cacho: lab.amostra.map(function (x, kx) { return Math.min(CACHO.length - 1, Math.floor(kx / NPONTAS)); }) };
          S.porN[lab.n] = S.bracos.length; S.bracos.push(b);
          a += passo;
        });
        S.setores.push({ nome: g.nome, a0: a0, a1: a });
        a += passo * gap;
      });
      S.L0 = (S.R - S.r0) / alcMax;
    }
    return {
      id: 'coral', nome: 'Coral',
      descricao: 'Uma colónia de coral vista de cima: cada braço fractal é um laboratório (em sectores por especialidade) e cada pólipo um gene da amostra (ouro = robustos, cinza = demitidos). Quando o lab calcula, uma onda de luz corre do centro às pontas, os pólipos abrem e o braço cresce com o que calculou na última hora.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, ref = E.relogio || agora, gr = S.grande, i, j, l, b, lab, n, base;
        var hk = E.histVer + '|' + Math.floor(ref / 2000) + '|' + E.versao;
        if (S.horaK !== hk) { S.hora = genesNaJanela(E, ref, HORA_MS); S.horaK = hk; }
        // o disco do centro (acende com a actividade de todos) e os sectores das especialidades
        var actT = escalaLog(E.act ? E.act.genes : 0, 200);
        luz(ctx, C.ouro, S.cx, S.cy, S.r0 * 2, 0.16 + 0.3 * actT);
        ctx.strokeStyle = 'rgba(242,194,48,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(S.cx, S.cy, S.r0 * 0.6, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(242,194,48,.4)'; ctx.lineWidth = gr ? 2.2 : 1.4; ctx.beginPath();
        S.setores.forEach(function (st) { var m = (st.a1 - st.a0) * 0.06; ctx.moveTo(S.cx + Math.cos(st.a0 + m) * S.r0 * 0.86, S.cy + Math.sin(st.a0 + m) * S.r0 * 0.86); ctx.arc(S.cx, S.cy, S.r0 * 0.86, st.a0 + m, st.a1 - m); });
        ctx.stroke(); ctx.lineWidth = 1;
        for (l = 0; l < NIV; l++) lNiv[l].n = 0;
        for (j = 0; j < 4; j++) lPol[j].n = 0;
        acesas.length = 0;
        var rp0 = gr ? 2.1 : 1.15, sp = gr ? 4 : 2.3;
        for (i = 0; i < S.bracos.length; i++) {
          b = S.bracos[i]; lab = b.lab;
          var e = Math.min(1, lab.energia), alvo = 0.48 + 0.2 * b.tam + 0.34 * escalaLog(S.hora.por[lab.n] || 0, 150), al = S.alt[lab.n];
          al = al == null || E.calmo ? alvo : dt > 0 ? seguir(al, alvo, alvo > al ? 2.2 : 0.4, dt) : al;
          S.alt[lab.n] = al; b.kk = S.L0 * al;
          var acc = 0;                                            // a ondulacao: cada nivel roda um pouco a volta da sua base (acumula)
          for (l = 0; l < NIV; l++) { acc += E.calmo ? 0 : (0.05 * Math.sin(t * 0.7 + b.fase + l * 0.55) + 0.09 * e * Math.sin(t * 5 + b.fase + l)) * (l / (NIV - 1)); cosD[l] = Math.cos(acc); sinD[l] = Math.sin(acc); }
          posicoes(b, b.kk, b.pos);
          for (l = 0; l < NIV; l++) {
            n = 1 << l; base = n - 1;
            for (j = 0; j < n; j++) { var gi = base + j, pg = (n >> 1) - 1 + (j >> 1); lNiv[l].por(l ? b.pos[pg * 2] : b.bx, l ? b.pos[pg * 2 + 1] : b.by, b.pos[gi * 2], b.pos[gi * 2 + 1]); }
          }
          var am = lab.amostra;
          for (j = 0; j < am.length; j++) {
            var tp = b.ponta[j], pp = ((tp + 1) >> 1) - 1, ex = b.pos[tp * 2], ey = b.pos[tp * 2 + 1], ux = ex - b.pos[pp * 2], uy = ey - b.pos[pp * 2 + 1], ul = Math.sqrt(ux * ux + uy * uy) || 1, o = CACHO[b.cacho[j]];
            ux /= ul; uy /= ul;
            var g = am[j], X = ex + (ux * o[0] - uy * o[1]) * sp, Y = ey + (uy * o[0] + ux * o[1]) * sp, cls = classe(g), ac = aceso(g, agora, 850, E.calmo);
            lPol[cls].por(X, Y, rp0 * (cls === 0 ? 1.3 : 1) * (1 + 0.9 * ac), 0);
            if (ac > 0.05) acesas.push(X, Y, ac, cls === 2 ? 1 : 0);
          }
        }
        for (l = 0; l < NIV; l++) lNiv[l].tracos(ctx, CORES_NIV[l], LARG[l] * (gr ? 1.8 : 1), 1);
        // os bracos dos labs a calcular, por cima e mais claros; e a onda do centro as pontas
        for (i = 0; i < S.bracos.length; i++) {
          b = S.bracos[i]; var e2 = Math.min(1, b.lab.energia); if (e2 < 0.05) continue;
          ctx.strokeStyle = cor('255,220,106', 0.18 + 0.55 * e2); ctx.lineWidth = gr ? 1.6 : 1; ctx.beginPath();
          for (j = 0; j < NSEG; j++) { var p2 = j ? ((j + 1) >> 1) - 1 : -1; ctx.moveTo(p2 < 0 ? b.bx : b.pos[p2 * 2], p2 < 0 ? b.by : b.pos[p2 * 2 + 1]); ctx.lineTo(b.pos[j * 2], b.pos[j * 2 + 1]); }
          ctx.stroke();
        }
        for (i = S.ondas.length - 1; i >= 0; i--) {
          var on = S.ondas[i], bo = S.bracos[on.b], u = (t - on.t0) / 0.95;
          if (!bo || bo.lab !== on.lab || u > 1.3 || u < -0.5) { S.ondas.splice(i, 1); continue; }
          if (u < 0) continue;
          for (l = 0; l < NIV; l++) {
            var inten = Math.max(0, 1 - Math.abs(u * NIV - (l + 0.5)) / 1.3) * (u > 1 ? (1.3 - u) / 0.3 : 1); if (inten < 0.03) continue;
            n = 1 << l; base = n - 1;
            ctx.strokeStyle = on.cor; ctx.globalAlpha = Math.min(1, inten); ctx.lineWidth = LARG[l] * (gr ? 1.8 : 1) + (gr ? 1.6 : 0.9); ctx.beginPath();
            for (j = 0; j < n; j++) { var gi2 = base + j, pg2 = (n >> 1) - 1 + (j >> 1); ctx.moveTo(l ? bo.pos[pg2 * 2] : bo.bx, l ? bo.pos[pg2 * 2 + 1] : bo.by); ctx.lineTo(bo.pos[gi2 * 2], bo.pos[gi2 * 2 + 1]); }
            ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.lineWidth = 1;
        }
        lPol[1].bolas(ctx, CORES[1]); lPol[3].bolas(ctx, C.dem); lPol[2].bolas(ctx, C.novo); lPol[0].bolas(ctx, C.rob);
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], gr ? 7 : 4.5, acesas[i + 2]);
        if (gr) {                                               // ampliado: as especialidades a volta e o nome de quem calcula
          var arr = new Arrumador();
          S.setores.forEach(function (st) {
            var am2 = (st.a0 + st.a1) / 2, x = S.cx + Math.cos(am2) * (S.R + 20), y = S.cy + Math.sin(am2) * (S.R + 20) + 3, al2 = Math.abs(Math.cos(am2)) < 0.25 ? 'center' : Math.cos(am2) > 0 ? 'left' : 'right';
            var nome = st.nome.toUpperCase(), y2 = arr.tentar(ctx, nome, x, y, 9.5, al2, 600, true, [0, 11, -11]);
            if (y2 != null) escreverCabe(ctx, nome, x, y2, 'rgba(242,194,48,.85)', 9.5, al2, 600, true, 0, true);
          });
          S.bracos.slice().sort(function (x1, x2) { return x2.lab.energia - x1.lab.energia; }).forEach(function (b2) {
            var hora = S.hora.por[b2.lab.n] || 0; if (!(b2.lab.energia > 0.08)) return;
            var gx = b2.bx, gy = b2.by, dm = -1;                  // a ponta mais longe do centro
            for (var tp = (1 << (NIV - 1)) - 1; tp < NSEG; tp++) { var ddx = b2.pos[tp * 2] - S.cx, ddy = b2.pos[tp * 2 + 1] - S.cy, d2 = ddx * ddx + ddy * ddy; if (d2 > dm) { dm = d2; gx = b2.pos[tp * 2]; gy = b2.pos[tp * 2 + 1]; } }
            var al3 = gx >= S.cx ? 'left' : 'right';
            var txt = b2.lab.curto + (hora ? ' · ' + fmtInt(hora) : ''), y3 = arr.tentar(ctx, txt, gx + (al3 === 'left' ? 8 : -8), gy + 3, 10, al3, 500, false, [0, -12, 12]);
            if (y3 != null) escreverCabe(ctx, txt, gx + (al3 === 'left' ? 8 : -8), y3, C.ouroHi, 10, al3, 500, false, 0, true);
          });
          escrever(ctx, 'braço maior = laboratório maior e com mais genes calculados na última hora', 14, h - 8, C.dim, 9.5, 'left', 500, true);
        }
      },
      aoEvento: function (r, E) {
        var i = S.porN[r.lab.n]; if (i == null) return;
        if (S.alt[r.lab.n] != null) S.alt[r.lab.n] = Math.min(1.12, S.alt[r.lab.n] + 0.03 + 0.04 * r.forca);
        if (!E.calmo) { S.ondas.push({ b: i, lab: r.lab, t0: E.t, cor: corTipo(r.tipo) }); if (S.ondas.length > 40) S.ondas.shift(); }
      },
      quem: function (x, y) {
        var dx = x - S.cx, dy = y - S.cy, d = Math.sqrt(dx * dx + dy * dy);
        if (!S.bracos.length || d < S.r0 * 0.5 || d > S.R * 1.08) return null;
        var a = Math.atan2(dy, dx), best = null, bd = Infinity;
        S.bracos.forEach(function (b) { var da = Math.abs(((a - b.ang) % TAU + TAU + Math.PI) % TAU - Math.PI); if (da < bd) { bd = da; best = b; } });
        return best ? { lab: best.lab, txt: fmtInt(S.hora.por[best.lab.n] || 0) + ' genes na última hora' } : null;
      },
      limpar: function () { S.ondas = []; }
    };
  });

  // ================================================================ 6. SATURNO
  // Um planeta com aneis, em 3D. Cada ANEL FINO e um lab (de dentro para fora pela ordem das especialidades, com divisoes entre
  // elas) e cada particula um gene da amostra: os robustos sao LUAS douradas (maiores, a balancar fora do plano), os demitidos po
  // cinzento, os novos ciano. Os aneis rodam como os de verdade (os de dentro mais depressa). Quando um lab calcula, o anel dele
  // acende e acelera, uma ONDA da-lhe a volta e os genes que calcularam brilham; a faixa da especialidade acende no planeta.
  LM.registar(function () {
    var S = { chave: '', an: [], cx: 0, cy: 0, Rp: 1, Ri: 1, Ro: 1, wr: 1, inc0: 0.42, si: 0.4, grande: false, fase: {}, ondas: [], planeta: null, planetaK: '' };
    var lotes = [], acesas = [];
    for (var q = 0; q < 8; q++) lotes.push(new Lote(1800));      // [tras | frente] x [robusto, gene, novo, demitido]
    function arrumar(w, h, E) {
      var grande = w >= 560, padX = grande ? 150 : 8, padY = grande ? 30 : 8, N = E.labs.length, G = E.grupos.length;
      S.grande = grande;
      S.inc0 = clamp(0.2 + 0.4 * (h / Math.max(1, w)), 0.34, 0.95);
      var si = Math.sin(S.inc0 + 0.04), RoK = 2.45;
      S.Rp = Math.max(4, Math.min((w - 2 * padX) / (2 * RoK), (h - 2 * padY) / (2 * Math.max(1, RoK * si))));
      S.Ri = S.Rp * 1.36; S.Ro = S.Rp * RoK; S.cx = w / 2; S.cy = h / 2;
      var gap = 0.7, unid = N + Math.max(0, G - 1) * gap, wr = (S.Ro - S.Ri) / Math.max(1, unid), r = S.Ri;
      S.wr = wr; S.an = [];
      E.grupos.forEach(function (g, gi) {
        if (gi) r += wr * gap;
        g.labs.forEach(function (lab) {
          var sem = semente('saturno ' + lab.n), rnd = aleatorio(sem), m = lab.amostra.length, gs = new Float32Array(Math.max(1, m) * 4);
          for (var k = 0; k < m; k++) { gs[k * 4] = (k + rnd() * 0.7) / Math.max(1, m) * TAU; gs[k * 4 + 1] = (rnd() - 0.5) * wr * 0.75; gs[k * 4 + 2] = (0.5 + 0.5 * rnd()) * Math.max(1.5, wr * 0.9); gs[k * 4 + 3] = rnd() * TAU; }
          S.an.push({ lab: lab, g: gi, r: r + wr / 2, genes: gs, om: Math.pow(S.Ri / (r + wr / 2), 1.5) });
          r += wr;
        });
      });
      S.planetaK = '';
    }
    function criarPlaneta(R, dpr, inc) {                         // o planeta e feito uma vez por tamanho (gradientes e riscas)
      var tam = Math.ceil((2 * R + 4) * dpr), c = novoCanvas(tam, tam), g = c ? c.getContext('2d') : null;
      if (!g || typeof g.createRadialGradient !== 'function') return null;
      var m = R + 2, si = Math.sin(inc), ci = Math.cos(inc);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save(); g.beginPath(); g.arc(m, m, R, 0, TAU); g.clip();
      var gr = g.createRadialGradient(m - R * 0.4, m - R * 0.45, R * 0.04, m, m, R * 1.08);
      gr.addColorStop(0, '#e2bd55'); gr.addColorStop(0.3, '#94730f'); gr.addColorStop(0.72, '#3a2d08'); gr.addColorStop(1, '#100c05');
      g.fillStyle = gr; g.fillRect(0, 0, 2 * m, 2 * m);
      g.lineWidth = Math.max(0.6, R * 0.014);
      for (var b = 1; b < 7; b++) {                              // as riscas de latitude, paralelas aos aneis (so a metade da frente)
        var lat = -1.05 + b * 0.3, yc = m - Math.sin(lat) * R * ci, rx = Math.max(0.1, Math.cos(lat) * R);
        g.strokeStyle = b % 2 ? 'rgba(8,8,10,.3)' : 'rgba(255,220,106,.13)'; g.beginPath(); g.ellipse(m, yc, rx, Math.max(0.1, rx * si), 0, 0, Math.PI); g.stroke();
      }
      var gn = g.createLinearGradient(m - R, m - R, m + R, m + R);
      gn.addColorStop(0.5, 'rgba(8,8,10,0)'); gn.addColorStop(1, 'rgba(8,8,10,.62)');
      g.fillStyle = gn; g.fillRect(0, 0, 2 * m, 2 * m);
      g.restore();
      g.strokeStyle = 'rgba(242,194,48,.42)'; g.lineWidth = 1; g.beginPath(); g.arc(m, m, Math.max(0.1, R - 0.5), 0, TAU); g.stroke();
      return c;
    }
    function zona(ctx, b, cx, cy, R, si, ci) {                  // a faixa de latitude b (0 = sul, 6 = norte), so a parte da frente
      var l1 = -1.05 + b * 0.3, l2 = l1 + 0.3, rx1 = Math.max(0.1, Math.cos(l1) * R), rx2 = Math.max(0.1, Math.cos(l2) * R);
      ctx.beginPath(); ctx.ellipse(cx, cy - Math.sin(l1) * R * ci, rx1, Math.max(0.1, rx1 * si), 0, 0, Math.PI);
      ctx.ellipse(cx, cy - Math.sin(l2) * R * ci, rx2, Math.max(0.1, rx2 * si), 0, Math.PI, 0, true); ctx.closePath();
    }
    function onda(ctx, on, lado, si) {                          // a onda que da a volta ao anel: parte de tras (0) ou da frente (1)
      var an = S.an[on.i], u = (on.u);
      if (!an) return;
      var th0 = Math.PI / 2 + u * 3.8, len = 1.0, aberto = false;
      ctx.strokeStyle = on.cor; ctx.globalAlpha = clamp(0.9 * (1 - u), 0, 1); ctx.lineWidth = (S.grande ? 2.6 : 1.5) * (0.7 + 0.5 * on.forca); ctx.beginPath();
      for (var s = 0; s <= 12; s++) {
        var th = th0 - len * s / 12, sn = Math.sin(th), X = S.cx + an.r * Math.cos(th), Y = S.cy + an.r * sn * si;
        if ((sn >= 0 ? 1 : 0) !== lado) { aberto = false; continue; }
        if (!aberto) { ctx.moveTo(X, Y); aberto = true; } else ctx.lineTo(X, Y);
      }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    return {
      id: 'saturno', nome: 'Saturno',
      descricao: 'Um planeta com anéis: cada anel fino é um laboratório (em faixas por especialidade) e cada partícula um gene da amostra; os robustos são luas douradas, os demitidos pó cinzento. Quando o lab calcula, o anel acende e acelera, uma onda dá-lhe a volta e os genes brilham; a faixa da especialidade acende no planeta.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, gr = S.grande, cx = S.cx, cy = S.cy, Rp = S.Rp, i, j;
        var inc = S.inc0 + (E.calmo ? 0 : 0.035 * Math.sin(t * 0.15)), si = Math.sin(inc), ci = Math.cos(inc);
        S.si = si;
        if (!E.calmo && dt > 0) for (i = 0; i < S.an.length; i++) { var a0 = S.an[i]; S.fase[a0.lab.n] = ((S.fase[a0.lab.n] || 0) + dt * 0.2 * a0.om * (1 + 1.4 * Math.min(1, a0.lab.energia))) % TAU; }
        for (j = 0; j < 8; j++) lotes[j].n = 0;
        acesas.length = 0;
        var tam = gr ? 1.7 : 1.05;
        for (i = 0; i < S.an.length; i++) {
          var an = S.an[i], lab = an.lab, am = lab.amostra, fa = S.fase[lab.n] || 0, e = Math.min(1, lab.energia);
          for (j = 0; j < am.length; j++) {
            var g = am[j], th = an.genes[j * 4] + fa, rr = an.r + an.genes[j * 4 + 1] * (1 + 0.6 * e), cls = classe(g), ac = aceso(g, agora, 250, E.calmo);
            var z = cls === 0 && !E.calmo ? an.genes[j * 4 + 2] * Math.sin(t * 1.2 + an.genes[j * 4 + 3]) : 0;
            var sn = Math.sin(th), X = cx + rr * Math.cos(th), Y = cy + rr * sn * si - z * ci, prof = rr * sn * ci + z * si;
            var lado = (cls === 0 ? tam * 1.7 : tam) * (1 + 0.8 * ac);
            lotes[(prof < 0 ? 0 : 4) + cls].por(X - lado, Y - lado, lado * 2, lado * 2);
            if (ac > 0.05 && !(prof < 0 && (X - cx) * (X - cx) + (Y - cy) * (Y - cy) < Rp * Rp)) acesas.push(X, Y, ac, cls === 2 ? 1 : 0);
          }
        }
        var ondas = [];
        for (i = S.ondas.length - 1; i >= 0; i--) {
          var on = S.ondas[i]; on.u = (t - on.t0) / 1.8;
          if (!S.an[on.i] || S.an[on.i].lab !== on.lab || on.u > 1 || on.u < -0.5) { S.ondas.splice(i, 1); continue; }
          if (on.u >= 0) ondas.push(on);
        }
        var aneis = function (lado) {                            // as linhas dos aneis: todas fracas, as de quem calcula acesas
          var a1 = lado ? 0 : Math.PI, a2 = lado ? Math.PI : TAU, x0 = lado ? 1 : -1;
          ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(242,194,48,.1)'; ctx.beginPath();
          for (var ii = 0; ii < S.an.length; ii++) { var r0 = S.an[ii].r; ctx.moveTo(cx + x0 * r0, cy); ctx.ellipse(cx, cy, r0, Math.max(0.1, r0 * si), 0, a1, a2); }
          ctx.stroke();
          for (ii = 0; ii < S.an.length; ii++) {
            var a3 = S.an[ii], e3 = Math.min(1, a3.lab.energia); if (e3 < 0.04) continue;
            ctx.strokeStyle = cor(rgbDe(a3.lab.corPulso || C.flash), 0.15 + 0.6 * e3); ctx.lineWidth = Math.max(1, S.wr * 0.7 * e3 + 0.6);
            ctx.beginPath(); ctx.moveTo(cx + x0 * a3.r, cy); ctx.ellipse(cx, cy, a3.r, Math.max(0.1, a3.r * si), 0, a1, a2); ctx.stroke();
          }
          ctx.lineWidth = 1;
          var off = lado ? 4 : 0, alfa = lado ? 1 : 0.62;
          lotes[off + 1].rects(ctx, CORES[1], alfa); lotes[off + 3].rects(ctx, C.dem, alfa); lotes[off + 2].rects(ctx, C.novo, alfa); lotes[off].rects(ctx, C.rob, alfa);
          ondas.forEach(function (o) { onda(ctx, o, lado, si); });
        };
        aneis(0);
        // o planeta (tapa a metade de tras dos aneis) e a faixa da especialidade que calcula
        var dpr = E.dpr || 1, pk = Math.round(Rp) + '@' + dpr + '@' + S.inc0.toFixed(2);
        if (S.planetaK !== pk) { S.planetaK = pk; S.planeta = criarPlaneta(Rp, dpr, S.inc0); }
        if (S.planeta) ctx.drawImage(S.planeta, cx - Rp - 2, cy - Rp - 2, 2 * Rp + 4, 2 * Rp + 4);
        else { ctx.fillStyle = '#5a450d'; ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.fill(); }
        var energiaG = {}, corG = {};
        S.an.forEach(function (a4) { var e4 = Math.min(1, a4.lab.energia); if (e4 > (energiaG[a4.g] || 0)) { energiaG[a4.g] = e4; corG[a4.g] = a4.lab.corPulso || C.flash; } });
        var nG = 0; S.an.forEach(function (a5) { nG = Math.max(nG, a5.g + 1); });
        Object.keys(energiaG).forEach(function (gk) {
          var eg = energiaG[gk]; if (eg < 0.05) return;
          var zb = clamp(6 - Math.round(Number(gk) * 6 / Math.max(1, nG - 1)), 0, 6);
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, TAU); ctx.clip();
          zona(ctx, zb, cx, cy, Rp, si, ci); ctx.globalAlpha = 0.16 + 0.34 * eg; ctx.fillStyle = corG[gk]; ctx.fill(); ctx.globalAlpha = 1;
          ctx.restore(); ctx._f = null;
        });
        aneis(1);
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], gr ? 7 : 4.5, acesas[i + 2]);
        if (gr) {                                               // ampliado: as especialidades no anel da direita e quem calcula a esquerda
          var arr = new Arrumador(), porG = {};
          S.an.forEach(function (a6) { var pg = porG[a6.g] || (porG[a6.g] = { r0: a6.r, r1: a6.r, nome: '' }); pg.r1 = a6.r; });
          E.grupos.forEach(function (g2, gi) { if (porG[gi]) porG[gi].nome = g2.nome; });
          Object.keys(porG).forEach(function (gk) {
            var pg = porG[gk], x = cx + (pg.r0 + pg.r1) / 2, nome = String(pg.nome).toUpperCase(), y = arr.tentar(ctx, nome, x, cy + S.wr * si + 16, 9, 'center', 600, true, [0, 11, 22]);
            if (y != null) escreverCabe(ctx, nome, x, y, 'rgba(242,194,48,.85)', 9, 'center', 600, true, 0, true);
          });
          var act = S.an.filter(function (a7) { return a7.lab.energia > 0.08; }).sort(function (x1, x2) { return x2.lab.energia - x1.lab.energia; }).slice(0, 8);
          act.forEach(function (a8, kk) {
            var y = cy - 4 + (kk - (act.length - 1) / 2) * 13, x = cx - S.Ro - 12;
            ctx.strokeStyle = cor(rgbDe(a8.lab.corPulso || C.flash), 0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y - 3); ctx.lineTo(cx - a8.r, cy); ctx.stroke();
            escreverCabe(ctx, a8.lab.curto, x, y, C.ouroHi, 10, 'right', 500, false, 0, true);
          });
          escrever(ctx, 'de dentro para fora: ' + E.grupos.map(function (g3) { return g3.nome; }).join(' · '), 14, h - 8, C.dim, 9.5, 'left', 500, true);
        }
      },
      aoEvento: function (r, E) {
        for (var i = 0; i < S.an.length; i++) if (S.an[i].lab === r.lab) {
          if (!E.calmo) { S.ondas.push({ i: i, lab: r.lab, t0: E.t, cor: corTipo(r.tipo), forca: r.forca, u: 0 }); if (S.ondas.length > 40) S.ondas.shift(); }
          return;
        }
      },
      quem: function (x, y) {
        var dx = x - S.cx, dy = y - S.cy, si = Math.max(0.05, S.si), best = null, bd = Infinity;
        if (dx * dx + dy * dy < S.Rp * S.Rp && dy < 0) return null;   // em cima do planeta (a parte que os aneis nao tapam)
        S.an.forEach(function (an) { var rho = Math.sqrt((dx / an.r) * (dx / an.r) + (dy / (an.r * si)) * (dy / (an.r * si))), d = Math.abs(rho - 1) * an.r; if (d < bd) { bd = d; best = an; } });
        return best && bd <= Math.max(5, S.wr * 1.5) ? { lab: best.lab, txt: 'anel ' + (S.an.indexOf(best) + 1) + ' de ' + S.an.length + ' (de dentro para fora)' } : null;
      },
      limpar: function () { S.ondas = []; }
    };
  });

  // ================================================================ 7. NEBULOSA ESPIRAL
  // Uma galaxia em espiral, em 3D, a rodar devagar e a balancar a inclinacao. Cada BRACO e uma especialidade e cada AGLOMERADO de
  // estrelas ao longo dele e um lab (o 1.o perto do nucleo, o ultimo na ponta); as estrelas sao os genes da amostra (douradas =
  // robustas, cinza = demitidas, ciano = novas). O po dos bracos e so o desenho dos bracos. Quando um lab calcula, o aglomerado
  // dele ACENDE numa explosao (um anel que se abre no plano do disco) e as estrelas que calcularam brilham; o nucleo acende com a
  // actividade de todos e, com mais actividade, a galaxia roda mais depressa.
  LM.registar(function () {
    var PASSO = 1.8;                                             // 1/tan(inclinacao do braco): ~210 graus de volta do nucleo a ponta
    var S = { chave: '', ag: [], porN: {}, bracos: [], gas: null, nGas: 0, R: 1, cx: 0, cy: 0, til0: 0.55, til: 0.55, grande: false, rot: 0.4, chamas: [] };
    var lotes = [], lGas = new Lote(1000), acesas = [];
    for (var q = 0; q < 12; q++) lotes.push(new Lote(1800));     // [robusto, gene, novo, demitido] x [longe, meio, perto]
    function angulo(th0, r) { return th0 + Math.log(Math.max(0.05, r) / 0.12) * PASSO; }
    function arrumar(w, h, E) {
      var grande = w >= 560, pad = grande ? 40 : 6, G = Math.max(1, E.grupos.length), i;
      S.grande = grande;
      S.til0 = clamp(0.32 + 0.38 * (h / Math.max(1, w)), 0.45, 1.25);
      var st = Math.sin(Math.min(1.45, S.til0 + 0.1));
      S.R = Math.max(6, Math.min((w - 2 * pad) / 2, (h - 2 * pad) / (2 * st + 0.1)));
      S.cx = w / 2; S.cy = h / 2; S.ag = []; S.porN = {}; S.bracos = [];
      E.grupos.forEach(function (g, gi) {
        var th0 = gi / G * TAU, m = g.labs.length;
        S.bracos.push({ nome: g.nome, th0: th0 });
        g.labs.forEach(function (lab, j) {
          var r = m > 1 ? 0.27 + 0.62 * j / (m - 1) : 0.52, th = angulo(th0, r), sem = semente('nebulosa ' + lab.n), rnd = aleatorio(sem), am = lab.amostra.length;
          var cx3 = r * Math.cos(th), cz3 = r * Math.sin(th), tx = Math.cos(th) - PASSO * Math.sin(th), tz = Math.sin(th) + PASSO * Math.cos(th), tl = Math.sqrt(tx * tx + tz * tz) || 1;
          tx /= tl; tz /= tl;
          var st3 = new Float32Array(Math.max(1, am) * 3);
          for (var k = 0; k < am; k++) {
            var a1 = gauss(rnd) * 0.055, a2 = gauss(rnd) * 0.026;
            st3[k * 3] = tx * a1 - tz * a2; st3[k * 3 + 1] = gauss(rnd) * 0.013; st3[k * 3 + 2] = tz * a1 + tx * a2;   // em volta do centro
          }
          S.porN[lab.n] = S.ag.length;
          S.ag.push({ lab: lab, g: gi, x: cx3, z: cz3, r: r, st: st3, sx: 0, sy: 0, prof: 0 });
        });
      });
      // o po dos bracos e o bojo do nucleo (estrutura do desenho, nao sao dados)
      var rnd2 = aleatorio(semente('nebulosa po')), porB = grande ? 150 : 85, nB = grande ? 130 : 80, pts = [];
      S.bracos.forEach(function (b) {
        for (i = 0; i < porB; i++) {
          var r2 = 0.1 + 0.92 * Math.pow(rnd2(), 0.8), th2 = angulo(b.th0, r2) + gauss(rnd2) * 0.06, sp = gauss(rnd2) * 0.025 * (0.6 + r2);
          pts.push(r2 * Math.cos(th2) - Math.sin(th2) * sp, gauss(rnd2) * 0.008, r2 * Math.sin(th2) + Math.cos(th2) * sp);
        }
      });
      for (i = 0; i < nB; i++) pts.push(gauss(rnd2) * 0.05, gauss(rnd2) * 0.03, gauss(rnd2) * 0.05);
      S.gas = new Float32Array(pts); S.nGas = pts.length / 3;
      if (lGas.cap < S.nGas) lGas = new Lote(S.nGas + 16);
    }
    return {
      id: 'nebulosa', nome: 'Nebulosa espiral',
      descricao: 'Uma galáxia em espiral vista em 3D: cada braço é uma especialidade e cada aglomerado de estrelas um laboratório; as estrelas são os genes da amostra (douradas = robustas, cinza = demitidas). Quando o lab calcula, o aglomerado acende numa explosão e as estrelas brilham; com mais actividade, a galáxia roda mais depressa.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, gr = S.grande, R = S.R, cx = S.cx, cy = S.cy, i, j, actT = clamp((E.energia || 0) / 3, 0, 1);
        if (!E.calmo && dt > 0) S.rot = (S.rot + dt * (0.05 + 0.16 * actT)) % TAU;
        var til = S.til0 + (E.calmo ? 0 : 0.1 * Math.sin(t * 0.06)), st = Math.sin(til), ct = Math.cos(til), cr = Math.cos(S.rot), sr = Math.sin(S.rot);
        S.til = til;
        // o nucleo: acende com os genes calculados por todos nos ultimos 3 min
        luz(ctx, C.ouro, cx, cy, R * 0.24, 0.2 + 0.32 * escalaLog(E.act ? E.act.genes : 0, 200));
        luz(ctx, '#ffe9a8', cx, cy, R * 0.07, 0.55);
        lGas.n = 0;
        var sg = gr ? 0.9 : 0.6;
        for (i = 0; i < S.nGas; i++) {
          var gx = S.gas[i * 3], gy = S.gas[i * 3 + 1], gz = S.gas[i * 3 + 2], x1 = gx * cr - gz * sr, z1 = gx * sr + gz * cr;
          lGas.por(cx + x1 * R - sg, cy + (z1 * st - gy * ct) * R - sg, sg * 2, sg * 2);
        }
        lGas.rects(ctx, 'rgba(242,194,48,.22)');
        for (j = 0; j < 12; j++) lotes[j].n = 0;
        acesas.length = 0;
        var base = gr ? 1.5 : 1, TAM = [0.6, 0.85, 1.15];
        for (i = 0; i < S.ag.length; i++) {
          var a = S.ag[i], lab = a.lab, e = Math.min(1, lab.energia), inch = E.calmo ? 1 : 1 + 0.2 * e, am = lab.amostra;
          var ax1 = a.x * cr - a.z * sr, az1 = a.x * sr + a.z * cr;
          a.sx = cx + ax1 * R; a.sy = cy + az1 * st * R; a.prof = az1 * ct;
          for (j = 0; j < am.length; j++) {
            var g = am[j], ox = a.x + a.st[j * 3] * inch, oy = a.st[j * 3 + 1] * inch, oz = a.z + a.st[j * 3 + 2] * inch;
            var x2 = ox * cr - oz * sr, z2 = ox * sr + oz * cr, X = cx + x2 * R, Y = cy + (z2 * st - oy * ct) * R, prof = z2 * ct + oy * st;
            var bin = prof < -0.25 ? 0 : prof < 0.25 ? 1 : 2, cls = classe(g), ac = aceso(g, agora, 350, E.calmo), s = base * TAM[bin] * (cls === 0 ? 1.35 : 1) * (1 + 0.7 * ac);
            lotes[cls * 3 + bin].por(X - s, Y - s, s * 2, s * 2);
            if (ac > 0.05) acesas.push(X, Y, ac, cls === 2 ? 1 : 0);
          }
        }
        var ALFA = [0.42, 0.7, 1];
        for (var bn = 0; bn < 3; bn++) { lotes[3 + bn].rects(ctx, CORES[1], ALFA[bn]); lotes[9 + bn].rects(ctx, C.dem, ALFA[bn]); lotes[6 + bn].rects(ctx, C.novo, ALFA[bn]); lotes[bn].rects(ctx, C.rob, ALFA[bn]); }
        // o aglomerado de quem calcula acende; a explosao abre um anel no plano do disco
        for (i = 0; i < S.ag.length; i++) { var a2 = S.ag[i], e2 = Math.min(1, a2.lab.energia), pu = a2.lab.pulso; if (e2 < 0.05 && pu < 0.03) continue; luz(ctx, a2.lab.corPulso || C.flash, a2.sx, a2.sy, R * 0.07 * (1 + e2), Math.min(1, 0.25 * e2 + 0.6 * pu)); }
        for (i = S.chamas.length - 1; i >= 0; i--) {
          var ch = S.chamas[i], a3 = S.ag[ch.i], u = (t - ch.t0) / 1.6;
          if (!a3 || a3.lab !== ch.lab || u > 1 || u < -0.5) { S.chamas.splice(i, 1); continue; }
          if (u < 0) continue;
          var rr = R * (0.015 + 0.09 * ease(u)) * (0.6 + 0.4 * ch.forca);
          ctx.strokeStyle = ch.cor; ctx.globalAlpha = 0.85 * (1 - u); ctx.lineWidth = gr ? 1.6 : 1;
          ctx.beginPath(); ctx.ellipse(a3.sx, a3.sy, Math.max(0.1, rr), Math.max(0.1, rr * st), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          luz(ctx, ch.cor, a3.sx, a3.sy, R * 0.035 * (1 + ch.forca), 1 - u);
        }
        ctx.lineWidth = 1;
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], gr ? 6.5 : 4.5, acesas[i + 2]);
        if (gr) {                                               // ampliado: o nome de cada braco na ponta e de quem calcula
          var arr = new Arrumador();
          S.ag.slice().sort(function (x1, x2) { return x2.lab.energia - x1.lab.energia; }).forEach(function (a4) {
            if (!(a4.lab.energia > 0.08)) return;
            var y = arr.tentar(ctx, a4.lab.curto, a4.sx + 10, a4.sy + 3, 10, 'left', 500, false, [0, -12, 12]);
            if (y != null) escreverCabe(ctx, a4.lab.curto, a4.sx + 10, y, C.ouroHi, 10, 'left', 500, false, 0, true);
          });
          S.bracos.forEach(function (b) {
            var th = angulo(b.th0, 1.02), bx = Math.cos(th), bz = Math.sin(th), x3 = bx * cr - bz * sr, z3 = bx * sr + bz * cr, X = cx + x3 * R, Y = cy + z3 * st * R;
            var nome = b.nome.toUpperCase(), al = X >= cx ? 'left' : 'right', y2 = arr.tentar(ctx, nome, X + (al === 'left' ? 6 : -6), Y + 3, 9.5, al, 600, true, [0, 11, -11]);
            if (y2 != null) escreverCabe(ctx, nome, X + (al === 'left' ? 6 : -6), y2, 'rgba(242,194,48,.8)', 9.5, al, 600, true, 0, true);
          });
          escrever(ctx, 'um braço por especialidade · o 1.º lab perto do núcleo, o último na ponta', 14, h - 8, C.dim, 9.5, 'left', 500, true);
        }
      },
      aoEvento: function (r, E) {
        var i = S.porN[r.lab.n]; if (i == null) return;
        if (!E.calmo) { S.chamas.push({ i: i, lab: r.lab, t0: E.t, cor: corTipo(r.tipo), forca: r.forca }); if (S.chamas.length > 40) S.chamas.shift(); }
      },
      quem: function (x, y) {
        var a = maisPerto(S.ag.map(function (b) { return { x: b.sx, y: b.sy, lab: b.lab }; }), x, y, S.grande ? 24 : 15);
        return a ? { lab: a.lab } : null;
      },
      limpar: function () { S.chamas = []; }
    };
  });

  // ================================================================ 8. BONSAI
  // Uma arvore em 3D, num vaso, a rodar devagar (os ramos de tras passam por tras do tronco). Cada RAMO GROSSO e uma especialidade
  // (a alturas e azimutes do angulo de ouro: nenhum tapa o outro) e na ponta de cada ramo fino ha uma ALMOFADA de folhas - um lab;
  // as folhas sao os genes da amostra (frutos dourados = robustos, cinza = demitidos, ciano = novos). Quando o lab calcula, a SEIVA
  // sobe do vaso pelo tronco e pelo ramo ate a almofada, as folhas acendem e a almofada incha; com mais actividade, roda mais depressa.
  LM.registar(function () {
    var S = { chave: '', tronco: [], membros: [], alm: [], porN: {}, U: 1, bx: 0, by: 0, grande: false, rot: 0.6, seiva: [], cr: 1, sr: 0 };
    var EL = 0.32, SE = Math.sin(EL), CE = Math.cos(EL), RP = 0.078;
    var lotes = [], acesas = [], P3 = [0, 0, 0], Q3 = [0, 0, 0];
    for (var q = 0; q < 8; q++) lotes.push(new Lote(1800));      // [tras | frente] x [robusto, gene, novo, demitido]
    function proj(x, y, z, cr, sr, out) {
      var x1 = x * cr + z * sr, z1 = -x * sr + z * cr, prof = z1 * CE + y * SE, f = 4 / (4 - prof);
      out[0] = S.bx + x1 * S.U * f; out[1] = S.by - (y * CE - z1 * SE) * S.U * f; out[2] = prof;
      return out;
    }
    function noCaminho(cam, s, out) {                           // o ponto 3D a fraccao s de um caminho [x,y,z,...] (comprimentos em acc)
      var n = cam.pts.length / 3, alvo = clamp(s, 0, 1) * cam.acc[n - 1], i = 1;
      while (i < n - 1 && cam.acc[i] < alvo) i++;
      var a = cam.acc[i - 1], b = cam.acc[i], qq = b > a ? (alvo - a) / (b - a) : 0;
      for (var c = 0; c < 3; c++) out[c] = cam.pts[(i - 1) * 3 + c] + (cam.pts[i * 3 + c] - cam.pts[(i - 1) * 3 + c]) * qq;
      return out;
    }
    function caminho(pts) { var n = pts.length / 3, acc = new Float32Array(Math.max(1, n)); for (var i = 1; i < n; i++) { var dx = pts[i * 3] - pts[i * 3 - 3], dy = pts[i * 3 + 1] - pts[i * 3 - 2], dz = pts[i * 3 + 2] - pts[i * 3 - 1]; acc[i] = acc[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz); } return { pts: pts, acc: acc }; }
    function arrumar(w, h, E) {
      var grande = w >= 560, pad = grande ? 34 : 6, G = Math.max(1, E.grupos.length), k, j;
      S.grande = grande;
      S.U = Math.max(6, Math.min((w - 2 * pad) / 1.25, (h - 2 * pad) / 0.94));
      S.bx = w / 2; S.by = Math.min(h - pad - 0.13 * S.U, h / 2 + 0.36 * S.U);   // ao centro na vertical (no telemovel ao alto)
      S.tronco = [];
      for (k = 0; k <= 6; k++) S.tronco.push([0.075 * Math.sin(k * 1.05 + 0.3) * (1 - k / 9), k * 0.075, 0.05 * Math.sin(k * 0.8 + 1.9)]);   // em S (moyogi)
      S.membros = []; S.alm = []; S.porN = {};
      var maxT = 1; E.labs.forEach(function (l) { if (l.total > maxT) maxT = l.total; });
      E.grupos.forEach(function (g, gi) {
        var f = gi / Math.max(1, G - 1), ki = 1 + Math.min(5, Math.round(f * 4.6)), b0 = S.tronco[ki], az = gi * 2.39996 + 0.5, dx = Math.cos(az), dz = Math.sin(az);
        var comp = 0.31 - 0.09 * f, sobe = 0.05 + 0.09 * f, pts = [b0[0], b0[1], b0[2]];
        for (var s = 1; s <= 3; s++) { var fs = s / 3; pts.push(b0[0] + dx * comp * fs, b0[1] + sobe * fs + 0.035 * Math.sin(fs * Math.PI), b0[2] + dz * comp * fs); }
        var mb = { g: gi, nome: g.nome, pts: pts, ki: ki, cam: caminho(pts), labs: [] };
        S.membros.push(mb);
        var m = g.labs.length;
        g.labs.forEach(function (lab, jj) {
          // os ramos finos em leque ao longo do ramo grosso (azimutes e alturas diferentes: as almofadas nao se empilham)
          var sem = semente('bonsai ' + lab.n), rnd = aleatorio(sem), sj = m > 1 ? 0.3 + 0.7 * jj / (m - 1) : 1;
          noCaminho(mb.cam, sj, Q3);
          var az2 = az + (m > 1 ? (jj / (m - 1) - 0.5) * Math.min(2.6, 0.62 * m) + (jj % 2 ? 0.25 : -0.25) : (rnd() - 0.5) * 0.3);
          var len = 0.1 + 0.05 * rnd() + (m > 3 ? 0.03 * (jj % 2) : 0), up = 0.03 + 0.045 * (jj % 3) + 0.02 * rnd();
          var ex = Q3[0] + Math.cos(az2) * len, ey = Q3[1] + up, ez = Q3[2] + Math.sin(az2) * len;
          var am = lab.amostra.length, fol = new Float32Array(Math.max(1, am) * 3);
          for (j = 0; j < am; j++) {                             // as folhas numa almofada em cupula (girassol: sem buracos nem montes)
            var rho = RP * Math.sqrt((j + 0.5) / Math.max(1, am)), ph = j * 2.39996 + sem % 7;
            fol[j * 3] = Math.cos(ph) * rho; fol[j * 3 + 1] = 0.034 * (1 - (rho / RP) * (rho / RP)) + (rnd() - 0.5) * 0.012; fol[j * 3 + 2] = Math.sin(ph) * rho;
          }
          // o caminho da seiva: o tronco ate ao ramo grosso, o ramo grosso ate ao ramo fino, o ramo fino ate a almofada
          var sv = [];
          for (k = 0; k <= ki; k++) sv.push(S.tronco[k][0], S.tronco[k][1], S.tronco[k][2]);
          for (k = 1; k <= 3 && k / 3 <= sj + 1e-6; k++) sv.push(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]);
          sv.push(Q3[0], Q3[1], Q3[2], ex, ey, ez, ex, ey + 0.03, ez);
          var al = { lab: lab, g: gi, a: [Q3[0], Q3[1], Q3[2]], b: [ex, ey, ez], c: [ex, ey + 0.03, ez], fol: fol, cam: caminho(new Float32Array(sv)), sx: 0, sy: 0, prof: 0, tam: escalaLog(lab.total, maxT) };
          S.porN[lab.n] = S.alm.length; S.alm.push(al); mb.labs.push(al);
        });
      });
    }
    return {
      id: 'bonsai', nome: 'Bonsai',
      descricao: 'Um bonsai em 3D a rodar devagar: cada ramo grosso é uma especialidade e cada almofada de folhas um laboratório; as folhas são os genes da amostra (frutos dourados = robustos, cinza = demitidos). Quando o lab calcula, a seiva sobe do vaso até à almofada, as folhas acendem e a almofada incha; com mais actividade, roda mais depressa.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var t = E.t, agora = E.agora || 0, gr = S.grande, U = S.U, i, j, actT = clamp((E.energia || 0) / 3, 0, 1);
        if (!E.calmo && dt > 0) S.rot = (S.rot + dt * (0.14 + 0.3 * actT)) % TAU;
        var cr = Math.cos(S.rot), sr = Math.sin(S.rot);
        S.cr = cr; S.sr = sr;
        // o vaso (nao roda: e redondo) e a terra
        var rx = 0.25 * U, ry = rx * SE, by = S.by;
        ctx.fillStyle = '#17140d'; ctx.beginPath(); ctx.moveTo(S.bx - rx, by); ctx.lineTo(S.bx - rx * 0.8, by + 0.1 * U); ctx.lineTo(S.bx + rx * 0.8, by + 0.1 * U); ctx.lineTo(S.bx + rx, by); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(242,194,48,.32)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#0d0b07'; ctx.beginPath(); ctx.ellipse(S.bx, by, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(242,194,48,.42)'; ctx.stroke();
        // as almofadas: posicao, profundidade e as folhas (atras do tronco primeiro)
        for (j = 0; j < 8; j++) lotes[j].n = 0;
        acesas.length = 0;
        var fundo = [], frente = [], tl = gr ? 1.5 : 0.95;
        for (i = 0; i < S.alm.length; i++) {
          var al = S.alm[i], lab = al.lab, e = Math.min(1, lab.energia), inch = E.calmo ? 1 : 1 + 0.18 * e, am = lab.amostra;
          proj(al.c[0], al.c[1], al.c[2], cr, sr, P3); al.sx = P3[0]; al.sy = P3[1]; al.prof = P3[2]; al.f = 4 / (4 - P3[2]);
          (al.prof < 0 ? fundo : frente).push(al);
          var off = al.prof < 0 ? 0 : 4;
          for (j = 0; j < am.length; j++) {
            var g = am[j], cls = classe(g), cresce = g.nasceu ? ease((agora - g.nasceu) / 900) : 1;
            proj(al.c[0] + al.fol[j * 3] * inch, al.c[1] + al.fol[j * 3 + 1] * inch, al.c[2] + al.fol[j * 3 + 2] * inch, cr, sr, P3);
            var ac = aceso(g, agora, 1150, E.calmo), s = tl * (4 / (4 - P3[2])) * (cls === 0 ? 1.45 : 1) * (1 + 0.7 * ac) * cresce;
            lotes[off + cls].por(P3[0] - s, P3[1] - s, s * 2, s * 2);
            if (ac > 0.05) acesas.push(P3[0], P3[1], ac, cls === 2 ? 1 : 0);
          }
        }
        var almofadas = function (lista, off, alfa) {
          if (!lista.length) return;
          ctx.fillStyle = alfa < 1 ? 'rgba(92,70,14,.32)' : 'rgba(126,98,16,.3)'; ctx.beginPath();
          lista.forEach(function (a) { var r = RP * U * a.f * (1 + 0.18 * Math.min(1, a.lab.energia)) * 1.12; ctx.moveTo(a.sx + r, a.sy); ctx.ellipse(a.sx, a.sy, Math.max(0.1, r), Math.max(0.1, r * (0.4 + 0.5 * SE)), 0, 0, TAU); });
          ctx.fill();
          lista.forEach(function (a) { var e3 = Math.min(1, a.lab.energia); if (e3 > 0.05) luz(ctx, a.lab.corPulso || C.flash, a.sx, a.sy, RP * U * a.f * 1.6, e3 * 0.45); });
          lotes[off + 1].rects(ctx, FOLHA, alfa); lotes[off + 3].rects(ctx, C.dem, alfa); lotes[off + 2].rects(ctx, C.novo, alfa); lotes[off].rects(ctx, C.rob, alfa);
        };
        var madeira = function (atras) {                          // os ramos (grossos e finos) de um dos lados do tronco
          ctx.lineCap = 'round';
          S.membros.forEach(function (mb) {
            var e4 = 0; mb.labs.forEach(function (a) { e4 = Math.max(e4, Math.min(1, a.lab.energia)); });
            var p = mb.pts, mid = proj(p[6], p[7], p[8], cr, sr, Q3)[2];
            if ((mid < 0) !== atras) return;
            ctx.strokeStyle = e4 > 0.05 ? cor('242,194,48', 0.45 + 0.4 * e4) : '#6b520f'; ctx.lineWidth = Math.max(1, U * 0.02); ctx.beginPath();
            for (var s = 0; s < 4; s++) { proj(p[s * 3], p[s * 3 + 1], p[s * 3 + 2], cr, sr, P3); if (s) ctx.lineTo(P3[0], P3[1]); else ctx.moveTo(P3[0], P3[1]); }
            ctx.stroke();
            mb.labs.forEach(function (a) {
              var e5 = Math.min(1, a.lab.energia);
              ctx.strokeStyle = e5 > 0.05 ? cor('255,220,106', 0.5 + 0.45 * e5) : '#7e6210'; ctx.lineWidth = Math.max(0.7, U * 0.009); ctx.beginPath();
              proj(a.a[0], a.a[1], a.a[2], cr, sr, P3); ctx.moveTo(P3[0], P3[1]); proj(a.b[0], a.b[1], a.b[2], cr, sr, P3); ctx.lineTo(P3[0], P3[1]); ctx.stroke();
            });
          });
          ctx.lineCap = 'butt';
        };
        almofadas(fundo, 0, 0.62);
        madeira(true);
        ctx.lineCap = 'round'; ctx.strokeStyle = '#5a450d';           // o tronco (do grosso ao fino)
        for (i = 0; i + 1 < S.tronco.length; i++) {
          var a0 = S.tronco[i], a1 = S.tronco[i + 1]; ctx.lineWidth = Math.max(1, U * (0.055 - 0.0065 * i)); ctx.beginPath();
          proj(a0[0], a0[1], a0[2], cr, sr, P3); ctx.moveTo(P3[0], P3[1]); proj(a1[0], a1[1], a1[2], cr, sr, P3); ctx.lineTo(P3[0], P3[1]); ctx.stroke();
        }
        ctx.lineCap = 'butt'; ctx.lineWidth = 1;
        madeira(false);
        almofadas(frente, 4, 1);
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], gr ? 6.5 : 4.5, acesas[i + 2]);
        // a seiva: do vaso a almofada (~1,1 s)
        for (i = S.seiva.length - 1; i >= 0; i--) {
          var sv = S.seiva[i], a2 = S.alm[S.porN[sv.n]], u = (t - sv.t0) / 1.1;
          if (!a2 || a2.lab.n !== sv.n || u > 1.35 || u < -0.3) { S.seiva.splice(i, 1); continue; }
          if (u < 0) continue;
          noCaminho(a2.cam, u, Q3); proj(Q3[0], Q3[1], Q3[2], cr, sr, P3);
          var fade = u > 1 ? (1.35 - u) / 0.35 : 1;
          luz(ctx, sv.cor, P3[0], P3[1], (gr ? 9 : 5) * (0.8 + 0.5 * sv.forca), 0.95 * fade);
          noCaminho(a2.cam, Math.max(0, u - 0.06), Q3); proj(Q3[0], Q3[1], Q3[2], cr, sr, P3);
          luz(ctx, sv.cor, P3[0], P3[1], gr ? 5 : 3, 0.4 * fade);
        }
        if (gr) {                                               // ampliado: quem calcula, e as especialidades dos ramos da frente
          var arr = new Arrumador();
          S.alm.slice().sort(function (x1, x2) { return x2.lab.energia - x1.lab.energia; }).forEach(function (a3) {
            if (!(a3.lab.energia > 0.08)) return;
            var y = arr.tentar(ctx, a3.lab.curto, a3.sx + RP * U * a3.f + 6, a3.sy + 3, 10, 'left', 500, false, [0, -12, 12]);
            if (y != null) escreverCabe(ctx, a3.lab.curto, a3.sx + RP * U * a3.f + 6, y, C.ouroHi, 10, 'left', 500, false, 0, true);
          });
          S.membros.forEach(function (mb) {
            var p = mb.pts; proj(p[9], p[10], p[11], cr, sr, P3); if (P3[2] < -0.05) return;
            var nome = mb.nome.toUpperCase(), al2 = P3[0] >= S.bx ? 'left' : 'right', x = P3[0] + (al2 === 'left' ? 1 : -1) * (RP * U + 8);
            var y2 = arr.tentar(ctx, nome, x, P3[1] + 16, 9, al2, 600, true, [0, 11, -11]);
            if (y2 != null) escreverCabe(ctx, nome, x, y2, 'rgba(242,194,48,.8)', 9, al2, 600, true, 0, true);
          });
          escrever(ctx, 'cada almofada é um laboratório · cada ramo grosso uma especialidade', 14, h - 8, C.dim, 9.5, 'left', 500, true);
        }
      },
      aoEvento: function (r, E) {
        if (S.porN[r.lab.n] == null) return;
        if (!E.calmo) { S.seiva.push({ n: r.lab.n, t0: E.t, cor: corTipo(r.tipo), forca: r.forca }); if (S.seiva.length > 40) S.seiva.shift(); }
      },
      quem: function (x, y) {
        var best = null;                                         // das almofadas debaixo do rato, a mais a frente
        S.alm.forEach(function (a) { var r = RP * S.U * (a.f || 1) * 1.35, dx = x - a.sx, dy = y - a.sy; if (dx * dx + dy * dy <= r * r && (!best || a.prof > best.prof)) best = a; });
        return best ? { lab: best.lab } : null;
      },
      limpar: function () { S.seiva = []; }
    };
  });

  var API2 = { novos: NOVOS, mostrar: MOSTRAR, marcas: MARCAS, aleatorio: aleatorio, genesNaJanela: genesNaJanela, escalaLog: escalaLog,
    aceso: aceso, repartir: repartir, passoPrimo: passoPrimo, inverterBits: inverterBits, gerarArvore: gerarArvore, naPolilinha: naPolilinha,
    acumular: acumular, ESPECIES: ESPECIES };
  if (typeof module !== 'undefined' && module && module.exports) module.exports = API2;
  if (raiz) raiz.LabModelos2 = API2;
  // a pagina (lab_modelos2.html, grelha com data-arranque="manual"): os dois aprovados primeiro, depois os seis novos
  if (typeof LM.arrancar === 'function') LM.arrancar({ modelos: MOSTRAR, marcas: MARCAS });
})(typeof window !== 'undefined' ? window : this);
