# -*- coding: utf-8 -*-
"""MEDIDOR REAL de consumo de Workers AI. Le a API da Cloudflare, nao estima.

Escrito em 27/08/2026 depois de eu errar DUAS vezes na mesma hora, e nas duas
por nao ter instrumento:

  1. Afirmei "a franquia estourou" a partir de um HTTP 503. Um 503 diz que a
     chamada falhou, nao POR QUE falhou.
  2. Recuei da afirmacao porque UM pedido voltou 200 -- e recuar por uma amostra
     e o mesmo erro ao contrario.

A prova so apareceu no log do proprio Worker:
  "reordenador falhou: 4006: you have used up your daily free allocation of
   10,000 neurons"  e  "groq falhou: groq 429"
e no medidor: 11.163 neuronios, 111,6% da franquia.

MEDIDO AQUI, e diferente do que estava no cerebro: 63,6 neuronios por chamada
de gpt-oss-120b, nao 48. A franquia inteira da ~157 respostas de modelo por dia,
nao ~200. O reordenador custa 2,2 -- nao e ele que gasta.

Estimativa de consumo nao e consumo. Rodar `--portao` ANTES de cada bateria.

Usa o token OAuth que o proprio wrangler ja guarda nesta maquina. O token NUNCA
e impresso: so a impressao digital, que deixa conferir QUAL token foi usado.

Uso:  python medidor.py [dias]        -> relatorio (padrao: 2 dias)
      python medidor.py --portao 70   -> sai 1 se ja passou de 70% do dia
"""
import datetime as dt
import hashlib
import io
import json
import os
import sys
import urllib.error
import urllib.request

CFG = os.path.expandvars(r"%APPDATA%\xdg.config\.wrangler\config\default.toml")
GRAPHQL = "https://api.cloudflare.com/client/v4/graphql"

ARQ_CONTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".conta")


def conta():
    """O id da conta NAO fica no codigo: este repo e publico e o id e o que se
       precisa para mirar a conta certa. Vem do ambiente ou de medir/.conta,
       que o git ignora. `npx wrangler whoami` imprime o valor."""
    v = os.environ.get("CF_ACCOUNT_ID", "").strip()
    if not v:
        try:
            v = io.open(ARQ_CONTA, encoding="utf8").read().strip()
        except OSError:
            v = ""
    if not v:
        print("falta o id da conta: ponha em CF_ACCOUNT_ID ou em medir/.conta"
              " -- `npx wrangler whoami` imprime")
        sys.exit(2)
    return v




def token():
    """O wrangler guarda o token OAuth em TOML simples. Ler daqui evita pedir
       ao dono uma credencial nova so para ler o proprio medidor."""
    env = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if env:
        return env, "env"
    try:
        s = io.open(CFG, encoding="utf8").read()
    except OSError:
        print("nao achei a sessao do wrangler em %s" % CFG)
        sys.exit(2)
    for linha in s.splitlines():
        if linha.strip().startswith("oauth_token"):
            return linha.split("=", 1)[1].strip().strip('"'), "wrangler"
    print("a sessao do wrangler nao tem oauth_token")
    sys.exit(2)


def renova():
    """A sessao OAuth do wrangler dura ~1h e o medidor le o ficheiro dela. Numa
       bateria longa ela expira NO MEIO e o relatorio final morre com 401 --
       aconteceu duas vezes em 28/08. Chamar o wrangler renova o ficheiro; ler
       de novo resolve, sem pedir credencial nova a ninguem."""
    import subprocess
    try:
        subprocess.run(["npx", "wrangler", "whoami"], capture_output=True,
                       timeout=90, shell=True)
    except Exception:
        pass


def consulta(tok, query, variaveis, _retentou=False):
    req = urllib.request.Request(GRAPHQL, method="POST")
    req.add_header("Authorization", "Bearer " + tok)
    req.add_header("Content-Type", "application/json")
    corpo = json.dumps({"query": query, "variables": variaveis}).encode()
    try:
        with urllib.request.urlopen(req, corpo, timeout=40) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 401 and not _retentou:
            renova()
            novo, _ = token()
            return consulta(novo, query, variaveis, True)
        return {"errors": [{"message": "HTTP %d: %s" % (e.code, e.read().decode()[:300])}]}


Q = """
query($conta: String!, $de: Time!, $ate: Time!) {
  viewer {
    accounts(filter: {accountTag: $conta}) {
      aiInferenceAdaptiveGroups(
        limit: 200
        filter: {datetime_geq: $de, datetime_leq: $ate}
        orderBy: [datetimeHour_ASC]
      ) {
        count
        sum { totalNeurons }
        dimensions { datetimeHour modelId }
      }
    }
  }
}
"""


def guarda(limite_pct):
    """PORTAO DE GASTO. Roda ANTES de qualquer bateria ponta a ponta.

       Em 27/08/2026 eu gastei 11.163 neuronios (111,6% da franquia) a medir, e
       so descobri DEPOIS, por um HTTP 503 -- e ainda assim atribui a causa
       errada. Estimar consumo nao e medir consumo. O portao existe para a
       proxima bateria parar ANTES, nao para explicar depois."""
    tok, _ = token()
    ate = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    de = ate.replace(hour=0, minute=0, second=0)
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")
    r = consulta(tok, Q, {"conta": conta(), "de": iso(de), "ate": iso(ate)})
    if r.get("errors"):
        print("PORTAO: nao consegui ler o medidor (%s). Na duvida, NAO rode a bateria."
              % r["errors"][0].get("message", "?")[:80])
        return 1
    grupos = r["data"]["viewer"]["accounts"][0]["aiInferenceAdaptiveGroups"]
    usados = sum(g["sum"]["totalNeurons"] for g in grupos)
    pct = 100.0 * usados / 10000
    resta = max(0, 10000 - usados)
    # medido em 27/08: 63,6 neuronios por chamada de gpt-oss-120b, NAO os 48
    # que estavam no cerebro. Com 63,6, a franquia inteira da 157 respostas.
    print("hoje: %.0f de 10.000 neuronios (%.1f%%) -- restam ~%d respostas de modelo"
          % (usados, pct, resta // 64))
    if pct >= limite_pct:
        print("PORTAO FECHADO: acima de %d%%. Meca LOCAL (node r53/visitante/dificil), "
              "que e de graca, e suba ao Worker so o que precisa do modelo." % limite_pct)
        return 1
    return 0


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--portao":
        sys.exit(guarda(int(sys.argv[2]) if len(sys.argv) > 2 else 70))
    dias = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    tok, origem = token()
    print("token: sha256=%s (de %s)" % (hashlib.sha256(tok.encode()).hexdigest()[:12], origem))

    ate = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    de = ate - dt.timedelta(days=dias)
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")
    r = consulta(tok, Q, {"conta": conta(), "de": iso(de), "ate": iso(ate)})

    if r.get("errors"):
        for e in r["errors"]:
            print("ERRO: %s" % e.get("message"))
        sys.exit(1)

    grupos = r["data"]["viewer"]["accounts"][0]["aiInferenceAdaptiveGroups"]
    if not grupos:
        print("a API nao devolveu nenhuma linha na janela pedida.")
        return

    por_dia, por_modelo, por_hora = {}, {}, []
    for g in grupos:
        h = g["dimensions"]["datetimeHour"]
        m = g["dimensions"]["modelId"]
        n = g["sum"]["totalNeurons"]
        c = g["count"]
        por_dia[h[:10]] = por_dia.get(h[:10], 0) + n
        por_modelo[m] = por_modelo.get(m, [0, 0])
        por_modelo[m][0] += n
        por_modelo[m][1] += c
        por_hora.append((h, m, n, c))

    print("")
    print("NEURONIOS POR DIA (franquia do plano gratuito: 10.000/dia)")
    for d in sorted(por_dia):
        n = por_dia[d]
        pct = 100.0 * n / 10000
        barra = "#" * min(50, int(pct / 2))
        print("  %s  %9.0f  %5.1f%% da franquia  %s" % (d, n, pct, barra))

    print("")
    print("POR MODELO (na janela de %d dias)" % dias)
    for m, (n, c) in sorted(por_modelo.items(), key=lambda x: -x[1][0]):
        print("  %-34s %9.0f neuronios em %5d chamadas  (%.1f/chamada)"
              % (m, n, c, n / c if c else 0))

    print("")
    print("ULTIMAS 12 HORAS COM USO")
    for h, m, n, c in por_hora[-12:]:
        print("  %s  %-30s %8.0f n  %4d chamadas" % (h, m, n, c))


if __name__ == "__main__":
    main()
