# -*- coding: utf-8 -*-
"""LOTE 24 — eco CURTO nas 14 entradas que sobraram frágeis.

O lote 19 levou as frágeis de 47 para 14, mas com frases compridas — e o lote
20 mostrou o preço disso: `"quantas entrevistas o motor gerou"` ecoa o núcleo e
de quebra empurra `motor` e `quantas`, que são de outras entradas. Uma pergunta
da bateria caiu de 1.º para 6.º por causa disso.

Aqui vale a regra corrigida: **núcleo mais o mínimo**. Duas a quatro palavras,
o suficiente para soar como coisa que alguém digita, e nada que pertença a
outra entrada.

As 14, com a taxa de sobrevivência medida:
  ressalva-aberturas 0/4 · barbeiro-carteira-dois-numeros 2/6 · preco-barbergo 3/8
  fundadores-quem 3/7 · entrega-email 3/7 · ressalva-clique 3/8
  metricas-que-nao-usamos 3/8 · por-que-ilpi 4/9 · concorrentes-savi 6/13
  aquisicao-e-canal 5/11 · fosso-savi 5/11 · como-verificar 5/11
  barbergo-conta-nao-fecha 5/11 · epic-sepsis 5/11
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

# ECO CURTO: 2 a 4 palavras. Nada que seja nucleo de outra entrada.
ECO = {
    "ressalva-aberturas":  ["taxa de abertura", "quantos abriram", "aberturas do e-mail",
                            "open rate"],
    "barbeiro-carteira-dois-numeros": ["barbeiro com carteira", "quantos com carteira assinada",
                            "carteira assinada no setor"],
    "preco-barbergo":      ["preco do barbergo", "quanto custa o barbergo",
                            "silver e gold quanto"],
    "fundadores-quem":     ["quem sao os fundadores", "quem fundou", "os dois fundadores"],
    "entrega-email":       ["taxa de entrega", "quantos e-mails entregaram",
                            "entregabilidade"],
    "ressalva-clique":     ["taxa de clique", "cliques no e-mail"],
    "metricas-que-nao-usamos": ["metrica de vaidade", "metricas que recusam"],
    "por-que-ilpi":        ["porque ILPI", "porque lar de idosos", "porque comecar por ILPI"],
    "concorrentes-savi":   ["concorrentes do savi", "quem concorre com o savi"],
    "aquisicao-e-canal":   ["canal de aquisicao", "como adquirem cliente", "qual o CAC"],
    "fosso-savi":          ["fosso do savi", "moat do savi", "o que protege o savi"],
    "como-verificar":      ["posso verificar", "como verifico", "as fontes sao publicas"],
    "barbergo-conta-nao-fecha": ["a conta do barbergo fecha", "LTV e CAC do barbergo",
                            "unit economics do barbergo"],
    "epic-sepsis":         ["epic sepsis", "o caso do epic", "modelo de sepsis"],
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
        print("  +%d ecos curtos: %s" % (len(boas), eid))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d ecos curtos." % (n, novas))


if __name__ == "__main__":
    main()
