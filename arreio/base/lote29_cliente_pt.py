# -*- coding: utf-8 -*-
"""LOTE 29 — as perguntas de CLIENTE português, não de investidor.

A base inteira foi escrita para quem investe. Medido com 12 perguntas que um
director de lar faz — e não um fundo:

    "o contrato e de que jurisdicao" ... VAZIO
    "atendem em que fuso horario" ...... VAZIO
    "ha periodo experimental" .......... caía em `precos-resumo`
    "integra com o SClinico" ........... parcial
    "quem assina do nosso lado" ........ parcial

É uma lacuna de PÚBLICO, não de assunto: o investidor pergunta tamanho de
mercado e múltiplo de saída; o cliente pergunta contrato, suporte, fuso e se dá
para experimentar antes de pagar. Nenhuma das duas listas cobre a outra.

⚠️ O QUE NÃO ESCREVI, DE PROPÓSITO: se há período experimental e em que termos.
Isso é decisão comercial do Fábio e não está tomada — inventar aqui seria pôr o
chat a prometer condição que ninguém decidiu, que é exactamente o erro que a
regra de tração já barra ("estar publicado numa loja NÃO é vender"). Fica na
lista para ele decidir.
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
        "id": "atendimento-e-contrato",
        "secao": "#contato",
        "tags": ["portugal", "juridico", "produto", "honestidade"],
        "perguntas": [
            "atendem em que fuso horario",
            "ha suporte em portugal",
            "quem atende do vosso lado",
            "o contrato e de que jurisdicao",
            "que lei rege o contrato",
            "quem assina o contrato do vosso lado",
            "falam portugues de portugal",
            "what is the governing law",
            "do you have support in europe",
            "which time zone are you in",
        ],
        "pt": "**Quem atende é quem escreve o produto** — não há camada comercial no meio, e "
              "isso vale igual em Portugal. O fuso é o do Brasil (Florianópolis), **quatro a "
              "cinco horas atrás de Lisboa** conforme a época do ano, o que na prática dá "
              "uma manhã portuguesa inteira sobreposta ao nosso dia.\n\n"
              "**Sobre o contrato, a resposta honesta é que ainda não está fechado.** Não há "
              "cliente português assinado, então não há minuta rodada nem jurisdição "
              "decidida — e inventar isso aqui seria prometer condição que ninguém acordou. "
              "O que está decidido é o desenho de proteção de dados (a instituição é "
              "responsável pelo tratamento, a 3BRAIN é subcontratante) e que **o contrato de "
              "subcontratação passa por advogado português antes da primeira assinatura**. "
              "O resto discute-se com o primeiro cliente, e quem discute é o fundador.",
        "en": "**The person who answers is the person who writes the product** — there is no "
              "sales layer in between, and that holds in Portugal too. The time zone is "
              "Brazil's (Florianópolis), **four to five hours behind Lisbon** depending on "
              "the season, which in practice leaves a whole Portuguese morning overlapping "
              "our day.\n\n"
              "**On the contract, the honest answer is that it is not settled.** There is no "
              "signed Portuguese client, so there is no drafted agreement and no chosen "
              "governing law — and inventing that here would be promising terms nobody has "
              "agreed. What is settled is the data-protection design (the institution is the "
              "controller, 3BRAIN is the processor) and that **the processing agreement goes "
              "through a Portuguese lawyer before the first signature**. The rest is "
              "discussed with the first client, and it is the founder who discusses it.",
        "fonte": "Estado declarado da 3BRAIN, ago/2026",
        "encaminha": "falar-com-fundador",
    },
]

ECO = {
    "substitui-prontuario": ["integra com o SClinico", "funciona com o sistema que ja temos",
                             "e preciso trocar de fornecedor", "integra com o que ja usamos"],
    "precos-resumo": ["quanto e em euros", "o preco e em reais ou euros"],
}


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
        ancora = L9.entrada(s, "contato") or L9.entrada(s, "mercado-portugues")
        if ancora is None:
            print("ABORTADO -- sem ancora"); sys.exit(1)
        s = (s[:ancora[1]] + "," + json.dumps(nova, ensure_ascii=False, separators=(",", ":"))
             + s[ancora[1]:])
        n += 1
        print("  NOVA: %s (%d perguntas)" % (nova["id"], len(nova["perguntas"])))

    for eid, entram in ECO.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("  (nao existe): %s" % eid); continue
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = [p for p in entram if p not in ja and ('"%s"' % p) not in s]
        if not boas:
            print("  ja tinha: %s" % eid); continue
        novo = dict(e); novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k)); sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        print("  +%d: %s" % (len(boas), eid))

    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d alteracoes." % n)


if __name__ == "__main__":
    main()
