# -*- coding: utf-8 -*-
"""LOTE 16 — as perguntas dos críticos adversariais do estudo de mercado.

DE ONDE VÊM ESTAS PERGUNTAS, e por que valem mais que perguntas inventadas:
o `ESTUDO_MERCADO_3BRAIN` tem, por capítulo, um crítico instruído a **derrubar**
o texto — e cada crítica tem uma secção literalmente chamada "o que eu
perguntaria e o capítulo não responde". São ~38 perguntas escritas por quem
estava a tentar achar o buraco, sobre ESTES produtos, com os números à frente.
É a melhor aproximação disponível de uma sala de diligência.

Passei as mais duras pela busca. A maioria já tinha dono. Estas não:

  chargeback e inadimplência ....... SEM CONTEXTO NENHUM
  CAC e payback do SAVI ............ caía em `o-que-e-savi`
  carta de intenção de barbearia ... caía em `ipca-barbearia`
  quanto a Trinks leva para copiar . caía em `tempo-juntos`
  mix iOS/Android dos pagantes ..... caía em `onde-publicado`
  fornecedor de IA, em inglês ...... caía em `precos-resumo`

As cinco primeiras têm a mesma resposta verdadeira — **ainda não medimos** — e
por isso entram numa entrada só, `o-que-nao-sabemos`, em vez de cinco entradas
magras que competiriam entre si. A sexta é só falta de porta em inglês.

DIZER "NÃO MEDIMOS" COM O NOME DA MEDIDA É RESPOSTA, NÃO EVASIVA. O investidor
desconta estimativa e descarta palpite apresentado como medida; o que ele não
perdoa é a pergunta ficar sem eco. E nomear a medida que falta prova que se
sabe qual é — que é metade da credibilidade.
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

TEXTO_PT = (
    " Os críticos adversariais do nosso próprio estudo de mercado listaram cinco "
    "medidas que ainda não temos, e preferimos nomeá-las a deixá-las sem eco: "
    "**o CAC e o payback do SAVI** (com ticket anual de R$ 4.860, é a conta que "
    "decide se \"capital-eficiente\" é fato ou opinião); **a taxa de chargeback e "
    "de inadimplência involuntária** no BarberGO, que nenhuma tabela de margem "
    "nossa desconta ainda; **carta de intenção ou piloto de barbearia pagante** — "
    "a virada para cobrar do estabelecimento é a nossa tese e ainda não tem uma "
    "única assinatura a sustentá-la; **o mix iOS/Android dos pagantes**, sem o "
    "qual nenhum cenário de taxa de loja é avaliável; e **em quantos meses um "
    "concorrente com base instalada copiaria a camada sobre o WhatsApp**. "
    "Dizemos \"janela real que fecha rápido\" e ainda não convertemos isso em "
    "número."
)
TEXTO_EN = (
    " The adversarial reviewers of our own market study listed five measurements "
    "we still do not have, and we would rather name them than leave them "
    "unanswered: **SAVI's CAC and payback** (at an annual ticket of R$ 4,860, it "
    "is the arithmetic that decides whether \"capital-efficient\" is fact or "
    "opinion); **the chargeback and involuntary churn rates** on BarberGO, which "
    "none of our margin tables discounts yet; **a letter of intent or a paying "
    "barbershop pilot** — pivoting to charge the establishment is our thesis and "
    "it has not one signature behind it yet; **the iOS/Android mix of paying "
    "users**, without which no store-fee scenario can be evaluated; and **how "
    "many months an incumbent with an installed base would take to copy the "
    "layer over WhatsApp**. We say \"a real window that closes fast\" and have "
    "not yet turned that into a number."
)

PORTAS_EN = {
    "risco-plataforma": [
        "what happens if anthropic changes pricing",
        "what if the AI provider shuts you off",
        "which APIs do you depend on",
        "what is your vendor risk",
    ],
    "o-que-nao-sabemos": [
        "what do you not know yet",
        "what is your CAC and payback",
        "what is your chargeback rate",
        "do you have any letter of intent",
        "how long would an incumbent take to copy you",
        # SEGUNDA corrida: as inglesas sozinhas nao bastaram. Medido -- "qual o
        # CAC e o payback do savi" caía em 9.º, "ha carta de intencao" em 8.º e
        # "quanto tempo a trinks leva pra copiar" nao aparecia de todo. A
        # resposta estava escrita e a porta em portugues nao existia; e a
        # pergunta chega em portugues muito mais vezes do que em ingles.
        "qual o CAC e o payback do savi",
        "ha carta de intencao de alguma barbearia",
        "quanto tempo um concorrente leva para copiar",
        "quanto tempo a trinks leva para copiar",
        "qual a taxa de chargeback",
    ],
}


def main():
    s = L9.carrega()
    original = s
    n = 0

    # 1. o texto das cinco medidas que faltam
    achado = L9.entrada(s, "o-que-nao-sabemos")
    if achado is None:
        print("ABORTADO -- 'o-que-nao-sabemos' nao existe")
        sys.exit(1)
    ini, fim, e = achado
    if "cinco medidas que ainda nao temos" in e.get("pt", "") or "CAC e o payback do SAVI" in e.get("pt", ""):
        print("  ja tinha o texto: o-que-nao-sabemos")
    else:
        novo = dict(e)
        novo["pt"] = e.get("pt", "").rstrip() + TEXTO_PT
        novo["en"] = e.get("en", "").rstrip() + TEXTO_EN
        novo["fonte"] = (e.get("fonte", "") + " · Criticas adversariais do estudo de mercado, ago/2026").strip(" ·")
        for k in ("id", "perguntas", "tags", "secao"):
            if e.get(k) != novo.get(k):
                print("ABORTADO -- mexeu em '%s'" % k)
                sys.exit(1)
        if len(novo["pt"]) <= len(e.get("pt", "")) or len(novo["en"]) <= len(e.get("en", "")):
            print("ABORTADO -- nao cresceu nos dois idiomas")
            sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        print("  enriquecida: o-que-nao-sabemos (5 medidas nomeadas)")

    # 2. portas
    for eid, entram in PORTAS_EN.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = []
        for p in entram:
            if p in ja:
                continue
            if ('"%s"' % p) in s:
                print("ABORTADO -- '%s' ja existe noutra entrada" % p)
                sys.exit(1)
            boas.append(p)
        if not boas:
            print("  ja tinha portas: %s" % eid)
            continue
        novo = dict(e)
        novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        print("  +%d portas: %s" % (len(boas), eid))

    if not n:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d alteracoes." % n)


if __name__ == "__main__":
    main()
