# -*- coding: utf-8 -*-
"""LE OS LIMITES REAIS DA GROQ, dos cabecalhos da propria resposta.

"De graca" nao quer dizer "sem limite": a Groq publica, em cada resposta,
quanto resta de pedidos e de FICHAS. Em vez de explicar de memoria por que ela
barrou, pergunta-se a ela.

VALIDADO em 27/08/2026: tres chamadas seguidas devolveram 998, 997, 996 pedidos
restantes e 7923, 7914, 7903 fichas -- os contadores DESCEM, entao a leitura e
viva e nao vem de cache. Instrumento que devolve sempre o mesmo numero nao
esta a medir, e eu quase confiei num antes de conferir isto.

  python limites_groq.py <chave>            -> pedido minusculo
  python limites_groq.py <chave> --grande   -> pedido do TAMANHO do Worker

O --grande existe porque a sonda pequena PASSA com 7.900 fichas livres e o
pedido real leva 429: a diferenca so aparece medindo o pedido real.

A chave nunca e impressa: so a impressao digital.
"""
import hashlib
import json
import sys
import urllib.error
import urllib.request

CHAVE = sys.argv[1] if len(sys.argv) > 1 else ''
if not CHAVE:
    print('uso: python limites_groq.py <chave> [--grande]')
    sys.exit(2)
GRANDE = '--grande' in sys.argv

print('chave sha256=%s' % hashlib.sha256(CHAVE.encode()).hexdigest()[:12])

if GRANDE:
    enchimento = 'A instituicao registra o dado no papel e no WhatsApp. ' * 60
    msgs = [{'role': 'system',
             'content': 'Voce e o assistente da 3BRAIN.\n\nCONTEXTO:\n' + enchimento},
            {'role': 'user', 'content': 'quanto custa o savi'}]
    pedido = {'model': 'openai/gpt-oss-120b', 'messages': msgs, 'temperature': 0.3,
              'max_completion_tokens': 900, 'reasoning_effort': 'medium',
              'reasoning_format': 'hidden', 'stream': False}
    print('pedido GRANDE: ~%d fichas de entrada + 900 de teto de saida'
          % (len(json.dumps(msgs)) // 4))
else:
    pedido = {'model': 'openai/gpt-oss-120b',
              'messages': [{'role': 'user', 'content': 'ok'}],
              'max_completion_tokens': 5}

req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', method='POST')
req.add_header('Authorization', 'Bearer ' + CHAVE)
req.add_header('Content-Type', 'application/json')
# A Groq esta atras da Cloudflare, que devolve 403/1010 a cliente sem assinatura
# de navegador. Nao e limite de uso -- e filtro de borda, e custou-me um
# diagnostico errado antes de eu reparar.
req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
req.add_header('Accept', 'application/json')

INTERESSA = ('x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests',
             'x-ratelimit-reset-requests', 'x-ratelimit-limit-tokens',
             'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-tokens',
             'retry-after')

try:
    with urllib.request.urlopen(req, json.dumps(pedido).encode(), timeout=40) as r:
        cab, status = r.headers, r.status
        r.read()
    print('HTTP %d -- passou' % status)
except urllib.error.HTTPError as e:
    cab, status = e.headers, e.code
    b = e.read().decode()
    try:
        msg = json.loads(b)['error']['message']
    except Exception:
        msg = b[:300]
    print('HTTP %d' % status)
    print('  mensagem: %s' % msg[:300])

print('')
print('LIMITES QUE A PROPRIA GROQ DECLARA:')
achou = False
for k in INTERESSA:
    v = cab.get(k)
    if v is not None:
        achou = True
        print('  %-32s %s' % (k, v))
if not achou:
    print('  (nenhum cabecalho de limite veio nesta resposta)')
