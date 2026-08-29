# -*- coding: utf-8 -*-
"""LOTE 14 — as portas em INGLÊS que faltavam em 19 das 139 entradas.

O ACHADO
--------
A página é bilíngue e o campo `en` de todas as 139 entradas está escrito. Mas
19 delas (14%) não tinham **uma única pergunta cadastrada em inglês** — o
conteúdo existia e o caminho até ele não. É o mesmo padrão dos números do lote
9: ter o dado não é ser encontrável.

E não são entradas periféricas. São `mercado-savi`, `metodo-tam`,
`mercado-barbergo`, `concorrentes-barbergo`, `fosso-barbergo`,
`riscos-do-canal`, `margem-por-cliente` — exactamente o que um investidor
estrangeiro pergunta primeiro. `onde-publicado` tinha vinte perguntas, nenhuma
em inglês.

Sintoma medido: "what is the market size" caía em 10.º lugar, com
`mercado-savi` (a resposta certa, contada de baixo para cima) sem porta
nenhuma que a alcançasse em inglês.

O HEURÍSTICO QUE ACHOU ISTO ESTAVA ERRADO NA PRIMEIRA VERSÃO
------------------------------------------------------------
A primeira medição deu 9 entradas, não 19, porque contava `do` como marcador
de inglês — e `do savi`, `do barbergo`, `do canal` são meia base. Palavra
ambígua não serve de marcador. Depois de reescrito só com marcadores
inequívocos e **validado contra dez casos conhecidos** (10/10, incluindo o
`TAM do savi` que enganava), o número real apareceu: 19.

Vale como regra: heurístico de idioma que não foi provado contra casos da
própria base mede o que quer, não o que há.
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

PORTAS = {
    "mercado-savi": [
        "what is the market size", "how big is the market for savi",
        "how many hospitals are there in brazil", "what is your addressable market",
    ],
    "metodo-tam": [
        "where does your market number come from", "why no TAM in dollars",
        "did you use gartner or euromonitor", "how did you size the market",
    ],
    "concorrentes-savi": [
        "who are savi competitors", "does this already exist in the market",
        "what about MV or Tasy", "who else does clinical surveillance",
    ],
    "camada-preditiva": [
        "does savi predict patient deterioration", "is there predictive AI",
        "what is the predictive layer", "does it anticipate risk",
    ],
    "penetracao-conservadora": [
        "what market penetration do you assume", "what if you only get 1 percent",
        "how much of the market do you expect to take",
    ],
    "margem-por-cliente": [
        "what is your margin per customer", "what is your gross margin",
        "how much is left after tax", "what do you earn per client",
    ],
    "onde-publicado": [
        "where can i download it", "is it on the app store",
        "is it live on google play", "can i try the app",
    ],
    "problema-barbergo": [
        "what problem does barbergo solve", "what is the pain",
        "why would a barber use this", "what is the barber's problem",
    ],
    "mercado-barbergo": [
        "how big is the barbergo market", "how many barbershops are there in brazil",
        "what is the size of the beauty market", "how many potential customers",
    ],
    "concorrentes-barbergo": [
        "who are barbergo competitors", "what about trinks or appbarber",
        "who else does this in the beauty sector",
    ],
    "concorrente-status-quo-barbergo": [
        "who is your biggest competitor", "why is whatsapp a competitor",
        "what are you really competing against",
    ],
    "ia-no-barbergo": [
        "what does the AI do in the app", "how do you use AI in barbergo",
        "what is the AI for",
    ],
    "fosso-barbergo": [
        "what is barbergo's moat", "what stops trinks from copying you",
        "what is your defensibility in beauty",
    ],
    "capacidade-de-pagamento": [
        "can a barber afford this", "does this customer pay for software",
        "how much can a barbershop pay", "is this customer too poor",
    ],
    "mercado-outbound": [
        "is there a market for this capability", "who would buy the engine",
        "how big is the outbound market in brazil",
    ],
    "riscos-do-canal": [
        "what is the biggest risk of this channel", "what could go wrong with the engine",
        "what if they block you", "what are the huntai risks",
    ],
    "savi-incerteza-leito": [
        "what is your biggest uncertainty about savi", "ICU bed or regular bed",
        "what could go wrong with the pricing unit",
    ],
    "alcance-vs-comprador": [
        "what is the market for the engine", "how many companies could buy it",
        "reach or buyer, which number is it",
    ],
    "barbergo-conta-nao-fecha": [
        "does the barbergo math work", "what is barbergo's CAC",
        "what is your LTV to CAC", "is paid acquisition worth it",
    ],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0

    for eid, entram in PORTAS.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))

        # TRAVA: pergunta que ja existe EM QUALQUER entrada nao entra. Duas
        # entradas a responder a mesma pergunta foi o que obrigou a fusao de
        # para-quem-savi com savi-segmentos.
        boas = []
        for p in entram:
            if p in ja:
                continue
            if ('"%s"' % p) in s:
                print("ABORTADO -- '%s' ja existe noutra entrada" % p)
                sys.exit(1)
            boas.append(p)
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
        print("  +%d portas EN: %s" % (len(boas), eid))

    if not n:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas ganharam porta em ingles (%d perguntas novas)." % (n, novas))


if __name__ == "__main__":
    main()
