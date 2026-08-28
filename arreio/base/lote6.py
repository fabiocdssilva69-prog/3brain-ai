# -*- coding: utf-8 -*-
"""Lote 6: gatilho em INGLES nas 43 entradas que nao tinham nenhum.

Medido em 27/08/2026: 43 das 136 entradas nao tinham UM gatilho em ingles --
entre elas `precos-resumo`, `rodada`, `contato`, `o-que-e-barbergo` e
`savi-piloto`. A pagina e bilingue e o publico-alvo dela e investidor
estrangeiro; essas sao exatamente as perguntas que ele faz primeiro.

O sintoma que expos isto: "how much are you raising" nao alcancava `rodada`
nem por palavra nem por trigrama, porque os doze gatilhos dela sao todos em
portugues. Nao ha truque de busca que resolva ausencia de superficie.

REGRA ao escrever cada um: palavra de CONTEUDO, nunca frase so de palavra
funcional. "how much" sozinho pontua em meia base; "runway", "moat",
"deliverability", "trademark" pontuam numa entrada so.
"""
import io
import json
import sys

sys.path.insert(0, ".")
from lote4 import ARQ, recorta  # noqa: E402

EN = {
    "por-que-ilpi": ["why start with nursing homes", "why long-term care first"],
    "quanto-economiza": ["how much time does it save", "what is the ROI",
                         "do you measure the savings"],
    "quem-usa-savi": ["who uses savi", "does savi have any customer",
                      "any paying customer for savi"],
    "precos-concorrentes-savi": ["what do competitors charge",
                                 "competitor pricing in this category"],
    "precos-resumo": ["how much does it cost", "what is your pricing",
                      "how much do you charge", "do you have a price list"],
    "implantacao": ["is there an onboarding fee", "what is the setup cost",
                    "do you charge for implementation"],
    "anvisa-regulatorio": ["do you need anvisa approval", "is it a regulated medical device",
                           "what is your regulatory status"],
    "certificacao-sbis": ["are you certified", "do you have SBIS certification",
                          "any healthcare certification"],
    "quem-paga-reembolso": ["is there reimbursement for this", "does insurance pay for it",
                            "who pays for it in healthcare"],
    "imposto-simples": ["what taxes do you pay", "what is your tax regime"],
    "clientes-para-1-milhao": ["how many customers to reach 1 million",
                               "customers needed for 1m of revenue"],
    "break-even": ["when do you break even", "where is your break-even point"],
    "rodada": ["how much are you raising", "what are you raising",
               "how big is the round", "are you fundraising right now",
               "what instrument is the round"],
    "tempo-de-caixa": ["what is your runway", "how many months of runway",
                       "how long does the money last"],
    "macro-captacao": ["how is the venture funding market",
                       "is it a good moment to raise in brazil"],
    "aceleradoras-investidor": ["do you have investors already",
                                "were you accepted in any accelerator"],
    "o-que-e-barbergo": ["what is barbergo", "what does barbergo do"],
    "modelo-receita-barbergo": ["what is your business model", "how do you make money",
                                "what is your revenue model"],
    "preco-barbergo": ["how much does barbergo cost", "what does the subscription cost",
                       "barbergo pricing"],
    "usuarios-barbergo": ["how many users does barbergo have",
                          "do you publish downloads", "what are your user numbers"],
    "barbergo-e-healthtech": ["why healthcare and barbershops together",
                              "how do the two products fit"],
    "por-que-nao-comissao": ["why not charge a commission", "why no take rate"],
    "churn-barbergo": ["what is your churn", "what is the churn rate"],
    "aquisicao-e-canal": ["how do you acquire customers", "what is your CAC",
                          "what is your go to market"],
    "precedente-squire": ["what happened to squire", "is there a precedent for this"],
    "foco-tres-frentes": ["why three products", "are you spread too thin"],
    "benchmark-belkins": ["what is the industry benchmark for outbound"],
    "entregabilidade": ["what about email deliverability", "what is your bounce rate"],
    "descadastro": ["how do people unsubscribe", "how does opt out work"],
    "dependencia-uma-pessoa": ["what if the developer leaves", "what is your key person risk",
                               "what is the bus factor"],
    "marca-inpi": ["do you have a trademark", "is the brand registered"],
    "risco-plataforma": ["what is your platform risk",
                         "what if the app stores ban you"],
    "fosso-savi": ["what is your moat", "what stops a funded competitor"],
    "contato": ["how do I contact you", "how do I reach the founder",
                "what is your email address", "can I book a demo"],
    "candidaturas-conversao": ["how many applications were sent",
                               "what is the application conversion rate"],
    "entrega-email": ["what is your email delivery rate", "how many emails were delivered"],
    "ressalva-aberturas": ["what is your open rate"],
    "ressalva-whatsapp": ["how many whatsapp contacts do you have"],
    "metricas-que-nao-usamos": ["which metrics do you refuse to publish",
                                "what about vanity metrics"],
    "savi-ilpi-nao-paga": ["which segment pays best",
                           "is the nursing home the best segment"],
    "savi-modelo-ia": ["how does the ai work", "which model do you use",
                       "what llm is behind it"],
    "savi-piloto": ["do you have a pilot running", "where is the pilot",
                    "what is the pilot status"],
    "comparaveis-sem-capital": ["are there comparable companies",
                                "who else did this without funding"],
}


def main():
    s = io.open(ARQ, encoding="utf8", newline="").read()
    i, j = recorta(s)
    base = json.loads(s[i:j])
    por = {e["id"]: e for e in base["entradas"]}

    novos = 0
    faltando = []
    for eid, gs in EN.items():
        if eid not in por:
            faltando.append(eid)
            continue
        p = por[eid].setdefault("perguntas", [])
        for g in gs:
            if g not in p:
                p.append(g)
                novos += 1

    if faltando:
        print("X ids inexistentes: %s -- NADA gravado" % ", ".join(faltando))
        sys.exit(1)

    io.open(ARQ, "w", encoding="utf8", newline="").write(
        s[:i] + json.dumps(base, ensure_ascii=False, separators=(",", ":")) + s[j:])
    print("%d entradas receberam gatilho em ingles; %d gatilhos novos" % (len(EN), novos))


if __name__ == "__main__":
    main()
