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
