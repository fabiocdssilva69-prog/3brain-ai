// predio_feed.js - AS CONTAS PURAS DO FEED DO PREDIO: em que ORDEM os eventos aconteceram e QUAL e cada um.
//
// PORQUE existe um ficheiro so para isto (17/09/2026, correccao dos refutadores 3 e 7): a primeira versao
// vivia dentro do predio.js e convertia o carimbo `t_brt` ("15:10:06") em SEGUNDOS DO DIA. O torre.py escreve
// o feed sem data - so a hora - e dai saiam dois defeitos, os dois medidos:
//   (1) ORDEM: um evento de ontem as 23:50 ordenava-se DEPOIS de um de hoje as 01:05 (85.800 > 3.900). E a
//       mesma familia do defeito do painel.py de 13/09, que lia a cripto pelo dia UTC e mostrava "fechado 0".
//   (2) CONGELAMENTO: a marca de agua ("ja vi ate aqui") guardava segundos do dia; passada a meia-noite todo
//       o evento novo tinha um numero MENOR, o filtro devolvia vazio, e o predio ficava mudo ate o relogio
//       voltar a passar o maximo visto - quase 24 h de ecra parado com a cripto a negociar 24/7.
// A cura e esta: a hora do evento passa a IDADE em segundos (quanto tempo atras, num relogio de 24 h) contra
// a hora de referencia do proprio torre.json, e a idade vira um instante ABSOLUTO que nunca recua. E o que
// ja e visto identifica-se pela CHAVE do evento, nao por uma marca de agua - identidade nao da a volta a
// meia-noite. Em ficheiro proprio porque assim se testa em node, sem browser e sem extrair funcoes por regex.
(function (raiz) {
  'use strict';

  var SEG_DIA = 86400;
  var TOL_FUTURO_S = 300;   // o carimbo do evento e escrito pelo executor e o "agora" vem do torre.json: entre
                            // os dois ha segundos de diferenca e um evento pode parecer do futuro. Ate 5 min no
                            // futuro e AGORA; acima disso e mesmo de ontem (e a unica leitura possivel sem data).

  function segundosDoDia(t) {
    var m = String(t == null ? '' : t).match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]), s = Number(m[3]);
    if (h > 23 || mi > 59 || s > 59) return null;
    return h * 3600 + mi * 60 + s;
  }

  // Quantos segundos ATRAS aconteceu, num relogio de 24 h. Nunca negativo, nunca >= 86400.
  function idadeEmSegundos(segEvento, segAgora) {
    if (segEvento == null || segAgora == null) return null;
    var d = ((segAgora - segEvento) % SEG_DIA + SEG_DIA) % SEG_DIA;
    return d > SEG_DIA - TOL_FUTURO_S ? 0 : d;
  }

  // O instante absoluto (segundos) em que o evento aconteceu, a partir da idade. Cresce sempre com o tempo
  // real, tambem a meia-noite: e por isso que serve para ordenar e para comparar entre ciclos.
  function ordemAbsoluta(ev, refSegDia, refAbsS) {
    var idade = idadeEmSegundos(segundosDoDia(ev && ev.t_brt), refSegDia);
    return idade == null ? null : refAbsS - idade;
  }

  // A identidade de um evento. Sem id no ficheiro, e o conjunto dos campos que o torre.py escreve. Dois
  // eventos iguais no mesmo segundo ganham sufixo em `preparar` - sao dois, e contam os dois.
  function chaveDoEvento(ev) {
    ev = ev || {};
    return [ev.t_brt, ev.tipo, ev.origem, ev.simbolo, ev.motivo, ev.valor]
      .map(function (x) { return x == null ? '' : String(x); }).join('|');
  }

  // O feed inteiro em ordem cronologica (o mais antigo primeiro), cada linha com a sua ordem e a sua chave.
  // Um carimbo ilegivel nao se deita fora: fica como o mais antigo possivel e entra na lista na mesma.
  function preparar(feed, refSegDia, refAbsS) {
    var fora = [], contagem = {};
    for (var i = 0; i < (feed || []).length; i++) {
      var ev = feed[i];
      var o = ordemAbsoluta(ev, refSegDia, refAbsS);
      fora.push({ ev: ev, i: i, ordem: o == null ? refAbsS - SEG_DIA : o, sem_hora: o == null });
    }
    fora.sort(function (a, b) { return (a.ordem - b.ordem) || (b.i - a.i); });
    for (var k = 0; k < fora.length; k++) {
      var base = chaveDoEvento(fora[k].ev);
      var n = contagem[base] || 0;
      contagem[base] = n + 1;
      fora[k].chave = n ? base + '#' + n : base;
    }
    return fora;
  }

  function novos(preparados, vistos) {
    vistos = vistos || {};
    return (preparados || []).filter(function (p) { return !vistos[p.chave]; });
  }

  var api = { SEG_DIA: SEG_DIA, TOL_FUTURO_S: TOL_FUTURO_S, segundosDoDia: segundosDoDia,
              idadeEmSegundos: idadeEmSegundos, ordemAbsoluta: ordemAbsoluta,
              chaveDoEvento: chaveDoEvento, preparar: preparar, novos: novos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.PredioFeed = api;
})(typeof window !== 'undefined' ? window : globalThis);
