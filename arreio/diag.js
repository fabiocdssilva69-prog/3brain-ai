(function () {
  var NL = String.fromCharCode(10);
  // pergunta -> id que DEVERIA vir em primeiro
  var CASOS = [
    ['quanto o barbergo fatura em 3 meses?', 'receita-hoje'],
    ['quanto o barbergo fatura', 'receita-hoje'],
    ['o barbergo da lucro', 'receita-hoje'],
    ['quanto o savi vai faturar ano que vem', 'receita-hoje'],
    ['qual a projecao de receita do savi', 'venture-scale-honesto'],
    ['o barbergo tem quantos usuarios pagando', 'usuarios-barbergo'],
    ['quanto o motor ja gerou de dinheiro', 'receita-hoje'],
    ['voces ja lucraram alguma coisa', 'receita-hoje']
  ];
  addEventListener('load', function () {
    setTimeout(function () {
      var out = ['EM QUE POSICAO A ENTRADA CERTA APARECE (de 135)', ''];
      CASOS.forEach(function (c) {
        var r = window.CAND(c[0], 135) || [];
        var pos = -1;
        for (var i = 0; i < r.length; i++) if (r[i].id === c[1]) { pos = i + 1; break; }
        out.push('P: ' + c[0]);
        out.push('   esperado: ' + c[1] + '  ->  posicao ' +
                 (pos < 0 ? 'NAO APARECE (busca devolveu ' + r.length + ' itens)' : pos) +
                 (pos > 0 && pos <= 5 ? '  [entra no contexto]' : '  [FORA do contexto de 5]'));
        out.push('   top 3 hoje: ' + r.slice(0, 3).map(function (e) { return e.id; }).join(', '));
        out.push('');
      });
      var p = document.createElement('pre');
      p.id = 'DIAG';
      p.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;font:11px monospace;margin:0;padding:8px;white-space:pre';
      p.textContent = out.join(NL);
      document.body.appendChild(p);
    }, 900);
  });
})();
