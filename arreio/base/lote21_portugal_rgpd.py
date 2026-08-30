# -*- coding: utf-8 -*-
"""LOTE 21 — RGPD e o mercado português: duas entradas que hoje devolvem VAZIO.

MEDIDO antes de escrever, com 16 perguntas na forma que um português as faz:
9/16 chegavam ao top 5 e 5/16 ao 1.º lugar. Duas não devolviam **nada**:

    "o RGPD e cumprido"                 ->  peneira vazia
    "ha ficheiro de dados dos utentes"  ->  peneira vazia

Peneira vazia é o pior resultado possível: a página nem chega a chamar o
Worker. A base tem `lgpd-savi` e o token "RGPD" não existe em lado nenhum —
e o RGPD é a **primeira** pergunta de conformidade que uma instituição de saúde
europeia faz. Um lar em Portugal não pergunta sobre LGPD.

A segunda entrada é o mercado português contado de baixo para cima. Ele já
aparecia de raspão em `por-que-portugal`, mas sem os números da Carta Social —
e sem o argumento que o próprio estudo diz ser o que vende ali: **o problema de
Portugal não é falta de idosos, é falta de quem cuide deles.** Índice de
dependência de 73 por 100 contra 39 no Brasil. Isso muda a venda de "mais
utentes" para "menos mãos por utente", e é uma frase diferente da brasileira.
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

NOVAS = [
    {
        "id": "rgpd-europa",
        "secao": "#savi",
        "tags": ["juridico", "savi", "portugal", "risco"],
        "perguntas": [
            "o RGPD e cumprido",
            "e o RGPD",
            "como tratam o RGPD",
            "ha ficheiro de dados dos utentes",
            "os dados dos utentes ficam onde",
            "cumprem o regulamento europeu de dados",
            "quem e o responsavel pelo tratamento",
            "ha subcontratante dos dados",
            "is this GDPR compliant",
            "what about GDPR",
            "who is the data controller",
        ],
        "pt": "**Dado de saúde é categoria especial pelo artigo 9.º do RGPD**, e o desenho "
              "parte disso: a instituição é a **responsável pelo tratamento** e a 3BRAIN é "
              "**subcontratante** — trabalhamos por instrução escrita dela, com contrato de "
              "subcontratação, e não usamos o dado para nada além do serviço contratado. O "
              "fundamento de licitude para prestação de cuidados é o artigo 9.º, n.º 2, "
              "alínea h), que dispensa consentimento do utente quando o tratamento é "
              "necessário para cuidados de saúde sob sigilo profissional. **Isto ainda não "
              "foi auditado por jurista português** e dizemos antes de perguntarem: é a "
              "leitura que fizemos, não um parecer. Antes do primeiro contrato em Portugal, "
              "o contrato de subcontratação e o registo de atividades de tratamento passam "
              "por advogado local.",
        "en": "**Health data is a special category under Article 9 of the GDPR**, and the "
              "design starts there: the institution is the **controller** and 3BRAIN is a "
              "**processor** — we work on its written instructions, under a processing "
              "agreement, and we do not use the data for anything beyond the contracted "
              "service. The lawful basis for care provision is Article 9(2)(h), which does "
              "not require the resident's consent where processing is necessary for "
              "healthcare under professional secrecy. **This has not yet been reviewed by a "
              "Portuguese lawyer**, and we say so before being asked: it is our reading, not "
              "an opinion. Before the first contract in Portugal, the processing agreement "
              "and the record of processing activities go through local counsel.",
        "fonte": "RGPD (UE) 2016/679, art. 9.º · leitura declarada da 3BRAIN, ago/2026",
        "encaminha": "falar-com-fundador",
    },
    {
        "id": "mercado-portugues",
        "secao": "#savi",
        "tags": ["mercado", "savi", "portugal"],
        "perguntas": [
            "qual o mercado portugues",
            "quantos lares ha em portugal",
            "quantas ERPI existem",
            "quantos utentes ha em lar",
            "trabalham com lares em portugal",
            "o mercado portugues e grande",
            "how big is the portuguese market",
            "how many care homes in portugal",
        ],
        "pt": "Contado na **Carta Social 2024**, de baixo para cima: **2.646 ERPI**, "
              "**107.515 lugares** e **99.903 utentes**, com **92,9% de utilização** — a "
              "rede está cheia. Cerca de **70% dos lares têm lista de espera**, e em 36% "
              "deles a espera passa de seis meses. Junto disso: **apenas 6% das residências "
              "têm médico em permanência**. Há ainda 2.770 respostas de apoio domiciliário "
              "(77.351 utentes) e 2.017 centros de dia (36.585 utentes).\n\n"
              "**O argumento em Portugal não é o mesmo que no Brasil.** O problema português "
              "não é falta de idosos — é **falta de quem cuide deles**: o índice de "
              "dependência de idosos é de **73 por 100** contra 39 por 100 no Brasil. A "
              "venda deixa de ser \"mais utentes\" e passa a ser **menos mãos por utente**.",
        "en": "Counted in the **2024 Carta Social**, bottom-up: **2,646 care homes (ERPI)**, "
              "**107,515 places** and **99,903 residents**, at **92.9% occupancy** — the "
              "network is full. Around **70% of homes have a waiting list**, and in 36% of "
              "them the wait exceeds six months. Alongside that: **only 6% of homes have a "
              "doctor on site**. There are also 2,770 home-care providers (77,351 users) and "
              "2,017 day centres (36,585 users).\n\n"
              "**The argument in Portugal is not the Brazilian one.** Portugal's problem is "
              "not a shortage of older people — it is a **shortage of people to care for "
              "them**: the old-age dependency ratio is **73 per 100** against 39 per 100 in "
              "Brazil. The pitch stops being \"more residents\" and becomes **fewer hands per "
              "resident**.",
        "fonte": "Carta Social 2024 · INE/Eurostat · 4.º Retrato das Residências Sénior, mar/2026",
        "encaminha": "nao",
    },
]


def main():
    s = L9.carrega()
    original = s
    n = 0
    for nova in NOVAS:
        if ('"id":"%s"' % nova["id"]) in s:
            print("  ja existe: %s" % nova["id"])
            continue
        for p in nova["perguntas"]:
            if ('"%s"' % p) in s:
                print("ABORTADO -- a pergunta '%s' ja existe noutra entrada" % p)
                sys.exit(1)
        ancora = L9.entrada(s, "lgpd-savi") or L9.entrada(s, "savi-segmentos")
        if ancora is None:
            print("ABORTADO -- sem ancora"); sys.exit(1)
        s = (s[:ancora[1]] + ","
             + json.dumps(nova, ensure_ascii=False, separators=(",", ":"))
             + s[ancora[1]:])
        n += 1
        print("  NOVA: %-20s (%d perguntas)" % (nova["id"], len(nova["perguntas"])))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas novas." % n)


if __name__ == "__main__":
    main()
