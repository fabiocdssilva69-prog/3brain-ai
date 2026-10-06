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
    hz: 60,                 // 05/10 (Q4 D1, ele: "sempre vivos e suaves, 60 q/s"): era 20 - o "fotograma" da pagina inteira
    ate: 0,                 // ate quando os quadros sao os do ecra (performance.now())
    quadros: 0,             // quadros servidos (para a sonda)
    nativo: N,
    soltar: function (ms) { var a = performance.now() + (ms || 900); if (a > R.ate) R.ate = a; if (temporizador) { clearTimeout(temporizador); temporizador = null; } agendar(); },
    livre: function () { return performance.now() < R.ate; }
  };
  function correr(ts) {
    pedido = 0; ultimo = performance.now(); R.quadros++;
    var f = fila; fila = [];
    for (var i = 0; i < f.length; i++) { try { f[i].cb(ts); } catch (e) { (function (x) { setTimeout(function () { throw x; }); })(e); } }
  }
  function agendar() {
    if (pedido || temporizador || !fila.length) return;
    if (R.livre() || R.hz >= 55) { pedido = N(correr); return; }   // a 60 q/s, direito ao ecra: um temporizador pelo meio falhava quadros (soluco)
    var espera = 1000 / Math.max(1, R.hz) - (performance.now() - ultimo) - 3;
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
})();
