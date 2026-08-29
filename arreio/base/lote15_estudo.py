# -*- coding: utf-8 -*-
"""LOTE 15 — os dois números de mercado que o estudo tem e a base não tinha.

Cruzei o `ESTUDO_MERCADO_3BRAIN` (1,2 MB, quatro capítulos e quatro críticas
adversariais) contra a base do chat. Boa notícia: quase tudo já estava lá —
imposto e Simples Nacional, LTV:CAC, a Squire, os múltiplos de saída, o Epic
Sepsis Model, a Lei 13.352, os 160.784 em ILPI, e o aviso de não usar o TAM de
R$ 200 bilhões da ABIHPEC.

Faltavam dois, e são o número que o investidor pede primeiro em cada produto:
o SAM do SAVI e o TAM/SAM/SOM do BarberGO, com os três cenários.

Os dois vão com a moldura que o próprio estudo exige, e é ela que os torna
defensáveis em vez de perigosos: no SAVI, que **100% do SAM não chega** à
receita necessária para uma saída de venture no cenário base — o investidor faz
essa divisão sozinho na segunda leitura, então é melhor que esteja no texto
antes de estar na cabeça dele. No BarberGO, que **o TAM grande e o número de
pagadores são a mesma tesoura**: mercado enorme em gente e minúsculo em quem
assina cheque.
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

ACRESCIMOS = {
    "mercado-savi": (
        " Fechado em SAM, somando ILPI no Brasil e ERPI em Portugal: **R$ 37,95 milhões** "
        "no cenário conservador, **R$ 117,74 milhões** na base e R$ 249,62 milhões no "
        "otimista. E dizemos junto a divisão que o investidor faria sozinho na segunda "
        "leitura: no cenário base, **100% desse SAM não chega** à receita que uma saída de "
        "nove dígitos em dólar exigiria se o mercado nos rotular como software de lar de "
        "idosos (2,2× receita). O que muda esse veredito não é produto, é **rótulo de "
        "categoria** — e o que separa 2,2× de 12,5× é validação externa publicada, que "
        "nenhum concorrente levantado tem.",
        " Closed as SAM, adding care homes in Brazil and ERPI in Portugal: **R$ 37.95 "
        "million** in the conservative case, **R$ 117.74 million** in the base case and "
        "R$ 249.62 million in the optimistic one. And we state alongside it the division "
        "an investor would do on their own second reading: in the base case, **100% of "
        "that SAM does not reach** the revenue a nine-figure dollar exit would require if "
        "the market labels us care-home software (2.2× revenue). What changes that verdict "
        "is not product, it is **category label** — and what separates 2.2× from 12.5× is "
        "published external validation, which no competitor we surveyed has.",
        ["37,95", "117,74", "249,62", "2,2×", "37.95", "117.74", "2.2"],
    ),
    "mercado-barbergo": (
        " Contado de baixo para cima, o TAM fica entre **R$ 24 e 249 milhões por ano** "
        "(base: R$ 126 milhões), o SAM em **R$ 62 milhões** e o SOM de 36 meses entre "
        "R$ 0,43 e 3,97 milhões de receita recorrente. Mas o número que decide não é esse "
        "— é a **tesoura**: o mercado é enorme em gente e minúsculo em pagadores. São "
        "78,07 milhões de homens de 15 anos ou mais, e apenas **226 CNPJs de beleza com "
        "20 ou mais pessoas** no país inteiro. Não existe venda enterprise aqui: existe "
        "venda pulverizada com CAC de dezenas de reais, ou não fecha nada.",
        " Counted bottom-up, the TAM lands between **R$ 24 and 249 million a year** (base: "
        "R$ 126 million), the SAM at **R$ 62 million** and the 36-month SOM between R$ 0.43 "
        "and 3.97 million in recurring revenue. But the deciding number is not that one — "
        "it is the **scissors**: the market is enormous in people and tiny in payers. There "
        "are 78.07 million men aged 15 or over, and only **226 beauty companies with 20 or "
        "more staff** in the whole country. There is no enterprise sale here: there is "
        "fragmented self-service selling with a CAC of tens of reais, or nothing closes.",
        ["24 e 249", "126", "62", "0,43", "3,97", "78,07", "226", "78.07"],
    ),
}


def main():
    s = L9.carrega()
    original = s
    n = 0
    for eid, (mais_pt, mais_en, numeros) in ACRESCIMOS.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        if mais_pt.strip()[:40] in e.get("pt", ""):
            print("  ja tinha: %s" % eid)
            continue
        novo = dict(e)
        novo["pt"] = e.get("pt", "").rstrip() + mais_pt
        novo["en"] = e.get("en", "").rstrip() + mais_en
        novo["fonte"] = (e.get("fonte", "") + " · Estudo de mercado 3BRAIN, ago/2026").strip(" ·")
        for k in ("id", "perguntas", "tags", "secao"):
            if e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)
        if len(novo["pt"]) <= len(e.get("pt", "")) or len(novo["en"]) <= len(e.get("en", "")):
            print("ABORTADO -- '%s' nao cresceu nos dois idiomas" % eid)
            sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        print("  enriquecida com o estudo: %-22s %d numeros" % (eid, len(numeros)))

    if not n:
        print("nada mudou.")
        return
    faltam = []
    for eid, (_, _, numeros) in ACRESCIMOS.items():
        a = L9.entrada(s, eid)
        if a:
            txt = a[2].get("pt", "") + " " + a[2].get("en", "")
            faltam += ["%s: %s" % (eid, x) for x in numeros if x not in txt]
    if faltam:
        print("ABORTADO -- nao entrou: %s" % ", ".join(faltam))
        sys.exit(1)
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas enriquecidas com o estudo de mercado." % n)


if __name__ == "__main__":
    main()
