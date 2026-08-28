# -*- coding: utf-8 -*-
"""O CHAT contradiz a PAGINA?

O visitante le as duas coisas na mesma tela. Se a secao de numeros diz uma coisa
e o assistente responde outra, quem nota e exatamente quem nao devia. E nenhuma
das travas existentes olha para isto: conferir_base.py so ve a base, e os
arreios so veem a busca.

Extrai os numeros publicados no index.html (fora de script e de style) e os da
base, e cruza. Nao decide -- poe lado a lado.
"""
import os
import io, json, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lote4 import ARQ, recorta

RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    os.pardir, os.pardir))
PAG = os.path.join(RAIZ, "index.html")

NUM = re.compile(r"(?i)(?:R\$\s*)?\d[\d.,]{2,}(?:\s*(?:mil|milh[oõ]es|milh[aã]o|%))?")

def achata(t):
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn").lower()

def limpa_html(s):
    s = re.sub(r"(?is)<script.*?</script>", " ", s)
    s = re.sub(r"(?is)<style.*?</style>", " ", s)
    s = re.sub(r"(?s)<!--.*?-->", " ", s)
    s = re.sub(r"(?s)<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s)

def norm(v):
    """R$ 1.290 e 1.290 sao o mesmo numero para efeito de comparacao."""
    return re.sub(r"[^\d,.%a-z]", "", achata(v)).lstrip("r$").strip()

pag = limpa_html(io.open(PAG, encoding="utf8", errors="ignore").read())
s = io.open(ARQ, encoding="utf8", newline="").read()
i, j = recorta(s)
base = json.loads(s[i:j])
txtBase = " ".join((e.get("pt", "") + " " + e.get("en", "")) for e in base["entradas"])

naPag = {}
for m in NUM.finditer(pag):
    v = norm(m.group(0))
    if len(re.sub(r"\D", "", v)) < 2:  # numero de um digito nao diz nada
        continue
    naPag.setdefault(v, pag[max(0, m.start()-55):m.end()+35].strip())

naBase = {norm(m.group(0)) for m in NUM.finditer(txtBase)}

sos = sorted(v for v in naPag if v not in naBase)
print("numeros publicados na PAGINA: %d distintos" % len(naPag))
print("numeros na BASE do chat .....: %d distintos" % len(naBase))
print("")
print("NA PAGINA MAS NAO NA BASE: %d" % len(sos))
print("(o visitante ve na tela e o chat nao sabe explicar)")
print("")
for v in sos[:30]:
    print("  %-14s ... %s" % (v, naPag[v][:96].replace(chr(10), " ")))
