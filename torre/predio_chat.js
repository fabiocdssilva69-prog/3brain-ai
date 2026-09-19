// predio_chat.js — a coluna "Leituras" como CHAT dos funcionarios da torre (v6, 18/09/2026).
// Ordem dele: "aquele 'Leituras' tem que ser igual um chat com os funcionarios lancando essas informacoes e
// conversando entre si com dados bem relevantes".
// Le sala/conversa.json (escrito por mercado/conversa.py, servido em /conversa.json) a cada 15 s e insere no topo
// de #leituras as mensagens que ainda nao mostrou. NAO toca em predio.js: as linhas de evento que ele escreve
// (escreverNaColuna) ficam no mesmo contentor; as nossas levam a classe .chat-msg e distinguem-se a olho.
// Nada e inventado aqui: texto, numeros, autor e tipo vem do JSON; quando falta, escreve-se "sem dado".
(function () {
  'use strict';
  var URL_CONVERSA = 'conversa.json', CADA_MS = 5000, MAX_DOM = 40, BRILHO_MS = 1300;
  var ETIQUETA = { mercado: 'MERCADO', lucro: 'LUCRO', perda: 'PERDA', director: 'DIRECTOR', contratacao: 'CONTRATACAO',
    inauguracao: 'INAUGURACAO', lab: 'LAB', risco: 'RISCO', resposta: 'RESPOSTA' };
  var vistos = {};            // id -> true: o que ja esta (ou esteve) no DOM
  var titulos = {};           // id -> titulo do autor, para "responde a <titulo>" mesmo quando a mae saiu do DOM
  var ultimoKn = '';          // o texto que ESTE ficheiro escreveu em #lei_kn (predio.js tambem escreve la)
  var estado = { corridas: 0, falhas: 0, ultimaT: null, mensagensJson: 0, autoresJson: 0, inseridas: 0, porTipo: {}, vazio: false };
  var temporizador = null;

  function $(id) { return document.getElementById(id); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function semDado(v) { return v == null || v === '' ? 'sem dado' : String(v); }
  function corDoAndar(n) { var h = ((Number(n) || 0) * 47) % 360; return 'hsl(' + h + ', 62%, 62%)'; }   // a mesma formula do predio.js
  function semente(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }

  // Busto: a mesma assinatura do predio.js (nome, cor, feminino). Se a torre ja expoe o dela em window.__predio,
  // usa-se essa (as caras ficam iguais nos cartoes e no chat); senao, este busto simples, deterministico pelo nome.
  function bustoProprio(nome, cor, feminino) {
    var h = semente(nome), peles = ['#f1c9a5', '#d9a679', '#b97a56', '#8d5a3b', '#f6d7bf', '#6b4128'];
    var cabelos = ['#1a1a1f', '#3b2416', '#7a4b2a', '#c9922b', '#d8d3c8', '#5b2a1e', '#2b2f55'];
    var pele = peles[h % peles.length], cab = cabelos[(h >> 3) % cabelos.length];
    cor = cor || '#5ac8fa';
    var cabelo = feminino ? '<path d="M14 30 C12 12 52 12 50 30 L50 44 C46 40 44 34 42 26 C36 30 26 30 22 24 C20 32 18 40 14 44 Z" fill="' + cab + '"/>'
      : '<path d="M17 27 C18 14 46 14 47 27 L45 24 C38 19 26 19 19 24 Z" fill="' + cab + '"/>';
    return '<svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">' +
      '<rect x="1" y="1" width="62" height="62" rx="10" fill="#0d141d" stroke="' + cor + '" stroke-opacity=".7" stroke-width="1.5"/>' +
      '<path d="M8 64 C8 50 20 46 32 46 C44 46 56 50 56 64 Z" fill="' + cor + '" fill-opacity=".85"/>' +
      '<ellipse cx="32" cy="30" rx="12" ry="14" fill="' + pele + '"/>' + cabelo +
      '<rect x="20" y="27" width="24" height="5" rx="2.5" fill="' + cor + '" fill-opacity=".9"/>' +
      '</svg>';
  }
  function busto(nome, cor, feminino) {
    var P = window.__predio;
    if (P && typeof P.avatarSVG === 'function') { try { var s = P.avatarSVG(nome, cor, feminino); if (s && s.indexOf('<svg') >= 0) return s; } catch (e) { } }
    return bustoProprio(nome, cor, feminino);
  }

  // Os numeros do texto passam a mono e a cor: um numero com sinal escrito (+0,84%, -1,10 US$) leva a cor do
  // proprio sinal; os outros levam o sinal da mensagem (valor_usd, senao pct). Sem sinal nenhum: mono neutro.
  var RE_NUM = /([+\-−]?\d[\d.]*(?:,\d+)?(?:\s?(?:%|US\$|p\.p\.))?)/g;
  function sinalDaMensagem(m) {
    var v = m.valor_usd != null ? Number(m.valor_usd) : (m.pct != null ? Number(m.pct) : NaN);
    return isNaN(v) ? 0 : (v > 0 ? 1 : v < 0 ? -1 : 0);
  }
  function colorir(texto, sinal) {
    var partes = String(texto == null ? '' : texto).split(RE_NUM), out = '';
    for (var i = 0; i < partes.length; i++) {
      var p = partes[i];
      if (i % 2 === 0) { out += escH(p); continue; }
      var s = p.charAt(0) === '+' ? 1 : (p.charAt(0) === '-' || p.charAt(0) === '−') ? -1 : sinal;
      out += '<span class="num' + (s > 0 ? ' up' : s < 0 ? ' dn' : '') + '">' + escH(p) + '</span>';
    }
    return out;
  }

  function construir(m) {
    var a = m.autor || {}, tipo = String(m.tipo || 'mercado'), etq = ETIQUETA[tipo] || tipo.toUpperCase();
    var cor = corDoAndar(a.andar), titulo = semDado(a.titulo || a.heroi || a.id);
    var el = document.createElement('div');
    el.className = 'chat-msg tipo-' + tipo.replace(/[^a-z_]/g, '') + (m.responde_a ? ' resposta' : '') + ' nova';
    el.setAttribute('data-id', String(m.id || '')); el.setAttribute('data-tipo', tipo); el.setAttribute('data-titulo', titulo);
    var sub = [a.heroi, a.sector, a.andar != null ? 'andar ' + a.andar : null].filter(function (x) { return x != null && x !== ''; });
    var html = '<span class="avatar" style="--c:' + cor + '">' + busto(a.heroi || titulo, cor, !!a.feminino) + '</span>' +
      '<div class="corpo">' +
      '<div class="cab"><b class="nome">' + escH(titulo) + '</b><i class="hora">' + escH(semDado(m.t_brt).slice(0, 5)) + '</i><u class="etq">' + escH(etq) + '</u></div>' +
      '<div class="sub">' + escH(sub.length ? sub.join(' · ') : 'sem dado') + '</div>';
    if (m.responde_a) html += '<div class="resp">↳ responde a ' + escH(titulos[m.responde_a] || 'sem dado') + '</div>';
    html += '<div class="txt">' + colorir(m.texto, sinalDaMensagem(m)) + '</div></div>';
    el.innerHTML = html;
    if (window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(function () { el.classList.remove('nova'); }, BRILHO_MS);
    else el.classList.remove('nova');
    return el;
  }

  function tirarVazio(cx) { var v = cx.querySelector('.chat-vazio'); if (v) cx.removeChild(v); }
  function porVazio(cx) {
    if (cx.querySelector('.chat-msg') || cx.querySelector('.chat-vazio')) return;
    var el = document.createElement('div'); el.className = 'chat-vazio'; el.textContent = 'sem conversa ainda';
    cx.insertBefore(el, cx.firstChild); estado.vazio = true;
  }
  function podar(cx) {
    var ms = cx.querySelectorAll('.chat-msg');
    for (var i = ms.length - 1; i >= MAX_DOM; i--) ms[i].parentNode.removeChild(ms[i]);
  }
  // #lei_kn e partilhado com predio.js ("N evento(s)"); aqui manda o chat, e o observador reescreve se o outro
  // passar por cima. O guarda (texto == ultimoKn) impede o laco observador -> escrita -> observador.
  function escreverKn() {
    var kn = $('lei_kn'); if (!kn) return;
    var t = estado.mensagensJson ? (estado.mensagensJson + ' mensagens · ' + estado.autoresJson + ' funcionários a falar') : 'sem conversa ainda';
    ultimoKn = t; if (kn.textContent !== t) kn.textContent = t;
  }
  function vigiarKn() {
    var kn = $('lei_kn'); if (!kn || !window.MutationObserver) return;
    new MutationObserver(function () { if (ultimoKn && kn.textContent !== ultimoKn) kn.textContent = ultimoKn; })
      .observe(kn, { childList: true, characterData: true, subtree: true });
  }

  function aplicar(d) {
    var cx = $('leituras'); if (!cx) return;
    var lista = (d && Array.isArray(d.mensagens)) ? d.mensagens : [];
    var autores = {};
    lista.forEach(function (m) { if (m && m.id) titulos[m.id] = (m.autor && (m.autor.titulo || m.autor.heroi)) || 'sem dado'; if (m && m.autor && m.autor.id) autores[m.autor.id] = 1; });
    estado.mensagensJson = lista.length; estado.autoresJson = Object.keys(autores).length; estado.ultimaT = d && d.t_brt ? d.t_brt : null;
    if (!lista.length) { porVazio(cx); escreverKn(); return; }
    tirarVazio(cx); estado.vazio = false;
    // O JSON vem mais recente primeiro; inserir no topo exige andar da mais antiga para a mais nova.
    for (var i = lista.length - 1; i >= 0; i--) {
      var m = lista[i]; if (!m || !m.id || vistos[m.id]) continue;
      vistos[m.id] = true;
      var el = construir(m), mae = m.responde_a ? cx.querySelector('.chat-msg[data-id="' + String(m.responde_a).replace(/"/g, '') + '"]') : null;
      if (mae) cx.insertBefore(el, mae.nextSibling);   // a resposta fica colada a mae, indentada
      else cx.insertBefore(el, cx.firstChild);
      // 19/09: quem quiser saber que um funcionario acabou de falar ouve este evento - e assim que os
      // cartoes acendem sem o chat saber que os cartoes existem.
      try { window.dispatchEvent(new CustomEvent('torre:mensagem', { detail: m })); } catch (e) { }
      estado.inseridas++; estado.porTipo[m.tipo] = (estado.porTipo[m.tipo] || 0) + 1;
    }
    podar(cx); escreverKn();
  }

  function ler() {
    estado.corridas++;
    var p;
    try { p = fetch(URL_CONVERSA + '?t=' + Date.now(), { cache: 'no-store' }); } catch (e) { p = Promise.reject(e); }
    return p.then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { aplicar(d); return true; })
      .catch(function () { estado.falhas++; var cx = $('leituras'); if (cx) { porVazio(cx); escreverKn(); } return false; });
  }
  function arrancar() {
    vigiarKn();
    ler();
    temporizador = setInterval(ler, CADA_MS);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();

  window.__chat = {
    contagem: function () {
      var cx = $('leituras'), ms = cx ? cx.querySelectorAll('.chat-msg') : [], porTipo = {}, comSvg = 0, comNome = 0, respostas = 0;
      for (var i = 0; i < ms.length; i++) {
        var t = ms[i].getAttribute('data-tipo'); porTipo[t] = (porTipo[t] || 0) + 1;
        if (ms[i].querySelector('.avatar svg')) comSvg++;
        var n = ms[i].querySelector('.nome'); if (n && n.textContent.trim()) comNome++;
        if (ms[i].classList.contains('resposta')) respostas++;
      }
      return { noDom: ms.length, comSvg: comSvg, comNome: comNome, respostas: respostas, porTipo: porTipo, maxDom: MAX_DOM,
        vazio: !!(cx && cx.querySelector('.chat-vazio')), kn: $('lei_kn') ? $('lei_kn').textContent : '', corridas: estado.corridas, falhas: estado.falhas,
        mensagensJson: estado.mensagensJson, autoresJson: estado.autoresJson, ultimaT: estado.ultimaT, cadaMs: CADA_MS, avatarDaTorre: !!(window.__predio && typeof window.__predio.avatarSVG === 'function') };
    },
    ler: ler,
    colorir: colorir, sinalDaMensagem: sinalDaMensagem
  };
})();
