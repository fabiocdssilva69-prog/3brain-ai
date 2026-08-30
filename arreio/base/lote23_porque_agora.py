# -*- coding: utf-8 -*-
"""LOTE 23 — "por que agora?" passa a responder pelos TRES produtos.

Ia escrever entrada nova e a trava barrou: `demografia-ilpi` ja tem as
perguntas "por que agora" e "why now" cadastradas. E ainda bem -- entrada nova
para pergunta que ja tem dono e exactamente a regra da casa n.o 6, e foi o que
obrigou a fundir `para-quem-savi` com `savi-segmentos` em 28/08.

Mas a resposta dela cobre UM produto: a demografia do SAVI. Quem pergunta "por
que agora" a uma empresa de tres produtos quer os tres. Entao o conserto e
enriquecer, nao duplicar -- e o que muda em cada um NAO e "a IA melhorou":

  SAVI ..... a demanda descolou do crescimento populacional (ja la estava)
  BarberGO . o preco do setor sobe acima da inflacao ha dois anos seguidos
  HuntAI ... o custo de operar o canal caiu para perto de zero
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

MAIS_PT = (
    " E nos outros dois o que mudou tambem nao foi a tecnologia. **No BarberGO, o preco "
    "do setor passou a subir acima da inflacao dois anos seguidos** — cabeleireiro e "
    "barbeiro **+36,0%** entre 2022 e 2025 contra **20,97%** do IPCA cheio. Quem repassa "
    "preco acima da inflacao por dois anos tem margem para pagar mensalidade, e antes "
    "nao tinha. **No HuntAI, o custo de operar o canal caiu para perto de zero**: "
    "alcancar um comprador custa **R$ 0,008**, e o motor inteiro roda com tres "
    "assinaturas, nenhuma acima de R$ 98/mes. Em 2019 a mesma operacao exigia equipa. "
    "**E em Portugal o relogio ja bateu**: 73 idosos dependentes por 100 em idade activa "
    "contra 39 no Brasil, com a rede de lares a 92,9% de utilizacao."
)
MAIS_EN = (
    " And in the other two, what changed was not the technology either. **For BarberGO, "
    "sector prices have risen above inflation two years running** — hairdressing and "
    "barbering **+36.0%** between 2022 and 2025 against **20.97%** headline inflation. A "
    "trade that passes on above-inflation prices for two years has room to pay a "
    "subscription; before, it did not. **For HuntAI, the cost of running the channel fell "
    "to near zero**: reaching one buyer costs **R$ 0.008**, and the whole engine runs on "
    "three subscriptions, none above R$ 98/month. In 2019 the same operation needed a "
    "team. **And in Portugal the clock has already struck**: 73 dependent older people "
    "per 100 of working age against 39 in Brazil, with care homes at 92.9% occupancy."
)
PORTAS = ["por que 2026 e nao 2019", "o que mudou para dar certo agora",
          "why 2026 and not 2019", "what changed to make this possible now"]
CONFERE = ["36,0%", "20,97%", "0,008", "73", "92,9%"]


def main():
    s = L9.carrega()
    original = s
    achado = L9.entrada(s, "demografia-ilpi")
    if achado is None:
        print("ABORTADO -- demografia-ilpi nao existe"); sys.exit(1)
    ini, fim, e = achado
    if "BarberGO, o preco do setor" in e.get("pt", ""):
        print("ja aplicado."); return
    novo = dict(e)
    novo["pt"] = e.get("pt", "").rstrip() + MAIS_PT
    novo["en"] = e.get("en", "").rstrip() + MAIS_EN
    boas = [p for p in PORTAS if p not in novo["perguntas"] and ('"%s"' % p) not in s]
    novo["perguntas"] = list(e.get("perguntas", [])) + boas
    for k in ("id", "tags", "secao"):
        if e.get(k) != novo.get(k):
            print("ABORTADO -- mexeu em %s" % k); sys.exit(1)
    if len(novo["pt"]) <= len(e.get("pt", "")) or len(novo["en"]) <= len(e.get("en", "")):
        print("ABORTADO -- nao cresceu nos dois idiomas"); sys.exit(1)
    s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
    a = L9.entrada(s, "demografia-ilpi")
    txt = a[2]["pt"] + " " + a[2]["en"]
    falta = [c for c in CONFERE if c not in txt]
    if falta:
        print("ABORTADO -- nao entrou: %s" % ", ".join(falta)); sys.exit(1)
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("demografia-ilpi: agora responde pelos tres produtos (+%d portas)" % len(boas))


if __name__ == "__main__":
    main()
