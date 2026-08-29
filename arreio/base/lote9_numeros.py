# -*- coding: utf-8 -*-
"""LOTE 9 — põe na base do chat os números que a PÁGINA publica e ele não sabia.

O QUE MUDOU NO DIAGNÓSTICO (29/08/2026)
----------------------------------------
O censo antigo dizia "93 números na página que o chat não explica". Medido de
novo: são **44**. Metade eram o MESMO número contado duas vezes, porque a
página é bilíngue e escreve `0,352` em português e `0.352` em inglês — comparar
por dígitos resolve. Outros 18 só aparecem em citação académica (páginas de
revista tipo `NEJM 2014;371:1803-1812`) e 6 são anos soltos; visitante nenhum
pergunta isso.

E as 44 restantes não são 44 assuntos: são POUCAS TABELAS. A maior é a
comparação de custo de canal do HuntAI, que sozinha responde por ~18 delas.

POR QUE ENRIQUECER, E NÃO CRIAR ENTRADA NOVA
---------------------------------------------
A base já tem 26 entradas sobre custo, preço e mercado, e elas estão certas —
só não carregam os números. Criar entradas novas para os mesmos assuntos
violaria a regra da casa nº 6 (gatilho novo não pode trazer a palavra que já é
núcleo de outra entrada), que já causou três regressões num único dia em
agosto. Entrada enriquecida ganha vocabulário sem ganhar rival.

A REGRA DOS DOIS IDIOMAS
-------------------------
Toda troca mexe em `pt` E em `en`. A página é bilíngue e é o investidor
estrangeiro que lê o `en` — deixar o número só do lado português é publicar
metade.
"""
import io
import json
import os
import re
import sys

ARQ = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), "assistente.js")

# id -> (texto a juntar ao pt, texto a juntar ao en, números que TÊM de aparecer)
ACRESCIMOS = {
    # ---------------------------------------------------------------
    # A tabela de canal: o visitante vê a comparação inteira na tela e
    # perguntava "e comparado com anúncio?" sem o chat saber os números.
    # ---------------------------------------------------------------
    "custo-chegar-comprador": (
        " A página publica a comparação inteira, por reunião gerada: **LinkedIn Ads** "
        "custa R$ 275 por lead (US$ 53), o que dá **R$ 1.375 a 2.750** por reunião "
        "(US$ 266 a 532); **Google Ads B2B** sai a R$ 825 a 1.650 (US$ 160 a 319). "
        "Contra o primeiro o HuntAI ganha de **52% a 76%**, contra o segundo de "
        "**20% a 60%**.",
        " The page publishes the whole comparison, per meeting generated: **LinkedIn "
        "Ads** costs US$ 53 per lead, which works out to **US$ 266 to 532** per "
        "meeting; **Google Ads B2B** runs US$ 160 to 319. Against the first the "
        "HuntAI wins by **52% to 76%**, against the second by **20% to 60%**.",
        ["275", "1.375", "2.750", "825", "1.650", "52%", "76%", "20%", "60%",
         "53", "266", "532", "160", "319"],
    ),
    # ---------------------------------------------------------------
    # O custo por REUNIÃO de um vendedor interno. A entrada já tinha o
    # salário; faltava a conta por reunião, que é a que se compara.
    # ---------------------------------------------------------------
    "custo-de-vendedor": (
        " Levado a custo **por reunião**, com encargos calculados como salário médio "
        "× 1,65 a 2,00: um SDR mediano (10 reuniões/mês) sai a **R$ 674 a 817** "
        "(US$ 130 a 158) por reunião — empate técnico com o motor; um SDR produtivo "
        "(20 reuniões/mês) sai a **R$ 337 a 408** (US$ 65 a 79), e aí o motor perde. "
        "Dizemos as duas pontas: o canal próprio não vence em todo cenário.",
        " Reduced to cost **per meeting**, with payroll taxes computed as average "
        "salary × 1.65 to 2.00: a median SDR (10 meetings/month) comes to **US$ 130 "
        "to 158** per meeting — a technical tie with the engine; a productive SDR "
        "(20 meetings/month) comes to **US$ 65 to 79**, and there the engine loses. "
        "We state both ends: owning the channel does not win in every scenario.",
        ["674", "817", "337", "408", "1,65", "2,00", "130", "158", "65", "79"],
    ),
    # ---------------------------------------------------------------
    # A conta de uma base de 8 mil, ponta a ponta. É a pergunta prática
    # do comprador: "o que eu recebo por mês?"
    # ---------------------------------------------------------------
    "custo-unitario-motor": (
        " A conta fechada de um cliente com base de 8 mil: **R$ 662 (US$ 128) de "
        "custo** contra **R$ 1.690/mês (US$ 327)** de preço, que rendem 16 mil "
        "e-mails, **73 respostas** e **2,55 reuniões** por mês. O estoque não vence: "
        "um canal só acrescenta **R$ 2.400/mês (US$ 464)** de base vendável, 12× a "
        "taxa de reposição. Já executado pelo motor: **62.131 ações**.",
        " The closed math for a client with an 8k base: **US$ 128 in cost** against "
        "**US$ 327/month** in price, yielding 16k e-mails, **73 replies** and **2.55 "
        "meetings** per month. Inventory does not expire: one channel alone adds "
        "**US$ 464/month** of sellable base, 12× the replacement rate. Already "
        "executed by the engine: **62,131 actions**.",
        ["662", "1.690", "73", "2,55", "2.400", "62.131", "128", "327", "464"],
    ),
    # ---------------------------------------------------------------
    # Contra o que o R$ 99 foi ancorado. A entrada tinha os preços de
    # ILPI; faltavam as duas âncoras de hospital, que são as que o
    # investidor cobra.
    # ---------------------------------------------------------------
    "precos-concorrentes-savi": (
        " Do lado da implantação, a faixa medida em contrato público vai de **1,6% do "
        "contrato anual** quando é só configuração (Epimed, R$ 1.500 / US$ 290) a "
        "**298%** quando é reescrita de processo cobrada por hora (Philips Tasy, "
        "R$ 498 mil / US$ 96 mil). Nossa régua é 1 a 2 mensalidades. Para chegar a "
        "R$ 1 milhão de receita recorrente (US$ 193 mil) bastam 2 de cada 1.000 "
        "hospitais do registro oficial.",
        " On the implementation side, the range measured in public contracts runs "
        "from **1.6% of the annual contract** when it is configuration only (Epimed, "
        "US$ 290) to **298%** when it is a process rewrite billed by the hour "
        "(Philips Tasy, US$ 96k). Our rule is 1 to 2 monthly fees. Reaching **US$ "
        "193k** in recurring revenue takes 2 of every 1,000 hospitals in the "
        "official registry.",
        ["1,6%", "298%", "1.500", "498", "290", "96", "193"],
    ),
    # ---------------------------------------------------------------
    # Quanto vale um assinante do BarberGO por ano, e contra que preços.
    # ---------------------------------------------------------------
    "modelo-receita-barbergo": (
        " Por assinante e por ano isso dá **R$ 1.068 (US$ 207)**, com **42,6% de "
        "margem de contribuição** já contando a taxa de loja. Os quatro planos de "
        "entrada do mercado vão de **R$ 39,95 a R$ 189,00** (US$ 7,70 a 36,55) — "
        "Trinks, AppBarber, Avec e Belasis. E o setor sustenta o reajuste: o preço "
        "de cabeleireiro e barbeiro subiu **36,0%** entre 2022 e 2025, contra "
        "**20,97%** do IPCA cheio (IBGE/SIDRA 7060), com **236 mil** aberturas no "
        "ano.",
        " Per subscriber per year that is **US$ 207**, at a **42.6% contribution "
        "margin** already net of store fees. The four entry plans in the market run "
        "from **US$ 7.70 to US$ 36.55** — Trinks, AppBarber, Avec and Belasis. And "
        "the sector supports the increase: hairdressing and barbering prices rose "
        "**36.0%** between 2022 and 2025, against **20.97%** headline inflation "
        "(IBGE/SIDRA 7060), with **236,000** openings in the year.",
        ["1.068", "42,6%", "39,95", "189,00", "36,0%", "20,97%", "236", "207",
         "7.70", "36.55"],
    ),
}


def carrega():
    return io.open(ARQ, encoding="utf8", newline="").read()


def entrada(s, eid):
    """Devolve (inicio, fim, dict) da entrada com esse id."""
    marca = '{"id":"%s"' % eid
    i = s.find(marca)
    if i < 0:
        return None
    # fecha no `}` que termina o objecto: procurar `},{` ou `}]`
    j = i
    prof = 0
    dentro = False
    escapa = False
    while j < len(s):
        c = s[j]
        if escapa:
            escapa = False
        elif c == "\\":
            escapa = True
        elif c == '"':
            dentro = not dentro
        elif not dentro:
            if c == "{":
                prof += 1
            elif c == "}":
                prof -= 1
                if prof == 0:
                    return i, j + 1, json.loads(s[i:j + 1])
        j += 1
    return None


def main():
    s = carrega()
    original = s
    alterados = 0

    for eid, (mais_pt, mais_en, numeros) in ACRESCIMOS.items():
        achado = entrada(s, eid)
        if achado is None:
            print("ABORTADO -- entrada '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado

        if mais_pt.strip()[:40] in e.get("pt", ""):
            print("  ja tinha: %s (nada a fazer)" % eid)
            continue

        novo = dict(e)
        novo["pt"] = e.get("pt", "").rstrip() + mais_pt
        novo["en"] = e.get("en", "").rstrip() + mais_en

        # TRAVA 1: nada além de pt e en pode mudar.
        for k in set(list(e.keys()) + list(novo.keys())):
            if k in ("pt", "en"):
                continue
            if e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s', que nao devia mudar" % (eid, k))
                sys.exit(1)

        # TRAVA 2: os dois idiomas crescem juntos. Deixar o numero so no
        # portugues e publicar metade -- quem le o `en` e o investidor de fora.
        if len(novo["pt"]) <= len(e.get("pt", "")) or len(novo["en"]) <= len(e.get("en", "")):
            print("ABORTADO -- '%s' nao cresceu nos dois idiomas" % eid)
            sys.exit(1)

        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        alterados += 1
        print("  enriquecida: %-26s +%d chars pt, +%d chars en, %d numeros"
              % (eid, len(mais_pt), len(mais_en), len(numeros)))

    if not alterados:
        print("nada mudou.")
        return

    # TRAVA 3: os numeros prometidos TEM de estar la depois. Trava que nao
    # confere o proprio efeito e so intencao.
    faltando = []
    for eid, (_, _, numeros) in ACRESCIMOS.items():
        a = entrada(s, eid)
        if a is None:
            continue
        txt = (a[2].get("pt", "") + " " + a[2].get("en", ""))
        for n in numeros:
            if n not in txt:
                faltando.append("%s: %s" % (eid, n))
    if faltando:
        print("ABORTADO -- numeros prometidos que nao entraram: %s" % ", ".join(faltando))
        sys.exit(1)

    # TRAVA 4: o ficheiro continua sendo JS valido -- contagem de chaves.
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)

    io.open(ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas enriquecidas. %d -> %d bytes."
          % (alterados, len(original), len(s)))


if __name__ == "__main__":
    main()
