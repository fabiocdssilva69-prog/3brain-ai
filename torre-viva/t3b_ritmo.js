/* t3b_ritmo.js - UM relogio de quadros para a pagina inteira (Torre 3BRAIN, OBRA 4, 04/10/2026).
 *
 * PORQUE (medido com a sonda, 1536x690@1,25, placa Intel Iris Xe): a pagina tem 4 ciclos (o 3D, os hologramas, os numeros
 * a rolar e o mostrador do reactor.js) e cada um pedia um quadro ao browser A CADA vsync (60 por segundo no ecra dele, 120
 * na sonda), mesmo quando nao tinha nada para desenhar. Cada pedido obriga o browser a fazer um quadro inteiro do fio
 * principal: estilos de todas as animacoes CSS, verificacoes, envio ao compositor - e isso, 60 vezes por segundo, era a maior
 * parte do CPU da aba "parada". Experiencia (mesma pagina, mesmo minuto): os 4 ciclos num so relogio de 30 Hz desceram o
 * fio principal de 38% para 24%; a 20 Hz para 12% (e o Chrome inteiro de 199% para 85% de um nucleo).
 * O QUE FAZ: requestAnimationFrame passa a juntar os pedidos de todos e a servi-los num so quadro, ao ritmo de T3BRitmo.hz
 * (20 Hz na torre, 30 com bonecos a andar no escritorio - decide o t3b_torre.js). Enquanto ele mexe (rato, roda, teclas,
 * toque) ou a camara/gaveta anima, os quadros voltam a ser os do ecra (T3BRitmo.soltar) - leve parado, fluido a mexer
 * (preferencia p01 dele). Com a aba escondida nada corre (o browser ja nao da quadros a uma aba escondida).
 * T3BRitmo.nativo e o requestAnimationFrame verdadeiro (a sonda mede com ele a fluidez da pagina).
 * Carrega ANTES de todos os outros scripts da pagina (o reactor.js partilhado com o predio.html nao sabe disto e nao muda).
 */
(function () {
  'use strict';
  if (!window.requestAnimationFrame || window.T3BRitmo) return;
  var N = window.requestAnimationFrame.bind(window);
  var fila = [], seq = 0, temporizador = null, pedido = 0, ultimo = 0;
  var R = window.T3BRitmo = {
    hz: 30,                 // 13/10 (ele: "pode fazer os ajustes pra aliviar"; a 05/10 tinha pedido 60): 30 parado (medido: -37% de CPU)
    mexerHz: 45,            // 13/10: a mexer (rato, roda, camara) ate 45 q/s - antes eram TODOS os do ecra, e era a mexer que travava
    // 10/10 (ele: "melhora o desempenho dessa maquina ou deixa a torre mais fluida porque ta travando DEMAIS o computador";
    // medido as 15:3x: a aba da torre ~2,2 nucleos e a placa integrada a pintar 60 q/s enquanto ele usava o VS Code ao lado):
    // com a janela SEM FOCO a pagina inteira anda a semFocoHz - continua viva no canto do olho, mas larga o CPU e a placa para
    // o programa que ele esta a usar. Com foco (ou ele a mexer nela) volta aos 60 na hora. ?foco=sempre desliga isto (sondas).
    semFocoHz: 20,
    foco: true,
    // 10/10 (ele: "ta muito travado ainda o computador e a torre tambem"): quando ESTA maquina nao aguenta os 60 (os quadros
    // chegam a mais de 22 ms em media, ou o trabalho de cada um passa de 14 ms, durante 3 s) a pagina assenta nos 30: 30 certos
    // sao mais fluidos do que 60 aos solavancos. Com folga (trabalho < 7 ms durante esperaSubir) volta a tentar os 60; se cair
    // outra vez em menos de 15 s, espera o dobro (ate 8 min). Ele a mexer tem sempre os quadros do ecra. ?ritmo=fixo desliga.
    tecto: 60,
    msMedio: 0,
    efectivo: function () { var h = R.foco ? R.hz : Math.min(R.hz, R.semFocoHz); return Math.min(h, R.tecto || 60); },
    ate: 0,                 // ate quando os quadros sao os do ecra (performance.now())
    quadros: 0,             // quadros servidos (para a sonda)
    nativo: N,
    soltar: function (ms) { var a = performance.now() + (ms || 900); if (a > R.ate) R.ate = a; if (temporizador) { clearTimeout(temporizador); temporizador = null; } agendar(); },
    livre: function () { return performance.now() < R.ate; }
  };
  var FIXO = typeof location !== 'undefined' && /[?&](ritmo=fixo|foco=sempre)/.test(location.search || '');
  var tsAnt = 0, intMedio = 16.7, pesadoDesde = 0, leveDesde = 0, subiuEm = 0, esperaSubir = 30000;
  function adaptar(ts, ms) {
    var agora = performance.now(), iv = tsAnt ? ts - tsAnt : 0; tsAnt = ts;
    R.msMedio = R.msMedio * 0.92 + ms * 0.08;
    if (FIXO || R.livre() || !R.foco || !(iv > 0 && iv < 250)) { pesadoDesde = 0; return; }   // so mede a pagina parada e com foco
    if (R.tecto > 30) {
      intMedio = intMedio * 0.92 + iv * 0.08;
      if (intMedio > 22 || R.msMedio > 14) {
        if (!pesadoDesde) pesadoDesde = agora;
        else if (agora - pesadoDesde > 3000) { R.tecto = 30; pesadoDesde = 0; leveDesde = 0; if (subiuEm && agora - subiuEm < 15000) esperaSubir = Math.min(480000, esperaSubir * 2); }   // (so conta se ja tinha subido)
      } else pesadoDesde = 0;
    } else if (R.tecto > 20 && Math.min(R.hz, 30) >= 30) {
      // 13/10: o degrau 30 -> 20 - a 30 q/s ainda pesado (quadros a mais de 45 ms ou trabalho de mais de 25 ms durante 3 s)
      intMedio = intMedio * 0.92 + iv * 0.08;
      if (intMedio > 45 || R.msMedio > 25) {
        if (!pesadoDesde) pesadoDesde = agora;
        else if (agora - pesadoDesde > 3000) { R.tecto = 20; pesadoDesde = 0; leveDesde = 0; }
      } else {
        pesadoDesde = 0;
        if (R.msMedio < 7 && R.hz > 30) {               // so volta aos 60 quem pediu 60 (hz); com hz 30 fica nos 30
          if (!leveDesde) leveDesde = agora;
          else if (agora - leveDesde > esperaSubir) { R.tecto = 60; leveDesde = 0; subiuEm = agora; intMedio = 16.7; }
        } else leveDesde = 0;
      }
    } else if (R.msMedio < 7) {
      if (!leveDesde) leveDesde = agora;
      else if (agora - leveDesde > esperaSubir) { R.tecto = R.tecto < 30 ? 30 : 60; leveDesde = 0; subiuEm = agora; intMedio = 33; }
    } else leveDesde = 0;
  }
  function correr(ts) {
    pedido = 0; ultimo = performance.now(); R.quadros++;
    var f = fila, t0 = ultimo; fila = [];
    for (var i = 0; i < f.length; i++) { try { f[i].cb(ts); } catch (e) { (function (x) { setTimeout(function () { throw x; }); })(e); } }
    adaptar(ts, performance.now() - t0);
  }
  function agendar() {
    if (pedido || temporizador || !fila.length) return;
    var hz = R.efectivo();
    if (R.livre()) hz = Math.min(R.mexerHz || 45, R.tecto || 60);    // 13/10: a mexer tambem tem tecto
    if (hz >= 55) { pedido = N(correr); return; }     // a 60 q/s, direito ao ecra: um temporizador pelo meio falhava quadros (soluco)
    var espera = 1000 / Math.max(1, hz) - (performance.now() - ultimo) - 3;
    if (espera <= 0) { pedido = N(correr); return; }
    temporizador = setTimeout(function () { temporizador = null; if (!pedido && fila.length) pedido = N(correr); }, espera);
  }
  window.requestAnimationFrame = function (cb) { var id = ++seq; fila.push({ id: id, cb: cb }); agendar(); return id; };
  var cancelarN = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null;
  window.cancelAnimationFrame = function (id) {
    for (var i = 0; i < fila.length; i++) if (fila[i].id === id) { fila.splice(i, 1); return; }
    if (cancelarN) try { cancelarN(id); } catch (e) { }
  };
  // ele a mexer: quadros do ecra ja (sem esperar pelo proximo tique), e ainda um pouco depois de largar
  function mexe(ev) { if (ev.type === 'pointermove' && !ev.buttons) return; R.soltar(ev.type === 'wheel' ? 700 : 900); }
  ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'touchstart', 'touchmove'].forEach(function (k) {
    window.addEventListener(k, mexe, { passive: true, capture: true });
  });
  // 10/10: o foco da janela (o blur/focus falham as vezes - alt-tab rapido, outro monitor - e por isso confere-se de 2 em 2 s)
  var SEMPRE = typeof location !== 'undefined' && /[?&]foco=sempre/.test(location.search || '');
  function poeFoco(f) { if (SEMPRE) f = true; if (f === R.foco) return; R.foco = f; if (f) R.soltar(300); }
  function verFoco() { var f = true; try { f = !document.hasFocus || document.hasFocus(); } catch (e) { f = true; } poeFoco(f); }
  window.addEventListener('focus', function () { poeFoco(true); });
  window.addEventListener('blur', function () { poeFoco(false); });
  setInterval(verFoco, 2000);
  verFoco();
})();
