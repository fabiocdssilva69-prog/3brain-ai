// t3b_mover.js - OS CARTOES MUDAM DE LUGAR (07/10/2026, questionario 5, C1: "sim").
// Ordem dele (05/10): "todos os cards menos vortex, shield, coracao e chat poder mover (arrastar trocando de lugar, linhas refeitas)".
// Arrastar um cartao pelo TITULO e larga-lo em cima de outro troca os dois de lugar. So os .holo mexem (o vortex, a S.H.I.E.L.D.,
// o coracao e o chat nao sao .holo: ficam fixos). Depois da troca as ligacoes refazem-se (um 'resize'). As trocas ficam
// guardadas NESTE navegador (localStorage, com try/catch: num modo privado simplesmente nao se lembra) e repetem-se ao abrir.
(function () {
  'use strict';
  var CHAVE = 't3b_trocas_cartoes_v1', MAX = 40;
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || '[]') || []; } catch (e) { return []; } }
  function gravar(l) { try { localStorage.setItem(CHAVE, JSON.stringify(l.slice(-MAX))); } catch (e) { /* sem memoria: nao faz mal */ } }
  function trocar(a, b) {
    if (!a || !b || a === b) return false;
    var marca = document.createElement('i');
    a.parentNode.insertBefore(marca, a);
    b.parentNode.insertBefore(a, b);
    marca.parentNode.insertBefore(b, marca);
    marca.parentNode.removeChild(marca);
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 40);   // as linhas e as camadas medem de novo
    return true;
  }
  function preparar() {
    var cartoes = Array.prototype.slice.call(document.querySelectorAll('.holo[id]'));
    if (!cartoes.length) return;
    ler().forEach(function (t) { trocar(document.getElementById(t[0]), document.getElementById(t[1])); });
    var aArrastar = null;
    cartoes.forEach(function (c) {
      var ht = c.querySelector('.ht');
      if (ht) {
        ht.setAttribute('draggable', 'true'); ht.title = 'arrasta para trocar este cartao de lugar';
        ht.addEventListener('dragstart', function (ev) {
          aArrastar = c; c.classList.add('a-mover');
          try { ev.dataTransfer.setData('text/plain', c.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* */ }
        });
        ht.addEventListener('dragend', function () { if (aArrastar) aArrastar.classList.remove('a-mover'); aArrastar = null;
          cartoes.forEach(function (o) { o.classList.remove('alvo-mover'); }); });
      }
      c.addEventListener('dragover', function (ev) { if (aArrastar && aArrastar !== c) { ev.preventDefault(); c.classList.add('alvo-mover'); } });
      c.addEventListener('dragleave', function () { c.classList.remove('alvo-mover'); });
      c.addEventListener('drop', function (ev) {
        ev.preventDefault(); c.classList.remove('alvo-mover');
        if (aArrastar && aArrastar !== c && trocar(aArrastar, c)) { var l = ler(); l.push([aArrastar.id, c.id]); gravar(l); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparar); else preparar();

})();

// 21/10 22h40 (ele: "um jeito de escolher o tamanho dos cards dos hologramas e movimenta-los na tela; as informacoes de dentro
// redefinem-se conforme aumenta ou diminui; controlar o tamanho e posicionar onde a gente quer"):
//   * largar o cartao (arrastado pelo TITULO) num sitio VAZIO do palco -> fica SOLTO nesse lugar (largar em cima de outro continua a trocar);
//   * a pega no canto de baixo a direita muda o TAMANHO (o canvas mede-se sozinho pelo ResizeObserver e o desenho refaz-se ao tamanho
//     novo: o livro mostra mais niveis, o equalizador alarga as bandas, os tubos crescem);
//   * o botao (volta) devolve o cartao a sua coluna; posicao e tamanho ficam NESTE navegador (localStorage, com try/catch).
(function () {
  'use strict';
  var CHAVE = 't3b_cartoes_soltos_v1', MIN_W = 170, MIN_H = 96;
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch (e) { return {}; } }
  function gravar(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* sem memoria: nao faz mal */ } }
  function palco() { return document.getElementById('palco'); }
  function avisar() { setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30); }
  function limites(p, x, y, w, h) {
    var r = p.getBoundingClientRect();
    w = Math.max(MIN_W, Math.min(w, r.width - 8)); h = Math.max(MIN_H, Math.min(h, r.height - 8));
    return { x: Math.max(4, Math.min(x, r.width - w - 4)), y: Math.max(4, Math.min(y, r.height - h - 4)), w: w, h: h };
  }
  function soltar(c, x, y, w, h, guardar) {
    var p = palco(); if (!p || !c) return;
    if (!c.classList.contains('solto')) {
      c.dataset.casa = (c.parentNode && c.parentNode.className) || '';
      p.appendChild(c); c.classList.add('solto');
    }
    var L = limites(p, x, y, w, h);
    c.style.left = L.x + 'px'; c.style.top = L.y + 'px'; c.style.width = L.w + 'px'; c.style.height = L.h + 'px';
    if (guardar !== false) { var d = ler(); d[c.id] = L; gravar(d); }
    avisar();
  }
  function voltar(c) {
    var p = palco(); if (!p || !c || !c.classList.contains('solto')) return;
    var cls = String(c.dataset.casa || '').trim().split(/\s+/).filter(Boolean).join('.');
    var col = (cls && p.querySelector('.' + cls)) || p.querySelector('.holos.perto') || p.querySelector('.holos');
    if (col) col.appendChild(c);
    c.classList.remove('solto'); c.style.left = ''; c.style.top = ''; c.style.width = ''; c.style.height = '';
    var d = ler(); delete d[c.id]; gravar(d);
    avisar();
  }
  function preparar() {
    var p = palco(); if (!p) return;
    var cartoes = Array.prototype.slice.call(document.querySelectorAll('.holo[id]'));
    if (!cartoes.length) return;
    cartoes.forEach(function (c) {
      if (!c.querySelector(':scope > .redim')) {
        var g = document.createElement('i'); g.className = 'redim'; g.title = 'arrasta para mudar o tamanho'; c.appendChild(g);
        g.addEventListener('pointerdown', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          var pr = p.getBoundingClientRect(), cr = c.getBoundingClientRect(), x0 = ev.clientX, y0 = ev.clientY;
          var bx = cr.left - pr.left, by = cr.top - pr.top, bw = cr.width, bh = cr.height;
          if (!c.classList.contains('solto')) soltar(c, bx, by, bw, bh, false);
          try { g.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
          function mexer(e2) { soltar(c, bx, by, bw + (e2.clientX - x0), bh + (e2.clientY - y0), false); }
          function largar(e3) { g.removeEventListener('pointermove', mexer); g.removeEventListener('pointerup', largar); mexer(e3); soltar(c, parseFloat(c.style.left), parseFloat(c.style.top), parseFloat(c.style.width), parseFloat(c.style.height), true); }
          g.addEventListener('pointermove', mexer); g.addEventListener('pointerup', largar);
        });
      }
      if (!c.querySelector(':scope > .volta')) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'volta'; b.textContent = '⟲'; b.title = 'devolver este cartao a sua coluna';
        b.addEventListener('click', function (ev) { ev.stopPropagation(); voltar(c); });
        c.appendChild(b);
      }
    });
    // largar num sitio vazio do palco: o cartao fica la (o 'drop' em cima de outro cartao continua a ser a troca, acima)
    var arrastado = null, dx = 0, dy = 0;
    cartoes.forEach(function (c) {
      var ht = c.querySelector('.ht'); if (!ht) return;
      ht.addEventListener('dragstart', function (ev) { var r = c.getBoundingClientRect(); arrastado = c; dx = ev.clientX - r.left; dy = ev.clientY - r.top; });
      ht.addEventListener('dragend', function () { setTimeout(function () { arrastado = null; }, 0); });
      ht.title = 'arrasta: larga em cima de outro cartao para trocar, ou num sitio vazio para o deixar la';
    });
    p.addEventListener('dragover', function (ev) { if (arrastado) ev.preventDefault(); });
    p.addEventListener('drop', function (ev) {
      if (!arrastado || (ev.target.closest && ev.target.closest('.holo'))) return;
      ev.preventDefault();
      var pr = p.getBoundingClientRect(), cr = arrastado.getBoundingClientRect();
      soltar(arrastado, ev.clientX - pr.left - dx, ev.clientY - pr.top - dy, cr.width, cr.height, true);
      arrastado = null;
    });
    // o que ficou guardado: repor
    var d = ler();
    Object.keys(d).forEach(function (id) { var c = document.getElementById(id), L = d[id]; if (c && L) soltar(c, L.x, L.y, L.w, L.h, false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(preparar, 400); });
  else setTimeout(preparar, 400);
  window.__t3bSoltos = { soltar: soltar, voltar: voltar, ler: ler };
})();
