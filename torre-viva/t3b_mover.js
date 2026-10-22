// t3b_mover.js - OS HOLOGRAMAS TROCAM DE LUGAR E MUDAM DE TAMANHO (07/10/2026; refeito a 21/10/2026 22h50).
// Ordem dele (05/10): "todos os cards menos vortex, shield, coracao e chat poder mover (arrastar trocando de lugar)".
// 21/10 22h50 (ele: "nao estamos a conseguir movimenta-los; so podem ir para o lugar de outro holograma - substituir um pelo outro; a
// linha a torre desaparece enquanto se move e volta no lugar novo; quando mexemos no tamanho a animacao de dentro tem de crescer"):
//   * TROCAR: carregar no TITULO e arrastar (rato ou dedo; o arrastar nativo do navegador falhava) ate ao lugar de OUTRO holograma e
//     largar - trocam os dois; largar noutro sitio nao faz nada. Enquanto se arrasta as linhas para a torre escondem-se;
//   * TAMANHO: a pega no canto de baixo muda a ALTURA do holograma e a LARGURA da sua coluna (o desenho de dentro escala com o cartao:
//     t3b_holo.js, escalaDoHolo); duplo clique na pega repoe;
//   * fica guardado NESTE navegador (localStorage, com try/catch).
(function () {
  'use strict';
  var CHAVE = 't3b_trocas_cartoes_v1', CHAVE_TAM = 't3b_tamanhos_v1', MAX = 40;
  function ler(k, omissao) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? omissao : v; } catch (e) { return omissao; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem memoria: nao faz mal */ } }
  function avisar() { setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30); }
  function trocar(a, b) {
    if (!a || !b || a === b) return false;
    var marca = document.createElement('i');
    a.parentNode.insertBefore(marca, a);
    b.parentNode.insertBefore(a, b);
    marca.parentNode.insertBefore(b, marca);
    marca.parentNode.removeChild(marca);
    avisar();                                                     // as linhas e as camadas medem de novo
    return true;
  }
  function varDaColuna(col) { return col && col.classList.contains('perto') ? '--perto-w' : '--col-w'; }
  function aplicarTamanhos() {
    var d = ler(CHAVE_TAM, {});
    Object.keys(d.cartoes || {}).forEach(function (id) { var c = document.getElementById(id), v = d.cartoes[id]; if (c && v && v.h) { c.dataset.min = v.h; c.dataset.max = v.h; c.dataset.peso = '1'; } });
    Object.keys(d.vars || {}).forEach(function (k) { if (d.vars[k]) document.documentElement.style.setProperty(k, d.vars[k] + 'px'); });
  }
  function ligarArrasto(ht, c) {
    ht.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      var x0 = ev.clientX, y0 = ev.clientY, fantasma = null, alvo = null, ativo = false;
      try { ht.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
      function mexer(e2) {
        if (!ativo && Math.abs(e2.clientX - x0) + Math.abs(e2.clientY - y0) < 6) return;
        if (!ativo) {
          ativo = true; document.body.classList.add('a-arrastar-holo'); c.classList.add('a-mover');
          fantasma = document.createElement('div'); fantasma.className = 'holo-fantasma'; fantasma.textContent = (ht.textContent || c.id).trim(); document.body.appendChild(fantasma);
        }
        fantasma.style.transform = 'translate(' + (e2.clientX + 12) + 'px,' + (e2.clientY + 10) + 'px)';
        var sob = null, els = document.elementsFromPoint ? document.elementsFromPoint(e2.clientX, e2.clientY) : [];
        for (var i = 0; i < els.length && !sob; i++) { var hh = els[i].closest ? els[i].closest('.holo[id]') : null; if (hh && hh !== c) sob = hh; }
        if (sob !== alvo) { if (alvo) alvo.classList.remove('alvo-mover'); alvo = sob; if (alvo) alvo.classList.add('alvo-mover'); }
      }
      function largar() {
        ht.removeEventListener('pointermove', mexer); ht.removeEventListener('pointerup', largar); ht.removeEventListener('pointercancel', largar);
        if (fantasma && fantasma.parentNode) fantasma.parentNode.removeChild(fantasma);
        document.body.classList.remove('a-arrastar-holo'); c.classList.remove('a-mover');
        if (alvo) { alvo.classList.remove('alvo-mover'); if (trocar(c, alvo)) { var l = ler(CHAVE, []); l.push([c.id, alvo.id]); gravar(CHAVE, l.slice(-MAX)); } }
        avisar();
      }
      ht.addEventListener('pointermove', mexer); ht.addEventListener('pointerup', largar); ht.addEventListener('pointercancel', largar);
    });
  }
  function ligarTamanho(g, c) {
    g.addEventListener('pointerdown', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      var col = c.parentNode, r = c.getBoundingClientRect(), cr = col.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY;
      var esq = col.classList.contains('esq'), nomeVar = varDaColuna(col);
      try { g.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
      function mexer(e2) {
        var hN = Math.max(90, Math.min(720, r.height + (e2.clientY - y0))), dx = e2.clientX - x0;
        var wN = Math.max(180, Math.min(560, cr.width + (esq ? dx : -dx)));
        c.dataset.min = Math.round(hN); c.dataset.max = Math.round(hN); c.dataset.peso = '1';
        document.documentElement.style.setProperty(nomeVar, Math.round(wN) + 'px');
        window.dispatchEvent(new Event('resize'));
      }
      function largar() {
        g.removeEventListener('pointermove', mexer); g.removeEventListener('pointerup', largar); g.removeEventListener('pointercancel', largar);
        var d = ler(CHAVE_TAM, {}); d.cartoes = d.cartoes || {}; d.vars = d.vars || {};
        d.cartoes[c.id] = { h: Number(c.dataset.min) }; d.vars[nomeVar] = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nomeVar)) || null;
        gravar(CHAVE_TAM, d);
      }
      g.addEventListener('pointermove', mexer); g.addEventListener('pointerup', largar); g.addEventListener('pointercancel', largar);
    });
    g.addEventListener('dblclick', function (ev) {
      ev.stopPropagation();
      var d = ler(CHAVE_TAM, {}); if (d.cartoes) delete d.cartoes[c.id]; if (d.vars) delete d.vars[varDaColuna(c.parentNode)]; gravar(CHAVE_TAM, d);
      location.reload();
    });
  }
  function preparar() {
    var cartoes = Array.prototype.slice.call(document.querySelectorAll('.holo[id]'));
    if (!cartoes.length) return;
    ler(CHAVE, []).forEach(function (t) { trocar(document.getElementById(t[0]), document.getElementById(t[1])); });
    aplicarTamanhos();
    try { localStorage.removeItem('t3b_cartoes_soltos_v1'); } catch (e) { /* o modo solto de 21/10 22h40 saiu: ele quer so trocar */ }
    cartoes.forEach(function (c) {
      var ht = c.querySelector('.ht');
      if (ht) { ht.removeAttribute('draggable'); ht.title = 'arrasta ate ao lugar de outro holograma para trocarem'; ligarArrasto(ht, c); }
      var g = c.querySelector(':scope > .redim');
      if (!g) { g = document.createElement('i'); g.className = 'redim'; c.appendChild(g); }
      g.title = 'arrasta para mudar o tamanho (duplo clique repoe)'; ligarTamanho(g, c);
    });
    avisar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(preparar, 400); });
  else setTimeout(preparar, 400);
  window.__t3bMover = { trocar: trocar, ler: ler };
})();
