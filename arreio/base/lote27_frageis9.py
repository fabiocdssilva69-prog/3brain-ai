# -*- coding: utf-8 -*-
"""LOTE 27 — as 9 entradas ainda frágeis, e as 3 pt-PT fora do 1.º lugar.

Duas delas — `mercado-portugues` e `savi-responsabilidade` — foram escritas por
mim HOJE, e estão frágeis pelo motivo que a regra do lote 18 identificou: dei a
cada uma perguntas com vocabulário diferente entre si, sem eco. O instrumento
apanhou o meu próprio deslize, o que é a melhor prova de que ele mede alguma
coisa real e não o que eu quero ver.

As 9, com a taxa medida:
  savi-responsabilidade 3/7 · entrega-email 4/9 · custo-chegar-comprador 4/10
  ipca-barbearia 4/9 · mercado-portugues 5/12 · aceleradoras-investidor 5/12
  savi-incerteza-leito 5/11 · modelo-receita-barbergo 6/14 · o-que-nao-sabemos 8/17

E as 3 pt-PT, com quem lhes rouba o topo:
  "o savi serve para ERPI" .............. perde para `o-que-e-savi`
  "ha lista de espera nos lares" ........ perde para `devolucao-autopsia`
  "os enfermeiros portugueses usam isto"  perde para `tam-que-nao-usamos`

Eco curto em todas, pela regra do lote 20 — a frase comprida arrasta palavras
de outras entradas e cobra o preço noutro sítio.
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

ECO = {
    # --- as 9 frageis ---
    "savi-responsabilidade":   ["de quem e a responsabilidade", "quem responde por erro",
                                "responsabilidade se errar"],
    "entrega-email":           ["quantos e-mails foram entregues", "a entrega esta boa",
                                "entrega dos e-mails"],
    "custo-chegar-comprador":  ["custo de chegar ao comprador", "quanto custa alcancar um comprador",
                                "chegar ao comprador custa quanto"],
    "ipca-barbearia":          ["o IPCA da barbearia", "a barbearia acompanha a inflacao",
                                "inflacao do setor de barbearia"],
    "mercado-portugues":       ["quantos lares ha em portugal hoje", "os lares portugueses sao quantos",
                                "ha lista de espera nos lares", "lugares nas ERPI portuguesas"],
    "aceleradoras-investidor": ["ja entraram em aceleradora", "que aceleradoras tentaram",
                                "aceleradora ou investidor"],
    "modelo-receita-barbergo": ["como o barbergo gera receita", "de onde vem a receita do barbergo",
                                "o modelo de receita do barbergo"],
    "savi-incerteza-leito":    ["a incerteza do leito", "leito e a unidade certa",
                                "incerteza sobre o leito"],
    "o-que-nao-sabemos":       ["o que voces ainda nao sabem", "o que falta saber",
                                "que medidas ainda nao tem"],
    # --- as 3 pt-PT ---
    "savi-segmentos":          ["o savi serve para ERPI mesmo", "serve ERPI e lar",
                                "ERPI entra no publico alvo"],
    "quem-usa-savi":           ["os enfermeiros usam isto", "enfermeiros portugueses ja usam",
                                "quem usa isto no terreno"],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0
    for eid, entram in ECO.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("  (nao existe): %s" % eid); continue
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = [p for p in entram if p not in ja and ('"%s"' % p) not in s]
        if not boas:
            print("  ja tinha: %s" % eid); continue
        novo = dict(e)
        novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k)); sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1; novas += len(boas)
        print("  +%d: %s" % (len(boas), eid))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d ecos." % (n, novas))


if __name__ == "__main__":
    main()
