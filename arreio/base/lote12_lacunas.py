# -*- coding: utf-8 -*-
"""LOTE 12 — três perguntas que não tinham dono na base, respondidas pelo Fábio.

Achadas por sondagem: 26 perguntas que um investidor faz de verdade, passadas
pela busca. Onze acertaram; estas três caíam em entrada errada, e a primeira é
a mais grave que apareceu no dia.

1. RESPONSABILIDADE CLÍNICA — "quem responde se a IA errar um dado?" caía em
   `fundadores-quem`. É a primeira pergunta do jurídico de um hospital, e a
   base tinha `anvisa-regulatorio` (registo) mas nada sobre responsabilidade.
   Registo e responsabilidade são coisas diferentes: um diz se pode vender, o
   outro diz quem paga quando dá errado.

2. CICLO DE VENDA — "quanto tempo do primeiro contacto à assinatura?" caía em
   `savi-segmentos`. A resposta honesta é que ainda não venderam nenhum, e
   dizer isso com a expectativa DECLARADA COMO expectativa vale mais do que
   inventar um número: o investidor desconta estimativa, mas descarta quem
   apresenta palpite como medida.

3. CAPITAL PRÓPRIO — "quanto vocês já puseram do próprio bolso?" caía em
   `custo-chegar-comprador`. É pergunta de primeira reunião.

Todas seguem a regra da casa: nenhum gatilho novo repete pergunta já
cadastrada, e a trava aborta se repetir.
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
        "id": "savi-responsabilidade",
        "secao": "#savi",
        "tags": ["savi", "risco", "juridico", "produto"],
        "perguntas": [
            "quem responde se a IA errar um dado clinico",
            "de quem e a responsabilidade se o savi errar",
            "e se a IA sugerir algo errado",
            "o savi decide alguma coisa sozinho",
            "quem assina o que o savi produz",
            "who is liable if the AI gets it wrong",
            "does SAVI make clinical decisions",
        ],
        "pt": "**O SAVI não decide nada.** Ele **sugere e estrutura o que recebe** — "
              "organiza o registo, aponta o que falta, devolve no formato certo. Quem "
              "decide e quem assina é sempre o profissional, como já é hoje sem ele. "
              "Se um dado sair errado, foi porque **alguém aprovou errado ou não "
              "conferiu**, e essa é exatamente a mesma responsabilidade que existe no "
              "papel. A diferença é que no papel o erro é invisível e aqui fica "
              "registado quem confirmou o quê. Dizemos isto antes de perguntarem "
              "porque é a primeira pergunta do jurídico de qualquer instituição, e "
              "porque produto de saúde que promete decidir sozinho é produto que não "
              "passa na porta.",
        "en": "**SAVI decides nothing.** It **suggests and structures what it "
              "receives** — it organises the record, flags what is missing, returns it "
              "in the right format. The professional always decides and always signs, "
              "exactly as they do today without it. If a piece of data comes out "
              "wrong, it is because **someone approved it wrongly or did not check**, "
              "and that is precisely the same responsibility that already exists on "
              "paper. The difference is that on paper the error is invisible, and here "
              "it is recorded who confirmed what. We say this before being asked "
              "because it is the first question any institution's legal team raises, "
              "and because a health product that promises to decide on its own is a "
              "product that does not get through the door.",
        "fonte": "Desenho do produto SAVI, ago/2026",
        "encaminha": "nao",
    },
    {
        "id": "ciclo-de-venda-savi",
        "secao": "#savi",
        "tags": ["savi", "venda", "estagio", "honestidade"],
        "perguntas": [
            "qual o ciclo de venda de um hospital",
            "quanto tempo leva para fechar uma instituicao",
            "quanto demora do contato ate a assinatura",
            "how long is the sales cycle",
            "how long to close a hospital",
        ],
        "pt": "**Não sabemos, porque ainda não vendemos nenhum** — e é assim que "
              "respondemos, em vez de citar uma média de mercado como se fosse nossa. "
              "A expectativa declarada é de um ciclo **curto**, e a razão é a unidade "
              "de compra: o SAVI entra por leito, com decisão de gestor de operação e "
              "não de comité de TI, e não substitui o sistema que já está instalado — "
              "compra que não exige troca de fornecedor não passa pelo processo longo. "
              "**Isto é expectativa, não medida**, e continua sendo expectativa até o "
              "primeiro contrato dizer o contrário.",
        "en": "**We do not know, because we have not sold one yet** — and that is how "
              "we answer, rather than quoting a market average as if it were ours. The "
              "stated expectation is a **short** cycle, and the reason is the buying "
              "unit: SAVI enters per bed, decided by an operations manager rather than "
              "an IT committee, and does not replace the system already installed — a "
              "purchase that requires no vendor switch does not go through the long "
              "process. **This is an expectation, not a measurement**, and it stays an "
              "expectation until the first contract says otherwise.",
        "fonte": "Estado declarado da 3BRAIN, ago/2026",
        "encaminha": "falar-com-fundador",
    },
    {
        "id": "capital-proprio",
        "secao": "#receita",
        "tags": ["dinheiro", "investidor", "time", "estagio"],
        "perguntas": [
            "quanto voces ja colocaram do proprio bolso",
            "quanto os fundadores investiram",
            "de onde saiu o dinheiro ate agora",
            "voces ja captaram alguma coisa",
            "how much have the founders put in",
            "is it bootstrapped",
        ],
        "pt": "**Cerca de R$ 20 mil do próprio bolso**, mais o custo corrente de "
              "ferramentas, APIs, provedores e domínios. Não há capital de terceiros: "
              "tudo o que está no ar — o BarberGO publicado nas duas lojas, o motor do "
              "HuntAI a operar e o SAVI a rodar sobre prontuário real — foi construído "
              "com isso. O número é pequeno de propósito e conta uma coisa: **o custo "
              "de descobrir se funciona já foi pago**, e o que se pede a seguir não é "
              "para começar, é para escalar o que já anda.",
        "en": "**About R$ 20,000 of our own money**, plus the running cost of tools, "
              "APIs, providers and domains. There is no outside capital: everything "
              "that is live — BarberGO published on both stores, the HuntAI engine "
              "operating and SAVI running on real medical records — was built with "
              "that. The figure is deliberately small and it says one thing: **the "
              "cost of finding out whether it works has already been paid**, and what "
              "we ask for next is not to start, it is to scale what already runs.",
        "fonte": "Estado declarado da 3BRAIN, ago/2026",
        "encaminha": "falar-com-fundador",
    },
]


def main():
    s = L9.carrega()
    original = s
    postas = 0

    for nova in NOVAS:
        if ('"id":"%s"' % nova["id"]) in s:
            print("  ja existe: %s" % nova["id"])
            continue
        # TRAVA: pergunta que ja existe noutra entrada nao entra. Foi pergunta
        # duplicada que obrigou a fusao de para-quem-savi com savi-segmentos.
        for p in nova["perguntas"]:
            if ('"%s"' % p) in s:
                print("ABORTADO -- a pergunta '%s' ja existe noutra entrada" % p)
                sys.exit(1)
        # insere depois de uma ancora estavel do mesmo assunto
        ancora = L9.entrada(s, "savi-piloto") or L9.entrada(s, "savi-segmentos")
        if ancora is None:
            print("ABORTADO -- nao achei ancora")
            sys.exit(1)
        s = (s[:ancora[1]] + ","
             + json.dumps(nova, ensure_ascii=False, separators=(",", ":"))
             + s[ancora[1]:])
        postas += 1
        print("  NOVA: %-24s (%d perguntas)" % (nova["id"], len(nova["perguntas"])))

    if not postas:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas novas." % postas)


if __name__ == "__main__":
    main()
