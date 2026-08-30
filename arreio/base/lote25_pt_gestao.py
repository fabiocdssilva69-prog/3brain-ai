# -*- coding: utf-8 -*-
"""LOTE 25 — as quatro falhas pt-PT que o conjunto alargado expôs.

Conjunto anterior tinha 16 perguntas e eu escolhera-as sabendo o que a base
tinha. Este tem 24 e inclui as formas que NÃO optimizei: IPSS,
contratualização, Segurança Social, marcação CE, gestão, ecrã. Linha de base
medida: **10/24 em 1.º, 20/24 no top 5**. Quatro falhas:

    "sois de que pais" ............... `pais` puxa as entradas de Portugal e
                                        `onde-ficamos` fica de fora
    "o estado comparticipa quanto" ... `comparticipa` não existe na base
    "quem gere isto no dia a dia" .... `gerir`/`gestão` não existem
    "e caro para um lar pequeno" ..... `precos-resumo` ganha de `preco-savi`

As três primeiras são falta de vocabulário; a quarta é disputa entre duas
entradas de preço, e resolve-se dando à específica o eco que a genérica já tem.

Ecos curtos, pela regra do lote 20.
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

ECO = {
    "onde-ficamos": ["de que pais sao", "sao de que pais", "em que pais ficam"],
    "mercado-portugues": ["o estado comparticipa quanto", "quanto comparticipa a seguranca social",
                          "ha contratualizacao com o estado", "trabalham com IPSS"],
    "como-entra-o-dado": ["quem gere o registo no dia a dia", "como se faz a gestao do registo",
                          "quem gere isto"],
    "preco-savi": ["e caro para um lar pequeno", "um lar pequeno consegue pagar",
                   "quanto paga um lar pequeno"],
    "anvisa-regulatorio": ["isto e dispositivo medico", "precisa de marcacao CE",
                           "e preciso marcacao CE na europa"],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0
    for eid, entram in ECO.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("  (nao existe): %s" % eid); continue
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = [p for p in entram if p not in ja and ('"%s"' % p) not in s]
        if not boas:
            print("  ja tinha: %s" % eid); continue
        novo = dict(e)
        novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k)); sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1; novas += len(boas)
        print("  +%d pt-PT: %s" % (len(boas), eid))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d portas." % (n, novas))


if __name__ == "__main__":
    main()
