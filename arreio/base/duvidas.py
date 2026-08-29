# -*- coding: utf-8 -*-
"""DÚVIDAS — lê o que os visitantes perguntaram e diz o que escrever na base.

Sem isto, o registo no D1 é só um log: dado que ninguém olha não melhora nada.
Esta peça fecha o ciclo — pega o que foi perguntado, agrupa o que se repete,
separa o que o bot NÃO soube responder, e devolve uma lista de trabalho.

POR QUE O SINAL DE RECUSA VALE MAIS QUE O DE FREQUÊNCIA
--------------------------------------------------------
Pergunta muito repetida que o bot responde bem não pede trabalho nenhum — está
funcionando. O que pede trabalho é a que ele recusou, e ainda mais a que caiu em
`sem-contexto`, porque essa quer dizer que **a base não tem nem uma palavra em
comum com a pergunta**. Foi exactamente o defeito medido em 27/08/2026: 8 de 36
perguntas de visitante não pontuavam entrada nenhuma, porque a base tinha sido
escrita com as NOSSAS palavras e o visitante usava as DELE — "seguro",
"confiar", "iphone", "caro".

A ordem de trabalho que este relatório produz é, portanto:
  1. sem-contexto repetido  -> a base não fala do assunto. Entrada NOVA.
  2. recusa repetida        -> a base tem o assunto e não foi alcançada. PORTA nova.
  3. respondida e repetida  -> está a funcionar; só confirma que o assunto importa.

USO
---
    python duvidas.py                 # relatório dos últimos 30 dias
    python duvidas.py --dias 7
    python duvidas.py --so-falhas     # só o que não foi respondido
"""
import argparse
import collections
import json
import os
import re
import subprocess
import sys
import unicodedata

BD = "duvidas-3brain"
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PARAR = set("""a o e de da do das dos que qual quais como para por com sem em no na
nos nas um uma uns umas os as ao aos se ja eh eu tem ter ha sobre isso isto voces
voce the of is are do does what how who why when where you your a an to for and""".split())


def normaliza(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]+", " ", s)


def fichas(s):
    return [t for t in normaliza(s).split() if len(t) > 2 and t not in PARAR]


def consulta(sql):
    """Corre no D1 remoto e devolve as linhas. Falhar aqui não é fatal: o
    relatório diz o que não conseguiu, em vez de fingir que não havia nada --
    ausência de medida nunca é ausência de dúvida."""
    r = subprocess.run(
        ["npx", "--yes", "wrangler", "d1", "execute", BD, "--remote", "--json",
         "--command", sql],
        cwd=RAIZ, capture_output=True, text=True, shell=True, timeout=180)
    if r.returncode != 0:
        print("NAO CONSEGUI LER O D1: %s" % (r.stderr or "")[:200])
        sys.exit(2)
    try:
        d = json.loads(r.stdout)
    except ValueError:
        m = re.search(r"(\[[\s\S]*\])\s*$", r.stdout)
        if not m:
            print("resposta do D1 em formato inesperado"); sys.exit(2)
        d = json.loads(m.group(1))
    return (d[0] if isinstance(d, list) else d).get("results", [])


def agrupa(linhas):
    """Junta perguntas que falam da mesma coisa, pela ficha mais rara que
    partilham. Não é agrupamento perfeito -- é o suficiente para ver o que se
    repete, que é para o que serve."""
    freq = collections.Counter()
    for l in linhas:
        for f in set(fichas(l["pergunta"])):
            freq[f] += 1
    grupos = collections.defaultdict(list)
    for l in linhas:
        fs = [f for f in set(fichas(l["pergunta"])) if freq[f] > 1]
        chave = min(fs, key=lambda f: (freq[f], f)) if fs else (fichas(l["pergunta"]) or ["?"])[0]
        grupos[chave].append(l)
    return grupos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=30)
    ap.add_argument("--so-falhas", action="store_true")
    a = ap.parse_args()

    linhas = consulta(
        "SELECT ts, pergunta, idioma, motor, recusou, topo FROM duvidas "
        "WHERE ts >= datetime('now', '-%d days') ORDER BY id DESC LIMIT 2000" % a.dias)
    if not linhas:
        print("nenhuma duvida registada nos ultimos %d dias." % a.dias)
        print("(o registo entrou no ar em 29/08/2026 -- se acabou de publicar, e normal)")
        return

    sem_ctx = [l for l in linhas if l["motor"] == "sem-contexto"]
    recusou = [l for l in linhas if l["recusou"] and l["motor"] != "sem-contexto"]
    ok = [l for l in linhas if not l["recusou"]]

    print("%d perguntas nos ultimos %d dias" % (len(linhas), a.dias))
    print("  respondidas .................... %4d  (%.0f%%)" % (len(ok), 100.0*len(ok)/len(linhas)))
    print("  recusadas COM contexto ......... %4d  (%.0f%%)  <- a base tem o assunto e nao foi alcancada"
          % (len(recusou), 100.0*len(recusou)/len(linhas)))
    print("  sem contexto nenhum ............ %4d  (%.0f%%)  <- a base nao fala do assunto"
          % (len(sem_ctx), 100.0*len(sem_ctx)/len(linhas)))
    idiomas = collections.Counter(l["idioma"] or "?" for l in linhas)
    print("  idioma: %s" % ", ".join("%s=%d" % kv for kv in idiomas.most_common()))
    print("")

    def bloco(titulo, dados, acao):
        if not dados:
            return
        print("=" * 78)
        print(titulo)
        print("  -> %s" % acao)
        print("=" * 78)
        for chave, grupo in sorted(agrupa(dados).items(), key=lambda kv: -len(kv[1])):
            marca = "  <<< REPETIDA" if len(grupo) > 1 else ""
            print("  [%dx] %s%s" % (len(grupo), chave, marca))
            for l in grupo[:4]:
                print("        \"%s\"" % l["pergunta"][:96])
        print("")

    bloco("SEM CONTEXTO — nem uma palavra em comum com a base",
          sem_ctx, "ENTRADA NOVA: o assunto nao existe na base")
    bloco("RECUSADAS — a base tinha o assunto e nao foi alcancada",
          recusou, "PORTA NOVA: acrescentar a pergunta ao campo `perguntas` da entrada certa")
    if not a.so_falhas:
        bloco("RESPONDIDAS — o que mais perguntam e o bot ja sabe",
              ok, "nada a fazer; confirma que o assunto importa")


if __name__ == "__main__":
    main()
