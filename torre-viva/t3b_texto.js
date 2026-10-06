// t3b_texto.js — O TEXTO SEM CARACTERES PARTIDOS da Torre 3BRAIN (obra 4, 04/10/2026). Funcoes PURAS (sem DOM): correm no
// browser (window.T3BTexto) e no node (require) - os testes estao em sala/testes_t3b.js.
//
// O PEDIDO DELE (04/10): "o chat ta meio bugado com caracteres bugados". No questionario 3 (c01) marcou TODOS os tipos:
//   quadradinhos                -> bandeiras (🇮🇱 = 2 letras regionais que o Windows desenha como 2 caixas), caracteres de
//                                  controlo/zero-width e o "U+FFFD" de origem; tudo trocado por texto que se le
//   letras trocadas (Ã§)        -> texto UTF-8 lido como cp1252 por quem o escreveu: desfaz-se (consertarMojibake)
//   "?" / losango               -> metade de um emoji: `String(x).slice(0, N)` cortava o par substituto ao meio. Aqui
//                                  corta-se por GRAFEMAS (Intl.Segmenter, ou Array.from) - nunca ao meio de um caracter
//   texto cortado a meio        -> o chat mostra as mensagens INTEIRAS (t3b_chat.js); quando um texto tem de encurtar
//                                  (um cartao, uma placa) acaba em "…" e num grafema inteiro
//   markdown cru (**, ##)       -> as respostas dos modelos vem em markdown: **negrito**, ## titulo, `codigo`, listas e
//                                  [ligacoes](url) passam a negrito/titulo/marca de lista - nunca os asteriscos
//   ids em vez de nomes         -> nomeDeId: "resumidor_ai" -> "Resumidor ai" quando o servidor nao sabe o nome (o servidor
//                                  ja troca os ids que conhece pelo nome do organograma: mercado/torre_vivo.py)
'use strict';
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.T3BTexto = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  // ---------------------------------------------------------------- grafemas
  var SEG = null;
  try { if (typeof Intl !== 'undefined' && Intl.Segmenter) SEG = new Intl.Segmenter('pt', { granularity: 'grapheme' }); } catch (e) { SEG = null; }
  function grafemas(s) {
    s = String(s == null ? '' : s);
    if (SEG) { var out = []; var it = SEG.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; }
    return Array.from(s);
  }
  // corta em n grafemas (nunca ao meio de um emoji nem de uma letra com acento composto); "…" so se cortou
  function cortar(s, n, reticencias) {
    s = String(s == null ? '' : s);
    if (s.length <= n) return s;                         // (mais curto em unidades UTF-16 = mais curto em grafemas)
    var g = grafemas(s);
    if (g.length <= n) return s;
    return g.slice(0, Math.max(0, n - 1)).join('').replace(/\s+$/, '') + (reticencias === false ? '' : '…');
  }

  // ---------------------------------------------------------------- mojibake (UTF-8 lido como cp1252 / latin-1)
  // o cp1252 nas posicoes 0x80-0x9F (o resto do byte e igual ao code point)
  var CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89,
    0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96,
    0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
  // a assinatura: um lead byte de UTF-8 (Ã Â â ð ...) seguido de um caracter que e um byte de continuacao em cp1252
  var SUSPEITO = /[Â-ô][\u0080-¿ŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™]/;
  function byteDe(cp) { if (cp < 0x100) return cp; return CP1252[cp] != null ? CP1252[cp] : -1; }
  function decodificarUtf8(bytes) {
    var out = '', i = 0;
    while (i < bytes.length) {
      var b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b); i++; continue; }
      var n = b >= 0xF0 && b < 0xF5 ? 3 : b >= 0xE0 ? 2 : b >= 0xC2 && b < 0xE0 ? 1 : -1;
      if (n < 0 || i + n > bytes.length - 1) return null;   // byte que nao abre um caracter, ou caracter cortado no fim
      var cp = b & (n === 1 ? 0x1F : n === 2 ? 0x0F : 0x07);
      for (var k = 1; k <= n; k++) { var c = bytes[i + k]; if (c == null || (c & 0xC0) !== 0x80) return null; cp = (cp << 6) | (c & 0x3F); }
      out += String.fromCodePoint(cp); i += n + 1;
    }
    return out;
  }
  // desfaz o mojibake palavra a palavra (so onde ha a assinatura, e so se o resultado for UTF-8 valido e mais curto)
  function consertarMojibake(s) {
    s = String(s == null ? '' : s);
    if (!SUSPEITO.test(s)) return s;
    return s.replace(/[^\s<>"']+/g, function (pal) {
      if (!SUSPEITO.test(pal)) return pal;
      var bytes = [];
      for (var i = 0; i < pal.length; i++) { var b = byteDe(pal.charCodeAt(i)); if (b < 0) return pal; bytes.push(b); }
      var d = decodificarUtf8(bytes);
      return d && d.length < pal.length && d.indexOf('�') < 0 ? d : pal;
    });
  }

  // ---------------------------------------------------------------- U+FFFD: o caracter ja chegou perdido
  // Um "�" no meio de uma palavra portuguesa e quase sempre UMA letra acentuada que alguem gravou em cp1252 e outro leu como
  // UTF-8 (foi o caso da pergunta de 03/10: "sa�ram nas �ltimas gera��es"). Procura-se a palavra num lexico das que a torre
  // usa; sem certeza, o "�" sai (fica a palavra sem a letra - nunca o losango).
  var LEX = ('até após através também então não são estão já só há é está vocês você três mês está ninguém além porém alguém ' +
    'início reinício início último última últimos últimas único única próximo próxima próximos possível possíveis disponível ' +
    'saíram saída saídas saiu país países gerações geração ações ação operações operação posições posição cotação cotações ' +
    'correção correções evolução evoluções função funções sessão sessões previsão previsões decisão decisões revisão revisões ' +
    'laboratório laboratórios relatório relatórios histórico diário diária período número números mínimo mínima máximo máxima ' +
    'crédito créditos análise análises gráfico gráficos crítico crítica técnico técnica prático rápido rápida lógica média ' +
    'médio página páginas código códigos líquido líquidos lucro prejuízo índice índices vídeo vídeos público pública básico ' +
    'estratégia estratégias família famílias notícia notícias contrário necessário necessária funcionário funcionários ' +
    'secretária horário horários usuário usuários calendário cenário cenários comentário saúde razão razões questão questões ' +
    'regulação regulador alocação execução execuções configuração atenção atualização posição condição condições direção ' +
    'direcção acção acções sessão memória memórias trajetória sequência frequência tendência tendências média médias ' +
    'reversão reversões robusta robustas genética genético sinapse técnicas mercadoria ética agência moeda câmbio dívida ' +
    'âmbito ônibus órgão órgãos ótimo ótima péssimo vigilância conformidade auditoria estatística estatísticas ' +
    'manutenção inovação otimização contratação demissão demissões promoção carreira avaliação avaliações ' +
    'pendência pendências conclusão começo começou começar preço preços serviço serviços esforço espaço força').split(/\s+/);
  var LEXSET = {}; LEX.forEach(function (w) { if (w) LEXSET[w.toLowerCase()] = w; });
  var CAND = ['á', 'à', 'â', 'ã', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'];
  function consertarFFFD(s) {
    s = String(s == null ? '' : s);
    if (s.indexOf('�') < 0) return s;
    return s.replace(/[A-Za-zÀ-ÿ�]*�[A-Za-zÀ-ÿ�]*/g, function (pal) {
      var n = (pal.match(/�/g) || []).length;
      if (n <= 3) {
        var tentativas = [''];
        for (var i = 0; i < pal.length; i++) {
          var c = pal[i], nova = [];
          if (c === '�') tentativas.forEach(function (t) { CAND.forEach(function (x) { nova.push(t + x); }); });
          else tentativas.forEach(function (t) { nova.push(t + c); });
          tentativas = nova; if (tentativas.length > 2000) break;
        }
        for (var j = 0; j < tentativas.length; j++) {
          var w = LEXSET[tentativas[j].toLowerCase()];
          if (w) return pal[0] === pal[0].toUpperCase() && pal[0] !== '�' ? w[0].toUpperCase() + w.slice(1) : tentativas[j];
        }
      }
      return pal.replace(/�/g, '');
    });
  }

  // ---------------------------------------------------------------- o resto dos "quadradinhos"
  // bandeiras (2 indicadores regionais) -> as 2 letras do pais; controlo e zero-width fora (o \n fica); substitutos sozinhos
  // (meio emoji) fora; o seletor de variacao sozinho fora
  function semQuadradinhos(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/([\uD83C][\uDDE6-\uDDFF])([\uD83C][\uDDE6-\uDDFF])/g, function (m, a, b) {
      return String.fromCharCode(65 + a.charCodeAt(1) - 0xDDE6) + String.fromCharCode(65 + b.charCodeAt(1) - 0xDDE6);
    });
    s = s.replace(/[\uD83C][\uDDE6-\uDDFF]/g, '');
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\uFEFF]/g, '');
    s = s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1');
    return s;
  }
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»' };
  function semEntidades(s) {
    return String(s == null ? '' : s).replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]{2,8});/gi, function (m, e) {
      if (e[0] === '#') { var cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return cp > 0 && cp < 0x110000 && !(cp >= 0xD800 && cp < 0xE000) ? String.fromCodePoint(cp) : ''; }
      var v = ENT[e.toLowerCase()]; return v != null ? v : m;
    });
  }
  // o texto limpo (sem markdown - para placas, cartoes, baloes e hologramas em canvas)
  function limpar(s) { return semQuadradinhos(consertarFFFD(consertarMojibake(semEntidades(s)))); }

  // ---------------------------------------------------------------- markdown -> texto / HTML seguro
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  // sem markdown: o texto que se le (para canvas e para cortar)
  function semMarkdown(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1');
    s = s.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    s = s.replace(/^\s*>\s?/gm, '');
    s = s.replace(/^\s*[-*+]\s+/gm, '• ');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1');
    s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2');
    s = s.replace(/(^|[\s(])\*(?=\S)([^*\n]*?\S)\*(?=[\s).,;:!?]|$)/g, '$1$2');
    s = s.replace(/`([^`\n]+)`/g, '$1');
    s = s.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '');
    s = s.replace(/\*\*/g, '').replace(/(^|\s)#{2,}(\s|$)/g, '$1$2');
    return s.replace(/\n{3,}/g, '\n\n').trim();
  }
  // markdown -> HTML (so o que um balao precisa: negrito, italico, codigo, titulo, lista, ligacao http). Escapa PRIMEIRO.
  function mdParaHtml(s) {
    var linhas = escH(String(s == null ? '' : s).replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')).split('\n'), out = [];
    linhas.forEach(function (l) {
      var m;
      if ((m = /^\s{0,3}#{1,6}\s+(.*)$/.exec(l))) l = '<b class="md-t">' + m[1] + '</b>';
      else if ((m = /^\s*[-*+]\s+(.*)$/.exec(l))) l = '<span class="md-li">• ' + m[1] + '</span>';
      else if (/^\s*&gt;\s?/.test(l)) l = l.replace(/^\s*&gt;\s?/, '');
      else if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l)) l = '';
      out.push(l);
    });
    var h = out.join('\n');
    h = h.replace(/\[([^\]]+)\]\((https?:[^)\s"]+)\)/g, function (m0, t, u) { return '<a class="lk" href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>'; });
    h = h.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<b>$2</b>');
    h = h.replace(/(^|[\s(])\*(?=\S)([^*\n]*?\S)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*/g, '');
    return h.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '').replace(/\n/g, '<br>');
  }
  // um id de maquina que chegou sem nome: "resumidor_ai" -> "Resumidor ai", "sector:estatistica" -> "Estatistica"
  function nomeDeId(id) {
    var s = String(id == null ? '' : id).replace(/^(sector|fonte|posto|agente|gene|lab|shield|msg|novo|stark|gerente):/, '');
    s = s.split('|')[0].replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return s ? s[0].toUpperCase() + s.slice(1) : '?';
  }
  // a fonte dos canvases: com as fontes de emoji e de simbolos do sistema como recurso (sem isto um ✓ ou um 📈 num balao
  // desenhado em canvas podia sair em caixa vazia numa maquina sem a fonte certa)
  function fonteCanvas(peso, tam, familia) {
    return (peso || 600) + ' ' + (tam || 10) + 'px ' + (familia || '"JetBrains Mono",ui-monospace,monospace') + ',"Segoe UI Emoji","Segoe UI Symbol","Apple Color Emoji","Noto Color Emoji",sans-serif';
  }
  return { grafemas: grafemas, cortar: cortar, consertarMojibake: consertarMojibake, consertarFFFD: consertarFFFD, semQuadradinhos: semQuadradinhos,
    semEntidades: semEntidades, limpar: limpar, semMarkdown: semMarkdown, mdParaHtml: mdParaHtml, nomeDeId: nomeDeId, fonteCanvas: fonteCanvas, escH: escH };
});
