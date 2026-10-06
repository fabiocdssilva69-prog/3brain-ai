/* t3b_ws.js - UMA ligacao a Binance para a pagina inteira (Torre 3BRAIN, OBRA 4, 04/10/2026).
 *
 * PORQUE: a sonda (node sala/sonda_t3b.js) apanhou na consola, em 2 de 4 ecras,
 *   "WebSocket connection to 'wss://stream.binance.com:9443/stream?streams=...' failed: Ping received after close".
 * Esse erro e o browser a acusar o servidor da Binance: depois de uma ligacao FECHADA (aperto de mao do fecho feito), o
 * servidor ainda manda um "ping" e o Chrome escreve-o a vermelho - nenhum try/catch o apanha. Acontece sempre que alguem
 * FECHA uma ligacao: o reactor.js fecha e reabre a sua sempre que muda o conjunto de simbolos em carteira (logo ao abrir a
 * pagina, quando chega o primeiro torre.json), e o Livro de ofertas fechava a sua ao esconder o painel.
 * O CONSERTO: nao fechar. Ha uma so ligacao ao endpoint combinado (/stream) e o conjunto de fluxos muda por mensagens
 * SUBSCRIBE / UNSUBSCRIBE (o protocolo da Binance permite-o na mesma ligacao), sem nenhum fecho.
 *  - O reactor.js (partilhado com o predio.html, que nao se toca) continua a fazer "new WebSocket(...)" e "close()": esta
 *    pagina - e so esta - troca-lhe o WebSocket por uma FACHADA para os URLs /stream da Binance. A fachada tem a mesma cara
 *    (readyState, onopen, onmessage, onerror, onclose, close, send), recebe so os fluxos que pediu, e o seu close() apenas a
 *    desliga da ligacao verdadeira. Se a ligacao verdadeira cair (rede), a fachada recebe onerror/onclose como antes, e o
 *    reactor faz o que sempre fez (tenta de novo; a 3.a falha passa a perguntar de 5 em 5 s).
 *  - O Livro usa window.T3BBinance.assinar(fluxo, fn) / largar(fluxo).
 * Qualquer outro URL de WebSocket passa direito ao WebSocket do browser.
 */
(function () {
  'use strict';
  var Nativo = window.WebSocket;
  if (!Nativo) return;
  var BASE = 'wss://stream.binance.com:9443/stream?streams=';
  var RX = /^wss:\/\/stream\.binance\.com(?::9443)?\/stream\?streams=/;
  var real = null, noReal = [], pedido = 1, actual = null, extras = {}, falhasExtras = 0, reabrirT = null;

  function depois(fn) { setTimeout(fn, 0); }
  function disparar(f, nome, ev) { var h = f[nome]; if (typeof h === 'function') { try { h.call(f, ev); } catch (e) { setTimeout(function () { throw e; }); } } }
  function streamsDe(url) { var q = String(url).split('streams=')[1] || ''; try { q = decodeURIComponent(q); } catch (e) { } return q.split('/').filter(Boolean); }
  function quero() {
    var s = {};
    if (actual && actual.readyState < 2) actual._s.forEach(function (x) { s[x] = 1; });
    Object.keys(extras).forEach(function (x) { s[x] = 1; });
    return Object.keys(s);
  }
  // acerta os fluxos da ligacao aberta com os que se querem agora (so mensagens; nunca fecha)
  function ajustar() {
    if (!real || real.readyState !== 1) return;
    var q = quero();
    var sai = noReal.filter(function (x) { return q.indexOf(x) < 0; }), entra = q.filter(function (x) { return noReal.indexOf(x) < 0; });
    try {
      if (sai.length) real.send(JSON.stringify({ method: 'UNSUBSCRIBE', params: sai, id: pedido++ }));
      if (entra.length) real.send(JSON.stringify({ method: 'SUBSCRIBE', params: entra, id: pedido++ }));
    } catch (e) { }
    noReal = q;
    if (actual && actual.readyState === 0) { var f = actual; f.readyState = 1; depois(function () { if (f.readyState === 1) disparar(f, 'onopen', { type: 'open' }); }); }
  }
  function abrir() {
    var q = quero();
    if (!q.length || real) return;
    var w;
    try { w = new Nativo(BASE + q.join('/')); } catch (e) { falhar({ type: 'error' }); return; }
    real = w; noReal = q.slice();
    w.onopen = function () { if (real !== w) return; falhasExtras = 0; ajustar(); };
    // (dezenas de mensagens por segundo: o nome do fluxo tira-se do texto sem o ler todo - o JSON.parse inteiro so para os
    //  assinantes extra, 1 por segundo; o reactor le a mensagem dele como sempre leu)
    w.onmessage = function (ev) {
      if (real !== w) return;
      var s = typeof ev.data === 'string' ? ev.data : '', i = s.indexOf('"stream":"');
      if (i < 0 || i > 8) return;                          // as respostas {"result":null,"id":N} ficam aqui
      var j = s.indexOf('"', i + 10); if (j < 0) return;
      var fluxo = s.slice(i + 10, j);
      var fx = extras[fluxo];
      if (fx) { try { fx(JSON.parse(s).data); } catch (e) { } }
      var f = actual;
      if (f && f.readyState === 1 && f._s.indexOf(fluxo) >= 0) disparar(f, 'onmessage', { type: 'message', data: s });
    };
    w.onerror = function (ev) { if (real !== w) return; if (actual) disparar(actual, 'onerror', ev); };
    w.onclose = function (ev) { if (real !== w) return; real = null; noReal = []; falhar(ev); };
  }
  // a ligacao verdadeira caiu: a fachada fica a saber (o reactor decide), e os assinantes extra tentam de novo, com folga
  function falhar(ev) {
    var f = actual;
    if (f && f.readyState < 3) { f.readyState = 3; actual = null; depois(function () { disparar(f, 'onclose', ev || { type: 'close', code: 1006 }); }); }
    if (Object.keys(extras).length && falhasExtras < 6 && !reabrirT) {
      falhasExtras++;
      reabrirT = setTimeout(function () { reabrirT = null; if (!real) abrir(); }, 3000 * falhasExtras);
    }
  }

  function Fachada(url) {
    this.url = String(url); this.protocol = ''; this.extensions = ''; this.binaryType = 'blob'; this.bufferedAmount = 0;
    this.readyState = 0; this.onopen = this.onmessage = this.onerror = this.onclose = null; this._s = streamsDe(url);
    if (actual && actual !== this && actual.readyState < 2) actual.close();
    actual = this;
    if (real && real.readyState === 1) ajustar(); else if (!real) abrir();      // a ligar: o onopen dela faz o ajuste
  }
  Fachada.CONNECTING = 0; Fachada.OPEN = 1; Fachada.CLOSING = 2; Fachada.CLOSED = 3;
  Fachada.prototype.send = function () { };                                       // o reactor nunca escreve
  Fachada.prototype.addEventListener = function (tipo, fn) { var k = 'on' + tipo, ant = this[k]; this[k] = function (ev) { if (ant) ant.call(this, ev); fn.call(this, ev); }; };
  Fachada.prototype.removeEventListener = function () { };
  Fachada.prototype.close = function () {
    if (this.readyState >= 2) return;
    var f = this; f.readyState = 2;
    if (actual === f) actual = null;
    depois(function () { ajustar(); });                                            // larga os fluxos dela (se ninguem os quiser)
    depois(function () { f.readyState = 3; disparar(f, 'onclose', { type: 'close', code: 1000, wasClean: true }); });
  };

  function WS(url, protocolos) {
    if (RX.test(String(url))) return new Fachada(url);
    return protocolos === undefined ? new Nativo(url) : new Nativo(url, protocolos);
  }
  WS.prototype = Nativo.prototype; WS.CONNECTING = 0; WS.OPEN = 1; WS.CLOSING = 2; WS.CLOSED = 3;
  window.WebSocket = WS;

  window.T3BBinance = {
    // fluxo como a Binance o escreve: 'btcusdt@depth10@1000ms'. fn recebe o "data" de cada mensagem.
    assinar: function (fluxo, fn) { extras[fluxo] = fn; if (real && real.readyState === 1) ajustar(); else if (!real) abrir(); },
    largar: function (fluxo) { if (!extras[fluxo]) return; delete extras[fluxo]; ajustar(); },
    estado: function () { return { ligada: !!(real && real.readyState === 1), fluxos: noReal.slice(), reactor: actual ? actual._s.length : 0, extras: Object.keys(extras) }; }
  };
})();
