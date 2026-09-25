// predio_enxame.js — O ENXAME NO ECRA DA TORRE (24/09/2026, lote 5).
// Porque existe: o enxame (mercado/enxame.py) vigia de minuto a minuto, os supervisores relatam, os lideres escalam
// e o Sr. Stark da parecer - e nada disso chegava ao ecra. Ele via a torre calma com o instagram vermelho ha horas.
// Le sala/enxame.json (escrito por mercado/enxame_ecra.py no laco de 60 s do predio) de 20 em 20 s e mostra-o em
// QUATRO sitios, todos leves:
//   1. uma seccao na coluna do lado (#bl_enxame): o batimento do vigia no titulo (visivel mesmo dobrada), e por
//      dentro os andares, quem esta fora do verde, os relatorios dos supervisores (relator x refutador), o que os
//      lideres escalaram e o ultimo parecer do Sr. Stark;
//   2. as LUZES DOS ANDARES na torre 3D (predio.js: vigiaDosAndares) - so se tocam quando o estado muda;
//   3. um ponto de cor em cada CARTAO (o estado do funcionario, ou o pior dos andares de quem chefia);
//   4. uma linha no telemovel (a coluna do lado nao existe la), com o batimento e os vermelhos.
// Nada e inventado: o que falta no ficheiro escreve-se "sem dado". NAO redesenha a cena: se o ficheiro nao mudou
// (mesma volta do vigia, mesmos relatorios, mesmo parecer) so a idade do batimento anda, ao segundo, em texto.
// 25/09 (lote 6G) - ORDEM DELE: "o enxame poderia ter outro nome, nao gostei; eles poderiam ser um andar FIXO". O nome
// que ele le e S.H.I.E.L.D. (Supervisao e Manutencao), e o andar dela vem no ficheiro (E.andar, 49 hoje). O ficheiro
// continua a ser sala/enxame.json e este predio_enxame.js: sao identificadores (servico, site, arreio leem-nos pelo
// nome). O painel do andar dela mostra os CARGOS com a pessoa e a prova do ultimo trabalho; E.visitas sao as idas dela
// aos outros andares (do dado) - a forma de as animar e do Fable (PACOTE_FABLE.md).
(function () {
  'use strict';
  var URL = 'enxame.json', CADA_MS = 20000, VIGIA_PARADO_S = 180;
  var E = null, ass = '', lidoEm = 0, falhas = 0, leituras = 0, pintados = 0, ultimaSeq = null, cartoesMarcados = 0;
  var NOME_SEV = { verde: 'verde', amarelo: 'amarelo', vermelho: 'vermelho', cinza: 'sem prova', sem: 'sem vigia' };
  var PESO = { vermelho: 3, amarelo: 2, verde: 1, cinza: 0 };

  function $(id) { return document.getElementById(id); }
  // o nome antigo ('Pointer') nao aparece no ecra (regra dele, 18/09): os textos do enxame citam funcionarios e
  // ficheiros do REGISTO, que ainda o usam - troca-se ao desenhar, como no chat (predio_chat.js semPointer)
  function semPointer(s) { return String(s == null ? '' : s).replace(/\b([Dd])o Pointer\b/g, '$1a torre').replace(/\bo Pointer\b/g, 'a torre').replace(/Pointer/g, 'torre'); }
  // 25/09 (lote 6G): o nome antigo ('enxame') tambem nao aparece - a mesma regra do mercado/shield.py (visivel): a
  // palavra SOLTA passa a S.H.I.E.L.D., com o artigo no feminino ('do enxame' -> 'da S.H.I.E.L.D.'); colada a / \ . - _
  // e um identificador (dados/enxame/, enxame_ecra, Tesouraria-Enxame) e fica. O enxame.json ja traz os textos
  // trocados (enxame_ecra.textos_visiveis): isto e a rede para o resto (um id 'enxame' mostrado, um ficheiro antigo).
  var NOME_SHIELD = 'S.H.I.E.L.D.';
  var ARTIGO_F = { o: 'a', 'do': 'da', 'no': 'na', pelo: 'pela', ao: 'à', um: 'uma', este: 'esta', deste: 'desta', neste: 'nesta' };
  function caixa(m, p) {
    if (m.length > 1 && m === m.toUpperCase()) return p.toUpperCase();
    return m.charAt(0) !== m.charAt(0).toLowerCase() ? p.charAt(0).toUpperCase() + p.slice(1) : p;
  }
  function semEnxame(s) {
    return String(s == null ? '' : s)
      .replace(/(^|[^\w\/\\.\-])(ao|do|no|pelo|um|este|deste|neste|o)(\s+)(?:(pr[oó]prio)(\s+))?enxames?(?![\w\/\\.\-])/gi,
        function (m0, pre, art, e1, prop, e2) {
          var a = caixa(art, ARTIGO_F[art.toLowerCase()] || art);
          var p = prop ? caixa(prop, prop.toLowerCase() === 'próprio' ? 'própria' : 'propria') + e2 : '';
          return pre + a + e1 + p + NOME_SHIELD;
        })
      .replace(/(^|[^\w\/\\.\-])enxames?(?![\w\/\\.\-])/gi, function (m0, pre) { return pre + NOME_SHIELD; });
  }
  function escH(s) { return semEnxame(semPointer(s)).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function lista(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !lista(x).length) ? x : {}; }
  function semDado(v) { return v == null || v === '' ? 'sem dado' : String(v); }
  function hora(iso) { var s = String(iso || ''); return s.length >= 16 ? s.slice(11, 16) : semDado(s); }
  function idadeS(iso) { var t = Date.parse(String(iso || '')); return isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 1000)) : null; }
  function haQuanto(s) { return s == null ? 'sem hora' : (s < 90 ? 'há ' + s + ' s' : (s < 5400 ? 'há ' + Math.round(s / 60) + ' min' : 'há ' + (s / 3600).toFixed(1) + ' h')); }
  function pior(a, b) { return (PESO[b] || -1) > (PESO[a] || -1) ? b : a; }
  function sevDe(id) { return E ? obj(E.funcionarios)[id] || null : null; }
  function andares() { return E ? lista(E.andares) : []; }
  function sevDoAndar(n) { var a = null; andares().forEach(function (x) { if (x.n === Number(n)) a = x.sev; }); return a; }
  function nomeAndar(n) { var a = null; andares().forEach(function (x) { if (x.n === Number(n)) a = x.nome; }); return a; }
  function pontoSev(sev, extra) { return '<i class="enx-ponto ' + escH(sev || 'sem') + '"' + (extra ? ' title="' + escH(extra) + '"' : '') + '></i>'; }

  // ---------------------------------------------------------------- o titulo: o batimento, sempre visivel
  function linhaDoBatimento() {
    // na copia PUBLICA (tem 'publicado_em') o ficheiro chega com o atraso da publicacao - 2 min do publicador mais o do
    // site (medido a 24/09 21:4x: 151 s): o limite de 'parado' e o do vigia (3 min) MAIS esse atraso, senao o site
    // acendia vermelho sem nada estar parado
    var limite = (E && E.publicado_em) ? VIGIA_PARADO_S + 420 : VIGIA_PARADO_S;
    var b = obj(E && E.batimento), s = idadeS(b.t_iso), parado = s == null || s > limite;
    return { parado: parado, s: s, texto: (b.seq != null ? 'volta ' + b.seq : 'sem batimento') + ' · ' + haQuanto(s) +
             (b.volta_ms != null ? ' · ' + (b.volta_ms / 1000).toFixed(1).replace('.', ',') + ' s' : '') };
  }
  function pintarTitulo() {
    var kn = $('enx_kn'); if (!kn || !E) return;
    var bt = linhaDoBatimento(), t = obj(E.totais);
    var verm = lista(E.fora_do_verde).filter(function (f) { return f.sev === 'vermelho'; }).map(function (f) { return f.id; });
    // o titulo le-se com a seccao DOBRADA, numa linha so: por isso o batimento vai curto (volta e idade; a duracao da
    // volta fica no corpo e no telemovel) e os vermelhos vao por ultimo (se a linha nao chegar, corta-se o nome, nunca
    // o numero de vermelhos, e a seccao ganha a borda vermelha)
    var b = obj(E.batimento);
    var curto = (b.seq != null ? 'volta ' + b.seq : 'sem batimento') + ' · ' + haQuanto(bt.s).replace('há ', '');
    var html = '<span class="enx-bat' + (bt.parado ? ' parado' : '') + '" title="' + escH(bt.texto) + '"><i class="enx-coracao"></i>' + escH(curto) + '</span>' +
      '<span class="enx-tot" title="verdes · amarelos · vermelhos · sem prova"><b class="verde">' + (t.verde || 0) + '</b> <b class="amarelo">' + (t.amarelo || 0) + '</b> <b class="vermelho">' + (t.vermelho || 0) + '</b> <b class="cinza">' + (t.cinza || 0) + '</b></span>' +
      (verm.length ? '<span class="enx-verm">' + escH(verm.slice(0, 3).join(', ')) + '</span>' : '');
    if (kn.dataset.h !== html) { kn.dataset.h = html; kn.innerHTML = html; }
    var bl = $('bl_enxame'); if (bl) bl.classList.toggle('tem-vermelho', verm.length > 0 || bt.parado);
  }
  function baterCoracao() {
    var c = document.querySelector('#enx_kn .enx-coracao'); if (!c) return;
    c.classList.remove('bate'); void c.offsetWidth; c.classList.add('bate');
  }

  // ---------------------------------------------------------------- o corpo da seccao
  function secaoAndares() {
    var as = andares();
    if (!as.length) return '<div class="enx-vazio">a vigia ainda não escreveu andares (sem dado)</div>';
    return '<div class="enx-andares">' + as.map(function (a) {
      var dica = 'andar ' + a.n + ' · ' + a.nome + ' · ' + a.n_func + ' vigiados: ' + a.verde + ' verdes, ' + a.amarelo + ' amarelos, ' + a.vermelho + ' vermelhos, ' + a.cinza + ' sem prova' +
        (a.vermelhos.length ? ' · vermelho: ' + a.vermelhos.join(', ') : '') + (a.amarelos.length ? ' · amarelo: ' + a.amarelos.join(', ') : '');
      return '<button type="button" class="enx-and ' + escH(a.sev) + (a.cripto ? ' cripto' : '') + '" data-n="' + escH(a.n) + '" title="' + escH(dica) + '">' +
        '<u>' + escH(a.n) + '</u>' + escH(String(a.nome || '').replace(/\s*\(.*\)$/, '')) + '</button>';
    }).join('') + '</div>';
  }
  function secaoFora() {
    var fs = lista(E.fora_do_verde);
    if (!fs.length) return '<div class="enx-sub">Fora do verde</div><div class="enx-vazio">ninguém vermelho nem amarelo nesta volta</div>';
    return '<div class="enx-sub">Fora do verde <em>' + fs.length + '</em></div>' + fs.map(function (f) {
      return '<div class="enx-it ' + escH(f.sev) + '">' + pontoSev(f.sev) + '<b>' + escH(f.id) + '</b> <u>andar ' + escH(semDado(f.andar)) + (f.tipo ? ' · ' + escH(f.tipo) : '') + (f.cripto ? ' · cripto' : '') + '</u><em>' + escH(semDado(f.prova)) + '</em></div>';
    }).join('');
  }
  function quem(p) { p = obj(p); return p.provedor ? escH(p.provedor) + (p.modelo ? ' <s>' + escH(String(p.modelo).split('/').pop()) + '</s>' : '') : 'sem dado'; }
  function secaoRelatorios() {
    var rs = lista(E.relatorios);
    var cab = '<div class="enx-sub">Supervisores <em>relator × refutador, fornecedores diferentes</em></div>';
    if (!rs.length) return cab + '<div class="enx-vazio">nenhum relatório hoje (os supervisores só são chamados quando um andar piora)</div>';
    return cab + rs.map(function (r) {
      var ver = r.veredito ? '<i class="enx-ver ' + escH(r.veredito) + '">' + escH(String(r.veredito).toUpperCase()) + '</i>' : '<i class="enx-ver sem">SEM REFUTAÇÃO</i>';
      var probs = lista(r.problemas).map(function (p) {
        return '<li class="' + (p.confirmado ? 'conf' : 'nconf') + '">' + (p.confirmado ? '✔ ' : '✖ ') + '<b>' + escH(p.funcionario) + '</b> ' + escH(p.tipo) + (p.origem === 'refutador' ? ' <s>(só o refutador viu)</s>' : '') + '<em>' + escH(p.prova) + '</em></li>';
      }).join('');
      return '<div class="enx-rel">' +
        '<div class="enx-rel-cab"><u>' + escH(hora(r.t_iso)) + '</u> <b>andar ' + escH(semDado(r.andar)) + '</b> ' + escH(r.nome || '') + (r.cripto ? ' <s>cripto</s>' : '') + '</div>' +
        '<div class="enx-rel-quem">relatou ' + quem(r.relator) + ' → refutou ' + (r.refutador ? quem(r.refutador) : '<s>' + escH(semDado(r.sem_refutacao)) + '</s>') + ' ' + ver + '</div>' +
        '<div class="enx-rel-n">' + (r.n_problemas || 0) + ' problema(s), ' + (r.n_confirmados || 0) + ' confirmado(s)' +
        (r.sem_prova_propria ? ' · ' + r.sem_prova_propria + ' confirmação(ões) sem prova própria descartada(s)' : '') + '</div>' +
        (probs ? '<ul class="enx-probs">' + probs + '</ul>' : '') + '</div>';
    }).join('');
  }
  function secaoLideres() {
    var L = obj(E.lideres), esc = lista(L.escalados), ult = lista(L.ultimos);
    var cab = '<div class="enx-sub">Líderes escalaram <em>' + esc.length + '</em></div>';
    var corpo = esc.length ? esc.map(function (e) {
      return '<div class="enx-it ' + escH(sevDe(e.funcionario) || 'sem') + '">' + pontoSev(sevDe(e.funcionario), 'hoje na vigia: ' + (NOME_SEV[sevDe(e.funcionario)] || 'sem dado')) + '<b>' + escH(e.funcionario) + '</b> <u>andar ' + escH(semDado(e.andar)) + ' · ' + escH(e.lider) + ' · ' + escH(hora(e.t_iso)) + '</u><em>' + escH(semDado(e.porque)) + '</em></div>';
    }).join('') : '<div class="enx-vazio">nada escalado</div>';
    var ls = ult.length ? '<div class="enx-lideres">' + ult.map(function (l) {
      return '<span title="' + escH(l.resumo || '') + '"><b>' + escH(l.lider) + '</b> ' + escH(hora(l.t_iso)) + ' · ' + escH(l.fonte === 'python' ? 'sem relatório novo' : (l.provedor || l.fonte)) + '</span>';
    }).join('') + '</div>' : '';
    return cab + corpo + ls;
  }
  function itens(xs) { return lista(xs).map(function (x) { return '<li>' + escH(x) + '</li>'; }).join(''); }
  function secaoStark() {
    var s = obj(E.stark);
    var cab = '<div class="enx-sub">Sr. Stark <em>' + (s.t_iso ? 'parecer das ' + escH(hora(s.t_iso)) + (s.modelo ? ' · ' + escH(s.modelo) : '') : 'sem parecer') + '</em></div>';
    if (!s.t_iso) return cab + '<div class="enx-vazio">o Sr. Stark ainda não deu parecer (sem dado)</div>';
    var ud = obj(s.ultima_decisao);
    var acc = lista(s.accoes).map(function (a) { return '<li><b>' + escH(a.tipo) + '</b> ' + escH(a.alvo) + ' → ' + escH(a.decisao) + (a.razao ? '<em>' + escH(a.razao) + '</em>' : '') + '</li>'; }).join('');
    var props = lista(s.propostas).map(function (p) { return '<li><b>' + escH(p.titulo) + '</b><em>' + escH(p.porque) + '</em></li>'; }).join('');
    return cab +
      '<div class="enx-parecer">' + escH(semDado(s.parecer)) + '</div>' +
      (lista(s.nao_funciona).length ? '<div class="enx-sub2">o que não funciona</div><ul class="enx-lst mau">' + itens(s.nao_funciona) + '</ul>' : '') +
      (lista(s.decidiria).length ? '<div class="enx-sub2">o que decidiria</div><ul class="enx-lst">' + itens(s.decidiria) + '</ul>' : '') +
      (acc ? '<div class="enx-sub2">acções (validadas pelo Python)</div><ul class="enx-lst">' + acc + '</ul>' : '') +
      (props ? '<div class="enx-sub2">pendências que propõe <em>ele promove as que valerem</em></div><ul class="enx-lst prop">' + props + '</ul>' : '') +
      (ud.t_iso ? '<div class="enx-nota">última decisão ' + escH(hora(ud.t_iso)) + ': ' + (ud.lancou ? 'acordou' : 'não acordou') + ' — ' + escH(semDado(ud.porque)) + '</div>' : '');
  }
  function secaoAuditorias() {
    var a = E.auditoria_claude, m = E.meta_frota, out = [];
    if (a) out.push('auditoria Claude ' + hora(a.t_iso) + ': ' + a.divergencias + ' divergência(s) em ' + a.amostra);
    if (m) out.push('meta da frota ' + hora(m.t_iso) + (m.provedor ? ' (' + m.provedor + ')' : '') + ': ' + m.concordam + ' concordam, ' + m.discordam + ' discordam em ' + m.amostra);
    return out.length ? '<div class="enx-nota">' + out.map(escH).join(' · ') + '</div>' : '';
  }
  function pintarCorpo() {
    var cx = $('enx_corpo'); if (!cx || !E) return;
    // vigia do vigia: {sev, texto} (enxame_ecra.vigia_do_vigia_curto); um ficheiro antigo ainda o traz em texto
    var vv = E.vigia_do_vigia, ag = E.agendador;
    var vvSev = (vv && typeof vv === 'object') ? String(vv.sev || '') : (vv === 'ok' ? 'ok' : (vv ? 'amarelo' : ''));
    var vvTxt = (vv && typeof vv === 'object') ? (vv.sev === 'ok' ? 'ok' : String(vv.texto || vv.sev)) : semDado(vv);
    // 25/09 (lote 6G): o andar dela no cabecalho; um clique abre o painel do andar (os cargos e a prova de trabalho)
    var cab = '<div class="enx-estado">' + (E.andar != null ? '<span>andar <b class="enx-ir" data-n="' + escH(E.andar) + '" role="button" tabindex="0" title="abrir o andar da ' + NOME_SHIELD + ': quem faz o quê e o último trabalho de cada um">' + escH(E.andar) + '</b></span>' : '') +
      '<span>batimento <b>' + escH(linhaDoBatimento().texto) + '</b></span>' +
      '<span>vigia do vigia <b class="' + (vvSev === 'ok' ? 'ok' : (vvSev === 'amarelo' ? 'at' : 'mau')) + '">' + escH(vvTxt) + '</b></span>' +
      '<span>agendador <b class="' + (ag === 'ok' ? 'ok' : 'mau') + '">' + escH(semDado(ag)) + '</b></span>' +
      '<span>vigiados <b>' + escH(semDado(obj(E.totais).vigiados)) + '</b></span></div>';
    cx.innerHTML = cab + secaoAndares() + secaoFora() + secaoRelatorios() + secaoLideres() + secaoStark() + secaoAuditorias();
    pintados++;
  }

  // ---------------------------------------------------------------- telemovel: uma linha
  function pintarTelemovel() {
    var el = $('enx_tel'); if (!el || !E) return;
    var bt = linhaDoBatimento(), t = obj(E.totais);
    var verm = lista(E.fora_do_verde).filter(function (f) { return f.sev === 'vermelho'; }).map(function (f) { return f.id; });
    // curto (volta + idade): a 390 px a duracao da volta empurrava o nome do vermelho para fora da linha (medido na captura)
    var b = obj(E.batimento), curto = (b.seq != null ? 'volta ' + b.seq : 'sem batimento') + ' · ' + haQuanto(bt.s).replace('há ', '');
    var html = '<b>' + NOME_SHIELD + '</b><span class="enx-bat' + (bt.parado ? ' parado' : '') + '"><i class="enx-coracao"></i>' + escH(curto) + '</span>' +
      '<span class="enx-tot"><b class="verde">' + (t.verde || 0) + '</b> <b class="amarelo">' + (t.amarelo || 0) + '</b> <b class="vermelho">' + (t.vermelho || 0) + '</b></span>' +
      (verm.length ? '<span class="enx-verm">' + escH(verm.slice(0, 2).join(', ')) + '</span>' : '');
    if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
    el.hidden = false;
  }

  // ---------------------------------------------------------------- 3D e cartoes
  var assLuzes = '';
  function luzes() {
    var P = window.__predio; if (!P || typeof P.vigiaDosAndares !== 'function' || !E) return false;
    var mapa = {}; andares().forEach(function (a) { if (a.sev && a.sev !== 'sem') mapa[a.n] = a.sev; });
    var a = JSON.stringify(mapa);
    if (a === assLuzes) return true;
    try { P.vigiaDosAndares(mapa); assLuzes = a; } catch (e) { return false; }
    return true;
  }
  // o cartao de um CARGO da cadeia (director, gerente de operacoes, supervisor, gerente de andar) leva o PIOR dos
  // andares que chefia - e o que ele tem de ver: um gerente com um andar vermelho por baixo nao esta "verde"
  function sevDoCargo(id) {
    var P = window.__predio, D = P && typeof P.dados === 'function' ? P.dados() : null;
    var topo = lista(obj(obj(D).torre_30).cargos_de_topo), c = null;
    topo.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return null;
    var ns = lista(c.andares).length ? lista(c.andares) : (c.andar != null ? [c.andar] : []), s = null;
    ns.forEach(function (n) { var x = sevDoAndar(n); if (x) s = s ? pior(s, x) : x; });
    return s;
  }
  function marcarCartoes() {
    if (!E) return;
    var cs = document.querySelectorAll('#cartoes .cartao[data-id]'), n = 0;
    for (var i = 0; i < cs.length; i++) {
      var el = cs[i], id = el.dataset.id, s = sevDe(id) || sevDoCargo(id) || '';
      if ((el.getAttribute('data-vg') || '') !== s) { if (s) el.setAttribute('data-vg', s); else el.removeAttribute('data-vg'); }
      if (s) n++;
    }
    cartoesMarcados = n;
  }

  // ---------------------------------------------------------------- ciclo
  function assinatura(d) {
    var b = obj(d.batimento), s = obj(d.stark), rs = lista(d.relatorios), l = obj(d.lideres);
    return [b.seq, s.t_iso, rs.length ? rs[0].t_iso : '', lista(l.escalados).length, JSON.stringify(d.totais),
            JSON.stringify(lista(d.andares).map(function (a) { return a.sev; })), lista(d.fora_do_verde).length].join('|');
  }
  function ler() {
    return fetch(URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        leituras++; lidoEm = Date.now(); E = d;
        var seq = obj(d.batimento).seq;
        var a = assinatura(d);
        if (a !== ass) { ass = a; pintarCorpo(); }
        pintarTitulo(); pintarTelemovel(); luzes(); marcarCartoes();
        if (seq != null && seq !== ultimaSeq) { ultimaSeq = seq; baterCoracao(); }
        var bl = $('bl_enxame'); if (bl) bl.hidden = false;
        return window.__enxame.contagem();
      })
      .catch(function (e) {
        falhas++;
        // sem ficheiro (o site antes da primeira publicacao, ou o servico parado): a seccao diz que falta, nao some
        var kn = $('enx_kn'); if (kn && !E) kn.textContent = NOME_SHIELD + ' sem dado (enxame.json: ' + String(e && e.message || e).slice(0, 40) + ')';
        return null;
      });
  }
  // a idade do batimento anda ao segundo (so o texto do titulo); as luzes tentam de novo ate o 3D existir
  setInterval(function () { if (!E) return; pintarTitulo(); pintarTelemovel(); if (!assLuzes) luzes(); }, 1000);
  setInterval(marcarCartoes, 1500);          // os cartoes AO VIVO trocam de gente: re-marca-se o que entrou
  setInterval(ler, CADA_MS);
  ler();

  // clique num andar da lista abre o painel desse andar (o mesmo do clique na torre); 25/09 (lote 6G): e o numero do
  // andar da S.H.I.E.L.D. no cabecalho da seccao tambem
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('.enx-and[data-n], .enx-ir[data-n]') : null;
    if (!b) return;
    var P = window.__predio; if (P && typeof P.abrir === 'function') P.abrir(Number(b.dataset.n));
  });

  // 25/09 (lote 6G): O ANDAR DA S.H.I.E.L.D. - quem mora aqui, o que faz, e a PROVA do ultimo trabalho de cada cargo
  // (enxame_ecra.prova_de_trabalho: o batimento do vigia, o ultimo relatorio, a ultima linha dos lideres e do conserto).
  // E a resposta, no ecra, a "confirma se eles estao a funcionar, se ja estao a corrigir". So texto e numeros: a forma
  // (os bots a sair do 49 para os andares com trabalho e a voltar) e do Fable, e os dados dela estao em E.visitas.
  function htmlDaShield() {
    var S = obj(E.shield), cs = lista(S.cargos), vs = lista(E.visitas).slice(0, 6), nomeCargo = {};
    cs.forEach(function (c) { nomeCargo[c.id] = c.cargo; });
    var li = cs.map(function (c) {
      var p = obj(c.pessoa), s = idadeS(c.ultima);
      return '<li><b>' + escH(c.cargo) + '</b> · ' + escH(p.titulo || 'sem pessoa') + ' <s>(' + escH(c.camada) + (c.n_agentes ? ', ' + escH(c.n_agentes) + ' agente(s) aqui' : '') + ')</s>' +
        '<em>' + escH(c.faz) + '</em><em>último trabalho: ' + (c.ultima ? escH(haQuanto(s)) + ' — ' + escH(semDado(c.o_que)) : 'sem registo') + '</em></li>';
    }).join('');
    var vis = vs.map(function (v) {
      return '<li>' + escH(hora(v.t_iso)) + ' · ' + escH(nomeCargo[v.cargo] || v.cargo) + ' → andar ' + escH(v.para) + ' (' + escH(v.o_que) + (v.resultado ? ': ' + escH(v.resultado) : '') + (v.funcionario ? ', ' + escH(v.funcionario) : '') + ')</li>';
    }).join('');
    return '<div class="diag enx-painel"><b>' + NOME_SHIELD + '</b> — ' + escH(S.subtitulo || 'Supervisao e Manutencao') + ': ' + escH(S.agentes || 0) +
      ' agente(s) com ficha moram aqui; os cargos sem ficha são chamados pelo código que os usa (e não entram no total).' +
      '<ul class="enx-lst">' + li + '</ul>' +
      (vis ? '<div class="enx-sub2">idas aos andares <em>do dado: relatórios, escaladas e conserto</em></div><ul class="enx-lst">' + vis + '</ul>' : '') + '</div>';
  }

  window.__enxame = {
    ler: ler,
    dados: function () { return E; },
    // o que o painel de um andar (predio.js, corpoDoPainel) mostra sobre a vigia desse andar
    htmlDoAndar: function (n) {
      if (!E) return '';
      if (E.andar != null && Number(n) === Number(E.andar)) return htmlDaShield();
      var a = null; andares().forEach(function (x) { if (x.n === Number(n)) a = x; });
      if (!a) return '<div class="diag enx-painel">Vigia da ' + NOME_SHIELD + ': este andar não tem ninguém vigiado (sem dado).</div>';
      var fs = lista(E.fora_do_verde).filter(function (f) { return f.andar === a.n; });
      return '<div class="diag enx-painel">' + pontoSev(a.sev) + 'Vigia da ' + NOME_SHIELD + ': <b>' + escH(NOME_SEV[a.sev] || a.sev) + '</b> — ' + a.verde + ' verdes, ' + a.amarelo + ' amarelos, ' + a.vermelho + ' vermelhos, ' + a.cinza + ' sem prova.' +
        (fs.length ? '<ul class="enx-lst">' + fs.map(function (f) { return '<li><b>' + escH(f.id) + '</b> ' + escH(f.sev) + (f.tipo ? ' · ' + escH(f.tipo) : '') + '<em>' + escH(f.prova) + '</em></li>'; }).join('') + '</ul>' : '') + '</div>';
    },
    contagem: function () {
      var bt = E ? linhaDoBatimento() : null, corpo = $('enx_corpo'), tel = $('enx_tel');
      return { lido: !!E, leituras: leituras, falhas: falhas, seq: E ? obj(E.batimento).seq : null, idade_s: bt ? bt.s : null, parado: bt ? bt.parado : null,
               andares: andares().length, fora: E ? lista(E.fora_do_verde).length : 0, relatorios: E ? lista(E.relatorios).length : 0,
               escalados: E ? lista(obj(E.lideres).escalados).length : 0, stark: !!(E && obj(E.stark).t_iso), pintados: pintados,
               noCorpo: corpo ? { andares: corpo.querySelectorAll('.enx-and').length, relatorios: corpo.querySelectorAll('.enx-rel').length,
                                  refutadores: corpo.querySelectorAll('.enx-rel-quem').length, parecer: (corpo.querySelector('.enx-parecer') || {}).textContent || '' } : null,
               titulo: ($('enx_kn') || {}).textContent || '', telemovel: tel ? { hidden: !!tel.hidden, texto: tel.textContent || '' } : null,
               luzesPedidas: assLuzes ? Object.keys(JSON.parse(assLuzes)).length : 0, cartoesMarcados: cartoesMarcados,
               // 25/09 (lote 6G): o nome e o andar dela, e o que o painel do andar mostra (para o arreio medir)
               shield: E ? { nome: E.nome || null, andar: E.andar == null ? null : E.andar, cargos: lista(obj(E.shield).cargos).length,
                             comPessoa: lista(obj(E.shield).cargos).filter(function (c) { return c && c.pessoa; }).length,
                             visitas: lista(E.visitas).length,
                             painel: E.andar != null ? (window.__enxame.htmlDoAndar(E.andar).match(/<li>/g) || []).length : 0 } : null };
    }
  };
})();
