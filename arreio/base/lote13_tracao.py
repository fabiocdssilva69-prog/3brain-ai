# -*- coding: utf-8 -*-
"""LOTE 13 — a tração medida, e o prontuário dito como de facto foi.

DUAS TROCAS, e as duas cumprem promessa que a própria base fez.

1. `usuarios-barbergo` dizia: "Ainda não divulgamos base. (...) Quando houver
   funil com denominador e janela declarada, publicamos com os dois." O
   princípio está certo — número de cadastro sem uso ao lado é métrica de
   vaidade, e é a primeira da lista negra dos fundos. Mas agora HÁ denominador
   e HÁ janela: contado no Firebase Auth do projecto em 29/08/2026, com
   autorização do dono. Manter o desvio depois de ter o número seria o desvio
   virar hábito — e a diligência fareja desvio muito mais depressa do que
   fareja número pequeno.

   O número é pequeno. Dizê-lo com o denominador ao lado é mais forte do que
   escondê-lo, porque quem esconde 75 parece esconder muito mais.

2. `fosso-savi` publicava "o prontuário real (...) e a permissão informal de
   quem já esteve do outro lado do balcão". Prontuário é dado sensível pela
   LGPD art. 11, e "permissão informal" não é base legal — publicar aquilo era
   entregar à diligência uma pergunta que não tinha boa resposta. O facto é
   melhor do que a frase: **os registos foram anonimizados antes do uso**, e
   dado anonimizado está fora do alcance da LGPD (art. 12). Trocar a frase não
   é maquiagem: é publicar a versão certa de uma coisa que já estava certa.
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

# Medido em 29/08/2026 no Firebase Auth e Firestore do projecto barbergo-38c21,
# somente contagens agregadas, com autorização do dono.
TRACAO_PT = (
    "Agora dá, e é o que esta resposta prometia: com denominador e janela "
    "declarada. **75 contas criadas**, das quais 70 já entraram alguma vez; "
    "**7 ativas nos últimos 30 dias** e 4 nos últimos 7. **Uma assinatura "
    "ativa.** Medido em 29/08/2026, direto no banco, não estimado.\n\n"
    "É pequeno e não maquiamos. O que os números mostram é que o produto **foi "
    "usado de verdade** — 315 curtidas, 18 matches, 120 avaliações e 77 "
    "resenhas saíram de gente real, não de semente — e que **não há tração "
    "comercial**. Chamar 75 cadastros de tração seria exatamente a métrica de "
    "vaidade que recusamos usar. O que falta não é produto: é canal e preço, e "
    "é nisso que estamos."
)
TRACAO_EN = (
    "Now we can, and it is what this answer promised: with a denominator and a "
    "stated window. **75 accounts created**, of which 70 have signed in at "
    "least once; **7 active in the last 30 days** and 4 in the last 7. **One "
    "active subscription.** Measured on 29 Aug 2026, straight from the "
    "database, not estimated.\n\n"
    "It is small and we do not dress it up. What the numbers show is that the "
    "product **was genuinely used** — 315 likes, 18 matches, 120 ratings and 77 "
    "reviews came from real people, not from seeding — and that **there is no "
    "commercial traction**. Calling 75 sign-ups traction would be exactly the "
    "vanity metric we refuse to use. What is missing is not the product: it is "
    "channel and price, and that is what we are working on."
)

TROCAS = {
    "usuarios-barbergo": {
        "espera_pt": "Ainda não divulgamos base.",
        "pt": TRACAO_PT,
        "en": TRACAO_EN,
        "fonte": "Firebase Auth e Firestore do BarberGO, contagem de 29/08/2026",
        "confere": ["75", "70", "7", "315", "18", "120", "77"],
    },
    "fosso-savi": {
        "espera_pt": "a permissão informal de quem já esteve do outro lado do balcão",
        "trocar_pt": (
            "a permissão informal de quem já esteve do outro lado do balcão",
            "o acesso de quem já esteve do outro lado do balcão",
        ),
        "trocar_en": (
            "the informal permission of someone who has stood on the other side of the counter",
            "the access of someone who has stood on the other side of the counter",
        ),
        "juntar_pt": " Os registos foram **anonimizados antes do uso** — dado "
                     "anonimizado está fora do alcance da LGPD (art. 12), e "
                     "dizemos isto porque é a primeira coisa que a diligência "
                     "pergunta sobre dado de saúde.",
        "juntar_en": " The records were **anonymised before use** — anonymised "
                     "data falls outside the scope of Brazil's LGPD (art. 12), "
                     "and we say so because it is the first thing due diligence "
                     "asks about health data.",
        "confere": ["anonimizados", "art. 12"],
    },
}


def main():
    s = L9.carrega()
    original = s
    n = 0

    for eid, plano in TROCAS.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado

        # TRAVA 1: a entrada tem de estar como eu penso que esta. Sem isto, o
        # lote aplicaria a um texto ja alterado por outra sessao e o resultado
        # seria silenciosamente errado.
        if plano["espera_pt"] not in e.get("pt", ""):
            if plano.get("confere") and all(c in e.get("pt", "") for c in plano["confere"][:1]):
                print("  ja aplicado: %s" % eid)
                continue
            print("ABORTADO -- '%s' nao esta no estado esperado" % eid)
            sys.exit(1)

        novo = dict(e)
        if "trocar_pt" in plano:
            velho, novo_txt = plano["trocar_pt"]
            novo["pt"] = e["pt"].replace(velho, novo_txt) + plano["juntar_pt"]
            velho_en, novo_en = plano["trocar_en"]
            novo["en"] = e["en"].replace(velho_en, novo_en) + plano["juntar_en"]
            if velho in novo["pt"] or velho_en in novo["en"]:
                print("ABORTADO -- '%s': a frase antiga sobreviveu" % eid)
                sys.exit(1)
        else:
            novo["pt"] = plano["pt"]
            novo["en"] = plano["en"]
        if "fonte" in plano:
            novo["fonte"] = plano["fonte"]

        # TRAVA 2: `perguntas`, `tags` e `id` nao mudam -- so o texto e a fonte.
        for k in ("id", "perguntas", "tags", "secao"):
            if e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)

        # TRAVA 3: os dois idiomas mudaram.
        if novo["pt"] == e.get("pt") or novo["en"] == e.get("en"):
            print("ABORTADO -- '%s' nao mudou nos dois idiomas" % eid)
            sys.exit(1)

        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        print("  reescrita: %s" % eid)

    if not n:
        print("nada mudou.")
        return

    # TRAVA 4: o que prometi estar la, esta.
    faltam = []
    for eid, plano in TROCAS.items():
        a = L9.entrada(s, eid)
        if a:
            txt = a[2].get("pt", "") + " " + a[2].get("en", "")
            faltam += ["%s: %s" % (eid, c) for c in plano.get("confere", []) if c not in txt]
    if faltam:
        print("ABORTADO -- nao entrou: %s" % ", ".join(faltam))
        sys.exit(1)
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)

    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas reescritas." % n)


if __name__ == "__main__":
    main()
