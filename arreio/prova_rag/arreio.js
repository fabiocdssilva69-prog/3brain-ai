/* Arreio de prova do RAG. Com a ponte desligada, a resposta que aparece na tela
   veio da BUSCA local -- entao o que este arreio mede e exatamente a recuperacao:
   dada a pergunta, a base achou a entrada certa? */
(function () {
  var NL = String.fromCharCode(10);
  var CASOS = [
    ['quanto custa o savi', ['99', 'leito']],
    ['quanto custa o barbergo', ['14,90', '29,90']],
    ['quanto custa o huntai', ['1.290']],
    ['quantos clientes para 1 milhao', ['13', '65']],
    ['qual o tamanho da base de contatos', ['2.126.099']],
    ['e soma ou uniao', ['uniao', '43,8']],
    ['quantas vagas tem e-mail do empregador', ['79.828']],
    ['em quantas plataformas voces submetem', ['58']],
    ['quantas candidaturas foram enviadas', ['12.368', '46,1']],
    ['quantas entrevistas o motor gerou', ['86']],
    ['em que pais o motor funcionou melhor', ['Portugal', '60']],
    ['a contratacao foi real mesmo', ['IMAS']],
    ['qual a taxa de reclamacao de spam', ['0,008']],
    ['a lista de e-mails esta velha', ['4,0', 'IP']],
    ['voces estao enviando e-mail agora', ['pausado', '8%']],
    ['qual a taxa de clique', ['varredor', '77%']],
    ['quantos downloads o app tem', ['nao publicamos', 'metrica']],
    ['tem algum contrato parecido como referencia de preco', ['166,13', 'INTO']],
    ['por que cobram por leito', ['leito']],
    ['o savi e so para ILPI', ['hospital']],
    ['ILPI da dinheiro', ['154.800', 'negativa']],
    ['qual a maior incerteza do preco do savi', ['2,66']],
    ['qual o tamanho do mercado', ['1,9 milhao', '1 em cada 13']],
    ['por que ninguem atende esse mercado', ['226', '19']],
    ['por que WhatsApp', ['82%']],
    ['qual o mercado do motor de aquisicao', ['10,6', '316.041']],
    ['por que nao contratar um vendedor', ['5,3', '154.800']],
    ['onde roda a IA de voces', ['Cloudflare', 'servidor']],
    ['voce e um chatgpt', ['RAG', 'curada']],
    ['que tecnologia usam no app', ['Flutter']],
    ['o preco do barbergo vai mudar', ['29,90', '49,90']],
    ['por que voces dois', ['porta']],
    ['e se um concorrente copiar', ['canal']],
    ['o que ainda nao funciona', ['nao foi vendido', 'pausado']],
    ['como eu confiro esses numeros', ['denominador', 'fonte']],
    ['qual o multiplo de saida de voces', ['2,2', '235,7']],
    ['isso e venture scale', ['3,93', '16,1']],
    ['o que mudaria esse veredito', ['3x', 'Espanha']],
    ['quem revisou esses numeros', ['adversarial', 'imposto']],
    ['qual o CAC do barbergo', ['133', '0,80']],
    ['por que cobrar do estabelecimento', ['3.666', '527']],
    ['o mercado de beleza nao e de 200 bilhoes', ['varejo', '900.868']],
    ['quantos barbeiros tem carteira assinada', ['544', '210']],
    ['o barbeiro consegue repassar preco', ['7,71']],
    ['quanto a squire gastou por barbearia', ['55.667']],
    ['por que agora', ['160.784', '2,80']],
    ['existe lista de ILPI', ['2007-2009', 'publica']],
    ['por que expandir para portugal', ['46%', '2,37']],
    ['e se a IA errar', ['0,63', '109']],
    ['a base de e-mails vale quanto', ['0,90', 'ZoomInfo']],
    ['e se a plataforma banir voces', ['30.000', 'HeyReach']],
    ['alguem ganha dinheiro com isso', ['Instantly', '38']],
    ['o que voces nao sabem', ['reembolso', 'CE']]
  ];

  function esperar(cond, ms, cb) {
    var t0 = Date.now();
    (function bate() {
      if (cond() || Date.now() - t0 > ms) return cb();
      setTimeout(bate, 60);
    })();
  }

  window.PROVA = function (feito) {
    var campo = document.getElementById('asCampo');
    var form = document.getElementById('asForm');
    var fluxo = document.getElementById('asFluxo');
    var abre = document.getElementById('asAbre');
    if (abre) abre.click();
    var res = [], k = 0;
    // le a ultima bolha DELA que tenha texto. A bolha de "pensando" tambem e
    // .as-msg.ela mas nasce vazia -- por isso contar bolha nao serve, e o arreio
    // tem de esperar o TEXTO MUDAR em relacao ao da pergunta anterior.
    function ultimaDela() {
      var b = fluxo.querySelectorAll('.as-msg.ela');
      for (var n = b.length - 1; n >= 0; n--) {
        var t = (b[n].textContent || '').trim();
        if (t) return t;
      }
      return '';
    }

    function proximo() {
      if (k >= CASOS.length) return feito(res);
      var caso = CASOS[k];
      var anterior = ultimaDela();
      campo.value = caso[0];
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      esperar(function () {
        var t = ultimaDela();
        return t.length > 20 && t !== anterior;
      }, 6000, function () {
        var txt = ultimaDela();
        var achou = caso[1].filter(function (m) { return txt.indexOf(m) >= 0; });
        res.push({ q: caso[0], ok: achou.length > 0, esperado: caso[1],
                   achou: achou, trecho: txt.replace(/\s+/g, ' ').slice(0, 90) });
        k++;
        setTimeout(proximo, 90);
      });
    }
    proximo();
  };

  addEventListener('load', function () {
    setTimeout(function () {
      window.PROVA(function (res) {
        var ok = res.filter(function (r) { return r.ok; }).length;
        var out = ['PROVA DE RECUPERACAO (ponte desligada: quem responde e a busca)',
                   '  ' + ok + ' de ' + res.length + ' perguntas acharam a entrada certa', ''];
        res.forEach(function (r) {
          out.push((r.ok ? 'OK   ' : 'FALHA') + '  ' + r.q);
          if (!r.ok) out.push('        esperava ' + JSON.stringify(r.esperado) +
                              ' | veio: ' + r.trecho);
        });
        var p = document.createElement('pre');
        p.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;' +
                          'font:11px monospace;margin:0;padding:8px;white-space:pre;line-height:1.35';
        p.textContent = out.join(NL);
        document.body.appendChild(p);
      });
    }, 1200);
  });
})();
