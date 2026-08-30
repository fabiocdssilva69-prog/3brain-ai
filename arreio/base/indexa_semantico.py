# -*- coding: utf-8 -*-
"""ÍNDICE SEMÂNTICO — gera os vetores da base e põe-nos na Vectorize.

POR QUE ELE EXISTE, com o número que o justifica
-------------------------------------------------
A busca da página compara PALAVRAS. Medido no teste de exclusão (1.344
retiradas de gatilho): quando o visitante frase a pergunta de um jeito que
ninguém registou, a entrada certa só chega às cinco que o modelo lê em **66%**
das vezes. Nos outros 34% a resposta existe e o caminho até ela não.

O caso da "IA" foi o retrato: o tokenizador apagava a ficha de duas letras e a
entrada despencava de 1.º para 11.º — tendo a resposta escrita.

Vetor não depende da palavra. Medido agora, com o `bge-m3`:

    "quanto custa"  x  "é caro" .................... 0,783
    "quanto custa"  x  "how much does it cost" ..... 0,919   <- zero palavras em comum
    "quanto custa"  x  "qual o mercado do savi" .... 0,304   <- assunto outro, longe

O 0,919 é o ponto: a busca lexical dá ZERO para esse par.

O QUE SE INDEXA, E POR QUÊ ESSA ESCOLHA
----------------------------------------
Cada PERGUNTA cadastrada vira um vetor próprio, e não o texto da resposta nem a
média das perguntas da entrada.

  · pergunta, e não resposta: medido em 27/08, o reordenador acerta 14 de 18
    vendo a PERGUNTA cadastrada contra 3 de 18 vendo a RESPOSTA. "how much does
    it cost" não se parece com um parágrafo sobre R$ 99 por leito — parece-se
    com "quanto custa?".
  · uma por vetor, e não a média: juntar vinte perguntas num vetor só borra o
    ponto. Vetor por pergunta dá casamento nítido com a que mais se parece.

Custo, conferido contra o painel: 142 entradas dão ~1.500 vetores; a 1.024
dimensões são ~1,5 M de dimensões guardadas, contra um teto de 10 M. Cada
consulta gasta 1.024 das 50 M mensais — cabem ~48 mil perguntas por mês.

USO
---
    python indexa_semantico.py --ensaio    # conta e mede, sem escrever
    python indexa_semantico.py --aplicar
"""
import argparse
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARQ = os.path.join(RAIZ, "assistente.js")
CONTA = "ff1bc9fefd0373aef2027bfaa88a6b2d"
INDICE = "base-3brain"
MODELO = "@cf/baai/bge-m3"
LOTE = 90          # textos por chamada ao modelo
DIMS = 1024


def token():
    cfg = os.path.join(os.environ["APPDATA"], "xdg.config", ".wrangler", "config", "default.toml")
    m = re.search(r'oauth_token\s*=\s*"([^"]+)"', io.open(cfg, encoding="utf8").read())
    if not m:
        print("sem oauth do wrangler -- corre `npx wrangler whoami`"); sys.exit(2)
    return m.group(1)


T = token()


def cf(caminho, corpo=None, metodo="POST", cru=None):
    url = "https://api.cloudflare.com/client/v4/accounts/%s%s" % (CONTA, caminho)
    dados = cru if cru is not None else (json.dumps(corpo).encode() if corpo is not None else None)
    cab = {"Authorization": "Bearer " + T}
    cab["Content-Type"] = "application/x-ndjson" if cru is not None else "application/json"
    # REPETE em falha de REDE, nunca em falha de LÓGICA. HTTP 4xx quer dizer
    # que o pedido está errado e repetir não conserta -- só esconde. Queda de
    # ligação é ruído e repetir resolve. Misturar os dois transforma erro real
    # em espera silenciosa.
    for tentativa in range(5):
        r = urllib.request.Request(url, data=dados, method=metodo, headers=cab)
        try:
            with urllib.request.urlopen(r, timeout=240) as x:
                return json.loads(x.read().decode())
        except urllib.error.HTTPError as e:
            print("HTTP %s em %s: %s"
                  % (e.code, caminho, e.read().decode("utf8", "replace")[:400]))
            sys.exit(2)
        except Exception as e:
            if tentativa == 4:
                print("  rede falhou 5x em %s (%.1f MB): %s"
                      % (caminho, len(dados or b"") / 1e6, str(e)[:140]))
                sys.exit(2)
            print("    rede caiu, repetindo (%d/5)" % (tentativa + 2))
            time.sleep(2 ** tentativa)


def entradas():
    """Lê a base do assistente.js -- cada entrada é um objeto JSON literal."""
    s = io.open(ARQ, encoding="utf8", errors="ignore").read()
    fora, i = [], 0
    while True:
        i = s.find('{"id":"', i)
        if i < 0:
            break
        j, prof, dentro, esc = i, 0, False, False
        while j < len(s):
            c = s[j]
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                dentro = not dentro
            elif not dentro:
                if c == "{":
                    prof += 1
                elif c == "}":
                    prof -= 1
                    if prof == 0:
                        break
            j += 1
        try:
            fora.append(json.loads(s[i:j + 1]))
        except ValueError:
            pass
        i = j + 1
    return fora


def vetores(textos):
    d = cf("/ai/run/" + MODELO, {"text": textos})
    r = d.get("result") or {}
    v = r.get("data")
    if not v or len(v) != len(textos):
        print("resposta do modelo em formato inesperado"); sys.exit(2)
    return v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aplicar", action="store_true")
    ap.add_argument("--ensaio", action="store_true")
    a = ap.parse_args()

    base = entradas()
    itens = []
    for e in base:
        for k, p in enumerate(e.get("perguntas", [])):
            p = (p or "").strip()
            if len(p) < 3:
                continue
            itens.append({"id": "%s#%d" % (e["id"], k), "texto": p, "entrada": e["id"],
                          "pt": (e.get("pt") or "")[:900], "en": (e.get("en") or "")[:900],
                          "fonte": (e.get("fonte") or "")[:120]})

    print("entradas: %d | perguntas a indexar: %d" % (len(base), len(itens)))
    print("dimensoes guardadas: %s de 10.000.000" % format(len(itens) * DIMS, ","))
    print("chamadas ao modelo: %d (lotes de %d)" % ((len(itens) + LOTE - 1) // LOTE, LOTE))
    if not a.aplicar:
        print("")
        print("ENSAIO. Para gravar: --aplicar")
        return

    corpo, feitos = [], 0
    t0 = time.time()
    for k in range(0, len(itens), LOTE):
        pedaco = itens[k:k + LOTE]
        vs = vetores([x["texto"] for x in pedaco])
        for x, v in zip(pedaco, vs):
            corpo.append(json.dumps({
                "id": x["id"], "values": v,
                # O TEXTO VAI NA METADATA, e nao so o id. O Worker recebe ids do
                # Vectorize e NAO TEM a base -- ela vive no assistente.js, que e da
                # PAGINA. Sem o texto aqui seriam duas consultas, ou uma copia da
                # base dentro do Worker que teria de ser mantida em sincronia com a
                # outra. Copia que precisa de sincronia apodrece; metadata nao.
                # Cabe: o teto e 10 KiB por vetor e isto usa ~2 KB.
                "metadata": {"entrada": x["entrada"], "pergunta": x["texto"][:200],
                             "pt": x["pt"], "en": x["en"], "fonte": x["fonte"]},
            }, ensure_ascii=False))
        feitos += len(pedaco)
        print("  vetorizadas %d/%d" % (feitos, len(itens)))

    # ENVIO PARTIDO, em ndjson. Com o texto na metadata o corpo passou de
    # dezenas para centenas de MB e a ligação caiu -- e caiu como QUEDA DE
    # REDE, não como "corpo grande demais", que é o modo de falhar que engana:
    # a primeira corrida sem metadata falhou pelo mesmo erro e era ruído mesmo.
    # Só ao repetir com o corpo maior é que o padrão apareceu.
    ENVIO = 120
    mutacoes = []
    for k in range(0, len(corpo), ENVIO):
        dados = ("\n".join(corpo[k:k + ENVIO]) + "\n").encode("utf8")
        d = cf("/vectorize/v2/indexes/%s/upsert" % INDICE, cru=dados)
        r = d.get("result") or {}
        if r.get("mutationId"):
            mutacoes.append(r["mutationId"])
        print("  enviados %4d/%d  (%.1f MB)"
              % (min(k + ENVIO, len(corpo)), len(corpo), len(dados) / 1e6))
    print("")
    print("%d envios aceites | ultima mutacao: %s"
          % (len(mutacoes), mutacoes[-1] if mutacoes else "?"))
    print("tempo: %.0fs" % (time.time() - t0))


if __name__ == "__main__":
    main()
