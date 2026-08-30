# -*- coding: utf-8 -*-
"""LOTE 20 — as baixas do lote 19, e o refinamento da regra do eco.

O lote 19 pôs eco de vocabulário em 48 entradas e o resultado foi grande:
entradas frágeis de 47 para 14, sobrevivência no top 5 de 57% para 66%. Mas
custou uma pergunta da bateria dura:

    "voces estao inflando os numeros"   ->  caiu de 1.º para 6.º
    top 5 dela:  motor-numeros, ressalvas-publicas, dois-setores-numeros,
                 ipca-barbearia, usuarios-barbergo

Todas as cinco são entradas que EU acabara de engordar. Escrevi "que numeros o
motor ja fez", "os dois setores somados dao quanto" — e diluí a ficha `numeros`
por várias entradas, tirando-a de quem responde sobre **verificar** número.

O REFINAMENTO DA REGRA
-----------------------
Eu tinha dito que eco não cria concorrência, por repetir vocabulário existente.
É verdade para a palavra-núcleo e **falso para a frase inteira**: `"quantas
entrevistas o motor gerou"` ecoa `entrevistas` e de quebra empurra `motor` e
`quantas`, que são de outras.

Logo: **o eco tem de ser o mais curto possível.** Núcleo mais o mínimo de
contexto que faça a frase soar como pergunta de gente. Foi assim que estas
foram escritas, e por isso são mais curtas que as do lote 19.
"""
import importlib.util
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("l9", os.path.join(AQUI, "lote9_numeros.py"))
L9 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(L9)

# Ecos CURTOS: o núcleo e pouco mais.
ECO = {
    "como-verificar": [
        "esses numeros sao inflados",
        "como conferir os numeros",
        "os numeros batem",
        "are the numbers inflated",
    ],
    "metricas-que-nao-usamos": [
        "voces inflam metrica",
        "que metrica voces recusam",
        "which numbers do you refuse",
    ],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0
    for eid, entram in ECO.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = [p for p in entram if p not in ja and ('"%s"' % p) not in s]
        if not boas:
            print("  ja tinha: %s" % eid)
            continue
        novo = dict(e)
        novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        novas += len(boas)
        print("  +%d ecos curtos: %s" % (len(boas), eid))
    if not n:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d perguntas." % (n, novas))


if __name__ == "__main__":
    main()
