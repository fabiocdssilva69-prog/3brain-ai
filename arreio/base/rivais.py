# -*- coding: utf-8 -*-
"""Pares de entradas que disputam a MESMA pergunta.

E ali que a contradicao faz estrago: o reordenador pode mandar as duas no mesmo
pedido, e o modelo escolhe UMA sem que ninguem veja qual. Com 136 entradas
escritas ao longo de meses, sobreposicao existe -- a questao e se as duas dizem
a mesma coisa.

Mede sobreposicao de FICHAS DE GATILHO (Jaccard). Saida curta de proposito:
isto e para eu LER, nao para automatizar.
"""
import io, json, re, sys, unicodedata
sys.path.insert(0, ".")
from lote4 import ARQ, recorta

PARAR = set("""a o e de da do das dos que qual quais como para por com sem em no na nos nas um uma
os as ao aos se ja eh eu tem ter ha sobre isso isto the of to in for on is are what how do does
you your we our it that this an and or nao voces voce vcs pra pro esta estao sao""".split())

def achata(t):
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn").lower()

def fichas(t):
    return {w for w in re.findall(r"[a-z0-9]{3,}", achata(t)) if w not in PARAR}

s = io.open(ARQ, encoding="utf8", newline="").read()
i, j = recorta(s)
ent = json.loads(s[i:j])["entradas"]
saco = {e["id"]: fichas(" ".join(e.get("perguntas", []) + e.get("tags", []))) for e in ent}
texto = {e["id"]: e.get("pt", "") for e in ent}

pares = []
ids = list(saco)
for a in range(len(ids)):
    for b in range(a + 1, len(ids)):
        A, B = saco[ids[a]], saco[ids[b]]
        if not A or not B: continue
        inter = len(A & B)
        if inter < 3: continue
        jac = inter / len(A | B)
        if jac >= 0.30:
            pares.append((jac, ids[a], ids[b], sorted(A & B)))
pares.sort(reverse=True)
print("PARES QUE DISPUTAM A MESMA PERGUNTA (sobreposicao de gatilho >= 30%%): %d" % len(pares))
print("")
for jac, x, y, comuns in pares[:14]:
    print("  %.0f%%  %s  x  %s" % (100 * jac, x, y))
    print("        em comum: %s" % ", ".join(comuns[:10]))
    print("        %s: %s" % (x, texto[x][:110].replace("\n", " ")))
    print("        %s: %s" % (y, texto[y][:110].replace("\n", " ")))
    print("")
