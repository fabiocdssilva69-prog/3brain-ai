# -*- coding: utf-8 -*-
"""LOTE 10 — as 12 lacunas de número que sobraram depois do lote 9.

O lote 9 fechou 32 das 44 enriquecendo cinco entradas que já existiam. Estas
doze estavam espalhadas por outros assuntos. Onze entram em entradas
existentes; UMA precisa de entrada nova, e a distinção importa:

  câmbio não tem dono na base. Nenhuma das 135 entradas fala de conversão de
  moeda, e a página inteira em inglês está em dólar. "Que taxa vocês usaram?"
  é pergunta de diligência — quem lê a versão em inglês precisa saber se o
  número foi fixado ou flutua. Entrada nova aqui NÃO cria rival, porque não há
  ninguém a competir pelo assunto.

Os gatilhos da entrada nova evitam de propósito a ficha `taxa`, que já é núcleo
de `ressalva-clique` e `ressalva-aberturas` (o par de 38% de sobreposição que
ainda existe). Regra da casa nº 6: gatilho novo não traz palavra que já é
núcleo de outra entrada.
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

ARQ = L9.ARQ

ACRESCIMOS = {
    # Os números de dano que SOBREVIVEM à conferência — a entrada explica quais
    # rejeitamos, faltava dizer quais usamos.
    "dano-e-mortes": (
        " Os que usamos são os que sobrevivem: quem sofre dano evitável custa **3 vezes "
        "mais e fica 4,6 dias a mais internado** (Porto et al., 2010, sobre **622 "
        "prontuários**), e o enfermeiro passa **18,4% do turno** em registro — quase "
        "um quinto do plantão a documentar em vez de assistir.",
        " The ones we use are the ones that survive scrutiny: a patient who suffers "
        "preventable harm costs **3 times more and stays 4.6 days longer** (Porto et "
        "al., 2010, over **622 charts**), and the nurse spends **18.4% of the shift** "
        "on recording — nearly a fifth of the duty documenting instead of caring.",
        ["4,6", "622", "18,4%", "4.6", "18.4%"],
    ),
    # Como o número do LinkedIn é DERIVADO. Sem isto o visitante vê "~14.800
    # e-mails novos" na tela e o chat não sabe de onde saiu.
    "metodo-tam": (
        " O número do LinkedIn é derivado, não colhido: parte do limite medido da conta "
        "(**240 pedidos por hora**, seguros) vezes o rendimento medido de **0,352 e-mail "
        "por perfil**, numa jornada de 8 horas — dá **84 e-mails por hora** e "
        "**~14.800 e-mails novos**, 100% inéditos contra a base. E a origem muda o "
        "rendimento: perfil achado por post rende **5,8×** o achado por busca.",
        " The LinkedIn figure is derived, not harvested: it takes the account's measured "
        "ceiling (**240 requests per hour**, safe) times the measured yield of **0.352 "
        "e-mails per profile**, over an 8-hour day — giving **84 e-mails per hour** and "
        "**~14,800 new e-mails**, 100% previously unseen against the base. And the "
        "source changes the yield: a profile found via post yields **5.8×** one found "
        "via search.",
        ["240", "0,352", "84", "14.800", "5,8", "0.352", "14,800", "5.8"],
    ),
    # Por que o canal caro não entra, com o preço na mão.
    "ressalva-whatsapp": (
        " E há a conta do canal: o WhatsApp alcança **8,7 milhões** de pequenos negócios, "
        "mas é camada paga à parte — custa **R$ 0,32 (US$ 0,062) por mensagem entregue** "
        "contra **R$ 0,021 (US$ 0,004) do e-mail**. Quem quer o canal onde se responde "
        "paga por ele, e a diferença é de quinze vezes.",
        " And there is the channel math: WhatsApp reaches **8.7 million** small "
        "businesses, but it is a separately paid tier — it costs **US$ 0.062 per "
        "delivered message** against **US$ 0.004 for e-mail**. Whoever wants the channel "
        "where people reply pays for it, and the gap is fifteenfold.",
        ["8,7", "0,32", "0,021", "8.7", "0.062", "0.004"],
    ),
    # O total somado e a fonte que separa quem compra.
    "mercado-savi": (
        " Somados, são **98.968 hospitais e clínicas especializadas** contados no registro "
        "oficial. E o que separa quem compra não é porte, é internação: **3.270 gestores** "
        "ouvidos pela TIC Saúde 2025 (Cetic.br/NIC.br, fev–nov/2025) mostram que 92 de "
        "cada 100 estabelecimentos já têm sistema, mas onde há internação **85 ainda "
        "produzem papel**.",
        " Added up, that is **98,968 hospitals and specialised clinics** counted in the "
        "official registry. And what separates the buyer is not size but inpatient care: "
        "**3,270 managers** surveyed by TIC Saúde 2025 (Cetic.br/NIC.br, Feb–Nov 2025) "
        "show that 92 of every 100 facilities already have a system, but where there are "
        "inpatients **85 still produce paper**.",
        ["98.968", "3.270", "98,968", "3,270"],
    ),
    # A forma em dólar do custo de folha, que só existia em real.
    "custo-de-vendedor": (
        " Em dólar, a mesma régua: contratar prospecção custa **US$ 1.020 a 1.200 por mês, "
        "por pessoa**.",
        " In dollars, the same rule: hiring prospecting costs **US$ 1,020–1,200 per month, "
        "per person**.",
        ["1.020", "1.200", "1,020", "1,200"],
    ),
}

NOVA = {
    "id": "cambio-usado",
    "secao": "#fontes",
    "tags": ["metodo", "moeda", "fonte"],
    "perguntas": [
        "qual o cambio usado", "como converteram para dolar",
        "de quanto e o dolar da pagina", "os valores em dolar sao de quando",
        "what exchange rate", "how did you convert to dollars",
        "is the dollar figure current",
    ],
    "pt": "**US$ 1 = R$ 5,17**, pela PTAX de 19/08/2026 (R$ 5,18). A conversão é "
          "**fixada nessa data, não é cotação ao vivo** — a página em português "
          "publica em real e a versão em inglês converte por esse valor. Dizemos "
          "isto porque número em moeda estrangeira sem data é número sem sentido: "
          "quem lê daqui a seis meses precisa saber que a régua é de agosto de "
          "2026, e não achar que acompanha o mercado.",
    "en": "**US$ 1 = R$ 5.17**, from the PTAX rate of 19 Aug 2026 (R$ 5.18). The "
          "conversion is **fixed at that date, not a live quote** — the Portuguese "
          "page publishes in reais and the English version converts at that value. "
          "We say so because a figure in foreign currency without a date is a "
          "meaningless figure: whoever reads this in six months needs to know the "
          "rule is from August 2026, and not assume it tracks the market.",
    "fonte": "PTAX/Banco Central, 19/08/2026",
}


def main():
    s = L9.carrega()
    original = s
    alterados = 0

    for eid, (mais_pt, mais_en, numeros) in ACRESCIMOS.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- entrada '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        if mais_pt.strip()[:40] in e.get("pt", ""):
            print("  ja tinha: %s" % eid)
            continue
        novo = dict(e)
        novo["pt"] = e.get("pt", "").rstrip() + mais_pt
        novo["en"] = e.get("en", "").rstrip() + mais_en
        for k in set(list(e.keys()) + list(novo.keys())):
            if k not in ("pt", "en") and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)
        if len(novo["pt"]) <= len(e.get("pt", "")) or len(novo["en"]) <= len(e.get("en", "")):
            print("ABORTADO -- '%s' nao cresceu nos dois idiomas" % eid)
            sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        alterados += 1
        print("  enriquecida: %-22s %d numeros" % (eid, len(numeros)))

    # ---- entrada nova ----
    if ('"id":"%s"' % NOVA["id"]) in s:
        print("  ja existe: %s" % NOVA["id"])
    else:
        # TRAVA: nenhum gatilho novo pode repetir uma pergunta ja cadastrada.
        # Pergunta duplicada e como as duas entradas que respondiam a mesma
        # coisa e tiveram de ser fundidas em 28/08.
        for p in NOVA["perguntas"]:
            if ('"%s"' % p) in s:
                print("ABORTADO -- a pergunta '%s' ja existe noutra entrada" % p)
                sys.exit(1)
        ancora = L9.entrada(s, "metodo-tam")
        if ancora is None:
            print("ABORTADO -- nao achei onde inserir")
            sys.exit(1)
        s = (s[:ancora[1]] + ","
             + json.dumps(NOVA, ensure_ascii=False, separators=(",", ":"))
             + s[ancora[1]:])
        alterados += 1
        print("  ENTRADA NOVA: %s (o cambio nao tinha dono na base)" % NOVA["id"])

    if not alterados:
        print("nada mudou.")
        return

    faltando = []
    for eid, (_, _, numeros) in ACRESCIMOS.items():
        a = L9.entrada(s, eid)
        if a:
            txt = a[2].get("pt", "") + " " + a[2].get("en", "")
            faltando += ["%s: %s" % (eid, n) for n in numeros if n not in txt]
    if faltando:
        print("ABORTADO -- numeros prometidos que nao entraram: %s" % ", ".join(faltando))
        sys.exit(1)

    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)

    io.open(ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d alteracoes. %d -> %d caracteres." % (alterados, len(original), len(s)))


if __name__ == "__main__":
    main()
