// -*- coding: utf-8 -*-
// torre.js — a TORRE STARK desenha-se a partir de UM ficheiro: torre.json, escrito pelo mercado/torre.py
// de 15 em 15 s. Esta pagina nao chama modelo nenhum nem a corretora — regra dele (16/09):
// **visualizacao nao custa, narracao custa**. O unico pedido de rede que existe e o preco da Binance, e
// esse vive dentro do reactor.js (veio do instrumento v3 e e leitura de mercado).
//
// DIVISAO DE TRABALHO
//   reactor.js  — o REACTOR ARC (mostrador, trilho, tabela de posicoes). Copia do instrumento v3. Nao se toca.
//   torre.js    — tudo o resto: PEPPER, EXTREMIS, VINGADORES, KILLIAN, FEED, cadeiras, barras.
//   A ponte e uma so linha: window.medidorVivo(d.reactor).
//
// TRES REGRAS DE DESENHO QUE ESTAO NO CODIGO E NAO SO NO CSS
//   1. BLOCO SEM DADOS ESCONDE-SE, nunca se desenha uma coluna de tracos (brief do leitor, 3.1). As colunas
//      CASA LIMPA / TECTO / GRUPO / ULTRON so aparecem quando ALGUMA linha as tem — hoje nenhuma tem.
//   2. A ORDEM E A DA `fila` do mesa.py. A Torre nunca reordena: duas verdades sobre "qual e a melhor
//      estrategia" sao piores do que uma.
//   3. O CONTROLO (DUM-E e U) mostra-se SEMPRE em `todas`, com separador e regra propria. Esconder o
//      placebo por omissao seria a armadilha de 13/09 (mostrar so o que agrada).
'use strict';
(function () {
  var FICHEIRO = 'torre.json';
  var PERIODO_MS = 5000;   // o torre.py escreve de 15 em 15 s; 5 s garante que nunca se ve um ecra velho
  var MAX_FEED_TELEMOVEL = 20;
  var telemovel = !!(window.matchMedia && matchMedia('(max-width: 640px)').matches);
  var D = null, filtro = 'todas', aberta = null, ultimo = {}, tUltimo = 0;

  var $ = function (id) { return document.getElementById(id); };
  function txt(el, s) { if (el && el.textContent !== s) el.textContent = s; }

  // ---------- numeros ----------
  // 2 casas em dolares, 0 em percentagem (decisao do brief, 4.1). "+231.103%" com tres casas e precisao falsa.
  function num(v, casas, sinal) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var s = Number(v).toFixed(casas === undefined ? 2 : casas);
    if (sinal && Number(v) > 0) s = '+' + s;
    return s.replace('-', '−');
  }
  function usd(v) { return num(v, 2, true); }
  function pct(v, casas) { return (v === null || v === undefined || isNaN(v)) ? '—' : num(v, casas === undefined ? 0 : casas, false) + '%'; }
  function cls(v) { return (v === null || v === undefined || isNaN(v) || Math.abs(v) < 0.005) ? '' : (v > 0 ? 'p' : 'n'); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  // Pisca de 200 ms na cor do sentido quando um numero muda (OpenTerminal; §1.8 do brief). E a mesma ideia
  // que ele pediu em 13/09 para o ponteiro — "tem que trocar de cor quando mexe" — aplicada ao ecra todo.
  function vivo(id, s, v) {
    var el = $(id); if (!el) return;
    if (el.textContent === s) return;
    var ant = ultimo[id];
    el.textContent = s; ultimo[id] = v;
    if (telemovel || ant === undefined || v === undefined || v === null || isNaN(v) || v === ant) return;
    var c = v > ant ? 'pisca-up' : 'pisca-dn';
    el.classList.remove('pisca-up', 'pisca-dn'); void el.offsetWidth; el.classList.add(c);
  }

  // ---------- barra de topo ----------
  function barraTopo(d) {
    var o = d.orgaos || {}, j = d.jarvis || {};
    var atras = (o.atrasados || []).length, erro = (o.com_erro || []).length;
    var led = $('b_led');
    if (led) led.className = 'led ' + (atras ? 'mau' : (erro ? 'at' : 'ok'));
    txt($('b_legiao'), atras ? ('LEGIÃO DE FERRO · ' + atras + ' atrasada(s)')
      : ('LEGIÃO DE FERRO ONLINE · ' + (o.total_ready || 0) + '/' + (o.total || 0)));
    txt($('b_brt'), (d.t_brt || '—')); txt($('b_ny'), (d.t_ny || '—')); txt($('b_fase'), d.fase || '—');
    txt($('b_fase'), d.fase || '—'); txt($('r_fase'), d.fase || '—');
    var p = $('b_portao');
    if (p) { p.textContent = (j.portao || '?').toUpperCase() + (j.idade_min !== null && j.idade_min !== undefined ? ' · ' + num(j.idade_min, 0) + ' min' : ''); p.className = j.portao === 'fechado' ? 'n' : 'p'; }
    jarvisBarra('ses', j.sessao_pct, 80); jarvisBarra('sem', j.semana_pct, 85); jarvisBarra('fab', j.fable_pct, 92);
  }
  function jarvisBarra(k, v, tecto) {
    var b = $('jb_' + k); if (!b) return;
    var x = (v === null || v === undefined || isNaN(v)) ? 0 : Math.max(0, Math.min(100, v));
    b.firstElementChild.style.width = x + '%';
    b.className = 'jbar' + (v >= tecto ? ' mau' : (v >= tecto * 0.8 ? ' at' : ''));
    vivo('jt_' + k, pct(v), v);
  }

  // ---------- PEPPER ----------
  // As colunas: `op` = opcional no telemovel (fica so ESTRATEGIA · EST · N · REALIZADO · VISION).
  // `tem` = a funcao que diz se a coluna tem dados; sem dados, a coluna nao entra no <thead> nem no <tbody>.
  var COLS = [
    { k: 'nome', t: 'Estratégia', op: false, ali: 'left' },
    { k: 'estado', t: 'Est.', op: false },
    { k: 'classe', t: 'Cl', op: true },
    { k: 'n', t: 'N', op: false },
    { k: 'acerto', t: 'Acerto', op: true },
    { k: 'realizado', t: 'Realizado', op: false },
    { k: 'aberto', t: 'Aberto', op: true },
    { k: 'fator', t: 'F.luc', op: true },
    { k: 'dd', t: 'DD', op: true },
    { k: 'dsr', t: 'Vision', op: false },
    { k: 'aderencia', t: 'Casa limpa', op: true, tem: function (l) { return !!l.aderencia; } },
    { k: 'tecto', t: 'Tecto', op: true, tem: function (l) { return !!l.tecto; } },
    { k: 'grupo', t: 'Grupo', op: true, tem: function (l) { return l.grupo !== null && l.grupo !== undefined; } },
    { k: 'ultron', t: 'Ultron', op: true, tem: function (l) { return !!l.ultron; } },
    { k: 'simbolos', t: 'Símbolos', op: true }
  ];

  function colunasVivas(linhas) {
    return COLS.filter(function (c) { return !c.tem || linhas.some(c.tem); });
  }

  function celula(c, l) {
    switch (c.k) {
      case 'nome': return '<span class="nomec">' + esc(l.nome_curto || l.chave) + (l.aproximado ? ' <span class="a" title="P&amp;L de conciliação, não de fill">≈</span>' : '') + '</span>' +
        '<span class="famc">' + esc(l.familia || (l.nivel === 'controlo' ? (l.chave.indexOf('cripto') >= 0 ? 'DUM-E · sem sinal' : 'U · sem sinal') : '—')) + '</span>';
      case 'estado': {
        var e = l.estado || '—', k = e.indexOf('posic') === 0 ? 'posicionada' : (e.indexOf('espera') >= 0 ? 'espera' : (e === 'controlo' ? 'controlo' : 'fora'));
        return '<span class="pil ' + k + '">' + esc(e) + '</span>';
      }
      case 'classe': return esc((l.classe || '—').replace('cripto', 'cri').replace('acoes', 'açõ'));
      case 'n': return String(l.n || 0) + (l.sem_preco ? '<sup class="a" title="' + l.sem_preco + ' sem preço">' + l.sem_preco + '</sup>' : '');
      case 'acerto': return l.n ? pct(l.acerto) : '—';
      case 'realizado': return '<span class="' + cls(l.realizado) + '">' + usd(l.realizado) + '</span>';
      case 'aberto': return l.n_abertas ? ('<span class="' + cls(l.aberto) + '">' + usd(l.aberto) + (l.abertas_sem_preco ? '<span class="a">?</span>' : '') + '</span>') : '—';
      case 'fator': return l.fator_lucro === null || l.fator_lucro === undefined ? '—' : (l.fator_lucro > 99 ? '∞' : num(l.fator_lucro, 2));
      case 'dd': return l.drawdown ? '<span class="n">−' + num(Math.abs(l.drawdown), 2) + '</span>' : '—';
      case 'dsr': return l.nivel === 'controlo' ? '<span class="z">—</span>'
        : (num(l.dsr, 3) + '<span class="famc">74:' + num(l.dsr_74, 3) + '</span>');
      case 'aderencia': return l.aderencia ? '<span class="pil">' + esc(l.aderencia.estado) + '</span>' : '';
      case 'tecto': return l.tecto ? ('<span class="mini"><i class="' + (l.tecto.bateu ? 'mau' : 'at') + '" style="width:' + Math.max(0, Math.min(100, l.tecto.usado_pct || 0)) + '%"></i></span>' + (l.tecto.bateu ? ' <span class="n">!</span>' : '')) : '';
      case 'grupo': return (l.grupo === null || l.grupo === undefined) ? '' : '<span class="pil on">G' + l.grupo + '</span>';
      case 'ultron': return l.ultron ? ((l.ultron.lookahead ? '<span class="n">look</span> ' : '') + (l.ultron.recursive ? '<span class="n">rec</span>' : '') || 'ok') : '';
      case 'simbolos': {
        var s = l.simbolos || [];
        return s.length ? esc(s.slice(0, 4).join(' ')) + (s.length > 4 ? ' <span class="z">+' + (s.length - 4) + '</span>' : '') : '<span class="z">—</span>';
      }
    }
    return '';
  }

  function passaFiltro(l) {
    if (filtro === 'posicao') return l.n_abertas > 0;
    if (filtro === 'elegiveis') return !!l.elegivel;
    if (filtro === 'controlo') return l.nivel === 'controlo';
    return true;
  }

  function pepper(d) {
    var p = d.pepper || {}, linhas = p.linhas || [], ctr = p.controlo || [];
    var todas = linhas.concat(ctr), cols = colunasVivas(todas);
    var tab = $('pep_tab'); if (!tab) return;

    var th = '<tr>' + cols.map(function (c) { return '<th class="' + (c.op ? 'op' : '') + '">' + esc(c.t) + '</th>'; }).join('') + '</tr>';
    if (tab.tHead.innerHTML !== th) tab.tHead.innerHTML = th;

    var html = '', vis = linhas.filter(passaFiltro), visC = ctr.filter(passaFiltro);
    vis.forEach(function (l) { html += linhaHtml(l, cols, false); });
    if (visC.length) {
      // O separador com REGRA, nao so ordem: as linhas "(sem gene)" sao entradas SEM sinal — sondas de US$20
      // e capital ocioso. Nao sao estrategias e nao podem competir na mesma lista como se fossem.
      html += '<tr class="sep"><td colspan="' + cols.length + '">── controlo · DUM-E &amp; U — entradas sem sinal (o placebo da mesa) ──</td></tr>';
      visC.forEach(function (l) { html += linhaHtml(l, cols, true); });
    }
    if (!html) html = '<tr><td colspan="' + cols.length + '" class="vazio">sem linhas neste filtro.</td></tr>';
    tab.tBodies[0].innerHTML = html;

    var t = p.totais || {}, e = t.estrategias || {}, c = t.controlo || {};
    var np = linhas.filter(function (l) { return l.n_abertas > 0; }).length;
    var ne = linhas.filter(function (l) { return l.elegivel && !l.n_abertas; }).length;
    txt($('pep_kn'), linhas.length + ' estratégias · ' + np + ' posicionadas · ' + ne + ' à espera');
    var s = $('pep_somas');
    if (s) s.innerHTML =
      '<span class="soma">Σ estratégias <b class="' + cls(e.realizado) + '">' + usd(e.realizado) + '</b> US$ · ' + (e.n || 0) + ' trades</span>' +
      '<span class="soma">Σ controlo <b class="' + cls(c.realizado) + '">' + usd(c.realizado) + '</b> US$ · ' + (c.n || 0) + ' trades</span>';
    // A linha de diagnostico escrita dos DADOS, sem LLM (a ideia do "AI BRAIN" do print 2013_06_14 sem a
    // parte que custa dinheiro).
    txt($('pep_diag'), linhas.length + ' estratégias, ' + np + ' posicionadas, ' + ne + ' à espera; controlo '
      + usd(c.realizado) + ' em ' + (c.n || 0) + ' entradas sem sinal.'
      + (cols.length < COLS.length ? ' Colunas escondidas por falta de dados: ' + COLS.filter(function (x) { return cols.indexOf(x) < 0; }).map(function (x) { return x.t; }).join(', ') + '.' : ''));
  }

  function linhaHtml(l, cols, ctr) {
    var tr = '<tr class="linha' + (ctr ? ' ctr' : '') + '" data-chave="' + esc(l.chave) + '">' +
      cols.map(function (c) { return '<td class="' + (c.op ? 'op' : '') + '">' + (ctr && ['aderencia', 'tecto', 'grupo', 'ultron'].indexOf(c.k) >= 0 ? '' : celula(c, l)) + '</td>'; }).join('') + '</tr>';
    if (aberta === l.chave) {
      var x = l.extra || {}, kv = [
        ['chave', l.chave], ['PSR', num(x.psr, 3)], ['Sharpe anual', num(x.sharpe_anual, 2)],
        ['fora da amostra', num(x.fora_sharpe_anual, 2)], ['Sharpe necessário', num(x.sharpe_necessario, 2)],
        ['média/op', usd(x.media)], ['ganhos', usd(x.ganhos)], ['perdas', usd(x.perdas)],
        ['ganhos/perdas', (x.n_ganhos || 0) + '/' + (x.n_perdas || 0)], ['notional aberto', usd(x.notional_aberto)],
        ['T (dias DSR)', x.T === null || x.T === undefined ? '—' : x.T], ['trades DSR', x.trades_dsr === null || x.trades_dsr === undefined ? '—' : x.trades_dsr],
        ['executores', (x.executores || []).join(' ') || '—'], ['co-genes', (x.co_genes || []).join(' · ') || '—']
      ];
      tr += '<tr class="gav"><td colspan="' + cols.length + '"><div class="kv">' +
        kv.map(function (p) { return '<span>' + esc(p[0]) + ' <b>' + esc(p[1]) + '</b></span>'; }).join('') + '</div></td></tr>';
    }
    return tr;
  }

  // ---------- EXTREMIS ----------
  function extremis(d) {
    var e = d.extremis || {}, gs = e.geracoes || [];
    vivo('ext_mark', (e.geracao_actual === null || e.geracao_actual === undefined ? '—' : 'MARK ' + e.geracao_actual), e.geracao_actual);
    var m = $('ext_mark'); if (m && m.querySelector('small') === null) m.innerHTML = esc(m.textContent) + '<small>geração</small>';
    txt($('ext_kn'), (e.n_genes || 0) + ' genes · ' + (e.n_familias || 0) + ' linhas · ' + (e.n_avaliacoes || 0) + ' avaliações · SR₀ ' + num(e.sr0_anual, 2));
    var maxA = Math.max.apply(null, gs.map(function (g) { return g.avaliados || 0; }).concat([1]));
    var h = gs.map(function (g) {
      var alt = Math.round((g.avaliados || 0) / maxA * 62) + 4, rob = (g.avaliados ? (g.robustos || 0) / g.avaliados : 0);
      var mono = (g.monocultura_pct || 0) >= 60;
      return '<div class="g' + (mono ? ' mono' : '') + '" title="MARK ' + g.geracao + ': ' + (g.avaliados || 0) + ' avaliados, ' +
        (g.robustos || 0) + ' robustos' + (g.familia_maior ? ', ' + esc(g.familia_maior) + ' ' + num(g.monocultura_pct, 0) + '%' : '') + '">' +
        '<div class="col" style="height:' + alt + 'px"><i style="height:' + Math.round(rob * 100) + '%"></i></div><u>' + (g.geracao || '') + '</u></div>';
    }).join('');
    var c = $('ext_ger'); if (c && c.innerHTML !== h) c.innerHTML = h || '<div class="vazio">sem gerações na memória.</div>';
    var u = gs.length ? gs[gs.length - 1] : null;
    // 🔴 MONOCULTURA: a percentagem da geracao numa SO familia. Foi assim que se apanhou a inundacao do
    // `distancia_media` em 12/09 — 122/122 robustos da mesma ideia nao sao 122 ideias.
    txt($('ext_diag'), u ? ('MARK ' + u.geracao + ': ' + (u.robustos || 0) + '/' + (u.avaliados || 0) + ' robustos'
      + (u.familia_maior ? ' · monocultura ' + num(u.monocultura_pct, 0) + '% em ' + u.familia_maior : '')
      + ((u.monocultura_pct || 0) >= 60 ? ' — uma geração dominada por uma família são variações da MESMA aposta.' : ''))
      : 'sem gerações lidas.');
    // ⚠️ O leque de curvas do Algory NAO se reproduz: a memoria grava avaliados/robustos por geracao, nao
    // uma curva de capital por gene. Barras sao o que os dados sustentam; o leque entra no mesmo sitio no
    // dia em que houver curva por gene (brief do leitor, 1.1, ressalva).
  }

  // ---------- VINGADORES ----------
  function vingadores(d) {
    var v = d.vingadores || {};
    vivo('vin_nef', v.n_ef === null || v.n_ef === undefined ? '—' : num(v.n_ef, 2), v.n_ef);
    var m = $('vin_nef'); if (m && !m.querySelector('small')) m.innerHTML = esc(m.textContent) + '<small>N efectivo</small>';
    txt($('vin_kn'), 'fonte: ' + (v.fonte || '—') + (v.rho_media !== null && v.rho_media !== undefined ? ' · ρ̄ ' + num(v.rho_media, 2) : ''));
    var g = v.grupos || [];
    var h = g.length ? g.map(function (gr, i) { return '<span class="pil on" title="' + esc(gr.join(' · ')) + '">G' + (i + 1) + ' · ' + gr.length + '</span> '; }).join('')
      : '<div class="vazio">vingadores.json ainda não existe (peça 5). Enquanto não existir, o N efectivo vem das posições abertas do painel.</div>';
    var c = $('vin_grupos'); if (c && c.innerHTML !== h) c.innerHTML = h;
    txt($('vin_diag'), v.n_ef ? ('Dividir por N não sobe a taxa — o que sobe é ter famílias DIFERENTES: com ρ alto, 20 apostas valem quase o mesmo que 2.') : '');
  }

  // ---------- KILLIAN ----------
  function killian(d) {
    var k = d.killian || {}, r = k.recusas_por_par_hoje || {}, s = k.spread_pb || {};
    var pares = Object.keys(r), sp = Object.keys(s);
    var maxS = Math.max.apply(null, sp.map(function (p) { return s[p]; }).concat([1]));
    var h = '';
    if (pares.length) h += pares.map(function (p) {
      return '<div class="lin"><span>' + esc(p) + '</span><b>' + r[p] + '</b><span class="mini"><i class="at" style="width:' + Math.min(100, r[p] * 20) + '%"></i></span></div>';
    }).join('');
    else h += '<div class="vazio">nenhuma recusa por custo hoje.</div>';
    if (sp.length) {
      h += '<div class="diag" style="border:0;padding:6px 0 2px">spread do livro (pb) — o par manda mais que a hora</div>';
      h += sp.map(function (p) {
        return '<div class="lin"><span>' + esc(p) + '</span><b class="' + (s[p] > 50 ? 'n' : '') + '">' + num(s[p], 1) + '</b>' +
          '<span class="mini"><i class="' + (s[p] > 50 ? 'mau' : 'at') + '" style="width:' + Math.round(s[p] / maxS * 100) + '%"></i></span></div>';
      }).join('');
    }
    var c = $('kil_corpo'); if (c && c.innerHTML !== h) c.innerHTML = h;
    txt($('kil_kn'), (Object.keys(r).reduce(function (a, p) { return a + r[p]; }, 0)) + ' recusas · ' + (k.rotacoes_recusadas || 0) + ' rotações travadas');
  }

  // ---------- FEED ----------
  // Do Clodds (§1.3 do brief): larguras FIXAS na hora e a ACCAO a cor — nao a linha inteira, senao o feed
  // vira arco-iris e deixa de se ler.
  function classeFeed(e) {
    var t = e.tipo || '', m = e.motivo || '';
    if (t.indexOf('entrada') === 0 || t === 'compra' || t === 'sonda' || t === 'limite_enviada') return 'entrada';
    if (t === 'saida') return m.indexOf('alvo') === 0 ? 'alvo' : (m.indexOf('stop') === 0 ? 'stop' : '');
    if (t.indexOf('stop') === 0 || t === 'perda_dia') return 'stop';
    if (t.indexOf('recus') >= 0 || t.indexOf('esgotado') >= 0 || t === 'livro_roto' || t === 'spread_acima_do_tecto') return 'recusa';
    return '';
  }
  function feed(d) {
    var f = (d.feed || []).slice(0, telemovel ? MAX_FEED_TELEMOVEL : 60);
    var h = f.map(function (e) {
      return '<div class="e ' + classeFeed(e) + '" data-papel="' + esc(e.papel) + '">' +
        '<time>' + esc(e.t_brt) + '</time>' +
        '<span class="pp">' + esc(e.papel === '—' ? e.origem : e.papel) + '</span>' +
        '<span class="ac">' + esc(e.texto_curto) + '</span>' +
        '<span class="vl">' + (e.valor === null || e.valor === undefined ? '' : num(e.valor, 2)) + '</span></div>';
    }).join('');
    var c = $('feed'); if (c && c.innerHTML !== h) c.innerHTML = h || '<div class="vazio">sem eventos hoje.</div>';
    txt($('feed_kn'), f.length + ' eventos');
  }

  // ---------- cadeiras ----------
  function cadeiras(d) {
    var cs = d.cadeiras || [];
    var h = cs.map(function (c, i) {
      var u = c.ultimo || {};
      return '<div class="cad ' + esc(c.estado) + '" data-nome="' + esc(c.nome) + '">' +
        '<div class="cn"><i>' + ('0' + (i + 1)).slice(-2) + '</i>' + esc(c.nome) + '</div>' +
        '<div class="cp">' + esc(c.papel) + '</div>' +
        '<div class="ce">' + (c.estado === 'IDLE' ? '◦ ' : '● ') + esc(c.estado) + ' · ' + (c.hoje || 0) + ' hoje</div>' +
        '<div class="cu"><span class="ct">' + esc(u.t || '—') + '</span> ' + esc(u.texto || 'sem eventos') + '</div></div>';
    }).join('');
    var c = $('cadeiras'); if (c && c.innerHTML !== h) c.innerHTML = h;
  }

  // ---------- F.R.I.D.A.Y. + barra de baixo ----------
  function rodape(d) {
    var o = d.orgaos || {}, fr = d.friday || {}, e = d.extremis || {}, p = d.pepper || {};
    var prox = o.proximo || {};
    txt($('r_proximo'), prox.nome ? (String(prox.nome).replace('Tesouraria-', '') + ' · ' + num(prox.em_min, 0) + ' min') : '—');
    vivo('r_genes', String(e.n_genes || '—'), e.n_genes);
    var melhor = null;
    (p.linhas || []).forEach(function (l) { if (l.realizado !== null && (melhor === null || l.realizado > melhor.realizado)) melhor = l; });
    var rm = $('r_melhor');
    if (rm) { rm.textContent = melhor ? (usd(melhor.realizado) + ' ' + (melhor.nome_curto || '')) : '—'; rm.className = melhor ? cls(melhor.realizado) : ''; }
    var led = $('r_led'); if (led) led.className = 'led ' + ((fr.vermelhos || 0) > 0 ? 'mau' : 'ok');
    txt($('r_friday'), 'F.R.I.D.A.Y. ' + (fr.vermelhos || 0) + ' vermelho(s)' + (fr.auditores && fr.auditores.n_hoje ? ' · ' + fr.auditores.n_hoje + ' achados hoje' : ''));
    txt($('fri_kn'), (fr.auditores && fr.auditores.t_brt ? 'último ' + fr.auditores.t_brt : '—') + (fr.auditores && fr.auditores.proxima_brt ? ' · próxima ' + fr.auditores.proxima_brt : ''));
    var a = $('avisos');
    if (a) {
      var h = (d.avisos || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('');
      if (a.innerHTML !== h) a.innerHTML = h;
    }
    var ac = $('fri_achados');
    if (ac) {
      var ha = (fr.achados || []).map(function (x) { return '<div class="z">· ' + esc(x) + '</div>'; }).join('');
      if (ac.innerHTML !== ha) ac.innerHTML = ha;
    }
  }

  // ---------- ciclo ----------
  function pintar(d) {
    D = d;
    barraTopo(d); pepper(d); extremis(d); vingadores(d); killian(d); feed(d); cadeiras(d); rodape(d);
    try { if (window.medidorVivo) window.medidorVivo(d.reactor || {}); } catch (e) { if (window.console) console.warn('reactor', e); }
    tUltimo = Date.now();
  }

  function buscar() {
    fetch(FICHEIRO + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(pintar)
      .catch(function (e) {
        // Nao se apaga o ecra por causa de uma leitura falhada: o torre.py escreve com os.replace (atomico),
        // por isso uma falha aqui e quase sempre o servidor a arrancar. Diz-se a idade e continua-se.
        txt($('r_idade'), 'sem torre.json');
        if (window.console) console.warn('torre.json', String(e).slice(0, 80));
      });
  }

  setInterval(function () {
    var s = tUltimo ? Math.round((Date.now() - tUltimo) / 1000) : null;
    txt($('r_idade'), s === null ? '—' : (s + ' s'));
  }, 1000);
  buscar(); setInterval(buscar, PERIODO_MS);

  // ---------- interaccao ----------
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-filtro]') : null;
    if (b) {
      filtro = b.getAttribute('data-filtro');
      Array.prototype.forEach.call(document.querySelectorAll('[data-filtro]'), function (x) { x.classList.toggle('on', x === b); });
      if (D) pepper(D);
      return;
    }
    var tr = ev.target.closest ? ev.target.closest('tr.linha') : null;
    if (tr) { var c = tr.getAttribute('data-chave'); aberta = (aberta === c) ? null : c; if (D) pepper(D); }
  });

  // Atalhos 1..6: "escuro, denso, TECLADO" (OpenTerminal). Grátis, e e o que distingue um painel
  // profissional de uma pagina.
  var BLOCOS = ['bl_pepper', 'bl_extremis', 'bl_vingadores', 'bl_killian', 'bl_feed', 'bl_friday'];
  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    var i = '123456'.indexOf(ev.key);
    if (i >= 0) { var el = $(BLOCOS[i]); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); } }
    if (ev.key === 'Escape' && aberta) { aberta = null; if (D) pepper(D); }
  });
})();

// ---------------------------------------------------------------------------------------------------
// O QUE FICA PARA ELE DECIDIR (nada disto trava a Torre; esta escrito para ele poder contrariar)
//   1. FONTE: hoje usa-se a mono do sistema. Para ficar IGUAL ao site, por a JetBrains Mono (~90 KB) em
//      sala/fontes/ e um @font-face no torre.css. Sem CDN, e a unica forma.
//   2. As TRES cores novas (YINSEN violeta, VERONICA turquesa, KILLIAN terracota) entram, ou as oito
//      cadeiras repetem as cinco que ja existiam? Oito cadeiras com cinco cores confundem-se.
//   3. EXTREMIS mostra titulo "EXTREMIS" e numero grande "MARK n" — confirmar que e assim que ele quer.
//   4. O leque de curvas do Algory fica FORA ate haver curva de capital por gene (hoje a memoria so tem
//      avaliados/robustos por geracao). Foi a unica coisa das referencias que os dados nao sustentam.
// ---------------------------------------------------------------------------------------------------
