# -*- coding: utf-8 -*-
"""LOTE 28 — Portugal é a prova, não o mercado; e o Net-Empregos.

Medido antes de escrever, com 12 perguntas sobre Portugal e expansão europeia:

    "querem expandir para outros paises europeus" -> caía em `onde-ficamos`
    "o savi vai para espanha depois de portugal"  -> caía em `savi-segmentos`
    "usam o net-empregos"                         -> caía em `quem-usa-savi`
    "ha visto ou autorizacao de trabalho"         -> caía em `problema-barbergo`

A primeira lacuna é a que o próprio estudo diz mudar mais o veredito, e a
resposta tem de vir com a ressalva colada, senão vira promessa:

  *"Portugal não é o mercado, é a prova. Um SAM português de €6,5 milhões não
  sustenta nada sozinho. O que ele sustenta é a referência auditável que abre
  Espanha, Reino Unido e Irlanda — onde cobrar por leito já é convenção
  declarada pelos próprios fornecedores. **Nenhum deles foi dimensionado, e essa
  é a lacuna que mais muda o veredito.**"*

Dizer "vamos para a Europa" sem dizer que os mercados vizinhos NÃO foram
dimensionados é o tipo de frase que a diligência derruba numa pergunta. Dizer as
duas coisas juntas é mais forte do que dizer só a primeira.
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
        "id": "expansao-europeia",
        "secao": "#savi",
        "tags": ["mercado", "savi", "portugal", "estrategia", "honestidade"],
        "perguntas": [
            "querem expandir para outros paises europeus",
            "depois de portugal vao para onde",
            "o savi vai para espanha",
            "e o reino unido e a irlanda",
            "portugal e o mercado ou a porta",
            "porque portugal e nao espanha directamente",
            "do you plan to expand in europe",
            "what comes after portugal",
            "why portugal first",
        ],
        "pt": "**Portugal não é o mercado — é a prova.** Um SAM português de cerca de "
              "**€6,5 milhões** não sustenta uma empresa sozinho, e dizemos isso antes de "
              "perguntarem. O que ele sustenta é a **referência auditável** que abre "
              "Espanha, Reino Unido e Irlanda, onde cobrar **por cama** já é convenção "
              "declarada pelos próprios fornecedores — e onde o preço por unidade é "
              "estruturalmente maior.\n\n"
              "Duas razões para começar por lá e não pelo Brasil: o preço por unidade é "
              "**46% maior**, e **a lista de clientes é pública** (Carta Social), enquanto "
              "no Brasil **não existe cadastro das casas privadas com fins lucrativos** — o "
              "CNES não tem esse tipo e o último censo é de 2007-2009. Isso torna o custo "
              "de aquisição estruturalmente mais alto do lado brasileiro. Em três anos, "
              "Portugal produz mais receita alcançável que o Brasil (**R$ 2,37 milhões** "
              "contra R$ 1,56 milhão) com um universo trinta vezes menor.\n\n"
              "**A ressalva, e é a maior que temos:** nenhum dos mercados vizinhos foi "
              "dimensionado. Espanha, Reino Unido e Irlanda são hipótese com fundamento, "
              "não conta feita — e essa é a lacuna que mais mudaria o veredito sobre o "
              "tamanho do negócio.",
        "en": "**Portugal is not the market — it is the proof.** A Portuguese SAM of around "
              "**€6.5 million** does not sustain a company on its own, and we say so before "
              "being asked. What it does sustain is the **auditable reference** that opens "
              "Spain, the UK and Ireland, where charging **per bed** is already declared "
              "convention among the vendors themselves — and where the price per unit is "
              "structurally higher.\n\n"
              "Two reasons to start there rather than Brazil: the price per unit is **46% "
              "higher**, and **the customer list is public** (Carta Social), whereas in "
              "Brazil **there is no registry of private for-profit homes** — CNES does not "
              "carry that type and the last census is from 2007-2009. That makes the cost of "
              "acquisition structurally higher on the Brazilian side. Over three years, "
              "Portugal yields more reachable revenue than Brazil (**R$ 2.37 million** "
              "against R$ 1.56 million) from a universe thirty times smaller.\n\n"
              "**The caveat, and it is the largest we have:** none of the neighbouring "
              "markets has been sized. Spain, the UK and Ireland are a grounded hypothesis, "
              "not a calculation — and that is the gap that would most change the verdict on "
              "how big this business is.",
        "fonte": "Estudo de mercado 3BRAIN, cap. SAVI, ago/2026 · Carta Social 2024",
        "encaminha": "falar-com-fundador",
    },
    {
        "id": "net-empregos-portugal",
        "secao": "#motor",
        "tags": ["huntai", "portugal", "canal", "metodo"],
        "perguntas": [
            "usam o net-empregos",
            "de que portais tiram as vagas",
            "que portal usam em portugal",
            "ha visto ou autorizacao de trabalho envolvida",
            "o huntai funciona fora de portugal",
            "which job boards do you use",
            "do you use net-empregos",
        ],
        "pt": "O motor foi provado sobretudo em **Portugal**, e o Net-Empregos é um dos "
              "portais onde opera — mas o desenho não depende de nenhum portal em "
              "particular: são **58 adaptadores que submetem**, dos quais 23 falam com "
              "sistemas de recrutamento por HTTP puro, sem robô de tela. Trocar de portal é "
              "escrever um adaptador, não reescrever o motor.\n\n"
              "**Sobre visto e autorização de trabalho: o motor não trata disso.** Ele "
              "encontra a vaga e submete a candidatura; a elegibilidade legal para "
              "trabalhar é do candidato e da empresa, e nada no produto verifica ou "
              "aconselha sobre isso. Dizemos porque a pergunta aparece e a resposta honesta "
              "é que está fora do escopo.",
        "en": "The engine was proven mostly in **Portugal**, and Net-Empregos is one of the "
              "boards it operates on — but the design does not depend on any single board: "
              "there are **58 adapters that submit**, 23 of which talk to recruitment "
              "systems over plain HTTP, with no screen robot. Switching boards means writing "
              "an adapter, not rewriting the engine.\n\n"
              "**On visas and work authorisation: the engine does not handle it.** It finds "
              "the vacancy and submits the application; legal eligibility to work is between "
              "the candidate and the employer, and nothing in the product checks or advises "
              "on that. We say so because the question comes up and the honest answer is "
              "that it is out of scope.",
        "fonte": "Ledgers da operacao HuntAI, ago/2026",
        "encaminha": "nao",
    },
]


def main():
    s = L9.carrega()
    original = s
    n = 0
    for nova in NOVAS:
        if ('"id":"%s"' % nova["id"]) in s:
            print("  ja existe: %s" % nova["id"]); continue
        for p in nova["perguntas"]:
            if ('"%s"' % p) in s:
                print("ABORTADO -- '%s' ja existe noutra entrada" % p); sys.exit(1)
        ancora = L9.entrada(s, "mercado-portugues") or L9.entrada(s, "por-que-portugal")
        if ancora is None:
            print("ABORTADO -- sem ancora"); sys.exit(1)
        s = (s[:ancora[1]] + "," + json.dumps(nova, ensure_ascii=False, separators=(",", ":"))
             + s[ancora[1]:])
        n += 1
        print("  NOVA: %-24s (%d perguntas)" % (nova["id"], len(nova["perguntas"])))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas novas." % n)


if __name__ == "__main__":
    main()
