# -*- coding: utf-8 -*-
"""Lote 5: os fatos que so o Fabio tinha (27/08/2026).

Fecha as duas lacunas que a medicao de ponta a ponta expos e que eu NAO podia
inventar -- perguntado "tem plano gratis", o modelo tinha respondido "todos os
planos sao pagos", afirmacao que nao estava em lugar nenhum da base.

  1. O BarberGO TEM plano gratuito, alem do Silver e do Gold.
  2. BarberGO e so aplicativo HOJE; web esta no plano. O SAVI esta previsto
     para os dois. Plano escrito COMO plano: nesta pagina, roadmap contado como
     produto no ar e o pecado que a diligencia derruba numa pergunta.
  3. Localizacao: mantida (decisao dele).
  4. Os dois e-mails dele entram no canal de contato, a pedido dele.

TODA TROCA MEXE NO pt E NO en. A pagina e bilingue, e o investidor estrangeiro
le o en: deixar um dos dois para tras publica duas versoes da empresa.
"""
import io
import json
import sys

sys.path.insert(0, ".")
from lote4 import ARQ, recorta  # noqa: E402

# (id, campo, trecho velho, trecho novo)
TROCAS = [
    # ---- 1. plano gratuito do BarberGO -------------------------------------
    ("precos-resumo", "pt",
     "O BarberGO tem dois planos pagos no app,",
     "O BarberGO tem plano gratuito e dois planos pagos no app,"),
    ("precos-resumo", "en",
     "BarberGO has two paid tiers in the app,",
     "BarberGO has a free tier and two paid tiers in the app,"),
    ("preco-barbergo", "pt",
     "Hoje o app tem dois planos pagos:",
     "Hoje o app tem um plano gratuito e dois pagos:"),
    ("preco-barbergo", "en",
     "The app currently has two paid tiers:",
     "The app currently has a free tier and two paid ones:"),

    # ---- 2. plataformas ----------------------------------------------------
    ("onde-publicado", "pt",
     "Para efeito de comparação dentro da 3BRAIN: o SAVI, o produto de saúde, "
     "ainda não está em operação comercial.",
     "Para efeito de comparação dentro da 3BRAIN: o SAVI, o produto de saúde, "
     "ainda não está em operação comercial. Sobre plataforma: hoje o BarberGO é "
     "**só aplicativo**, e a versão web está no plano — plano, não produto no ar. "
     "O SAVI está previsto para os dois, aplicativo e web, e também é plano."),
    ("onde-publicado", "en",
     "For comparison inside 3BRAIN: SAVI, the healthcare product, is not in "
     "commercial operation yet.",
     "For comparison inside 3BRAIN: SAVI, the healthcare product, is not in "
     "commercial operation yet. On platforms: BarberGO is **app-only** today, and "
     "the web version is planned — planned, not shipped. SAVI is planned for both, "
     "app and web, and that is a plan too."),
    ("onde-publicado", "fonte",
     "Google Play (com.barbergo.app) e App Store (BarberGO)",
     "Google Play (com.barbergo.app) e App Store (BarberGO); roteiro de produto "
     "declarado pela 3BRAIN, ago/2026"),

    # ---- 4. e-mails --------------------------------------------------------
    ("contato", "pt",
     "a conversa começa no assunto certo.",
     "a conversa começa no assunto certo. Por e-mail, direto com o fundador: "
     "fabiocds.silva69@gmail.com ou fabiocds.silva69brasil@gmail.com."),
    ("contato", "en",
     "the conversation starts on the right subject.",
     "the conversation starts on the right subject. By e-mail, straight to the "
     "founder: fabiocds.silva69@gmail.com or fabiocds.silva69brasil@gmail.com."),
]

GATILHOS = {
    "onde-publicado": ["só tem app", "tem site ou app", "vai ter versão web",
                       "o savi é app ou web"],
    "contato": ["qual o e-mail de vocês", "manda o e-mail"],
}


def main():
    s = io.open(ARQ, encoding="utf8", newline="").read()
    i, j = recorta(s)
    base = json.loads(s[i:j])
    por = {e["id"]: e for e in base["entradas"]}

    for eid, campo, velho, novo in TROCAS:
        e = por[eid]
        atual = e.get(campo, "")
        if novo in atual:
            print("  = %s/%s ja aplicado" % (eid, campo))
            continue
        if velho not in atual:
            print("  X %s/%s: ANCORA NAO ENCONTRADA -- nada trocado" % (eid, campo))
            sys.exit(1)
        e[campo] = atual.replace(velho, novo, 1)
        print("  + %s/%s" % (eid, campo))

    for eid, gs in GATILHOS.items():
        p = por[eid].setdefault("perguntas", [])
        for g in gs:
            if g not in p:
                p.append(g)
        print("  + %s: gatilhos -> %d" % (eid, len(p)))

    io.open(ARQ, "w", encoding="utf8", newline="").write(
        s[:i] + json.dumps(base, ensure_ascii=False, separators=(",", ":")) + s[j:])
    print()
    print("gravado: %d entradas" % len(base["entradas"]))


if __name__ == "__main__":
    main()
