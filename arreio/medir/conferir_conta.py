# -*- coding: utf-8 -*-
"""Confere a conta por TRES caminhos independentes, porque o dono diz que a
franquia esta boa e eu ja errei uma vez hoje afirmando sem instrumento.

  1. Quantas CONTAS existem neste login? (talvez o Worker rode noutra)
  2. Qual o PLANO da conta? (Free tem muro; Paid so cobra)
  3. O uso, por dia, contado de duas formas diferentes

Nao imprime o token -- so a impressao digital.
"""
import datetime as dt
import hashlib
import io
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
CFG = os.path.expandvars(r"%APPDATA%\xdg.config\.wrangler\config\default.toml")


def token():
    env = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if env:
        return env
    s = io.open(CFG, encoding="utf8").read()
    for linha in s.splitlines():
        if linha.strip().startswith("oauth_token"):
            return linha.split("=", 1)[1].strip().strip('"')
    print("sem token")
    sys.exit(2)


TOK = token()


def rest(caminho):
    req = urllib.request.Request(API + caminho)
    req.add_header("Authorization", "Bearer " + TOK)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"success": False, "errors": [{"message": "HTTP %d" % e.code}]}


def gql(query, variaveis):
    req = urllib.request.Request(API + "/graphql", method="POST")
    req.add_header("Authorization", "Bearer " + TOK)
    req.add_header("Content-Type", "application/json")
    corpo = json.dumps({"query": query, "variables": variaveis}).encode()
    try:
        with urllib.request.urlopen(req, corpo, timeout=40) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"errors": [{"message": "HTTP %d: %s" % (e.code, e.read().decode()[:200])}]}


print("token sha256=%s" % hashlib.sha256(TOK.encode()).hexdigest()[:12])

print("")
print("1) CONTAS NESTE LOGIN")
r = rest("/accounts")
contas = r.get("result") or []
if not contas:
    print("   a API nao listou contas: %s"
          % "; ".join(x.get("message", "?") for x in r.get("errors", [])))
for c in contas:
    print("   %s  %s" % (c["id"], c.get("name", "?")))

print("")
print("2) PLANO / ASSINATURA")
for c in contas or [{"id": conta(), "name": "(fixa)"}]:
    sub = rest("/accounts/%s/subscriptions" % c["id"])
    if sub.get("success") and sub.get("result"):
        for a in sub["result"]:
            rp = a.get("rate_plan") or {}
            print("   %s: %s  (%s %s)" % (c["id"][:8], rp.get("public_name") or rp.get("id"),
                                          a.get("price", "?"), a.get("currency", "")))
    else:
        msg = "; ".join(x.get("message", "?") for x in sub.get("errors", [])) or "sem assinatura listada"
        print("   %s: %s" % (c["id"][:8], msg))

print("")
print("3) USO DE WORKERS AI, dois recortes")
Q = """
query($c: String!, $de: Time!, $ate: Time!) {
  viewer { accounts(filter: {accountTag: $c}) {
    aiInferenceAdaptiveGroups(limit: 500, filter: {datetime_geq: $de, datetime_leq: $ate}) {
      count sum { totalNeurons } dimensions { date modelId }
    } } } }
"""
ate = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
de = ate - dt.timedelta(days=4)
iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")
for c in contas or [{"id": conta()}]:
    r = gql(Q, {"c": c["id"], "de": iso(de), "ate": iso(ate)})
    if r.get("errors"):
        print("   %s: %s" % (c["id"][:8], r["errors"][0].get("message", "?")[:120]))
        continue
    g = r["data"]["viewer"]["accounts"]
    if not g:
        print("   %s: a conta nao devolveu dados de IA" % c["id"][:8])
        continue
    linhas = g[0]["aiInferenceAdaptiveGroups"]
    if not linhas:
        print("   %s: ZERO chamadas de IA em 4 dias" % c["id"][:8])
        continue
    por_dia = {}
    for x in linhas:
        d = x["dimensions"]["date"]
        por_dia[d] = por_dia.get(d, [0, 0])
        por_dia[d][0] += x["sum"]["totalNeurons"]
        por_dia[d][1] += x["count"]
    print("   conta %s:" % c["id"][:8])
    for d in sorted(por_dia):
        n, ch = por_dia[d]
        print("     %s  %8.0f neuronios  %5d chamadas  (%.0f%% de 10.000)"
              % (d, n, ch, 100.0 * n / 10000))
