// lab_modelos.js — OS MODELOS DO LABORATORIO, numa pagina a parte (sala/lab_modelos.html). 10/10/2026.
//
// O PEDIDO DELE (10/10): "o laboratorio ainda nao ficou bom, quero que tu gere em uma pagina separada alguns modelos
// diferentes e que reagem conforme o movimento". Os 6 do cartao da torre (orbitas, galaxia, atomo, pulsar, enxame,
// planetario - t3b_holo.js) nao lhe agradaram; aqui ficam OITO desenhos novos, todos ao mesmo tempo numa grelha para ele
// comparar (clique = ampliar; Esc ou "voltar" = grelha). Nenhum reaproveita os 6 de la.
//
// OS DADOS (nada inventado):
//   labs.json           os labs: total de genes, robustos, demitidos e uma amostra de ~48 genes (os robustos primeiro)
//   vivo.json?desde=S   o anel de eventos da torre; daqui so interessa o evento "genes" (um lab calculou neste minuto:
//                       previa da sombra, revisao, evolucao). Os outros (batimento, escreveu, ...) ignoram-se.
// No PC vem do servidor da sala (127.0.0.1:8766). Na copia publica (3brain.com.br/torre-viva/) nao ha servidor: o
// vivo.json e uma fotografia de minuto a minuto com os ultimos ~12 min; a pagina le-a de 15 em 15 s e toca os eventos
// novos em DIFERIDO CONTINUO (a hora a que aconteceram + um atraso fixo que nunca encolhe), como o t3b_vivo.js
// (tocarPublicado). Sem calculos, os modelos ficam calmos e a pagina diz "sem calculos agora". O botao "repetir a ultima
// hora" toca de novo, acelerados e marcados REPETICAO, os eventos de genes que a pagina tem do anel.
//
// TECNICA: canvas 2D, UM so relogio (requestAnimationFrame) para os oito, no maximo 30 quadros/s (20 sem calculos, 4 com
// prefers-reduced-motion), ao devicePixelRatio do ecra (ate 2), parado com o separador escondido, e so desenha os
// cartoes a vista. Sem bibliotecas nem CDN. O brilho e uma imagem radial feita uma vez (nada de shadowBlur, o mais caro
// do canvas) e os pontos do mesmo tipo vao num so fill (um PC com Intel UHD 620 tem de aguentar os oito).
//
// CONTRATO DE UM MODELO: {id, nome, descricao, desenhar(ctx, w, h, estado, dt), aoEvento(ev, estado)} (+ quem(x, y, estado)
// para a etiqueta do rato e limpar() para a repeticao). A parte pura (evento -> lab, decaimento, a janela dos 3 min, os
// planos de reproducao, o registo) corre em Node: node --test sala/testes_lab_modelos.js
'use strict';
(function (raiz) {
  var TAU = Math.PI * 2;
  var C = { ouro: '#f2c230', ouroHi: '#ffdc6a', ouroDk: '#7e6210', rob: '#ffd65a', gene: 'rgba(242,194,48,.55)', dem: '#5c5c66',
    flash: '#fff3c4', novo: '#2dd4e8', txt: '#efede8', mute: '#9797a3', dim: '#6a6a76' };
  var F_MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace', F_SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
  var JANELA_ACT_MS = 180000;          // "actividade dos ultimos 3 min"
  var HORA_MS = 3600000;
  var HIST_MS = 65 * 60000;            // a historia que a pagina guarda (a ultima hora + folga)
  var HIST_MAX = 3000;
  var ARRANQUE_PUB_MS = 6 * 60000;     // copia publica: a 1.a fotografia toca os ultimos 6 min (o resto e historia), como o t3b_vivo
  var ESPALHAR_MAX_MS = 12000;         // um lote local com horas espalhadas (a previa escreve de uma vez) toca em no maximo 12 s
  var MEIA_ENERGIA = 1.6, MEIA_PULSO = 0.45, MEIA_LUZ = 0.7, MEIA_NOVO = 25;   // meias-vidas em segundos
  var TIPOS = { previa: 'prévia', revisao: 'revisão', evolucao: 'evolução' };
  // as especialidades (as mesmas constelacoes do t3b_holo.js): os labs da mesma especialidade ficam juntos em todos os desenhos
  var GRUPOS = [['macro', 'Macro', ['macro']], ['cel', 'Células', ['celulas']], ['cri', 'Cripto', ['cripto']],
    ['vol', 'Volume·Preço', ['volume_fluxo', 'preco_accao']], ['rev', 'Reversão', ['reversao_media']], ['ten', 'Tendência', ['tendencia']],
    ['mesa', 'Mesa', ['mesa']]];
  var GRUPO_DA_ESP = {}, NOME_GRUPO = { outro: 'Outros' };
  GRUPOS.forEach(function (g) { NOME_GRUPO[g[0]] = g[1]; g[2].forEach(function (e) { GRUPO_DA_ESP[e] = g[0]; }); });

  // ================================================================ PURAS (testadas em Node)
  function num(x, def) { x = Number(x); return isFinite(x) ? x : (def === undefined ? 0 : def); }
  function clamp(x, a, b) { return x > a ? (x < b ? x : b) : a; }              // NaN -> a
  function decair(v, dt, meia) {
    v = Number(v); if (!(v > 0) || !isFinite(v)) return 0;
    dt = Number(dt); if (!(dt > 0)) return v;
    if (!(meia > 0)) return 0;
    var r = v * Math.pow(0.5, dt / meia);
    return r < 1e-4 ? 0 : r;
  }
  function seguir(v, alvo, k, dt) { return dt > 0 ? v + (alvo - v) * (1 - Math.exp(-k * dt)) : v; }
  function ease(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function frac(x) { return x - Math.floor(x); }
  function semente(s) { var h = 2166136261; s = String(s == null ? '' : s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function forcaDe(n) { return clamp(Math.log(1 + Math.max(0, num(n))) / Math.log(65), 0.18, 1); }
  function corTipo(tipo) { return tipo === 'evolucao' ? C.novo : tipo === 'revisao' ? C.ouroHi : C.flash; }

  // os nomes do organograma vem sem acentos ("Lab. Celulas I", "Lab. Reversao a Media IV"): no ecra vao com eles
  var ACENTOS = [['Celulas', 'Células'], ['Reversao', 'Reversão'], ['Media', 'Média'], ['Tendencia', 'Tendência'], ['Preco', 'Preço'], ['Accao', 'Acção'],
    ['Operacoes', 'Operações'], ['Accoes', 'Acções'], ['Societarias', 'Societárias']];
  function nomeBonito(nome) {
    var s = String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim();
    ACENTOS.forEach(function (p) { s = s.replace(new RegExp('\\b' + p[0] + '\\b', 'g'), p[1]); });
    return s.replace('Reversão a Média', 'Reversão à Média');
  }
  function nomeCurto(nome) {
    var s = nomeBonito(nome).replace(/^Lab\.?\s+/i, '').replace(/^Macro e Mundo\b/, 'Macro').replace(/^Reversão à Média\b/, 'Reversão')
      .replace(/^Mesa de Operações\b/, 'Mesa');
    return s || '?';
  }
  function sigla(curto) {
    var p = String(curto || '?').split(' '), rom = p.length > 1 && /^[IVXL]+$/.test(p[p.length - 1]) ? ' ' + p[p.length - 1] : '';
    return p[0].slice(0, 3) + rom;
  }
  function grupoDe(esp) { return GRUPO_DA_ESP[esp] || 'outro'; }

  // labs.json -> a lista limpa (sem NaN, sem repetidos, por andar)
  function normalizarLabs(d) {
    var lista = d && typeof d === 'object' && Array.isArray(d.labs) ? d.labs : [], vistos = {}, out = [];
    lista.forEach(function (l) {
      if (!l || typeof l !== 'object' || l.n == null || typeof l.n === 'boolean') return;
      var n = Number(l.n); if (!isFinite(n) || vistos[n]) return; vistos[n] = 1;
      var total = Math.max(0, num(l.total)), rob = Math.max(0, num(l.robustos)), dem = Math.max(0, num(l.demitidos)), am = [], ks = {};
      (Array.isArray(l.amostra) ? l.amostra : []).forEach(function (g) {
        if (!g || typeof g !== 'object' || g.k == null || am.length >= 64) return;
        var k = String(g.k); if (ks[k]) return; ks[k] = 1;
        am.push({ k: k, r: !!num(g.r), d: !!num(g.d) });
      });
      var nome = nomeBonito(l.nome) || ('Lab ' + n);
      out.push({ n: n, nome: nome, curto: nomeCurto(nome), esp: String(l.esp == null ? '' : l.esp), total: total, robustos: rob,
        demitidos: dem, fr: total > 0 ? clamp(rob / total, 0, 1) : 0, amostra: am });
    });
    return out.sort(function (a, b) { return a.n - b.n; });
  }

  function criarEstado(op) {
    op = op || {};
    return { labs: [], porAndar: {}, grupos: [], carregado: false, versao: 0, t: 0, agora: 0, relogio: 0, relogioVivo: 0, dpr: 1,
      calmo: !!op.calmo, publicado: !!op.publicado, rep: null, hist: [], histChaves: {}, histVer: 0, cobertura: null, energia: 0,
      totais: { labs: 0, genes: 0, robustos: 0, demitidos: 0 }, act: { genes: 0, robustos: 0, eventos: 0, labs: 0 } };
  }

  // aplica um labs.json novo SEM perder o estado do desenho: o mesmo lab (pelo andar) e o mesmo objecto, e o gene que fica
  // na amostra guarda a luz e a hora do ultimo calculo. Ilegivel = fica o que estava (devolve false).
  function carregarLabs(E, d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.labs)) return false;
    var novos = normalizarLabs(d), antigos = E.porAndar || {}, ordemG = {}, grupos = [];
    var labs = novos.map(function (l) {
      var lab = antigos[l.n] || { energia: 0, pulso: 0, ultMs: 0, ultEvMs: 0, g3: 0, r3: 0, e3: 0, corPulso: C.flash, amostra: [] };
      var velhos = {}; lab.amostra.forEach(function (g) { velhos[g.k] = g; });
      lab.n = l.n; lab.nome = l.nome; lab.curto = l.curto; lab.sigla = sigla(l.curto); lab.esp = l.esp; lab.total = l.total;
      lab.robustos = l.robustos; lab.demitidos = l.demitidos; lab.fr = l.fr; lab.porChave = {};
      lab.amostra = l.amostra.map(function (g) {
        var o = velhos[g.k] || { k: g.k, luz: 0, t: 0, novo: 0, nasceu: 0, rT: 0 };
        o.k = g.k; o.r = g.r; o.d = g.d; o.fora = false; lab.porChave[o.k] = o; return o;
      });
      var gid = grupoDe(l.esp);
      if (ordemG[gid] == null) { ordemG[gid] = grupos.length; grupos.push({ id: gid, nome: NOME_GRUPO[gid] || gid, labs: [] }); }
      lab.grupo = ordemG[gid];
      return lab;
    });
    labs.sort(function (a, b) { return a.grupo - b.grupo || a.n - b.n; });
    var porAndar = {}, tot = { labs: labs.length, genes: 0, robustos: 0, demitidos: 0 };
    labs.forEach(function (lab, i) { lab.i = i; porAndar[lab.n] = lab; grupos[lab.grupo].labs.push(lab); tot.genes += lab.total; tot.robustos += lab.robustos; tot.demitidos += lab.demitidos; });
    E.labs = labs; E.porAndar = porAndar; E.grupos = grupos; E.totais = tot; E.carregado = true; E.versao++;
    return true;
  }

  // o andar de um evento: o campo andar, ou o id "lab:<andar>"
  function andarDoEvento(ev) {
    if (!ev || typeof ev !== 'object') return null;
    if (typeof ev.andar === 'number' && isFinite(ev.andar)) return ev.andar;
    if (typeof ev.andar === 'string' && /^\d+$/.test(ev.andar)) return Number(ev.andar);
    var m = typeof ev.id === 'string' ? /^lab:(\d+)$/.exec(ev.id) : null;
    return m ? Number(m[1]) : null;
  }
  function labDoEvento(ev, E) {
    if (!ev || ev.k !== 'genes' || !E || !E.porAndar) return null;
    var a = andarDoEvento(ev);
    return a == null ? null : (E.porAndar[a] || null);
  }
  // a identidade de um evento (o anel recomeca o seq quando o servidor reinicia, a hora nao)
  function chaveDoEvento(ev) { return ev ? [ev.s, ev.t, ev.id, ev.k].map(function (x) { return x == null ? '' : String(x); }).join('#') : ''; }
  // um evento "genes" cru -> normalizado (null para todos os outros e para o que nao se percebe)
  function normalizarEvento(ev) {
    if (!ev || typeof ev !== 'object' || ev.k !== 'genes') return null;
    if (ev._n) return ev;
    var andar = andarDoEvento(ev); if (andar == null) return null;
    var ms = typeof ev.t === 'string' ? Date.parse(ev.t) : NaN; if (!isFinite(ms)) return null;
    var vistos = {}, chaves = [], robustas = [];
    (Array.isArray(ev.chaves) ? ev.chaves : []).forEach(function (k) { if (k == null || chaves.length >= 32) return; k = String(k); if (!vistos[k]) { vistos[k] = 1; chaves.push(k); } });
    (Array.isArray(ev.robustas) ? ev.robustas : []).forEach(function (k) { if (k != null && robustas.length < 32) robustas.push(String(k)); });
    return { _n: 1, k: 'genes', andar: andar, ms: ms, t: ev.t, n: Math.max(chaves.length, Math.floor(clamp(num(ev.n), 0, 1e6))), chaves: chaves,
      robustas: robustas, tipo: TIPOS[ev.tipo] ? ev.tipo : 'outro', quem: String(ev.quem == null ? '' : ev.quem),
      s: isFinite(Number(ev.s)) && ev.s !== null ? Number(ev.s) : null, chave: chaveDoEvento(ev), rob: 0 };
  }
  // quantas das chaves do evento sao robustas (pela revisao que vem no evento ou pela amostra do labs.json)
  function contarRobustos(lab, e) {
    var rob = {}, c = 0;
    e.robustas.forEach(function (k) { rob[k] = 1; });
    e.chaves.forEach(function (k) { var g = lab && lab.porChave[k]; if (rob[k] || (g && g.r && !g.d)) c++; });
    return c;
  }
  // a historia (para a janela dos 3 min, o mapa de calor e a repeticao): sem repetidos, por ordem do tempo
  function registarHistoria(E, e) {
    if (!e || E.histChaves[e.chave]) return false;
    E.histChaves[e.chave] = 1;
    var h = E.hist, i = h.length;
    while (i > 0 && h[i - 1].ms > e.ms) i--;
    h.splice(i, 0, e);
    if (h.length > HIST_MAX) h.splice(0, h.length - HIST_MAX).forEach(function (x) { delete E.histChaves[x.chave]; });
    E.histVer++;
    return true;
  }
  function podarHistoria(E, agora) {
    var h = E.hist, corte = agora - HIST_MS, n = 0;
    while (n < h.length && h[n].ms < corte) n++;
    if (n) { h.splice(0, n).forEach(function (x) { delete E.histChaves[x.chave]; }); E.histVer++; }
  }
  // um gene que calculou e nao esta na amostra ocupa o lugar do gene da amostra calculado ha mais tempo (nunca um robusto,
  // se houver outro): a estrela/folha/conta desse lab acende na mesma. O labs.json seguinte (1 min) repoe a amostra.
  function reciclar(lab, k) {
    var am = lab.amostra, alvo = null, i;
    for (i = am.length - 1; i >= 0; i--) { var g = am[i]; if (g.r && !g.d) continue; if (!alvo || g.t < alvo.t) alvo = g; }
    if (!alvo) for (i = am.length - 1; i >= 0; i--) if (!alvo || am[i].t < alvo.t) alvo = am[i];
    if (!alvo) return null;
    delete lab.porChave[alvo.k];
    alvo.k = k; alvo.r = false; alvo.d = false; alvo.fora = true; alvo.rT = 0; alvo.novo = 0; alvo.nasceu = 0;
    lab.porChave[k] = alvo;
    return alvo;
  }
  // O EVENTO CHEGA AO LABORATORIO. modo: 'vivo' (acende e anima), 'silencioso' (so entra na historia: o anel lido ao abrir,
  // o que chega com o separador escondido) ou 'repeticao' (anima, mas nao mexe na historia). Devolve o evento resolvido
  // (o que os modelos recebem no aoEvento) ou null.
  function aplicarEvento(E, ev, modo, agora) {
    var e = normalizarEvento(ev);
    if (!e) return null;
    agora = num(agora, Date.now());
    modo = modo === 'silencioso' || modo === 'repeticao' ? modo : 'vivo';
    var lab = E.porAndar[e.andar] || null;
    if (modo !== 'repeticao') {
      if (lab) e.rob = contarRobustos(lab, e);
      registarHistoria(E, e);
      if (lab && e.ms > lab.ultEvMs) lab.ultEvMs = e.ms;
    }
    if (modo === 'silencioso' || !lab) return null;
    var rob = {}, genes = [];
    e.robustas.forEach(function (k) { rob[k] = 1; });
    e.chaves.forEach(function (k) {
      var g = lab.porChave[k], fora = false;
      if (!g) { g = reciclar(lab, k); fora = true; }
      if (!g) return;
      if (rob[k] && !g.r) { g.r = true; g.rT = agora; }
      g.luz = 1; g.t = agora;
      if (e.tipo === 'evolucao') { g.novo = 1; if (fora) g.nasceu = agora; }
      genes.push({ g: g, fora: fora, novo: e.tipo === 'evolucao', r: !!(g.r && !g.d) });
    });
    var forca = forcaDe(e.n);
    lab.energia = Math.min(4, lab.energia + 0.55 + 0.9 * forca);
    lab.pulso = 1; lab.ultMs = agora; lab.corPulso = corTipo(e.tipo);
    return { k: 'genes', andar: e.andar, n: e.n, tipo: e.tipo, ms: e.ms, t: e.t, chaves: e.chaves, robustas: e.robustas,
      rob: e.rob || genes.filter(function (x) { return x.r; }).length, quem: e.quem, lab: lab, genes: genes, forca: forca,
      modo: modo, rep: modo === 'repeticao', ev: e };
  }
  // a janela dos ultimos 3 min (no relogio dos eventos: ao vivo e agora, na repeticao e o cursor). Fica em cada lab:
  // g3 = genes calculados, r3 = estimativa dos robustos, e3 = eventos.
  function actividade(E, relogio, janela) {
    relogio = num(relogio, 0); janela = num(janela, JANELA_ACT_MS);
    var labs = E.labs, h = E.hist, ini = relogio - janela, i, tot = { genes: 0, robustos: 0, eventos: 0, labs: 0 };
    for (i = 0; i < labs.length; i++) { labs[i].g3 = 0; labs[i].r3 = 0; labs[i].e3 = 0; }
    var lo = 0, hi = h.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (h[m].ms <= ini) lo = m + 1; else hi = m; }
    for (i = lo; i < h.length && h[i].ms <= relogio; i++) {
      var e = h[i], lab = E.porAndar[e.andar]; if (!lab) continue;
      var rob = e.chaves.length ? e.n * clamp((e.rob || 0) / e.chaves.length, 0, 1) : 0;
      if (!lab.e3) tot.labs++;
      lab.g3 += e.n; lab.r3 += rob; lab.e3++; tot.genes += e.n; tot.robustos += rob; tot.eventos++;
    }
    E.act = tot;
    return tot;
  }
  // o tempo passa: a energia, o pulso e a luz de cada gene apagam-se (meias-vidas acima)
  function passo(E, dt) {
    var soma = 0;
    for (var i = 0; i < E.labs.length; i++) {
      var lab = E.labs[i], am = lab.amostra;
      lab.energia = decair(lab.energia, dt, MEIA_ENERGIA); lab.pulso = decair(lab.pulso, dt, MEIA_PULSO); soma += lab.energia;
      for (var j = 0; j < am.length; j++) { var g = am[j]; if (g.luz) g.luz = decair(g.luz, dt, MEIA_LUZ); if (g.novo) g.novo = decair(g.novo, dt, MEIA_NOVO); }
    }
    E.energia = soma;
    return soma;
  }
  // o mapa de calor: genes por lab e por minuto (nMin colunas cheias + o minuto em curso), so eventos ate `ref`
  function celulasDoMapa(E, ref, nMin) {
    nMin = Math.max(1, Math.floor(num(nMin, 60))); ref = num(ref, 0);
    var base = Math.floor(ref / 60000), ini = base - nMin, porLab = {}, robLab = {}, max = 0;
    E.labs.forEach(function (lab) { porLab[lab.n] = new Float64Array(nMin + 1); robLab[lab.n] = new Float64Array(nMin + 1); });
    E.hist.forEach(function (e) {
      if (e.ms > ref) return;
      var c = Math.floor(e.ms / 60000) - ini, a = porLab[e.andar];
      if (!a || c < 0 || c > nMin) return;
      a[c] += e.n; if (a[c] > max) max = a[c];
      if (e.rob) robLab[e.andar][c] += e.rob;
    });
    return { base: base, ini: ini, n: nMin, porLab: porLab, robLab: robLab, max: max,
      coberturaCol: E.cobertura == null ? null : Math.floor(E.cobertura / 60000) - ini };
  }
  // NO PC: um lote novo toca ao ritmo real (o servidor da os eventos ao segundo); um lote com horas muito espalhadas (a
  // previa da sombra escreve o ficheiro de uma vez) espalha-se em no maximo maxMs, pela ordem. Devolve [{quando, ev}].
  function planearLocal(evs, agora, maxMs) {
    maxMs = num(maxMs, ESPALHAR_MAX_MS);
    var ok = (evs || []).filter(function (e) { return e && isFinite(e.ms); }).slice().sort(function (a, b) { return a.ms - b.ms; });
    if (!ok.length) return [];
    var t0 = ok[0].ms, span = ok[ok.length - 1].ms - t0, k = span > maxMs ? maxMs / span : 1;
    return ok.map(function (e) { return { quando: agora + (e.ms - t0) * k, ev: e }; });
  }
  // NA COPIA PUBLICA (o tocarPublicado do t3b_vivo.js): cada evento sai a hora em que aconteceu + pub.D. A 1.a fotografia
  // toca os ultimos 6 min (o mais velho fica historia); se uma fotografia chega tarde, D estica - nunca encolhe (a ordem fica).
  function planearPublicado(evs, pub, agora, primeira) {
    var ok = (evs || []).filter(function (e) { return e && isFinite(e.ms) && e.ms > 0; }).slice().sort(function (a, b) { return a.ms - b.ms; });
    var out = { fila: [], historia: [] };
    if (!ok.length) return out;
    var maxMs = ok[ok.length - 1].ms;
    if (primeira) {
      out.historia = ok.filter(function (e) { return e.ms < maxMs - ARRANQUE_PUB_MS; });
      ok = ok.filter(function (e) { return e.ms >= maxMs - ARRANQUE_PUB_MS; });
    }
    if (!ok.length) return out;
    if (pub.D == null || ok[0].ms + pub.D < agora - 2000) pub.D = agora - ok[0].ms;
    out.fila = ok.map(function (e) { return { quando: e.ms + pub.D, ev: e }; });
    return out;
  }
  // A REPETICAO: os eventos reais, por ordem, comprimidos (no minimo 20x; uma hora inteira cabe em ~45 s)
  function planearRepeticao(evs, agora, op) {
    op = op || {};
    var durMax = num(op.duracaoMax, 45000), velMin = num(op.velocidadeMin, 20), antes = num(op.antes, 900);
    var ok = (evs || []).filter(function (e) { return e && isFinite(e.ms); }).slice().sort(function (a, b) { return a.ms - b.ms; });
    if (!ok.length) return null;
    var t0 = ok[0].ms, t1 = ok[ok.length - 1].ms, span = t1 - t0, vel = Math.max(velMin, span / Math.max(1, durMax)), inicio = agora + antes;
    return { inicio: inicio, fim: inicio + span / vel, t0: t0, t1: t1, vel: vel, i: 0, n: ok.length,
      fila: ok.map(function (e) { return { quando: inicio + (e.ms - t0) / vel, ev: e }; }) };
  }
  function cursorDaRepeticao(rep, agora) {
    if (!rep) return null;
    return clamp(rep.t0 + (agora - rep.inicio) * rep.vel, rep.t0 - rep.vel * 1000, rep.t1);
  }
  // publicado = nao e o servidor da sala (127.0.0.1 / localhost, ou a porta 8766 aberta na rede de casa)
  function modoPublicado(loc) {
    if (!loc) return false;
    var h = String(loc.hostname || '').toLowerCase(), p = String(loc.port || ''), pr = String(loc.protocol || '');
    if (pr === 'file:' || !h) return false;
    if (h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]') return false;
    return p !== '8766';
  }
  var FMT_H = null, FMT_HS = null, FMT_N = null;
  try {
    FMT_H = new Intl.DateTimeFormat('pt-PT', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
    FMT_HS = new Intl.DateTimeFormat('pt-PT', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    FMT_N = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  } catch (e) { /* sem Intl: hora local e numeros simples */ }
  function horaBrt(ms, seg) {
    ms = Number(ms); if (!isFinite(ms)) return '—';
    var d = new Date(ms), f = seg ? FMT_HS : FMT_H;
    if (f) return f.format(d);
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + (seg ? ':' + p(d.getSeconds()) : '');
  }
  function fmtInt(v) { v = Math.round(num(v)); return FMT_N ? FMT_N.format(v) : String(v); }
  function pct(x) { return Math.round(clamp(num(x), 0, 1) * 100) + '%'; }

  // ================================================================ AJUDAS DE DESENHO
  var SPRITES = {}, RGB = {};
  function novoCanvas(w, h) {
    if (typeof document === 'undefined' || !document || typeof document.createElement !== 'function') return null;
    var c = document.createElement('canvas');
    if (!c || typeof c.getContext !== 'function') return null;
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function rgbDe(c) {
    if (RGB[c]) return RGB[c];
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c), v;
    if (m) v = parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16);
    else { var n = /rgba?\(([^)]+)\)/.exec(c); v = n ? n[1].split(',').slice(0, 3).map(function (x) { return x.trim(); }).join(',') : '255,255,255'; }
    return (RGB[c] = v);
  }
  function cor(rgb, a) { a = a > 1 ? 1 : a > 0 ? a : 0; return 'rgba(' + rgb + ',' + a.toFixed(3) + ')'; }
  // o brilho: uma imagem radial por cor e raio, feita uma vez e somada por cima ('lighter')
  function sprite(c, r) {
    r = Math.max(2, Math.min(64, Math.round(r)));
    var k = c + '|' + r; if (k in SPRITES) return SPRITES[k];
    var cv = novoCanvas(r * 4, r * 4), g = cv ? cv.getContext('2d') : null;
    if (!g || typeof g.createRadialGradient !== 'function') return (SPRITES[k] = null);
    var rgb = rgbDe(c), gr = g.createRadialGradient(r * 2, r * 2, 0, r * 2, r * 2, r * 2);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.18, 'rgba(' + rgb + ',.6)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.15)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, r * 4, r * 4);
    return (SPRITES[k] = cv);
  }
  function luz(ctx, c, x, y, r, a) {
    if (!(a > 0.01) || !(r > 0.5) || !isFinite(x) || !isFinite(y)) return;
    var sp = sprite(c, r), ga = ctx.globalAlpha, op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
    if (sp) ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
    else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
  }
  function fonte(peso, tam, mono) { return (peso || 500) + ' ' + (Math.round(tam * 10) / 10) + 'px ' + (mono ? F_MONO : F_SANS); }
  function porFonte(ctx, f) { if (ctx._f !== f) { ctx.font = f; ctx._f = f; } }
  function escrever(ctx, t, x, y, c, tam, al, peso, mono) {
    porFonte(ctx, fonte(peso, tam, mono)); ctx.fillStyle = c; ctx.textAlign = al || 'left'; ctx.fillText(String(t), x, y);
  }
  // o texto cabe na largura: a letra encolhe ate 6 px; se nem assim, sai a sigla. contorno = letra com aro escuro (por cima de cor)
  function escreverCabe(ctx, t, x, y, c, tam, al, peso, mono, maxW, contorno, alt) {
    t = String(t); var f = fonte(peso, tam, mono); porFonte(ctx, f);
    var lw = ctx.measureText(t).width, tt = tam;
    if (maxW > 0 && lw > maxW) {
      tt = Math.max(6, tam * maxW / lw);
      if (tt === 6 && alt) { t = String(alt); tt = tam; porFonte(ctx, fonte(peso, tt, mono)); lw = ctx.measureText(t).width; if (lw > maxW) tt = Math.max(6, tam * maxW / lw); }
    }
    porFonte(ctx, fonte(peso, tt, mono)); ctx.textAlign = al || 'left';
    if (contorno) { ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,8,10,.85)'; ctx.strokeText(t, x, y); ctx.lineWidth = 1; }
    ctx.fillStyle = c; ctx.fillText(t, x, y);
  }
  // muitos rectangulos/tracos/bolas da mesma cor num so fill (um Float32Array reaproveitado: nada de lixo por quadro)
  function Lote(n) { this.b = new Float32Array(n * 4); this.n = 0; this.cap = n; }
  Lote.prototype.por = function (a, b, c, d) { if (this.n >= this.cap) return; var i = this.n++ * 4; this.b[i] = a; this.b[i + 1] = b; this.b[i + 2] = c; this.b[i + 3] = d; };
  Lote.prototype.rects = function (ctx, c, a) {
    if (!this.n) return; ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = c; ctx.beginPath();
    for (var i = 0; i < this.n; i++) { var k = i * 4; ctx.rect(this.b[k], this.b[k + 1], this.b[k + 2], this.b[k + 3]); }
    ctx.fill(); ctx.globalAlpha = 1;
  };
  Lote.prototype.tracos = function (ctx, c, larg, a) {
    if (!this.n) return; ctx.globalAlpha = a == null ? 1 : a; ctx.strokeStyle = c; ctx.lineWidth = larg; ctx.lineCap = 'round'; ctx.beginPath();
    for (var i = 0; i < this.n; i++) { var k = i * 4; ctx.moveTo(this.b[k], this.b[k + 1]); ctx.lineTo(this.b[k + 2], this.b[k + 3]); }
    ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  };
  Lote.prototype.bolas = function (ctx, c, a) {
    if (!this.n) return; ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = c; ctx.beginPath();
    for (var i = 0; i < this.n; i++) { var k = i * 4, r = Math.max(0.1, this.b[k + 2]); ctx.moveTo(this.b[k] + r, this.b[k + 1]); ctx.arc(this.b[k], this.b[k + 1], r, 0, TAU); }
    ctx.fill(); ctx.globalAlpha = 1;
  };
  // sem labs ainda (ou nenhum): o aviso no meio, e o modelo nao desenha
  function pronto(ctx, w, h, E) {
    if (!(w > 24 && h > 24)) return false;
    if (!E || !E.carregado) { escrever(ctx, 'a ler os laboratórios…', w / 2, h / 2 + 4, C.dim, 10, 'center', 500); return false; }
    if (!E.labs.length) { escrever(ctx, 'o labs.json não trouxe laboratórios', w / 2, h / 2 + 4, C.dim, 10, 'center', 500); return false; }
    return true;
  }
  // as faixas horizontais (uma por lab, com folga entre especialidades): rio, cardiograma, mapa
  function faixas(E, topo, fundo, folga) {
    var N = Math.max(1, E.labs.length), G = E.grupos.length, f = G > 1 ? folga : 0;
    var lh = Math.max(1, (fundo - topo - f * (G - 1)) / N), y = topo, gAnt = null, out = [];
    E.labs.forEach(function (lab) { if (gAnt !== null && lab.grupo !== gAnt) y += f; gAnt = lab.grupo; out.push({ lab: lab, y: y, yc: y + lh / 2 }); y += lh; });
    return { lh: lh, linhas: out };
  }
  // as etiquetas nunca ficam por cima umas das outras: cada uma procura um sitio livre (ate 3 tentativas) ou nao sai
  function Arrumador() { this.r = []; }
  Arrumador.prototype.tentar = function (ctx, t, x, y, tam, al, peso, mono, desvios) {
    porFonte(ctx, fonte(peso, tam, mono));
    var lw = ctx.measureText(String(t)).width, x0 = al === 'right' ? x - lw : al === 'center' ? x - lw / 2 : x, ds = desvios || [0, tam + 2, -(tam + 2)];
    for (var k = 0; k < ds.length; k++) {
      var y0 = y + ds[k] - tam, y1 = y + ds[k] + 2, livre = true;
      for (var i = 0; i < this.r.length && livre; i++) { var q = this.r[i]; if (x0 - 2 < q[2] && x0 + lw + 2 > q[0] && y0 < q[3] && y1 > q[1]) livre = false; }
      if (livre) { this.r.push([x0, y0, x0 + lw, y1]); return y + ds[k]; }
    }
    return null;
  };
  function maisPerto(lista, x, y, maxD) {
    var best = null, bd = Infinity;
    for (var i = 0; i < lista.length; i++) { var o = lista[i], dx = x - o.x, dy = y - o.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
    return best && bd <= maxD * maxD ? best : null;
  }

  // ================================================================ OS MODELOS (o registo)
  var FABRICAS = [];
  function registar(f) { FABRICAS.push(f); }

  // ---------------------------------------------------------------- 1. COLMEIA
  // 25 celulas hexagonais (uma por lab). O mel e a fraccao de robustos (robustos/total, do labs.json); as contas a volta sao a
  // amostra (ouro = robusto, cinza = demitido). Um calculo faz a celula pulsar e uma ONDA corre pelas vizinhas (atraso pela
  // distancia no favo).
  registar(function () {
    var HEX = [];
    for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i - Math.PI / 2; HEX.push(Math.cos(a), Math.sin(a)); }
    function hex(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x + HEX[0] * r, y + HEX[1] * r); for (var i = 1; i < 6; i++) ctx.lineTo(x + HEX[i * 2] * r, y + HEX[i * 2 + 1] * r); ctx.closePath(); }
    var S = { chave: '', cel: [], R: 0, dist: [], ondas: [], cor: {} };
    var lRob = new Lote(1800), lGene = new Lote(1800), lDem = new Lote(1800), lNovo = new Lote(1800);
    function arrumar(ctx, w, h, E) {
      var N = E.labs.length, s3 = Math.sqrt(3), pad = 6, best = null, c, l, R;
      for (c = 1; c <= Math.min(12, N); c++) {
        l = Math.ceil(N / c);
        R = Math.min((w - 2 * pad) / (s3 * (c + (l > 1 ? 0.5 : 0))), (h - 2 * pad) / (1.5 * l + 0.5));
        if (!best || R > best.R + 0.01) best = { c: c, l: l, R: R };
      }
      R = Math.max(3, best.R); c = best.c; l = best.l;
      var gw = s3 * R * (c + (l > 1 ? 0.5 : 0)), gh = R * (1.5 * l + 0.5), x0 = (w - gw) / 2, y0 = (h - gh) / 2;
      S.R = R; S.cel = [];
      E.labs.forEach(function (lab, i) {
        var lin = Math.floor(i / c), col = i % c, x = x0 + s3 * R * (col + 0.5 + (lin & 1) * 0.5), y = y0 + R + 1.5 * R * lin;
        var mel = ctx.createLinearGradient(x, y + R, x, y - R);
        mel.addColorStop(0, '#3f3005'); mel.addColorStop(0.5, '#a9821a'); mel.addColorStop(1, '#ffd65a');
        var qx = col - (lin - (lin & 1)) / 2;
        S.cel.push({ lab: lab, x: x, y: y, mel: mel, q: [qx, -qx - lin, lin] });
      });
      S.dist = S.cel.map(function (a) { return S.cel.map(function (b) { return Math.max(Math.abs(a.q[0] - b.q[0]), Math.abs(a.q[1] - b.q[1]), Math.abs(a.q[2] - b.q[2])); }); });
    }
    return {
      id: 'colmeia', nome: 'Colmeia',
      descricao: 'Cada célula é um laboratório. O mel dourado é a fracção de genes robustos e as contas à volta são os genes da amostra. Quando o lab calcula, a célula pulsa e a onda passa às vizinhas.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(ctx, w, h, E); S.chave = k; }
        var t = E.t, R = S.R, grande = R >= 34, i, j;
        for (i = S.ondas.length - 1; i >= 0; i--) if (t - S.ondas[i].t0 > 3 || t < S.ondas[i].t0 - 1) S.ondas.splice(i, 1);
        lRob.n = lGene.n = lDem.n = lNovo.n = 0;
        var acesas = [];
        for (i = 0; i < S.cel.length; i++) {
          var c = S.cel[i], lab = c.lab, e = Math.min(1, lab.energia), p = lab.pulso, onda = 0;
          if (!E.calmo) for (j = 0; j < S.ondas.length; j++) {
            var on = S.ondas[j], d = (S.dist[on.i] || [])[i] || 0, x = (t - on.t0 - d * 0.09) / 0.34;
            if (x > 0 && x < 1) onda += on.forca * Math.pow(0.64, d) * Math.sin(Math.PI * x);
          }
          onda = Math.min(1, onda);
          var r = R * 0.92 * (E.calmo ? 1 : 1 + 0.07 * p + 0.06 * onda);
          c.r = r;
          hex(ctx, c.x, c.y, r); ctx.fillStyle = 'rgba(16,14,9,.92)'; ctx.fill();
          if (lab.fr > 0) {                                   // o mel (robustos/total), com a superficie a ondular quando ha actividade
            ctx.save(); hex(ctx, c.x, c.y, Math.max(0.5, r - 0.8)); ctx.clip();
            var topo = c.y + r - 2 * r * Math.min(1, lab.fr), amp = E.calmo ? 0 : 0.35 + 2.2 * Math.max(e, onda);
            ctx.beginPath(); ctx.moveTo(c.x - r, c.y + r + 1);
            for (j = 0; j <= 10; j++) ctx.lineTo(c.x - r + j * r / 5, topo + Math.sin(t * 2.3 + j * 0.8 + i * 1.7) * amp);
            ctx.lineTo(c.x + r, c.y + r + 1); ctx.closePath();
            ctx.globalAlpha = 0.6 + 0.35 * Math.max(e, onda); ctx.fillStyle = c.mel; ctx.fill(); ctx.globalAlpha = 1;
            ctx.restore(); ctx._f = null;
          }
          if (p > 0.02 || onda > 0.02) { hex(ctx, c.x, c.y, r); ctx.globalAlpha = Math.min(0.55, 0.4 * p + 0.22 * onda); ctx.fillStyle = S.cor[lab.n] || C.flash; ctx.fill(); ctx.globalAlpha = 1; }
          hex(ctx, c.x, c.y, r); ctx.lineWidth = grande ? 1.4 : 1; ctx.strokeStyle = cor('242,194,48', 0.24 + 0.5 * e + 0.3 * onda); ctx.stroke();
          if (R >= 17) {                                      // as contas: a amostra de genes do lab, num colar
            var am = lab.amostra, m = am.length, rc = r * 0.76, tam = grande ? 1.7 : 1.05;
            for (j = 0; j < m; j++) {
              var g = am[j], a = -Math.PI / 2 + j * TAU / m, px = c.x + Math.cos(a) * rc, py = c.y + Math.sin(a) * rc, tt = g.r && !g.d ? tam * 1.25 : tam;
              (g.d ? lDem : g.r ? lRob : g.novo > 0.08 ? lNovo : lGene).por(px - tt, py - tt, tt * 2, tt * 2);
              if (g.luz > 0.06) acesas.push(px, py, g.luz, g.novo > 0.3 ? 1 : 0);
            }
          }
        }
        lGene.rects(ctx, 'rgba(242,194,48,.5)'); lDem.rects(ctx, C.dem); lNovo.rects(ctx, C.novo); lRob.rects(ctx, C.rob);
        for (i = 0; i < acesas.length; i += 4) luz(ctx, acesas[i + 3] ? C.novo : C.flash, acesas[i], acesas[i + 1], grande ? 7 : 4.5, acesas[i + 2]);
        for (i = 0; i < S.cel.length; i++) {                 // o andar e o nome (com aro escuro: lê-se por cima do mel)
          var c2 = S.cel[i], l2 = c2.lab, e2 = Math.min(1, l2.energia);
          escreverCabe(ctx, String(l2.n), c2.x, c2.y - R * (grande ? 0.26 : 0.2), e2 > 0.1 ? C.ouroHi : 'rgba(242,194,48,.9)', grande ? 12 : 8.5, 'center', 700, true, R * 1.2, true);
          if (R >= 15) escreverCabe(ctx, l2.curto, c2.x, c2.y + R * (grande ? 0.16 : 0.2), cor('239,237,232', 0.8 + 0.2 * e2), grande ? 11 : 7.5, 'center', 500, false, R * 1.3, true, l2.sigla);
          if (grande) escreverCabe(ctx, fmtInt(l2.robustos) + '/' + fmtInt(l2.total) + ' · ' + pct(l2.fr), c2.x, c2.y + R * 0.46, C.mute, 9, 'center', 500, true, R * 1.3, true);
        }
      },
      aoEvento: function (r, E) {
        S.cor[r.lab.n] = corTipo(r.tipo);
        if (E.calmo) return;
        var i = E.labs.indexOf(r.lab); if (i < 0) return;
        S.ondas.push({ i: i, t0: E.t, forca: r.forca }); if (S.ondas.length > 30) S.ondas.shift();
      },
      quem: function (x, y) { var c = maisPerto(S.cel, x, y, S.R); return c ? { lab: c.lab } : null; },
      limpar: function () { S.ondas = []; }
    };
  });

  // ---------------------------------------------------------------- 2. RIO
  // Uma faixa por lab; cada calculo solta uma RAJADA de gotas na nascente (tantas quanto mais genes; douradas = robustas,
  // ciano = genes novos). A corrente fina e continua e a actividade real dos ultimos 3 min; sem ela, o leito fica tracejado
  // e quieto (so o tracejado corre devagar - o rio em repouso).
  registar(function () {
    var MAX = 900, P = { n: 0, x: new Float32Array(MAX), v: new Float32Array(MAX), y: new Float32Array(MAX), f: new Float32Array(MAX), l: new Int16Array(MAX), k: new Uint8Array(MAX) };
    var S = { chave: '', fx: [], lh: 1, esq: 0, dir: 0, acum: [], nLabs: -1, cor: {}, fade: null, grande: false };
    var ORDEM = [3, 0, 2, 1], CORES = ['rgba(255,243,196,.92)', '#ffd65a', '#2dd4e8', 'rgba(242,194,48,.5)'];   // 0 calculo 1 robusta 2 nova 3 corrente
    function soltar(li, tipo, atraso, vel) { if (P.n >= MAX) return; var q = P.n++; P.x[q] = -atraso * vel; P.v[q] = vel; P.y[q] = Math.random() * 2 - 1; P.f[q] = Math.random() * TAU; P.l[q] = li; P.k[q] = tipo; }
    function tirar(q) { var u = --P.n; if (q !== u) { P.x[q] = P.x[u]; P.v[q] = P.v[u]; P.y[q] = P.y[u]; P.f[q] = P.f[u]; P.l[q] = P.l[u]; P.k[q] = P.k[u]; } }
    function yDe(q, t) { var f = S.fx[P.l[q]]; return f.yc + P.y[q] * S.lh * 0.28 + Math.sin(t * 3.1 + P.f[q]) * S.lh * 0.1; }
    function arrumar(ctx, w, h, E) {
      var grande = w >= 560; S.grande = grande;
      S.esq = grande ? 136 : 22; S.dir = Math.max(S.esq + 10, w - (grande ? 76 : 8));
      var fz = faixas(E, grande ? 12 : 7, h - (grande ? 12 : 7), grande ? 7 : 3); S.lh = fz.lh; S.fx = fz.linhas;
      if (S.nLabs !== E.labs.length) { P.n = 0; S.acum = []; S.nLabs = E.labs.length; }
      var fd = ctx.createLinearGradient(S.dir - 34, 0, S.dir + 1, 0); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)'); S.fade = fd;
    }
    return {
      id: 'rio', nome: 'Rio',
      descricao: 'Uma faixa por laboratório. Cada cálculo solta uma rajada de partículas na nascente (douradas = robustas, ciano = genes novos); a corrente fina e contínua é a actividade dos últimos 3 min.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(ctx, w, h, E); S.chave = k; }
        var L = Math.max(1, S.dir - S.esq), t = E.t, lh = S.lh, i, q, f;
        if (!E.calmo && dt > 0) for (i = 0; i < E.labs.length; i++) {
          var lab = E.labs[i]; if (!(lab.g3 > 0)) { S.acum[i] = 0; continue; }
          S.acum[i] = (S.acum[i] || 0) + dt * (0.3 + 0.55 * Math.log(1 + lab.g3) / Math.LN2);
          while (S.acum[i] >= 1) { S.acum[i] -= 1; soltar(i, 3, 0, 0.17 + Math.random() * 0.07); }
        }
        ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.lineDashOffset = E.calmo ? 0 : -((t * 8) % 8);
        ctx.strokeStyle = 'rgba(242,194,48,.14)'; ctx.beginPath();
        for (i = 0; i < S.fx.length; i++) if (S.fx[i].lab.energia <= 0.03) { ctx.moveTo(S.esq, S.fx[i].yc); ctx.lineTo(S.dir, S.fx[i].yc); }
        ctx.stroke(); ctx.setLineDash([]);
        for (i = 0; i < S.fx.length; i++) {
          f = S.fx[i]; var e = f.lab.energia; if (e <= 0.03) continue;
          ctx.strokeStyle = cor('242,194,48', 0.14 + 0.5 * Math.min(1, e)); ctx.lineWidth = 1 + Math.min(1, e) * (lh > 10 ? 1.4 : 0.6);
          ctx.beginPath(); ctx.moveTo(S.esq, f.yc); ctx.lineTo(S.dir, f.yc); ctx.stroke();
        }
        ctx.lineWidth = 1;
        for (q = P.n - 1; q >= 0; q--) { if (!E.calmo) P.x[q] += P.v[q] * dt; if (P.x[q] > 1.03 || P.l[q] >= S.fx.length) tirar(q); }
        var gl = S.grande ? 2 : 1;
        for (var o = 0; o < 4; o++) {
          var tipo = ORDEM[o], len = (tipo === 3 ? 2.2 : 3.4) * gl, esp = (tipo === 1 ? 2.1 : tipo === 3 ? 1 : 1.4) * gl, tem = false;
          ctx.fillStyle = CORES[tipo]; ctx.beginPath();
          for (q = 0; q < P.n; q++) { if (P.k[q] !== tipo || P.x[q] < 0) continue; ctx.rect(S.esq + P.x[q] * L - len, yDe(q, t) - esp / 2, len, esp); tem = true; }
          if (tem) ctx.fill();
        }
        for (q = 0; q < P.n; q++) {                         // o brilho: das robustas sempre; ampliado, tambem das outras gotas das rajadas
          if (P.x[q] < 0 || P.k[q] === 3 || (P.k[q] !== 1 && !S.grande)) continue;
          luz(ctx, P.k[q] === 1 ? C.ouro : P.k[q] === 2 ? C.novo : C.flash, S.esq + P.x[q] * L, yDe(q, t), (P.k[q] === 1 ? 5 : 3.5) * gl, P.k[q] === 1 ? 0.45 : 0.3);
        }
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = S.fade; ctx.fillRect(S.dir - 34, 0, w - S.dir + 34, h); ctx.restore(); ctx._f = null;
        for (i = 0; i < S.fx.length; i++) { var p = S.fx[i].lab.pulso; if (p > 0.03) luz(ctx, S.cor[S.fx[i].lab.n] || C.flash, S.esq, S.fx[i].yc, (3 + 9 * p) * gl, p); }
        var salto = lh >= 6.5 ? 1 : 2;
        for (i = 0; i < S.fx.length; i += salto) {
          f = S.fx[i]; var e2 = Math.min(1, f.lab.energia), ativo = e2 > 0.08 || f.lab.g3 > 0;
          if (S.grande) {
            escrever(ctx, String(f.lab.n), S.esq - 112, f.yc + 3.5, ativo ? C.ouroHi : C.mute, 9.5, 'left', 600, true);
            escreverCabe(ctx, f.lab.curto, S.esq - 88, f.yc + 3.5, ativo ? C.txt : C.mute, Math.min(10.5, lh), 'left', 500, false, 80);
            if (f.lab.g3 > 0) escrever(ctx, fmtInt(f.lab.g3) + ' genes', S.dir + 8, f.yc + 3.5, C.ouro, 9, 'left', 500, true);
          } else escrever(ctx, String(f.lab.n), S.esq - 4, f.yc + 2.6, ativo ? C.ouroHi : 'rgba(151,151,163,.9)', Math.min(7.5, lh + 0.5), 'right', 600, true);
        }
      },
      aoEvento: function (r, E) {
        S.cor[r.lab.n] = corTipo(r.tipo);
        if (E.calmo) return;
        var li = E.labs.indexOf(r.lab); if (li < 0) return;
        var n = Math.min(42, 3 + Math.round(Math.sqrt(Math.max(1, r.n)) * 3.4)), base = Math.max(1, r.chaves.length);
        var nr = r.rob > 0 ? Math.max(1, Math.round(n * Math.min(1, r.rob / base))) : 0;
        for (var i = 0; i < n; i++) soltar(li, i < nr ? 1 : (r.tipo === 'evolucao' ? 2 : 0), Math.random() * 0.5, 0.25 + Math.random() * 0.14);
      },
      quem: function (x, y) {
        var best = null, bd = Infinity;
        S.fx.forEach(function (f) { var d = Math.abs(y - f.yc); if (d < bd) { bd = d; best = f; } });
        return best && bd <= Math.max(4, S.lh) ? { lab: best.lab } : null;
      },
      limpar: function () { P.n = 0; S.acum = []; }
    };
  });

  // ---------------------------------------------------------------- 3. ARVORE
  // O tronco, um ramo grosso por especialidade e um ramo por lab. As folhas sao os genes da amostra, os frutos dourados os
  // robustos e as folhas cinza os demitidos. Um calculo faz subir a SEIVA (um ponto de luz do tronco a ponta do ramo) e,
  // quando ela chega, acendem as folhas dos genes que calcularam; um gene novo (evolucao) faz nascer uma folha ciano.
  registar(function () {
    var S = { chave: '', ramos: [], membros: [], base: null, topo: null, esc: 1, seiva: [], grande: false };
    var lFolha = new Lote(2000), lDem = new Lote(2000), lNovo = new Lote(2000), lFruto = new Lote(2000), lBrilho = new Lote(2000);
    function arrumar(w, h, E) {
      var grande = w >= 560, esc = Math.max(0.6, Math.min(2.2, Math.min(w / 360, h / 215)));
      S.esc = esc; S.grande = grande;
      S.base = { x: w / 2, y: h - 6 * esc }; S.topo = { x: w / 2, y: h - 6 * esc - h * 0.2 };
      var G = Math.max(1, E.grupos.length), L1 = Math.min(w * 0.15, h * 0.24), L2 = Math.min(w * 0.3, h * 0.44);
      S.ramos = []; S.membros = [];
      E.grupos.forEach(function (g, gi) {
        var ang = -Math.PI / 2 + ((gi + 0.5) / G - 0.5) * Math.PI * 0.92;
        var pg = { x: S.topo.x + Math.cos(ang) * L1, y: S.topo.y + Math.sin(ang) * L1 };
        var pcm = { x: S.topo.x + Math.cos(ang) * L1 * 0.4, y: S.topo.y - L1 * 0.32 };
        S.membros.push({ g: g, p0: S.topo, pc: pcm, p1: pg });
        var m = g.labs.length, abre = Math.min(1.25, 0.26 * m);
        g.labs.forEach(function (lab, j) {
          var a2 = ang + (m > 1 ? (j / (m - 1) - 0.5) * abre : 0), sem = semente('ramo' + lab.n), comp = L2 * (0.74 + 0.26 * ((sem % 100) / 100));
          var p1 = { x: pg.x + Math.cos(a2) * comp, y: Math.max(9 * esc, pg.y + Math.sin(a2) * comp) };
          var mx = (pg.x + p1.x) / 2, my = (pg.y + p1.y) / 2, nx = -(p1.y - pg.y), ny = p1.x - pg.x, nl = Math.sqrt(nx * nx + ny * ny) || 1, cv = (j % 2 ? 1 : -1) * comp * 0.14;
          S.ramos.push({ lab: lab, membro: S.membros.length - 1, p0: pg, pc: { x: mx + nx / nl * cv, y: my + ny / nl * cv }, p1: p1, fase: (sem % 628) / 100,
            pcA: { x: 0, y: 0 }, p1A: { x: p1.x, y: p1.y },
            folhas: lab.amostra.map(function (gene, k) { return { gene: gene, s: 0.24 + 0.74 * frac(0.5 + k * 0.6180339887), lado: k % 2 ? 1 : -1, off: (2.2 + 2.4 * frac(k * 0.371)) * esc, len: (2.6 + 1.6 * frac(k * 0.53)) * esc }; }) });
        });
      });
    }
    function noRamo(p0, pc, p1, s, out) { var u = 1 - s; out[0] = u * u * p0.x + 2 * u * s * pc.x + s * s * p1.x; out[1] = u * u * p0.y + 2 * u * s * pc.y + s * s * p1.y; out[2] = 2 * u * (pc.x - p0.x) + 2 * s * (p1.x - pc.x); out[3] = 2 * u * (pc.y - p0.y) + 2 * s * (p1.y - pc.y); }
    var TMP = [0, 0, 0, 0];
    // a folha acende quando a seiva chega (~0,9 s depois do calculo) e apaga-se devagar
    function acesa(g, agora) { if (!g.t) return 0; var d = agora - g.t - 900; return d < 0 || d > 6000 ? 0 : Math.exp(-d / 900); }
    function pontoDaSeiva(sv, out) {
      var rm = S.ramos[sv.ri]; if (!rm) return false;
      var u = sv.u, mb = S.membros[rm.membro];
      if (u < 0.22) { var k = u / 0.22; out[0] = S.base.x + (S.topo.x - S.base.x) * k; out[1] = S.base.y + (S.topo.y - S.base.y) * k; }
      else if (u < 0.45) noRamo(mb.p0, mb.pc, mb.p1, (u - 0.22) / 0.23, out);
      else noRamo(rm.p0, rm.pcA, rm.p1A, Math.min(1, (u - 0.45) / 0.55), out);
      return true;
    }
    return {
      id: 'arvore', nome: 'Árvore',
      descricao: 'Cada ramo é um laboratório, agrupados por especialidade. Folhas = genes da amostra, frutos dourados = robustos, cinza = demitidos. Quando calcula, a seiva sobe pelo ramo e acende as folhas; um gene novo faz nascer uma folha ciano.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var esc = S.esc, t = E.t, agora = E.agora || 0, i, j;
        // o chao e as raizes
        ctx.strokeStyle = 'rgba(242,194,48,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w * 0.18, S.base.y + 1); ctx.lineTo(w * 0.82, S.base.y + 1); ctx.stroke();
        ctx.strokeStyle = 'rgba(126,98,16,.7)'; ctx.lineWidth = 1.6 * esc; ctx.lineCap = 'round'; ctx.beginPath();
        [-1, -0.4, 0.45, 1].forEach(function (d) { ctx.moveTo(S.base.x, S.base.y); ctx.quadraticCurveTo(S.base.x + d * 14 * esc, S.base.y + 2, S.base.x + d * 30 * esc, S.base.y + 4 * esc); });
        ctx.stroke();
        // o tronco e os ramos grossos
        ctx.strokeStyle = '#4d3b0a'; ctx.lineWidth = 6 * esc; ctx.beginPath(); ctx.moveTo(S.base.x, S.base.y); ctx.lineTo(S.topo.x, S.topo.y); ctx.stroke();
        ctx.strokeStyle = '#6b520f'; ctx.lineWidth = 3.2 * esc; ctx.beginPath();
        S.membros.forEach(function (m) { ctx.moveTo(m.p0.x, m.p0.y); ctx.quadraticCurveTo(m.pc.x, m.pc.y, m.p1.x, m.p1.y); });
        ctx.stroke();
        // os ramos dos labs (com vento leve; o que calcula estremece)
        lFolha.n = lDem.n = lNovo.n = lFruto.n = lBrilho.n = 0;
        for (i = 0; i < S.ramos.length; i++) {
          var rm = S.ramos[i], e = Math.min(1, rm.lab.energia);
          var dx = E.calmo ? 0 : Math.sin(t * 0.7 + rm.fase) * 1.3 * esc + e * Math.sin(t * 7 + rm.fase) * 0.9 * esc;
          rm.pcA.x = rm.pc.x + dx * 0.5; rm.pcA.y = rm.pc.y; rm.p1A.x = rm.p1.x + dx; rm.p1A.y = rm.p1.y;
          ctx.strokeStyle = cor('242,194,48', 0.32 + 0.55 * e); ctx.lineWidth = (1.3 + 0.9 * e) * esc;
          ctx.beginPath(); ctx.moveTo(rm.p0.x, rm.p0.y); ctx.quadraticCurveTo(rm.pcA.x, rm.pcA.y, rm.p1A.x, rm.p1A.y); ctx.stroke();
          for (j = 0; j < rm.folhas.length; j++) {
            var f = rm.folhas[j], g = f.gene;
            noRamo(rm.p0, rm.pcA, rm.p1A, f.s, TMP);
            var tl = Math.sqrt(TMP[2] * TMP[2] + TMP[3] * TMP[3]) || 1, tx = TMP[2] / tl, ty = TMP[3] / tl, nx = -ty * f.lado, ny = tx * f.lado;
            var cresce = g.nasceu ? ease((agora - g.nasceu) / 900) : 1;
            var bx = TMP[0] + nx * f.off * 0.35, by = TMP[1] + ny * f.off * 0.35, L = f.len * cresce;
            if (g.d) lDem.por(bx, by, bx + (tx * 0.5 + nx * 0.85) * L, by + (ty * 0.5 + ny * 0.85) * L);
            else if (g.r) { var rf = (S.grande ? 2.6 : 1.9) * esc * 0.75 * (g.rT ? ease((agora - g.rT) / 700) : 1); lFruto.por(TMP[0] + nx * f.off, TMP[1] + ny * f.off, rf, 0); }
            else (g.novo > 0.08 ? lNovo : lFolha).por(bx, by, bx + (tx * 0.5 + nx * 0.85) * L, by + (ty * 0.5 + ny * 0.85) * L);
            var ac = acesa(g, agora);
            if (ac > 0.05) lBrilho.por(TMP[0] + nx * f.off * 0.8, TMP[1] + ny * f.off * 0.8, ac, g.novo > 0.3 ? 1 : 0);
          }
        }
        lFolha.tracos(ctx, 'rgba(214,180,74,.62)', 2 * esc); lDem.tracos(ctx, '#4b4b54', 2 * esc); lNovo.tracos(ctx, C.novo, 2.2 * esc);
        lFruto.bolas(ctx, C.rob);
        for (i = 0; i < lFruto.n; i++) { var kf = i * 4, rr = lFruto.b[kf + 2]; if (rr > 0.8) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(lFruto.b[kf] - rr * 0.45, lFruto.b[kf + 1] - rr * 0.5, Math.max(0.6, rr * 0.4), Math.max(0.6, rr * 0.4)); } }
        for (i = 0; i < lBrilho.n; i++) { var kb = i * 4; luz(ctx, lBrilho.b[kb + 3] ? C.novo : C.flash, lBrilho.b[kb], lBrilho.b[kb + 1], 6 * esc, lBrilho.b[kb + 2]); }
        // a seiva
        for (i = S.seiva.length - 1; i >= 0; i--) {
          var sv = S.seiva[i]; sv.u = (t - sv.t0) / 1.0;
          if (sv.u > 1.4 || sv.u < -0.2 || !S.ramos[sv.ri]) { S.seiva.splice(i, 1); continue; }
          if (sv.u < 0) continue;
          var fade = sv.u > 1 ? (1.4 - sv.u) / 0.4 : 1, u0 = sv.u;
          for (j = 3; j >= 0; j--) {
            sv.u = Math.max(0, Math.min(1, u0 - j * 0.035));
            if (pontoDaSeiva(sv, TMP)) luz(ctx, sv.cor, TMP[0], TMP[1], (j ? 3 : 4.5 + 4 * sv.forca) * esc, (j ? 0.35 - j * 0.08 : 0.95) * fade);
          }
          sv.u = u0;
        }
        // os rotulos (so ampliado: na grelha nao cabem sem se pisarem - a etiqueta do rato diz qual e o ramo)
        if (S.grande) {
          var arr = new Arrumador();
          S.ramos.forEach(function (rm2) {
            var dir = rm2.p1A.x >= w / 2, at = rm2.lab.energia > 0.08, al = dir ? 'left' : 'right', x = rm2.p1A.x + (dir ? 6 : -6);
            var y = arr.tentar(ctx, rm2.lab.curto, x, rm2.p1A.y + 3, 10, al, 500, false, [0, -11, 11, -22]);
            if (y != null) escreverCabe(ctx, rm2.lab.curto, x, y, at ? C.ouroHi : 'rgba(239,237,232,.72)', 10, al, 500, false, 0, true);
          });
          S.membros.forEach(function (m) {
            var nome = m.g.nome.toUpperCase(), y = arr.tentar(ctx, nome, m.p1.x, m.p1.y + 15, 9.5, 'center', 600, true, [0, 11, 22, -14]);
            if (y != null) escreverCabe(ctx, nome, m.p1.x, y, 'rgba(242,194,48,.85)', 9.5, 'center', 600, true, 0, true);
          });
        }
      },
      aoEvento: function (r, E) {
        for (var i = 0; i < S.ramos.length; i++) if (S.ramos[i].lab === r.lab) {
          if (!E.calmo) { S.seiva.push({ ri: i, t0: E.t, u: 0, forca: r.forca, cor: corTipo(r.tipo) }); if (S.seiva.length > 40) S.seiva.shift(); }
          return;
        }
      },
      quem: function (x, y) {
        var best = null, bd = 14 * 14;
        S.ramos.forEach(function (rm) { for (var s = 0; s <= 1.0001; s += 0.2) { noRamo(rm.p0, rm.pcA, rm.p1A, s, TMP); var d = (TMP[0] - x) * (TMP[0] - x) + (TMP[1] - y) * (TMP[1] - y); if (d < bd) { bd = d; best = rm; } } });
        return best ? { lab: best.lab } : null;
      },
      limpar: function () { S.seiva = []; }
    };
  });

  // ---------------------------------------------------------------- 4. SONAR
  // Um ponto por lab, em sectores por especialidade; quanto maior a fraccao de robustos, mais perto do centro. O varrimento
  // roda devagar e DEVOLVE ECO de quem calculou nos ultimos 3 min (os outros ficam apagados); cada calculo dispara aneis de
  // ping a partir do ponto do lab (1 a 3 aneis, pelo numero de genes).
  registar(function () {
    var S = { chave: '', cx: 0, cy: 0, R: 0, blips: [], rotulos: [], limites: [], ang: -Math.PI / 2, pings: [], cone: null, coneK: '', grande: false };
    function arrumar(w, h, E) {
      var grande = w >= 560; S.grande = grande;
      S.cx = w / 2; S.cy = h / 2; S.R = Math.max(8, Math.min(w, h) / 2 - (grande ? 42 : 10));
      var N = E.labs.length, G = E.grupos.length, folga = G > 1 ? 0.7 : 0, passo = TAU / Math.max(1, N + G * folga), a = -Math.PI / 2 + passo * folga / 2;
      var frMax = 0.01; E.labs.forEach(function (l) { if (l.fr > frMax) frMax = l.fr; });
      S.blips = []; S.rotulos = []; S.limites = [];
      E.grupos.forEach(function (g) {
        S.limites.push(a - passo * folga / 2);
        var a0 = a;
        g.labs.forEach(function (lab) { var ang = a + passo / 2, rr = S.R * (0.22 + 0.7 * (1 - lab.fr / frMax)); S.blips.push({ lab: lab, ang: ang, x: S.cx + Math.cos(ang) * rr, y: S.cy + Math.sin(ang) * rr }); a += passo; });
        S.rotulos.push({ nome: g.nome, ang: (a0 + a) / 2 });
        a += passo * folga;
      });
    }
    // o cone do varrimento: feito uma vez por tamanho (gradiente conico; sem ele, 30 fatias)
    function cone(R, dpr) {
      var k = Math.round(R) + '@' + dpr; if (S.coneK === k) return S.cone;
      S.coneK = k; S.cone = null;
      var tam = Math.ceil(R * 2 * dpr) + 2, c = novoCanvas(tam, tam), g = c ? c.getContext('2d') : null, m = tam / 2, ARCO = 1.2;
      if (!g) return null;
      if (typeof g.createConicGradient === 'function') {
        var gr = g.createConicGradient(0, m, m); gr.addColorStop(0, 'rgba(242,194,48,0)'); gr.addColorStop(1 - ARCO / TAU, 'rgba(242,194,48,0)'); gr.addColorStop(1, 'rgba(242,194,48,.3)');
        g.fillStyle = gr; g.beginPath(); g.arc(m, m, m - 1, 0, TAU); g.fill();
      } else {
        for (var i = 0; i < 30; i++) { g.fillStyle = 'rgba(242,194,48,' + (0.3 * (1 - i / 30)).toFixed(3) + ')'; g.beginPath(); g.moveTo(m, m); g.arc(m, m, m - 1, -(i + 1) * ARCO / 30, -i * ARCO / 30); g.closePath(); g.fill(); }
      }
      S.cone = c; return c;
    }
    return {
      id: 'sonar', nome: 'Sonar',
      descricao: 'Um ponto por laboratório (os de mais robustos ficam perto do centro). O varrimento devolve eco de quem calculou nos últimos 3 min e cada cálculo dispara anéis de ping — mais anéis, mais genes.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var R = S.R, cx = S.cx, cy = S.cy, t = E.t, i, actT = clamp(Math.log(1 + (E.act ? E.act.genes : 0)) / Math.log(200), 0, 1);
        if (!E.calmo && dt > 0) S.ang = (S.ang + dt * TAU / (8 - 3 * actT)) % TAU;
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(242,194,48,.13)'; ctx.beginPath();
        for (i = 1; i <= 3; i++) { ctx.moveTo(cx + R * i / 3, cy); ctx.arc(cx, cy, R * i / 3, 0, TAU); }
        S.limites.forEach(function (a) { ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); });
        ctx.stroke();
        if (!E.calmo) {
          var cn = cone(R, E.dpr || 1);
          if (cn) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.ang); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cn, -R, -R, R * 2, R * 2); ctx.restore(); ctx._f = null; }
          ctx.strokeStyle = 'rgba(255,220,106,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(S.ang) * R, cy + Math.sin(S.ang) * R); ctx.stroke(); ctx.lineWidth = 1;
        }
        for (i = S.pings.length - 1; i >= 0; i--) {
          var pg = S.pings[i], b = S.blips[pg.b], u = (t - pg.t0) / 1.9;
          if (!b || b.lab !== pg.lab || u > 1.4 || u < -0.5) { S.pings.splice(i, 1); continue; }
          for (var an = 0; an < pg.aneis; an++) {
            var uu = u - an * 0.18; if (uu <= 0 || uu >= 1) continue;
            var rp = E.calmo ? 5 + 3 * an : 2 + uu * R * (0.18 + 0.22 * pg.forca);
            ctx.strokeStyle = pg.cor; ctx.globalAlpha = Math.pow(1 - uu, 1.6) * 0.9; ctx.lineWidth = Math.max(0.5, 1.5 - an * 0.3);
            ctx.beginPath(); ctx.arc(b.x, b.y, rp, 0, TAU); ctx.stroke();
          }
          if (u > 0 && u < 0.6) { ctx.globalAlpha = (0.6 - u) * 0.35; ctx.strokeStyle = pg.cor; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          ctx.globalAlpha = 1; ctx.lineWidth = 1;
        }
        for (i = 0; i < S.blips.length; i++) {
          var bl = S.blips[i], lab = bl.lab, act = clamp(Math.log(1 + lab.g3) / Math.log(64), 0, 1), atras = ((S.ang - bl.ang) % TAU + TAU) % TAU;
          var eco = E.calmo ? act * 0.7 : act * Math.exp(-atras / 1.3), p = lab.pulso, mx = Math.max(eco, p);
          var rb = (S.grande ? 2.6 : 1.8) + 2.2 * mx;
          if (mx > 0.08) luz(ctx, p > eco ? (lab.corPulso || C.flash) : C.ouro, bl.x, bl.y, rb * 4, mx * 0.8);
          ctx.globalAlpha = Math.min(1, 0.4 + 0.6 * mx); ctx.fillStyle = p > 0.3 ? '#fff7d6' : act > 0 ? C.ouroHi : 'rgba(242,194,48,.7)';
          ctx.beginPath(); ctx.arc(bl.x, bl.y, rb, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        }
        if (S.grande) {                                       // ampliado: o andar de cada ponto (o nome, se esta activo), sem se pisarem
          var arr = new Arrumador();
          S.blips.slice().sort(function (a, b) { return (b.lab.pulso + b.lab.g3) - (a.lab.pulso + a.lab.g3); }).forEach(function (bl) {
            var at = bl.lab.pulso > 0.05 || bl.lab.g3 > 0, t2 = at ? bl.lab.curto : String(bl.lab.n), al = Math.cos(bl.ang) >= 0 ? 'left' : 'right';
            var x = bl.x + Math.cos(bl.ang) * 9, y = arr.tentar(ctx, t2, x, bl.y + Math.sin(bl.ang) * 9 + 3, at ? 10 : 8, al, 500, !at);
            if (y != null) escrever(ctx, t2, x, y, at ? C.ouroHi : 'rgba(151,151,163,.8)', at ? 10 : 8, al, 500, !at);
          });
        }
        luz(ctx, C.ouro, cx, cy, 10 + 6 * actT, 0.45 + 0.3 * actT);
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, TAU); ctx.fill();
        S.rotulos.forEach(function (ro) {
          var rr2 = S.grande ? R + 20 : R - 7, x = cx + Math.cos(ro.ang) * rr2, y = cy + Math.sin(ro.ang) * rr2 + 3;
          escreverCabe(ctx, S.grande ? ro.nome.toUpperCase() : ro.nome, x, y, 'rgba(242,194,48,' + (S.grande ? '.85' : '.6') + ')', S.grande ? 9.5 : 6.5, 'center', 600, true, S.grande ? 130 : 56, !S.grande);
        });
      },
      aoEvento: function (r, E) {
        for (var i = 0; i < S.blips.length; i++) if (S.blips[i].lab === r.lab) {
          S.pings.push({ b: i, lab: r.lab, t0: E.t, forca: r.forca, cor: corTipo(r.tipo), aneis: r.forca > 0.55 ? 3 : r.forca > 0.3 ? 2 : 1 });
          if (S.pings.length > 48) S.pings.shift();
          return;
        }
      },
      quem: function (x, y) { var b = maisPerto(S.blips, x, y, 14); return b ? { lab: b.lab } : null; },
      limpar: function () { S.pings = []; }
    };
  });

  // ---------------------------------------------------------------- 5. EQUALIZADOR
  // Uma barra de LEDs por lab: a altura e o numero de genes calculados nos ultimos 3 min (escala logaritmica: de 1 a centenas
  // cabem todos), com o PICO RETIDO (a tampa fica no maximo 1,6 s e depois desce). A parte mais clara de baixo e a estimativa
  // dos robustos. Sem calculos, os LEDs ficam apagados.
  registar(function () {
    var S = { chave: '', barras: [], grupos: [], topo: 0, base: 0, segH: 4, gap: 1, nSeg: 10, bw: 4, v: {}, pico: {}, picoT: {}, escala: 24, grande: false };
    var lOff = new Lote(3000), lLit = new Lote(3000), lRob = new Lote(3000), lCim = new Lote(80), lCap = new Lote(80), lRef = new Lote(400);
    function arrumar(w, h, E) {
      var grande = w >= 560; S.grande = grande;
      var esq = grande ? 20 : 8, dir = grande ? 20 : 8;
      S.topo = grande ? 30 : 12; S.base = h - (grande ? 48 : 18);
      var N = E.labs.length, G = E.grupos.length, unid = N * 1.28 - 0.28 + Math.max(0, G - 1) * 0.9, bw = (w - esq - dir) / Math.max(1, unid), x = esq;
      S.barras = []; S.grupos = []; S.bw = bw;
      E.grupos.forEach(function (g) { var x0 = x; g.labs.forEach(function (lab) { S.barras.push({ lab: lab, x: x, w: bw }); x += bw * 1.28; }); S.grupos.push({ nome: g.nome, x0: x0, x1: x - bw * 0.28 }); x += bw * 0.9; });
      S.segH = grande ? 6 : 3.2; S.gap = grande ? 2 : 1;
      S.nSeg = Math.max(3, Math.floor((S.base - S.topo) / (S.segH + S.gap)));
    }
    return {
      id: 'equalizador', nome: 'Equalizador',
      descricao: 'Uma barra por laboratório: a altura são os genes calculados nos últimos 3 min (escala logarítmica), com o pico retido no topo; a parte clara de baixo são os robustos.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var alvoEsc = 24, i, s;
        E.labs.forEach(function (l) { if (l.g3 > alvoEsc) alvoEsc = l.g3; });
        S.escala = Math.max(24, seguir(S.escala, alvoEsc * 1.1, alvoEsc * 1.1 > S.escala ? 3 : 0.25, dt));
        var lg = Math.log(1 + S.escala), ps = S.segH + S.gap;
        lOff.n = lLit.n = lRob.n = lCim.n = lCap.n = lRef.n = 0;
        for (i = 0; i < S.barras.length; i++) {
          var b = S.barras[i], lab = b.lab, n = lab.n, alvo = lab.g3 || 0, v = S.v[n] || 0;
          v = seguir(v, alvo, alvo > v ? 9 : 1.4, dt); if (v < 0.01) v = 0;
          if (!(dt > 0)) v = alvo;                            // sem tempo a passar (prova, primeiro quadro): o valor certo ja
          S.v[n] = v;
          var nLit = Math.round(clamp(Math.log(1 + v) / lg, 0, 1) * S.nSeg); if (nLit === 0 && alvo > 0) nLit = 1;
          var pk = S.pico[n] || 0;
          if (nLit >= pk) { pk = nLit; S.picoT[n] = E.t; } else if (E.t - (S.picoT[n] || 0) > 1.6) pk = Math.max(nLit, pk - dt * S.nSeg * 0.3);
          S.pico[n] = pk;
          var nRob = alvo > 0 ? Math.round(nLit * clamp((lab.r3 || 0) / alvo, 0, 1)) : 0;
          for (s = 0; s < S.nSeg; s++) {
            var y = S.base - (s + 1) * ps + S.gap;
            if (s < nLit) { (s === nLit - 1 ? lCim : s < nRob ? lRob : lLit).por(b.x, y, b.w, S.segH); if (s < 2) lRef.por(b.x, S.base + 2 + s * ps, b.w, S.segH); }
            else lOff.por(b.x, y, b.w, S.segH);
          }
          if (pk >= 1) lCap.por(b.x, S.base - Math.round(pk) * ps + S.gap - (S.grande ? 4 : 2.6), b.w, S.grande ? 2 : 1.4);
        }
        lOff.rects(ctx, 'rgba(242,194,48,.065)'); lLit.rects(ctx, 'rgba(242,194,48,.62)'); lRob.rects(ctx, C.rob); lCim.rects(ctx, '#ffe9a8');
        lRef.rects(ctx, 'rgba(242,194,48,.09)'); lCap.rects(ctx, C.flash, 0.95);
        ctx.fillStyle = 'rgba(242,194,48,.28)'; ctx.fillRect(S.barras.length ? S.barras[0].x : 0, S.base + 0.5, S.barras.length ? S.barras[S.barras.length - 1].x + S.bw - S.barras[0].x : 0, 1);
        for (i = 0; i < S.barras.length; i++) {
          var b2 = S.barras[i], p = b2.lab.pulso, nl = Math.max(1, Math.round(S.pico[b2.lab.n] || 0)), yt = S.base - nl * ps + S.gap;
          if (p > 0.04) { ctx.globalAlpha = Math.min(1, p); ctx.fillStyle = '#ffffff'; ctx.fillRect(b2.x, yt, b2.w, S.segH * 2 + S.gap); ctx.globalAlpha = 1; luz(ctx, b2.lab.corPulso || C.flash, b2.x + b2.w / 2, yt, Math.max(6, b2.w * 2.2), p * 0.8); }
          var at = b2.lab.g3 > 0 || p > 0.05;
          if (S.bw >= 6.5 || i % 2 === 0) escrever(ctx, String(b2.lab.n), b2.x + b2.w / 2, S.base + (S.grande ? 16 : 14), at ? C.ouroHi : C.dim, S.grande ? 9 : 6.5, 'center', 600, true);
          if (S.grande && b2.lab.g3 > 0) escrever(ctx, fmtInt(b2.lab.g3), b2.x + b2.w / 2, yt - 7, C.ouro, 9, 'center', 600, true);
        }
        if (S.grande) S.grupos.forEach(function (g) { escreverCabe(ctx, g.nome, (g.x0 + g.x1) / 2, S.base + 34, 'rgba(242,194,48,.8)', 10, 'center', 500, false, Math.max(20, g.x1 - g.x0 + 10)); });
      },
      // a barra salta ja (a janela dos 3 min so e recalculada de 200 em 200 ms) e a tampa sobe com ela
      aoEvento: function (r) { var n = r.lab.n; S.v[n] = Math.max(S.v[n] || 0, (r.lab.g3 || 0) + r.n); },
      quem: function (x) { for (var i = 0; i < S.barras.length; i++) { var b = S.barras[i]; if (x >= b.x - S.bw * 0.15 && x <= b.x + b.w + S.bw * 0.15) return { lab: b.lab, txt: fmtInt(b.lab.g3) + ' genes nos últimos 3 min' }; } return null; },
      limpar: function () { S.pico = {}; S.picoT = {}; }
    };
  });

  // ---------------------------------------------------------------- 6. CARDIOGRAMA
  // Uma linha por lab a correr da direita (agora) para a esquerda (60 s atras; 90 s ampliado). Cada calculo e um batimento:
  // mais alto quanto mais genes, a ouro se tem robustos, ciano se sao genes novos. Linha plana = esse lab nao calculou.
  registar(function () {
    var S = { chave: '', linhas: [], lh: 1, esq: 0, dir: 0, topo: 0, fundo: 0, picos: {}, grande: false };
    function qrs(ctx, x, y, a, z) { ctx.lineTo(x - 5 * z, y + 0.12 * a); ctx.lineTo(x - 2.5 * z, y - a); ctx.lineTo(x + 0.3 * z, y + 0.38 * a); ctx.lineTo(x + 2.6 * z, y); ctx.lineTo(x + 6.5 * z, y - 0.14 * a); ctx.lineTo(x + 9 * z, y - 0.06 * a); ctx.lineTo(x + 11 * z, y); }
    function arrumar(w, h, E) {
      var grande = w >= 560; S.grande = grande;
      S.esq = grande ? 132 : 22; S.dir = Math.max(S.esq + 10, w - (grande ? 18 : 7)); S.topo = grande ? 12 : 6; S.fundo = h - (grande ? 26 : 13);
      var fz = faixas(E, S.topo, S.fundo, grande ? 6 : 2.5); S.lh = fz.lh; S.linhas = fz.linhas;
    }
    return {
      id: 'cardiograma', nome: 'Cardiograma',
      descricao: 'Uma linha por laboratório a correr da direita para a esquerda (o último minuto; 90 s ampliado). Cada cálculo é um batimento, mais alto quanto mais genes; dourado se tem robustos, ciano se são genes novos.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var jan = S.grande ? 90 : 60, pxs = (S.dir - S.esq) / jan, t = E.t, z = S.grande ? 1.4 : 1, i, j;
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(242,194,48,.07)'; ctx.beginPath();
        for (var xg = S.dir - (t % 10) * pxs; xg > S.esq; xg -= 10 * pxs) { ctx.moveTo(xg, S.topo); ctx.lineTo(xg, S.fundo); }
        ctx.stroke();
        for (i = 0; i < S.linhas.length; i++) {
          var ln = S.linhas[i], lab = ln.lab, y = ln.yc, e = Math.min(1, lab.energia), arr = S.picos[lab.n] || [];
          while (arr.length && (t - arr[0].t > jan + 2 || arr[0].t > t + 1)) arr.shift();
          ctx.strokeStyle = cor('242,194,48', 0.26 + 0.5 * e); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(S.esq, y);
          var ultX = S.esq;
          for (j = 0; j < arr.length; j++) {
            var pk = arr[j], x = S.dir - (t - pk.t) * pxs; if (x < S.esq + 9 * z || x > S.dir) continue;
            var a = Math.min(S.lh * 1.35, S.lh * (0.35 + 0.95 * pk.a));
            if (x - 9 * z > ultX) ctx.lineTo(x - 9 * z, y);
            qrs(ctx, x, y, a, z); ultX = x + 11 * z;
          }
          if (ultX < S.dir) ctx.lineTo(S.dir, y);
          ctx.stroke();
          for (j = 0; j < arr.length; j++) {
            var p2 = arr[j], x2 = S.dir - (t - p2.t) * pxs; if (x2 < S.esq + 9 * z || x2 > S.dir) continue;
            ctx.strokeStyle = p2.cor; ctx.globalAlpha = clamp(1 - 0.65 * (t - p2.t) / jan, 0.2, 1); ctx.lineWidth = S.grande ? 1.7 : 1.25;
            ctx.beginPath(); ctx.moveTo(x2 - 9 * z, y); qrs(ctx, x2, y, Math.min(S.lh * 1.35, S.lh * (0.35 + 0.95 * p2.a)), z); ctx.stroke(); ctx.globalAlpha = 1;
          }
          luz(ctx, lab.corPulso || C.flash, S.dir, y, (3 + 6 * lab.pulso) * z, 0.2 + 0.8 * lab.pulso);
          if (S.grande) { escrever(ctx, String(lab.n), S.esq - 110, y + 3.5, e > 0.05 ? C.ouroHi : C.mute, 9.5, 'left', 600, true); escreverCabe(ctx, lab.curto, S.esq - 86, y + 3.5, e > 0.05 ? C.txt : C.mute, Math.min(10.5, S.lh), 'left', 500, false, 78); }
          else if (S.lh >= 6.5 || i % 2 === 0) escrever(ctx, String(lab.n), S.esq - 4, y + 2.6, e > 0.05 ? C.ouroHi : 'rgba(151,151,163,.9)', Math.min(7.5, S.lh + 0.5), 'right', 600, true);
        }
        ctx.lineWidth = 1;
        var ty = S.fundo + (S.grande ? 17 : 10), tam = S.grande ? 9 : 6.5;
        escrever(ctx, '−' + jan + ' s', S.esq, ty, C.dim, tam, 'left', 500, true);
        escrever(ctx, '−' + (jan / 2) + ' s', (S.esq + S.dir) / 2, ty, C.dim, tam, 'center', 500, true);
        escrever(ctx, 'agora', S.dir, ty, C.mute, tam, 'right', 600, true);
      },
      aoEvento: function (r, E) {
        var arr = S.picos[r.lab.n] || (S.picos[r.lab.n] = []);
        arr.push({ t: E.t, a: r.forca, cor: r.rob > 0 ? C.rob : corTipo(r.tipo) });
        if (arr.length > 60) arr.shift();
      },
      quem: function (x, y) {
        var best = null, bd = Infinity;
        S.linhas.forEach(function (l) { var d = Math.abs(y - l.yc); if (d < bd) { bd = d; best = l; } });
        return best && bd <= Math.max(4, S.lh) ? { lab: best.lab } : null;
      },
      limpar: function () { S.picos = {}; }
    };
  });

  // ---------------------------------------------------------------- 7. MAPA DE CALOR
  // Lab x minuto da ultima hora: cada celula e quantos genes esse lab calculou nesse minuto (mais claro = mais; a risca clara
  // em cima = houve robustos). Riscado = minutos que a pagina nao viu (antes do anel que leu ao abrir). A grelha desliza com o
  // tempo; um calculo novo faz a celula dele piscar. Na repeticao, uma agulha percorre a hora.
  registar(function () {
    var M = 60, S = { chave: '', esq: 0, dir: 0, topo: 0, fundo: 0, cw: 1, ch: 1, linhas: [], dados: null, dadosK: '', camada: null, camadaK: '', flashes: [], grande: false };
    var RAMPA = [];
    (function () {
      var st = [[0, 58, 46, 8], [0.35, 126, 98, 16], [0.7, 242, 194, 48], [1, 255, 243, 196]];
      for (var i = 0; i <= 32; i++) {
        var v = i / 32, j = 1; while (j < st.length - 1 && v > st[j][0]) j++;
        var a = st[j - 1], b = st[j], q = (v - a[0]) / (b[0] - a[0]);
        RAMPA.push('rgb(' + Math.round(a[1] + (b[1] - a[1]) * q) + ',' + Math.round(a[2] + (b[2] - a[2]) * q) + ',' + Math.round(a[3] + (b[3] - a[3]) * q) + ')');
      }
    })();
    var lVazio = new Lote(2000), lRobT = new Lote(2000), niveis = [];
    for (var nv = 0; nv <= 32; nv++) niveis.push(new Lote(2000));
    function arrumar(w, h, E) {
      var grande = w >= 560; S.grande = grande;
      S.esq = grande ? 128 : 20; S.dir = Math.max(S.esq + 10, w - (grande ? 14 : 6)); S.topo = grande ? 12 : 6; S.fundo = h - (grande ? 30 : 14);
      var fz = faixas(E, S.topo, S.fundo, grande ? 4 : 2); S.ch = fz.lh; S.linhas = fz.linhas; S.cw = (S.dir - S.esq) / M;
      S.camadaK = '';
    }
    function pintar(g, d) {
      var cw = S.cw, ch = S.ch, lg = Math.log(1 + Math.max(8, d.max)), c0 = d.coberturaCol == null ? M + 1 : Math.max(0, d.coberturaCol), i, c;
      lVazio.n = lRobT.n = 0; for (i = 0; i <= 32; i++) niveis[i].n = 0;
      for (i = 0; i < S.linhas.length; i++) {
        var ln = S.linhas[i], a = d.porLab[ln.lab.n], r = d.robLab[ln.lab.n]; if (!a) continue;
        for (c = c0; c <= M; c++) {
          var x = S.esq + c * cw, v = a[c];
          if (v > 0) { niveis[Math.max(1, Math.min(32, Math.round(32 * Math.log(1 + v) / lg)))].por(x + 0.5, ln.y + 0.5, Math.max(0.5, cw - 1), Math.max(0.5, ch - 1)); if (r && r[c] > 0) lRobT.por(x + 0.5, ln.y + 0.5, Math.max(0.5, cw - 1), Math.min(1.5, ch * 0.22)); }
          else lVazio.por(x + 0.5, ln.y + 0.5, Math.max(0.5, cw - 1), Math.max(0.5, ch - 1));
        }
      }
      lVazio.rects(g, 'rgba(242,194,48,.05)');
      for (i = 1; i <= 32; i++) niveis[i].rects(g, RAMPA[i]);
      lRobT.rects(g, C.flash);
      if (c0 > 0) {                                           // os minutos que a pagina nao viu: riscado
        var xr = S.esq + Math.min(M + 1, c0) * cw;
        g.save(); g.beginPath(); g.rect(S.esq, S.topo, Math.max(0, xr - S.esq), S.fundo - S.topo); g.clip();
        g.strokeStyle = 'rgba(151,151,163,.16)'; g.lineWidth = 1; g.beginPath();
        for (var xx = S.esq - (S.fundo - S.topo); xx < xr; xx += 6) { g.moveTo(xx, S.fundo); g.lineTo(xx + (S.fundo - S.topo), S.topo); }
        g.stroke(); g.restore(); g._f = null;
      }
    }
    return {
      id: 'mapa', nome: 'Mapa de calor',
      descricao: 'Laboratório × minuto da última hora: quanto mais claro, mais genes calculados nesse minuto (risca clara = houve robustos). Riscado = minutos que a página não viu. A célula pisca quando chega um cálculo.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        var k = w + 'x' + h + '|' + E.versao; if (S.chave !== k) { arrumar(w, h, E); S.chave = k; }
        var ref = E.relogioVivo || E.agora || 0, base = Math.floor(ref / 60000), fr = (ref - base * 60000) / 60000, i;
        var dk = E.histVer + '|' + base + '|' + E.versao + '|' + (E.cobertura == null ? '' : Math.floor(E.cobertura / 60000));
        if (S.dadosK !== dk) { S.dados = celulasDoMapa(E, ref, M); S.dadosK = dk; }
        var d = S.dados, ox = -fr * S.cw, dpr = E.dpr || 1;
        ctx.save(); ctx.beginPath(); ctx.rect(S.esq, 0, S.dir - S.esq, h); ctx.clip();
        var lk = dk + '|' + w + 'x' + h + '@' + dpr;
        if (S.camadaK !== lk) {
          S.camadaK = lk; S.camada = novoCanvas(w * dpr, h * dpr);
          var g = S.camada ? S.camada.getContext('2d') : null;
          if (g) { g.setTransform(dpr, 0, 0, dpr, 0, 0); pintar(g, d); } else S.camada = null;
        }
        if (S.camada) ctx.drawImage(S.camada, ox, 0, w, h);
        else { ctx.save(); ctx.translate(ox, 0); pintar(ctx, d); ctx.restore(); }
        for (i = S.flashes.length - 1; i >= 0; i--) {         // o calculo que acabou de chegar: a celula dele pisca
          var f = S.flashes[i], u = (E.t - f.t0) / 1.3;
          if (u > 1 || u < -0.5) { S.flashes.splice(i, 1); continue; }
          if (u < 0) continue;
          var ln = null; for (var j = 0; j < S.linhas.length; j++) if (S.linhas[j].lab.n === f.n) { ln = S.linhas[j]; break; }
          if (!ln) continue;
          var x = S.esq + (Math.floor(f.ms / 60000) - d.ini) * S.cw + ox, cresce = E.calmo ? 0 : u * 4;
          ctx.globalAlpha = (1 - u) * 0.85; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, ln.y, S.cw, S.ch);
          ctx.strokeStyle = f.cor; ctx.lineWidth = 1; ctx.strokeRect(x - cresce, ln.y - cresce, S.cw + cresce * 2, S.ch + cresce * 2); ctx.globalAlpha = 1;
        }
        if (E.rep) {                                          // a agulha da repeticao
          var cur = E.relogio, xp = S.esq + ((cur / 60000) - d.ini) * S.cw + ox;
          if (xp > S.esq && xp < S.dir) { ctx.fillStyle = 'rgba(8,8,10,.5)'; ctx.fillRect(xp, S.topo, S.dir - xp, S.fundo - S.topo); }
          ctx.strokeStyle = C.ouroHi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xp, S.topo - 2); ctx.lineTo(xp, S.fundo + 2); ctx.stroke(); ctx.lineWidth = 1;
        }
        ctx.restore(); ctx._f = null;
        ctx.strokeStyle = 'rgba(255,220,106,.6)'; ctx.beginPath(); ctx.moveTo(S.dir + 0.5, S.topo - 2); ctx.lineTo(S.dir + 0.5, S.fundo + 2); ctx.stroke();
        for (i = 0; i < S.linhas.length; i++) {
          var l2 = S.linhas[i], at = l2.lab.pulso > 0.05 || l2.lab.g3 > 0, ym = l2.y + S.ch / 2 + 3;
          if (S.grande) { escrever(ctx, String(l2.lab.n), S.esq - 108, ym, at ? C.ouroHi : C.mute, 9.5, 'left', 600, true); escreverCabe(ctx, l2.lab.curto, S.esq - 84, ym, at ? C.txt : C.mute, Math.min(10.5, S.ch), 'left', 500, false, 78); }
          else if (S.ch >= 6.5 || i % 2 === 0) escrever(ctx, String(l2.lab.n), S.esq - 4, l2.y + S.ch / 2 + 2.5, at ? C.ouroHi : 'rgba(151,151,163,.9)', Math.min(7.5, S.ch + 0.5), 'right', 600, true);
        }
        var ty = S.fundo + (S.grande ? 17 : 10), tam = S.grande ? 9 : 6.5;
        [60, 45, 30, 15, 0].forEach(function (m, q) {
          var x = S.dir - m * S.cw, txt = m ? '−' + m + (S.grande ? ' min · ' + horaBrt(ref - m * 60000) : '') : (S.grande ? 'agora · ' + horaBrt(ref) : 'agora');
          escrever(ctx, txt, x, ty, m ? C.dim : C.mute, tam, q === 0 ? 'left' : m ? 'center' : 'right', 500, true);
        });
      },
      aoEvento: function (r, E) { S.flashes.push({ n: r.lab.n, ms: r.ms, t0: E.t, cor: corTipo(r.tipo) }); if (S.flashes.length > 80) S.flashes.shift(); },
      quem: function (x, y, E) {
        var d = S.dados; if (!d || x < S.esq || x > S.dir) return null;
        var ref = (E && (E.relogioVivo || E.agora)) || 0, fr = (ref - Math.floor(ref / 60000) * 60000) / 60000, c = Math.floor((x - S.esq) / S.cw + fr);
        for (var i = 0; i < S.linhas.length; i++) {
          var ln = S.linhas[i]; if (y < ln.y || y > ln.y + S.ch) continue;
          var a = d.porLab[ln.lab.n], v = a && c >= 0 && c <= M ? a[c] : 0, visto = d.coberturaCol != null && c >= d.coberturaCol;
          return { lab: ln.lab, txt: horaBrt((d.ini + c) * 60000) + ' · ' + (!visto ? 'a página não viu este minuto' : v ? fmtInt(v) + ' genes' : 'sem cálculos') };
        }
        return null;
      },
      limpar: function () { S.flashes = []; }
    };
  });

  // ---------------------------------------------------------------- 8. ESFERA
  // Cada ponto e um gene da amostra numa esfera que roda devagar; cada lab e uma FAIXA de latitude (andar mais baixo em cima).
  // Robustos a ouro, demitidos a cinza, genes novos a ciano. Quando um lab calcula, a faixa dele incha, o anel de latitude
  // acende e os genes que calcularam brilham; com mais actividade a esfera roda mais depressa.
  registar(function () {
    var TILT = 0.42, S = { chave: '', N: 0, px: null, py: null, pz: null, sx: null, sy: null, sz: null, gene: [], lab: [], rot: 0, bandas: [], aneis: [] };
    var lotes = []; for (var q = 0; q < 12; q++) lotes.push(new Lote(1600));
    var CORES = [C.rob, 'rgba(242,194,48,.85)', C.novo, C.dem], ALFA = [0.22, 0.5, 0.95];
    function arrumar(E) {
      var genes = [];
      E.labs.forEach(function (lab) { lab.amostra.forEach(function (g) { genes.push([lab, g]); }); });
      var N = genes.length, ga = Math.PI * (3 - Math.sqrt(5)), soma = {}, cont = {};
      S.N = N; S.px = new Float32Array(N); S.py = new Float32Array(N); S.pz = new Float32Array(N); S.sx = new Float32Array(N); S.sy = new Float32Array(N); S.sz = new Float32Array(N);
      S.gene = new Array(N); S.lab = new Array(N);
      for (var i = 0; i < N; i++) {
        var y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(Math.max(0, 1 - y * y)), ph = i * ga, n = genes[i][0].n;
        S.px[i] = Math.cos(ph) * r; S.py[i] = y; S.pz[i] = Math.sin(ph) * r; S.lab[i] = genes[i][0]; S.gene[i] = genes[i][1];
        soma[n] = (soma[n] || 0) + y; cont[n] = (cont[n] || 0) + 1;
      }
      S.bandas = E.labs.map(function (lab) { return { lab: lab, y: cont[lab.n] ? soma[lab.n] / cont[lab.n] : 0 }; });
    }
    return {
      id: 'esfera', nome: 'Esfera',
      descricao: 'Cada ponto é um gene da amostra e cada faixa de latitude um laboratório. Robustos a ouro, demitidos a cinza. Quando um lab calcula, a faixa dele incha, o anel acende e os genes brilham; com mais actividade, a esfera roda mais depressa.',
      desenhar: function (ctx, w, h, E, dt) {
        if (!pronto(ctx, w, h, E)) return;
        if (S.chave !== String(E.versao)) { arrumar(E); S.chave = String(E.versao); }
        var grande = w >= 560, cx = w / 2, cy = h / 2, R = Math.max(6, Math.min(w, h) * (grande ? 0.42 : 0.4)), i;
        if (!E.calmo && dt > 0) S.rot = (S.rot + dt * (0.14 + 0.5 * clamp(E.energia / 3, 0, 1))) % TAU;
        var cr = Math.cos(S.rot), sr = Math.sin(S.rot), ct = Math.cos(TILT), st = Math.sin(TILT);
        ctx.strokeStyle = 'rgba(242,194,48,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy, R, Math.max(0.1, R * st), 0, 0, TAU); ctx.stroke();
        for (i = 0; i < 12; i++) lotes[i].n = 0;
        var tam = grande ? 1.35 : 1;
        for (i = 0; i < S.N; i++) {
          var lab = S.lab[i], g = S.gene[i], inch = E.calmo ? 1 : 1 + 0.1 * Math.min(1, lab.energia) + 0.05 * lab.pulso;
          var x = S.px[i], y = S.py[i], z = S.pz[i], x1 = x * cr + z * sr, z1 = -x * sr + z * cr, y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
          var sx = cx + x1 * R * inch, sy = cy + y2 * R * inch;
          S.sx[i] = sx; S.sy[i] = sy; S.sz[i] = z2;
          var prof = z2 < -0.3 ? 0 : z2 < 0.35 ? 1 : 2, cls = g.d ? 3 : g.r ? 0 : g.novo > 0.08 ? 2 : 1;
          var lado = tam * (prof === 0 ? 0.55 : prof === 1 ? 0.8 : 1.1) * (cls === 0 ? 1.3 : 1);
          lotes[cls * 3 + prof].por(sx - lado, sy - lado, lado * 2, lado * 2);
        }
        for (var p = 0; p < 3; p++) for (var c = 0; c < 4; c++) lotes[c * 3 + p].rects(ctx, CORES[c], ALFA[p] * (c === 1 ? 0.8 : 1));
        S.bandas.forEach(function (b) {
          var pu = b.lab.pulso, e = Math.min(1, b.lab.energia); if (pu < 0.03 && e < 0.05) return;
          var k2 = E.calmo ? 1 : 1 + 0.1 * e, rl = Math.sqrt(Math.max(0, 1 - b.y * b.y)) * R * k2;
          ctx.strokeStyle = b.lab.corPulso || C.flash; ctx.globalAlpha = Math.min(0.9, 0.25 * e + 0.6 * pu); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse(cx, cy + b.y * ct * R * k2, Math.max(0.1, rl), Math.max(0.1, rl * st), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          if (grande && pu > 0.05) escrever(ctx, b.lab.curto, cx + rl + 8, cy + b.y * ct * R * k2 + 3, C.ouroHi, 10, 'left', 500);
        });
        for (i = S.aneis.length - 1; i >= 0; i--) {          // o calculo solta um anel da faixa do lab, que se afasta e apaga
          var an = S.aneis[i], u = (E.t - an.t0) / 1.4, bd = null;
          if (u > 1 || u < -0.5) { S.aneis.splice(i, 1); continue; }
          for (var j = 0; j < S.bandas.length; j++) if (S.bandas[j].lab === an.lab) { bd = S.bandas[j]; break; }
          if (!bd || u < 0) continue;
          var kk = 1 + (E.calmo ? 0.04 : 0.28 * ease(u)) * (0.6 + 0.4 * an.forca), ra = Math.sqrt(Math.max(0, 1 - bd.y * bd.y)) * R * kk;
          ctx.strokeStyle = an.cor; ctx.globalAlpha = 0.75 * (1 - u); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(cx, cy + bd.y * ct * R * kk, Math.max(0.1, ra), Math.max(0.1, ra * st), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.lineWidth = 1;
        for (i = 0; i < S.N; i++) { var gg = S.gene[i]; if (!(gg.luz > 0.05)) continue; luz(ctx, gg.novo > 0.3 ? C.novo : C.flash, S.sx[i], S.sy[i], (grande ? 7 : 5) * (0.6 + 0.4 * gg.luz), gg.luz * (0.35 + 0.65 * (S.sz[i] + 1) / 2)); }
        if (grande && E.labs.length) {
          escrever(ctx, 'em cima: andar ' + E.labs[0].n + ' (' + E.labs[0].curto + ') · em baixo: andar ' + E.labs[E.labs.length - 1].n + ' (' + E.labs[E.labs.length - 1].curto + ')', 14, h - 12, C.dim, 9.5, 'left', 500, true);
        }
      },
      // (a faixa incha pela energia do lab e os genes acendem pela luz - estado); aqui: o anel que se solta da faixa
      aoEvento: function (r, E) { S.aneis.push({ lab: r.lab, t0: E ? E.t : 0, forca: r.forca, cor: corTipo(r.tipo) }); if (S.aneis.length > 40) S.aneis.shift(); },
      quem: function (x, y) {
        var best = -1, bd = 10 * 10;
        for (var i = 0; i < S.N; i++) { if (S.sz[i] < 0) continue; var dx = S.sx[i] - x, dy = S.sy[i] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
        return best >= 0 ? { lab: S.lab[best] } : null;
      },
      limpar: function () { S.aneis = []; }
    };
  });

  function criarModelos() { return FABRICAS.map(function (f) { return f(); }); }

  var API = {
    TIPOS: TIPOS, GRUPOS: GRUPOS, JANELA_ACT_MS: JANELA_ACT_MS, ARRANQUE_PUB_MS: ARRANQUE_PUB_MS, ESPALHAR_MAX_MS: ESPALHAR_MAX_MS, HORA_MS: HORA_MS,
    num: num, clamp: clamp, decair: decair, forcaDe: forcaDe, nomeBonito: nomeBonito, nomeCurto: nomeCurto, sigla: sigla,
    normalizarLabs: normalizarLabs, criarEstado: criarEstado, carregarLabs: carregarLabs, andarDoEvento: andarDoEvento,
    labDoEvento: labDoEvento, chaveDoEvento: chaveDoEvento, normalizarEvento: normalizarEvento, registarHistoria: registarHistoria,
    podarHistoria: podarHistoria, aplicarEvento: aplicarEvento, actividade: actividade, passo: passo, celulasDoMapa: celulasDoMapa,
    planearLocal: planearLocal, planearPublicado: planearPublicado, planearRepeticao: planearRepeticao, cursorDaRepeticao: cursorDaRepeticao,
    modoPublicado: modoPublicado, horaBrt: horaBrt, fmtInt: fmtInt, criarModelos: criarModelos,
    ids: function () { return criarModelos().map(function (m) { return m.id; }); }
  };
  if (typeof module !== 'undefined' && module && module.exports) module.exports = API;
  if (raiz) raiz.LabModelos = API;

  // ================================================================ A PAGINA (so no browser, com a grelha presente)
  if (typeof document !== 'undefined' && document && typeof document.getElementById === 'function' && document.getElementById('lm_grelha')) arrancar();

  function arrancar() {
    var doc = document, $ = function (id) { return doc.getElementById(id); };
    var q = String(location.search || '');
    var publicado = /[?&]modo=publicado\b/.test(q) ? true : /[?&]modo=vivo\b/.test(q) ? false : modoPublicado(location);
    var calmo = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var E = criarEstado({ calmo: calmo, publicado: publicado });
    var MODELOS = criarModelos(), CARTOES = [], FILA = [], ampliadoIdx = null;
    var VIVO = { fase: 0, seq: 0, anelDesde: 0, pub: { D: null }, primeira: true, falhas: 0, okEm: 0, vistos: {}, vistosLista: [] };
    var LABS = { falhas: 0, okEm: 0 };
    var AVISO = { txt: '', ate: 0 };
    var ativoAte = 0;
    window.__labModelos = { estado: E, modelos: MODELOS, publicado: publicado };   // a sonda le daqui (nada se escreve por aqui)

    var volta = $('lm_voltar'); if (volta) volta.setAttribute('href', publicado ? './' : 'torre3b.html');
    if (publicado) doc.body.classList.add('publicado');
    if (calmo) doc.body.classList.add('calmo');

    // ---------- os cartoes
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var grelha = $('lm_grelha'), veu = $('lm_veu'), dicaEl = $('lm_dica');
    MODELOS.forEach(function (m, i) {
      var art = doc.createElement('article');
      art.className = 'lm-cartao'; art.tabIndex = 0; art.setAttribute('role', 'button'); art.dataset.m = m.id;
      art.setAttribute('aria-label', (i + 1) + ' · ' + m.nome + ' — ampliar');
      art.innerHTML = '<header class="lm-ch"><span class="lm-num">' + (i + 1) + '</span><h2>' + esc(m.nome) + '</h2>' +
        '<span class="lm-rep">repetição</span><button type="button" class="lm-fechar" aria-label="voltar à grelha">voltar ✕</button></header>' +
        '<div class="lm-tela"><canvas aria-hidden="true"></canvas></div><p class="lm-desc">' + esc(m.descricao) + '</p>';
      grelha.appendChild(art);
      var cv = art.querySelector('canvas'), o = { m: m, i: i, art: art, cv: cv, ctx: cv.getContext('2d'), w: 0, h: 0, d: 0, vis: true, medir: true, erros: 0 };
      CARTOES.push(o);
      art.addEventListener('click', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('.lm-fechar')) { ev.stopPropagation(); fechar(); return; }
        if (ampliadoIdx !== i) abrir(i);
      });
      art.addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ampliadoIdx !== i && ev.target === art) { ev.preventDefault(); abrir(i); } });
      cv.addEventListener('pointermove', function (ev) { dica(o, ev); });
      cv.addEventListener('pointerleave', esconderDica);
    });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function (es) { es.forEach(function (en) { CARTOES.forEach(function (o) { if (o.cv.parentElement === en.target) o.medir = true; }); }); }); CARTOES.forEach(function (o) { ro.observe(o.cv.parentElement); }); }
    if (window.IntersectionObserver) { var io = new IntersectionObserver(function (es) { es.forEach(function (en) { CARTOES.forEach(function (o) { if (o.art === en.target) o.vis = en.isIntersecting; }); }); }); CARTOES.forEach(function (o) { io.observe(o.art); }); }
    window.addEventListener('resize', function () { CARTOES.forEach(function (o) { o.medir = true; }); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { E.versao++; });   // as letras da marca chegaram: refaz as etiquetas
    function medir(o) {
      o.medir = false;
      var r = o.cv.getBoundingClientRect(), d = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      if (w === o.w && h === o.h && d === o.d) return;
      o.w = w; o.h = h; o.d = d; o.cv.width = Math.round(w * d); o.cv.height = Math.round(h * d);
      o.ctx.setTransform(o.cv.width / w, 0, 0, o.cv.height / h, 0, 0); o.ctx._f = null;
    }

    // ---------- ampliar e voltar (o botao "voltar" do telemovel tambem volta: history)
    function indiceDoHash() { var h = String(location.hash || '').replace('#', ''); for (var i = 0; i < MODELOS.length; i++) if (MODELOS[i].id === h) return i; return null; }
    function abrir(i, trocar) {
      if (i == null || i < 0 || i >= CARTOES.length || ampliadoIdx === i) return;
      var antes = ampliadoIdx;
      if (antes != null) CARTOES[antes].art.classList.remove('ampliado');
      var o = CARTOES[i]; o.art.classList.add('ampliado'); o.medir = true; ampliadoIdx = i;
      doc.body.classList.add('com-ampliado'); veu.hidden = false; esconderDica();
      var hash = '#' + MODELOS[i].id;
      try { if (antes != null || trocar) history.replaceState({ lm: i }, '', hash); else history.pushState({ lm: i }, '', hash); } catch (e) { /* sem history: fica so a classe */ }
      var b = o.art.querySelector('.lm-fechar'); if (b && b.focus) b.focus({ preventScroll: true });
    }
    function fechar(daHistoria) {
      if (ampliadoIdx == null) return;
      var o = CARTOES[ampliadoIdx];
      o.art.classList.remove('ampliado'); ampliadoIdx = null;
      doc.body.classList.remove('com-ampliado'); veu.hidden = true; esconderDica();
      CARTOES.forEach(function (c) { c.medir = true; });
      if (!daHistoria) { try { if (history.state && history.state.lm != null) history.back(); else history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* idem */ } }
      if (o.art.focus) o.art.focus({ preventScroll: true });
    }
    window.addEventListener('popstate', function () { var i = indiceDoHash(); if (i == null) fechar(true); else abrir(i, true); });
    veu.addEventListener('click', function () { fechar(); });
    doc.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Escape') { if (ampliadoIdx != null) { ev.preventDefault(); fechar(); } return; }
      if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); repetir(); return; }   // (ampliado, o botao fica por baixo do veu)
      if (/^[1-9]$/.test(ev.key)) { var i = Number(ev.key) - 1; if (i < MODELOS.length) { ev.preventDefault(); if (ampliadoIdx != null) abrir(i, true); else abrir(i); } return; }
      if (ampliadoIdx != null && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { ev.preventDefault(); abrir((ampliadoIdx + (ev.key === 'ArrowRight' ? 1 : MODELOS.length - 1)) % MODELOS.length, true); }
    });
    var hi = indiceDoHash(); if (hi != null) abrir(hi, true);

    // ---------- a etiqueta do rato
    function dica(o, ev) {
      if (!o.m.quem || !E.carregado) return;
      var r = o.cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, res = null;
      try { res = o.m.quem(x, y, E); } catch (e) { res = null; }
      if (!res || !res.lab) { esconderDica(); return; }
      var l = res.lab;
      dicaEl.innerHTML = '<b>' + esc(l.nome) + '</b><i>andar ' + esc(l.n) + ' · ' + fmtInt(l.total) + ' genes · ' + fmtInt(l.robustos) + ' robustos (' + pct(l.fr) + ')' +
        (l.demitidos ? ' · ' + fmtInt(l.demitidos) + ' demitidos' : '') + '</i><i>' + (l.g3 > 0 ? fmtInt(l.g3) + ' genes nos últimos 3 min · ' : '') +
        (l.ultEvMs ? 'último cálculo ' + horaBrt(l.ultEvMs) : 'sem cálculos no anel') + '</i>' + (res.txt ? '<i>' + esc(res.txt) + '</i>' : '');
      dicaEl.hidden = false;
      var bw = dicaEl.offsetWidth, bh = dicaEl.offsetHeight, px = ev.clientX + 14, py = ev.clientY + 14;
      if (px + bw > window.innerWidth - 8) px = ev.clientX - bw - 14;
      if (py + bh > window.innerHeight - 8) py = ev.clientY - bh - 14;
      dicaEl.style.left = Math.max(8, px) + 'px'; dicaEl.style.top = Math.max(8, py) + 'px';
    }
    function esconderDica() { if (dicaEl) dicaEl.hidden = true; }

    // ---------- os dados
    function pedirJson(url) {
      var ctl = window.AbortController ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
      return fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) {
        if (tm) clearTimeout(tm);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }, function (e) { if (tm) clearTimeout(tm); throw e; });
    }
    function cicloLabs() {
      pedirJson('labs.json?t=' + Date.now()).then(function (d) {
        if (carregarLabs(E, d)) { LABS.falhas = 0; LABS.okEm = Date.now(); } else LABS.falhas++;
      }).catch(function () { LABS.falhas++; }).then(function () {
        setTimeout(cicloLabs, !E.carregado ? 8000 : publicado ? 300000 : 60000);
      });
    }
    function visto(e) {
      var k = chaveDoEvento(e); if (VIVO.vistos[k]) return true;
      VIVO.vistos[k] = 1; VIVO.vistosLista.push(k);
      if (VIVO.vistosLista.length > 5000) VIVO.vistosLista.splice(0, 1000).forEach(function (x) { delete VIVO.vistos[x]; });
      return false;
    }
    function porNaFila(itens) {
      if (!itens.length) return;
      Array.prototype.push.apply(FILA, itens);
      FILA.sort(function (a, b) { return a.quando - b.quando; });
    }
    function receberVivo(d) {
      if (!d || !Array.isArray(d.eventos)) return;
      var agora = Date.now(), novos = d.eventos.filter(function (e) { return e && typeof e === 'object' && !visto(e); });
      novos.forEach(function (e) { e.ms = Date.parse(e.t); if (isFinite(e.ms) && (E.cobertura == null || e.ms < E.cobertura)) E.cobertura = e.ms; });
      if (publicado) {
        var plano = planearPublicado(novos, VIVO.pub, agora, VIVO.primeira);
        VIVO.primeira = false;
        plano.historia.forEach(function (e) { aplicarEvento(E, e, 'silencioso', agora); });
        porNaFila(plano.fila.filter(function (it) { return it.ev.k === 'genes'; }).map(function (it) { return { quando: it.quando, ev: normalizarEvento(it.ev) }; }).filter(function (it) { return it.ev; }));
        return;
      }
      var reiniciou = d.seq != null && d.seq < VIVO.seq, historia = VIVO.fase < 2 || reiniciou;
      if (d.seq != null) VIVO.seq = d.seq;
      var genes = novos.map(normalizarEvento).filter(Boolean);
      if (historia || doc.hidden) genes.forEach(function (e) { aplicarEvento(E, e, 'silencioso', agora); });
      else porNaFila(planearLocal(genes, agora));
      if (VIVO.fase === 0) { if (VIVO.seq > 60) { VIVO.fase = 1; VIVO.anelDesde = Math.max(1, VIVO.seq - 799); } else VIVO.fase = 2; }
      else if (VIVO.fase === 1) VIVO.fase = 2;
    }
    function cicloVivo() {
      var url = publicado ? 'vivo.json?t=' + Date.now() : 'vivo.json?desde=' + (VIVO.fase === 1 ? VIVO.anelDesde : VIVO.fase === 0 ? 0 : VIVO.seq) + '&t=' + Date.now();
      pedirJson(url).then(function (d) { VIVO.falhas = 0; VIVO.okEm = Date.now(); receberVivo(d); }).catch(function () { VIVO.falhas++; }).then(function () {
        var espera = VIVO.fase === 1 ? 0 : publicado ? (doc.hidden ? 60000 : 15000) : (doc.hidden ? 10000 : 2000);
        if (VIVO.falhas) espera = Math.min(30000, Math.max(espera, 2000 * Math.pow(2, Math.min(4, VIVO.falhas - 1))));
        setTimeout(cicloVivo, espera);
      });
    }

    // ---------- tocar
    function relogioVivo(agora) { return publicado && VIVO.pub.D != null ? agora - VIVO.pub.D : agora; }
    function tocar(ev, modo, agora) {
      var r = aplicarEvento(E, ev, modo, agora);
      if (!r) return;
      ativoAte = agora + 3000;
      for (var i = 0; i < MODELOS.length; i++) {
        try { MODELOS[i].aoEvento(r, E); } catch (e) { if (window.console && CARTOES[i].erros++ < 3) console.warn('lab_modelos ' + MODELOS[i].id, e); }
      }
    }
    function drenar(agora) {
      while (FILA.length && FILA[0].quando <= agora) {
        var it = FILA.shift();
        if (E.rep || doc.hidden || agora - it.quando > 4000) aplicarEvento(E, it.ev, 'silencioso', agora);
        else tocar(it.ev, 'vivo', agora);
      }
      var R = E.rep;
      if (R) {
        while (R.i < R.fila.length && R.fila[R.i].quando <= agora) { tocar(R.fila[R.i].ev, 'repeticao', agora); R.i++; }
        if (R.i >= R.fila.length && agora > R.fim + 2500) pararRepeticao(true);
      }
    }
    setInterval(function () { var agora = Date.now(); if (doc.hidden) drenar(agora); podarHistoria(E, agora); }, 1000);

    // ---------- a repeticao
    var botaoRep = $('lm_rep');
    function limparModelos() {
      MODELOS.forEach(function (m) { try { if (m.limpar) m.limpar(); } catch (e) { /* um modelo partido nao para a repeticao */ } });
      E.labs.forEach(function (l) { l.energia = 0; l.pulso = 0; l.amostra.forEach(function (g) { g.luz = 0; }); });
    }
    function aviso(txt, ms) { AVISO.txt = txt; AVISO.ate = Date.now() + ms; pintarEstado(Date.now()); }
    function repetir() {
      if (E.rep) { pararRepeticao(false); return; }
      var agora = Date.now(), ref = relogioVivo(agora);
      var evs = E.hist.filter(function (e) { return e.ms >= ref - HORA_MS && e.ms <= ref; });
      var plano = planearRepeticao(evs, agora);
      if (!plano) { aviso('Nada para repetir: o anel não tem cálculos de genes da última hora' + (E.cobertura ? ' (a página vê-o desde as ' + horaBrt(E.cobertura) + ').' : '.'), 8000); return; }
      limparModelos(); E.rep = plano; doc.body.classList.add('em-repeticao');
      if (botaoRep) botaoRep.textContent = 'parar a repetição';
      pintarEstado(agora);
    }
    function pararRepeticao(chegouAoFim) {
      if (!E.rep) return;
      E.rep = null; limparModelos(); doc.body.classList.remove('em-repeticao');
      if (botaoRep) botaoRep.textContent = 'repetir a última hora';
      aviso(chegouAoFim ? 'Fim da repetição — de volta ao vivo.' : 'Repetição parada — de volta ao vivo.', 4000);
    }
    if (botaoRep) botaoRep.addEventListener('click', repetir);

    // ---------- o estado no topo (de meio em meio segundo, so texto)
    function txt(el, s) { if (el && el.textContent !== s) el.textContent = s; }
    var elFonte = $('lm_fonte'), elLed = $('lm_led'), elLabs = $('lm_labs'), elAct = $('lm_act');
    function pintarEstado(agora) {
      var velho = agora - VIVO.okEm, limite = publicado ? 90000 : 20000;   // (o servidor da sala, com a maquina carregada, chega a demorar 5 s)
      var fonte = publicado ? 'cópia pública · diferido ' + (VIVO.pub.D != null ? '≈ ' + Math.max(1, Math.round(VIVO.pub.D / 60000)) + ' min' : '…') : 'ao vivo · servidor da torre';
      if (!VIVO.okEm) fonte = VIVO.falhas ? (publicado ? 'sem o vivo.json da cópia pública' : 'sem resposta do servidor da torre (vivo.json)') : 'a ligar…';
      else if (velho > limite) fonte += ' · sem dados novos há ' + Math.round(velho / 1000) + ' s';
      txt(elFonte, fonte);
      if (elLed) elLed.className = 'led' + (!VIVO.okEm && !VIVO.falhas ? ' at pulsa' : (!VIVO.okEm || velho > limite * 3) ? ' mau' : velho > limite ? ' at' : '');
      txt(elLabs, E.carregado ? fmtInt(E.totais.labs) + ' laboratórios · ' + fmtInt(E.totais.genes) + ' genes · ' + fmtInt(E.totais.robustos) + ' robustos (' + pct(E.totais.genes ? E.totais.robustos / E.totais.genes : 0) + ')'
        : (LABS.falhas ? 'sem o labs.json (tentativa ' + LABS.falhas + ')' : 'a ler os laboratórios…'));
      var s, cls = 'lm-act';
      var ult = E.hist.length ? E.hist[E.hist.length - 1] : null, ultLab = ult ? E.porAndar[ult.andar] : null;
      var ultTxt = ult ? horaBrt(ult.ms) + ' · ' + (ultLab ? ultLab.curto : 'andar ' + ult.andar) + ' · ' + fmtInt(ult.n) + ' genes (' + (TIPOS[ult.tipo] || ult.tipo) + ')' : '';
      if (agora < AVISO.ate) { s = AVISO.txt; cls += ' aviso'; }
      else if (E.rep) { var R = E.rep; s = 'REPETIÇÃO ×' + Math.round(R.vel) + ' · a mostrar ' + horaBrt(E.relogio, true) + ' · ' + Math.min(R.i, R.n) + ' de ' + R.n + ' cálculos'; cls += ' rep'; }
      else if (E.act.genes > 0) s = 'a calcular: ' + E.act.labs + (E.act.labs === 1 ? ' lab' : ' labs') + ' · ' + fmtInt(E.act.genes) + ' genes nos últimos 3 min · último ' + ultTxt;
      else { s = 'sem cálculos agora' + (ult ? ' · último: ' + ultTxt : E.cobertura ? ' · o anel não tem nenhum desde as ' + horaBrt(E.cobertura) : ''); cls += ' calmo'; }
      txt(elAct, s); if (elAct && elAct.className !== cls) elAct.className = cls;
      doc.body.classList.toggle('sem-calculos', !E.rep && !(E.act.genes > 0));
    }

    // ---------- o relogio (um so, para os oito)
    var ultimo = 0, tAct = 0, tEst = 0;
    function quadro(ms) {
      requestAnimationFrame(quadro);
      if (doc.hidden) { ultimo = 0; return; }
      var agora = Date.now();
      drenar(agora);
      var fps = E.calmo ? 4 : (E.rep || E.energia > 0.02 || agora < ativoAte) ? 30 : 20;
      if (ultimo && ms - ultimo < 1000 / fps - 4) return;
      var dt = ultimo ? Math.min(0.1, (ms - ultimo) / 1000) : 1 / 30;
      ultimo = ms;
      E.agora = agora; E.t += dt; E.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      E.relogioVivo = relogioVivo(agora); E.relogio = E.rep ? cursorDaRepeticao(E.rep, agora) : E.relogioVivo;
      if (agora - tAct >= 200 || E.rep) { actividade(E, E.relogio); tAct = agora; }
      passo(E, dt);
      for (var i = 0; i < CARTOES.length; i++) {
        var o = CARTOES[i];
        if (ampliadoIdx != null ? i !== ampliadoIdx : !o.vis) continue;
        if (o.medir) medir(o);
        if (o.w < 25 || o.h < 25) continue;
        o.ctx.clearRect(0, 0, o.w, o.h);
        try { o.m.desenhar(o.ctx, o.w, o.h, E, dt); } catch (e) { if (window.console && o.erros++ < 3) console.warn('lab_modelos ' + o.m.id, e); }
      }
      if (agora - tEst >= 500) { pintarEstado(agora); tEst = agora; }
    }
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) { ultimo = 0; CARTOES.forEach(function (o) { o.medir = true; }); } });
    cicloLabs(); cicloVivo(); requestAnimationFrame(quadro);
  }
})(typeof window !== 'undefined' ? window : this);
