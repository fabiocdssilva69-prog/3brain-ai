// t3b_chat.js — O CHAT DA TORRE 3BRAIN (01/10/2026): "da mais um talento no chat" (ordem dele, sessao do visual).
//
// O que ele pediu ao chat desde 18/09, e onde cada coisa esta aqui:
//  - "parecer um bate-papo dos funcionarios, onde um conversa com o outro, um relata, um da aviso, outro da recado" ->
//    as mensagens do conversa.py E os RECADOS do barramento (sector -> sector) no mesmo fio, cada um com a sua cara;
//    as respostas citam a mensagem a que respondem.
//  - "TODOS os funcionarios" -> a fila mostra quem falou (as caras) e a linha de actividade diz quem esta a trabalhar
//    AGORA (o feed vivo: escreveu o seu ficheiro ha N s) - a empresa a mexer, nao so quem escreve frases.
//  - "as noticias com estilo e link" (26/09) -> cartao proprio, fonte e link clicavel.
//  - "o chat e o chat geral da empresa: 'acabamos de fechar tal, ganho confirmado tanto'" -> numeros a cor do sinal,
//    etiquetas por tipo, filtros (US$, noticias, recados, direccao).
// Nada e inventado: texto, autor, hora e tipo vem do conversa.json / barramento; a linha "a trabalhar" e um evento real
// (o ficheiro dele mudou ha N s), nunca um "esta a escrever..." de enfeite.
// As mensagens chegam pelo /vivo.json (ao segundo, inteiras); o conversa.json le-se UMA vez, para o historico.
//
// 04/10 (obra 4; ele: "o chat ta meio bugado com caracteres bugados"; c01: quadradinhos, letras trocadas, losango, texto cortado
// a meio, markdown cru, ids em vez de nomes; v07: "nao ta mostrando a mensagem completa, tem que ajeitar pra cada uma caber"):
//  - todo o texto passa por T3BTexto.limpar (mojibake, losango, bandeiras, controlo) e o markdown vira negrito/listas (nunca
//    ** nem ##); os cortes (a citacao) sao por grafemas, nunca a meio de um emoji
//  - as mensagens aparecem INTEIRAS (sem o corte a 2 linhas); quando a de cima nao cabe inteira no fio, esconde-se ate se rolar
//    - mostram-se menos mensagens, mas cada uma inteira
//  - os recados dizem o NOME do sector (o andar) e nao o id; o servidor ja troca os ids dos contratados pelo nome deles
'use strict';
(function () {
  var T3B = window.T3B, U = T3B.util, $ = U.$, escH = U.escH;
  var lista = $('ch_lista'); if (!lista) return;
  var TX = window.T3BTexto, limpo = U.limpo, cortar = U.cortar;
  var MAX_DOM = 90, vistos = {}, porMid = {}, autores = {}, filtro = 'todos', novasAbaixo = 0, colado = true, ultimoAutor = null, ultimoT = 0;
  var ETQ = { mercado: 'MERCADO', lucro: 'LUCRO', perda: 'PERDA', director: 'DIRECÇÃO', contratacao: 'CONTRATAÇÃO', inauguracao: 'INAUGURAÇÃO',
    lab: 'LAB', risco: 'RISCO', resposta: 'RESPOSTA', noticia: 'NOTÍCIA', dados: 'DADOS', auditoria: 'AUDITORIA', estatistica: 'ESTATÍSTICA', recado: 'RECADO', pergunta: 'PERGUNTA' };
  var DINHEIRO = /^(lucro|perda|mercado|risco|director)$/;

  // os numeros do texto em mono e a cor do proprio sinal; "andar 43" vira um botao que abre o andar
  var RE = /([+\-−]\d[\d.]*(?:,\d+)?\s?(?:%|US\$|pb|p\.p\.)?|\d[\d.]*(?:,\d+)?\s?(?:%|US\$|pb)|andar(?:es)?\s+\d{1,2})/g;
  function enriquecer(t) {
    var html = TX ? TX.mdParaHtml(limpo(t)) : escH(t);
    return html.split(/(<[^>]+>)/).map(function (bocado) { return bocado.charAt(0) === '<' ? bocado : realcar(bocado); }).join('');
  }
  // (o texto ja vem escapado: os numeros e "andar N" nao tem nada que se escape)
  function realcar(t) {
    return String(t || '').split(RE).map(function (p, i) {
      if (i % 2 === 0) return p;
      var m = /^andar(?:es)?\s+(\d{1,2})$/.exec(p);
      if (m) return '<button type="button" class="ch-and" data-n="' + m[1] + '" style="background:none;border:0;padding:0;color:var(--ouro);cursor:pointer;font:inherit;text-decoration:underline dotted">' + p + '</button>';
      var cor = /^[+]/.test(p) ? 'var(--ok)' : /^[\-−]/.test(p) ? 'var(--mau)' : 'var(--txt)';
      return '<span class="n" style="color:' + cor + '">' + p + '</span>';
    }).join('');
  }
  // q28 (grupo de WhatsApp): cada participante tem a SUA cor de nome, sempre a mesma (pelo nome), como nos grupos
  var CORES_NOME = ['#f15c6d', '#fd8f2b', '#ffbc38', '#35cd96', '#53bdeb', '#a281f0', '#e542a3', '#02a698', '#6bcbef', '#e26b7b', '#c4e86b', '#ff8fb1'];
  function corDoNome(n) { var h = 0, t = String(n || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return CORES_NOME[Math.abs(h) % CORES_NOME.length]; }
  function eDinheiro(m) { return DINHEIRO.test(m.tipo || '') || m.valor_usd != null; }
  function passaFiltro(m) {
    if (filtro === 'todos') return true;
    if (filtro === 'dinheiro') return eDinheiro(m);
    if (filtro === 'noticia') return m.tipo === 'noticia';
    if (filtro === 'recado') return m.tipo === 'recado';
    if (filtro === 'direccao') return m.tipo === 'director' || (m.autor && Number(m.autor.andar) >= 52);
    if (filtro === 'perguntas') return !!m.chat;
    return true;
  }

  function cartaoDaMensagem(m) {
    var a = m.autor || {}, nome = limpo(a.titulo || (TX ? TX.nomeDeId(a.id) : a.id) || '?'), and = a.andar, cor = U.corDoAndar(and);
    var heroi = /Stark|Director|Supervisor|Gerente de Opera/.test(nome);
    var grupo = ultimoAutor === (a.id || nome) && Math.abs(m.ms - ultimoT) < 120000 && m.tipo !== 'recado';
    ultimoAutor = a.id || nome; ultimoT = m.ms;
    var el = document.createElement('div');
    // q28 + q03 (03/10): "tudo em cima um do outro" era o avatar escondido com height:0 numa grelha que continuava a
    // reservar a linha e o balao a nao encolher. Agora a continuacao do mesmo autor e uma CLASSE (.seg) e o CSS trata
    // do resto; o fio e um bloco so, como um grupo de WhatsApp: autor em cima, balao, hora a direita.
    el.className = 'msg ' + escH(m.tipo || '') + (grupo ? ' seg' : '');
    el.dataset.tipo = m.tipo || '';
    el.dataset.dia = String(m.t_iso || '').slice(0, 10);
    var cita = '';
    if (m.responde_a && porMid[m.responde_a]) {
      var o = porMid[m.responde_a];
      cita = '<div class="cita">↪ <b>' + escH(limpo((o.autor || {}).titulo || '')) + '</b> ' + escH(cortar(TX ? TX.semMarkdown(limpo(o.texto)) : String(o.texto || ''), 90)) + '</div>';
    }
    // ponto 7 (>= 5 mensagens a vista): o caminho do recado vai no cabecalho, nao numa linha propria
    var rota = '', rotaCab = m.tipo === 'recado' ? '<span class="rt">→ <b>' + escH(limpo(m.para_nome || (TX ? TX.nomeDeId(m.para_sector || 'todos') : m.para_sector))) + '</b>' + (m.para != null ? ' · and. ' + escH(m.para) : '') + (m.subtipo ? ' · ' + escH(m.subtipo) : '') + '</span>' : '';
    // o url vem de feeds de fora: so http(s) entra num href (um "javascript:" de um feed seria codigo a correr aqui)
    var url = /^https?:\/\//i.test(String(m.url || '')) ? String(m.url) : null;
    var link = url ? '<a class="lk" href="' + escH(url) + '" target="_blank" rel="noopener noreferrer">↗ ' + escH(limpo(m.fonte || 'abrir a peça')) + '</a>' : '';
    // ponto 7: a pergunta dele (a direita, verde, como as nossas no WhatsApp) e a resposta de quem e dono do dado (com o
    // caminho: frota gratis ou 1 chamada da cota pelo Sr. Stark)
    var via = m.chat && m.tipo === 'resposta' ? '<span class="via">' + (String(m.via || '').indexOf('cota:') === 0 ? 'respondeu o Sr. Stark · 1 chamada da cota' : String(m.via || '').indexOf('frota') === 0 ? 'respondeu quem é dono do dado · frota grátis (' + escH(String(m.via).slice(6)) + ')' : 'sem resposta') + '</span>'
      : m.chat && m.tipo === 'pergunta' && m.para ? '<span class="via">para ' + escH(limpo(m.para)) + (m.para_andar != null ? ' · and. ' + escH(m.para_andar) : '') + '</span>' : '';
    // a hora vai no cabecalho (a direita); o texto vai INTEIRO (04/10, v07)
    var hora = escH(U.hhmmss(m.t_iso).slice(0, 5));
    el.innerHTML = '<div class="av">' + (grupo ? '' : U.avatarSVG(nome, cor, !!a.feminino, heroi)) + '</div>' +
      '<div class="bal">' + (grupo ? '' : '<div class="cab"><b style="color:' + corDoNome(nome) + '">' + escH(nome) + '</b>' +
        (and != null ? '<span class="and" style="color:' + cor + ';border-color:' + cor + '">and. ' + escH(and) + '</span>' : '') +
        (ETQ[m.tipo] && m.tipo !== 'recado' ? '<span class="tag ' + escH(m.tipo) + '">' + ETQ[m.tipo] + '</span>' : '') + rotaCab + '<span class="t">' + hora + '</span>' +
        '</div>') +
      cita + rota + '<div class="txt">' + enriquecer(m.texto) + (grupo ? '<span class="hora">' + hora + '</span>' : '') + '</div>' + link + via + '</div>';
    if (m.chat) el.dataset.chat = '1';
    if (!passaFiltro(m)) el.hidden = true;
    return el;
  }

  function perto() { return lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40; }
  // v07: "se a mensagem X ocupar 2 mensagens no chat mostra menos mensagens pra poder caber essa inteira". Com o fio colado ao
  // fundo, a mensagem de cima que so se ve em parte fica escondida (o espaco dela fica vazio): o que se ve e sempre inteiro.
  var meiaT = 0;
  function soInteiras() {
    meiaT = 0;
    var antes = lista.querySelectorAll('.msg.meia'); for (var i = 0; i < antes.length; i++) antes[i].classList.remove('meia');
    if (!colado) return;
    var topo = lista.scrollTop + 2, filhos = lista.children;
    for (var k = 0; k < filhos.length; k++) {
      var el = filhos[k]; if (el.hidden) continue;
      var t = el.offsetParent === lista ? el.offsetTop : el.offsetTop - lista.offsetTop, b = t + el.offsetHeight;   // (a lista e posicionada: o offsetTop ja e dela)
      if (b <= topo) continue;
      // 05/10 (ele, com a print: "o chat ta bugado"): esconder a mensagem cortada deixava um BURACO vazio por cima da ultima;
      // agora fica a vista e o topo da lista esbate-se (t3b.css .chat-lista mask) - mais mensagens, nenhum espaco morto
      // if (t < topo - 1 && el.classList.contains('msg')) el.classList.add('meia');
      break;
    }
  }
  function soInteirasDepois() { if (!meiaT) meiaT = requestAnimationFrame(soInteiras); }
  if (window.ResizeObserver) new ResizeObserver(soInteirasDepois).observe(lista);
  lista.addEventListener('scroll', function () { colado = perto(); if (colado) { novasAbaixo = 0; pintarAviso(); } soInteirasDepois(); });
  var aviso = document.createElement('button');
  aviso.type = 'button'; aviso.hidden = true;
  aviso.style.cssText = 'position:absolute;right:16px;bottom:34px;z-index:3;background:var(--ouro);color:#0b0b0f;border:0;border-radius:12px;padding:3px 10px;font:600 10px var(--f-m);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)';
  aviso.addEventListener('click', function () { lista.scrollTop = lista.scrollHeight; colado = true; novasAbaixo = 0; pintarAviso(); });
  $('bl_chat').appendChild(aviso);
  function pintarAviso() { aviso.hidden = !novasAbaixo; aviso.textContent = novasAbaixo + ' nova' + (novasAbaixo === 1 ? '' : 's') + ' ↓'; }

  var vistosTexto = {};
  function juntar(m, animar) {
    var chave = m.mid || ('s' + m.s);
    if (vistos[chave]) return;
    vistos[chave] = 1;
    // 09/10 (ele: "o chat ta bugado varias mensagens repetidas"): um RECADO nao tem id de mensagem (a chave e o numero do evento),
    // e o mesmo recado (de, para, texto) chegava varias vezes com numeros diferentes. Em 6 h so entra uma vez.
    if (m.tipo === 'recado') {
      var ck = 'r|' + (m.de_sector || '') + '|' + (m.para_sector || '') + '|' + String(m.texto || '').slice(0, 160);
      var msR = m.ms || Date.now(), ja = vistosTexto[ck];
      if (ja && Math.abs(msR - ja) < 6 * 3600000) return;
      vistosTexto[ck] = msR;
    }
    if (m.mid) porMid[m.mid] = m;
    var a = m.autor || {};
    if (a.id || a.titulo) autores[a.id || a.titulo] = { a: a, ms: m.ms };
    var estava = colado;
    var el = cartaoDaMensagem(m);
    if (animar && !U.calmo) el.classList.add('novo');
    // o separador do dia (como nos grupos): quando a data muda entre duas mensagens seguidas
    var dia = el.dataset.dia, ultimo = lista.lastElementChild;
    if (dia && (!ultimo || (ultimo.dataset.dia || ultimo.dataset.diaSep) !== dia)) {
      var sep = document.createElement('div'); sep.className = 'chat-dia'; sep.dataset.diaSep = dia;
      var hoje = new Date().toISOString().slice(0, 10), ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      sep.innerHTML = '<span>' + (dia === hoje ? 'hoje' : dia === ontem ? 'ontem' : escH(dia.slice(8, 10) + '/' + dia.slice(5, 7))) + '</span>';
      lista.appendChild(sep);
    }
    lista.appendChild(el);
    while (lista.children.length > MAX_DOM) lista.removeChild(lista.firstChild);
    if (lista.firstChild && lista.firstChild.classList.contains('msg') && lista.firstChild.classList.contains('seg')) lista.firstChild.classList.remove('seg');   // a primeira do fio mostra sempre o autor
    if (estava) lista.scrollTop = lista.scrollHeight;
    else if (animar && !el.hidden) { novasAbaixo++; pintarAviso(); }
    soInteirasDepois();
  }

  function deEvento(e) {
    if (e.k === 'falou') return { mid: e.mid, s: e.s, ms: e.ms, t_iso: e.t, tipo: e.tipo, texto: e.txt, autor: e.autor || { id: e.id, titulo: e.quem, andar: e.andar },
      responde_a: e.responde_a, valor_usd: e.valor_usd, pct: e.pct, url: e.url, fonte: e.fonte, chat: e.chat, via: e.via, para: e.chat ? e.para : null, para_andar: e.para_andar };
    if (e.k === 'recado' && e.chat) return null;      // o recado que leva a pergunta do chat ja esta no fio como pergunta/resposta
    if (e.k === 'recado') return { s: e.s, ms: e.ms, t_iso: e.t, tipo: 'recado', subtipo: e.tipo, texto: e.txt, de_sector: e.de_sector, para_sector: e.para_sector, para: e.para,
      para_nome: e.para_nome, autor: { id: e.id, titulo: limpo(e.de_nome || e.quem || (TX ? TX.nomeDeId(e.de_sector) : e.de_sector)), andar: e.de } };
    return null;
  }

  // o historico (uma vez): o conversa.json (da mais recente para a mais antiga) + as perguntas dele com as respostas
  // (dados/chat_perguntas.jsonl, pelo servidor) - juntos e por ordem da hora
  var hist = { conversa: null, perguntas: null, feito: false };
  function juntarHistoria() {
    if (hist.feito || hist.conversa == null || hist.perguntas == null) return; hist.feito = true;
    hist.conversa.concat(hist.perguntas).sort(function (a, b) { return a.ms - b.ms; }).forEach(function (m) { juntar(m, false); });
    lista.scrollTop = lista.scrollHeight;
    pintarCabecalho(); soInteirasDepois();
  }
  function daPergunta(r) {
    var out = [], rota = r.rota || {};
    out.push({ mid: 'chat:' + r.id, ms: U.epoch(r.t_iso), t_iso: r.t_iso, tipo: 'pergunta', texto: r.pergunta, chat: 1, para: rota.nome, para_andar: rota.andar, autor: { id: 'ele', titulo: 'Fábio (tu)' } });
    if (r.resposta) out.push({ mid: 'chat:' + r.id + ':r', responde_a: 'chat:' + r.id, ms: U.epoch(r.t_resposta || r.t_iso) + 1, t_iso: r.t_resposta || r.t_iso, tipo: 'resposta', texto: r.resposta, chat: 1, via: r.via,
      autor: { id: r.programa_respondeu, titulo: r.quem_respondeu, andar: r.andar_respondeu } });
    return out;
  }
  T3B.on('conversa_historia', function (c) {
    var ms = U.lista(c && c.mensagens).slice(0, 60).reverse().map(function (m) { m.mid = m.id; m.ms = U.epoch(m.t_iso); return m; });
    if (hist.feito) {
      // chegou depois da espera (servidor lento): as mensagens antigas entram POR CIMA do fio, pela ordem, sem repetir
      var primeiro = lista.firstChild;
      ms.forEach(function (m) { var ch = m.mid || ('s' + m.s); if (vistos[ch]) return; vistos[ch] = 1; if (m.mid) porMid[m.mid] = m; var el = cartaoDaMensagem(m); lista.insertBefore(el, primeiro); });
      pintarCabecalho(); return;
    }
    hist.conversa = ms;
    juntarHistoria();
  });
  fetch('chat_perguntas.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { perguntas: [] }; })
    .then(function (d) { var o = []; U.lista(d && d.perguntas).forEach(function (r) { o = o.concat(daPergunta(r)); }); hist.perguntas = o; })
    .catch(function () { hist.perguntas = []; }).then(juntarHistoria);
  setTimeout(function () { if (hist.conversa == null) hist.conversa = []; if (hist.perguntas == null) hist.perguntas = []; juntarHistoria(); }, 45000);
  // o vivo: falas e recados, ao segundo
  T3B.on('eventos', function (evs) {
    evs.forEach(function (e) {
      var m = deEvento(e);
      if (m) { juntar(m, true); if (m.chat && m.tipo === 'resposta') tirarEspera(m.responde_a); }
      else if (e.k === 'escreveu' || e.k === 'mudou') actividade(e);
    });
    pintarCabecalho();
  });

  // ================================================================ PONTO 7: A CAIXA PARA ELE ESCREVER (r06)
  // A pergunta vai ao servidor da sala (POST /chat/pergunta, so desta maquina); o servidor entrega-a ao funcionario DONO do
  // dado (mercado/chat_torre.py: frota gratis com os dados do sector dele) ou, se ele nao souber, ao Sr. Stark (1 chamada da
  // cota). A pergunta e a resposta entram no fio pelo /vivo.json, com o nome de quem respondeu.
  var form = $('ch_form'), entrada = $('ch_txt'), botao = $('ch_env'), esperas = {};
  function bolhaSistema(texto, cls, chave) {
    var el = document.createElement('div'); el.className = 'msg resposta ' + (cls || ''); if (chave) el.dataset.espera = chave;
    el.innerHTML = '<div class="av"></div><div class="bal"><div class="txt">' + escH(texto) + '</div></div>';
    lista.appendChild(el); lista.scrollTop = lista.scrollHeight; colado = true;
    return el;
  }
  function tirarEspera(mid) { var el = esperas[mid]; if (el && el.parentNode) el.parentNode.removeChild(el); delete esperas[mid]; }
  if (form && entrada) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var texto = entrada.value.trim(); if (texto.length < 2 || botao.disabled) return;
    botao.disabled = true;
    fetch('chat/pergunta', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Torre': '1' }, body: JSON.stringify({ texto: texto }) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, erro: 'HTTP ' + r.status }; }); })
      .then(function (d) {
        if (d && d.ok) {
          entrada.value = '';
          var p = d.para || {}, mid = 'chat:' + d.id;
          esperas[mid] = bolhaSistema('a perguntar a ' + limpo(p.nome || 'Sr. Stark') + (p.andar != null ? ' (and. ' + p.andar + ')' : '') + '… se não souber, responde o Sr. Stark', 'espera', mid);
          setTimeout(function () { if (esperas[mid]) { esperas[mid].querySelector('.txt').textContent = 'ainda à espera de ' + (p.nome || 'resposta') + '… (o Sr. Stark pode levar alguns minutos)'; } }, 45000);
        } else bolhaSistema('não enviei: ' + ((d && d.erro) || 'erro'), 'espera');
      })
      .catch(function (e) { bolhaSistema('não enviei: o servidor da sala não respondeu (' + String(e).slice(0, 60) + ')', 'espera'); })
      .then(function () { botao.disabled = false; entrada.focus(); });
  });
  if (entrada) entrada.addEventListener('keydown', function (ev) { ev.stopPropagation(); });   // as teclas 0-3 dos niveis nao disparam a escrever

  // quem falou: as caras dos ultimos 8 e quantos diferentes ha no fio
  function pintarCabecalho() {
    var arr = Object.keys(autores).map(function (k) { return autores[k]; }).sort(function (x, y) { return y.ms - x.ms; });
    var av = $('ch_av');
    if (av) av.innerHTML = arr.slice(0, 8).map(function (x) {
      var a = x.a; return '<span class="av" title="' + escH(limpo(a.titulo || a.id)) + '">' + U.avatarSVG(a.titulo || a.id || '?', U.corDoAndar(a.andar), !!a.feminino, /Stark|Director/.test(a.titulo || '')) + '</span>';
    }).join('');
    U.txt($('ch_falaram'), arr.length + ' vozes');
    var dia = 0, agora = Date.now(); arr.forEach(function (x) { if (agora - x.ms < 86400000) dia++; });
    U.txt($('ch_kn'), lista.children.length + ' no fio · ' + dia + ' falaram em 24 h');
  }

  // A LINHA DE ACTIVIDADE: quem esta a trabalhar AGORA (o ficheiro dele mudou). Os tres pontos so andam enquanto o
  // evento tem menos de 4 s - depois fica a frase parada, com a idade.
  var act = { e: null, ms: 0 };
  function actividade(e) { act.e = e; act.ms = Date.now(); pintarActividade(); }
  function pintarActividade() {
    var el = $('ch_act'); if (!el || !act.e) return;
    var idade = Date.now() - act.ms, e = act.e, quente = idade < 4000;
    var o_que = e.k === 'mudou' ? 'mudou ' + cortar(limpo(e.txt || ''), 80) : 'escreveu ' + String(e.ficheiro || '').split('/').pop();
    el.innerHTML = (quente ? '<span class="pts"><i></i><i></i><i></i></span> ' : '') + '<b>' + escH(limpo(e.quem || (TX ? TX.nomeDeId(e.id) : e.id))) + '</b>' +
      (e.andar != null ? ' · and. ' + escH(e.andar) : '') + ' ' + escH(o_que) + ' · ' + (quente ? 'agora' : 'há ' + U.haQuanto(idade));
  }
  setInterval(pintarActividade, 1000);
  // os tres pontos "a escrever" andam por passos (um aceso de cada vez, 3 passos por segundo) em vez de uma animacao CSS
  // infinita - a infinita obrigava o compositor a refazer o ecra a cada vsync enquanto houvesse actividade (sempre)
  var passoPts = 0;
  setInterval(function () {
    if (document.hidden) return;
    var ps = document.querySelectorAll('#ch_act .pts i'); if (!ps.length) return;
    passoPts = (passoPts + 1) % 3;
    for (var i = 0; i < ps.length; i++) ps[i].classList.toggle('on', i === passoPts);
  }, 330);

  // filtros e os botoes de andar dentro das mensagens
  var fil = $('ch_fil');
  if (fil) fil.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-f]'); if (!b) return;
    filtro = b.dataset.f;
    Array.prototype.forEach.call(fil.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    Array.prototype.forEach.call(lista.children, function (el) {
      if (!el.classList.contains('msg')) { el.hidden = filtro !== 'todos'; return; }
      var tipo = el.dataset.tipo || '';
      el.hidden = filtro === 'todos' ? false : filtro === 'dinheiro' ? !DINHEIRO.test(tipo) : filtro === 'direccao' ? tipo !== 'director' : filtro === 'perguntas' ? el.dataset.chat !== '1' : tipo !== filtro;
      if (filtro !== 'todos' && !el.hidden) el.classList.remove('seg');
    });
    lista.scrollTop = lista.scrollHeight; colado = true; soInteirasDepois();
  });
  lista.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.ch-and'); if (b) { T3B.abrirAndar(Number(b.dataset.n), true); return; }
    if (ev.target.closest && ev.target.closest('a')) return;
    // (04/10: as mensagens ja aparecem inteiras - o clique para abrir deixou de ser preciso)
  });
})();
