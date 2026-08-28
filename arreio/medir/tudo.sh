#!/bin/sh
# Bateria LOCAL completa do RAG da 3BRAIN. De graca, instantanea, sem tocar na
# franquia de IA. Rodar SEMPRE antes de publicar qualquer coisa.
#
#   sh tudo.sh          -> so o local (gratis)
#   sh tudo.sh --ponta  -> local + ponta a ponta, com portao de gasto antes
#
# O portao existe porque em 27/08/2026 eu gastei 111,6% da franquia do dia a
# medir, e so descobri depois, por um 503 -- e ainda atribui a causa errada.

set -e
AQUI=$(dirname "$0")
BASE="$AQUI/../base"
WK="$AQUI/../prova_worker"
falhou=0

linha() { echo ""; echo "=== $1 ==================================================="; }

linha "1. recuperacao local (gratis)"
node "$AQUI/r53.mjs"        || falhou=1   # 53/53 - regressao historica
node "$AQUI/visitante.mjs" | head -6      # 36 perguntas de visitante comum
node "$AQUI/dificil.mjs"   | head -8      # 52 duras: ingles, typo, parafrase, composta, hostil
node "$AQUI/envio.mjs"     | head -3      # o alvo CHEGA ao reordenador?
node "$AQUI/social2.mjs"   | grep '^  [0-9]'
node "$AQUI/piso.mjs"      | tail -1      # o que o visitante ve se os motores cairem

linha "2. base e travas"
( cd "$BASE" && PYTHONIOENCODING=utf-8 python prova_travas.py  | tail -1 ) || falhou=1
( cd "$BASE" && PYTHONIOENCODING=utf-8 python conferir_base.py | grep -E 'entradas|gatilhos totais|OK|ERROS' ) || falhou=1

linha "2b. entradas que disputam a mesma pergunta (leitura, nao portao)"
( cd "$BASE" && PYTHONIOENCODING=utf-8 python rivais.py | head -4 )

linha "3. Worker (com env de mentira, sem gastar neuronio)"
node "$WK/testa.mjs" | tail -1 || falhou=1

linha "4. sintaxe"
node --check "$AQUI/../../assistente.js" && echo "assistente.js OK"
node --check "$AQUI/../../worker/src/index.js" && echo "worker/index.js OK"

if [ "$1" = "--ponta" ]; then
  linha "5. PORTAO DE GASTO antes de tocar no Worker vivo"
  if ! ( cd "$AQUI" && PYTHONIOENCODING=utf-8 python medidor.py --portao 70 ); then
    echo ""
    echo "PARANDO AQUI. O local ja passou; o ponta a ponta fica para quando houver franquia."
    exit 1
  fi
  linha "6. ponta a ponta contra o Worker vivo"
  # 22s entre pedidos: medido nos cabecalhos da Groq -- 8.000 fichas/minuto
  # contra ~2.650 por conversa da tres a quatro por minuto, nao dezasseis.
  node "$AQUI/e2e.mjs" | tail -6

  linha "7. o reordenador ainda vale a pena? (so com franquia de neuronios)"
  # Mede o reordenador ISOLADO, com o alvo plantado num contexto de 60.
  # Em 27/08 deu 2/18 lendo a RESPOSTA e 11/18 lendo a PERGUNTA -- e por isso
  # que existe o campo `busca`. Refazer confirma que continua a valer, e diz
  # se PISO_PENEIRA devia mudar.
  node "$AQUI/rerank_ab.mjs" | tail -4

  ( cd "$AQUI" && PYTHONIOENCODING=utf-8 python medidor.py 1 | head -6 )
fi

echo ""
[ "$falhou" = "0" ] && echo "TUDO VERDE" || { echo "ALGUMA COISA FALHOU -- nao publique"; exit 1; }
