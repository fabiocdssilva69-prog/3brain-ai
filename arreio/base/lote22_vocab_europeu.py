# -*- coding: utf-8 -*-
"""LOTE 22 — o vocabulário europeu, posto nas entradas que já existem.

A base foi escrita em português do BRASIL. Um visitante português escreve
outra coisa, e a busca compara palavras — então metade das entradas certas
fica inalcançável para ele. Medido em 16 perguntas na forma portuguesa:
9/16 no top 5, 5/16 em 1.º lugar.

O par que a base não conhecia, e onde cada um dói:

    utente        (paciente/residente)   -> preço, produto, LGPD
    ERPI / lar    (ILPI)                 -> segmento, mercado
    cama          (leito)                -> unidade de cobrança
    IVA           (imposto)              -> imposto
    facturar      (faturar)              -> receita
    equipa        (equipe)               -> time
    telemóvel     (celular)              -> onde baixar
    aplicação     (aplicativo)           -> onde baixar
    ficheiro      (arquivo)              -> dados
    gerir         (gerenciar)            -> produto
    ecrã          (tela)                 -> produto

Isto é a mesma classe de defeito do "IA": a resposta existe e o caminho até
ela não. E é a mesma correção — porta, não conteúdo novo.

O ECO É CURTO, pela regra do lote 20: núcleo mais o mínimo. Frase comprida
carrega palavras de outras entradas e rouba pergunta de quem já a respondia.
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

VOCAB = {
    "preco-savi": ["quanto custa por utente", "preco por utente", "quanto e por cama"],
    "savi-unidade-leito": ["porque cobram por cama", "a cobranca e por cama", "cama ou utente"],
    "savi-segmentos": ["servem lares", "atendem ERPI", "trabalham com lar de idosos"],
    "lgpd-savi": ["onde ficam os ficheiros", "o ficheiro do utente fica onde",
                  "dados do utente sao sensiveis"],
    "imposto-simples": ["quanto e o IVA", "ha IVA nisto", "e o IVA em portugal"],
    "receita-hoje": ["ja facturam", "quanto facturam", "facturacao de voces"],
    "tamanho-time": ["a equipa e grande", "quantas pessoas na equipa"],
    "onde-publicado": ["a aplicacao esta na loja", "da para instalar no telemovel",
                       "ha aplicacao para telemovel"],
    "concorrentes-savi": ["quem concorre em portugal", "ha concorrente portugues"],
    "o-que-e-savi": ["o savi faz o que ao utente", "como gere o registo do utente"],
    "quem-usa-savi": ["algum lar ja usa", "ha lar a usar"],
    "por-que-portugal": ["porque portugal e nao espanha", "porque comecar por portugal"],
    "precos-resumo": ["quanto e por mes em euros", "o preco e em euros"],
    "camada-preditiva": ["preve a piora do utente", "antecipa risco do utente"],
    "como-entra-o-dado": ["como se regista no ecra", "o registo e feito no telemovel"],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0
    for eid, entram in VOCAB.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("  (nao existe): %s" % eid)
            continue
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))
        boas = [p for p in entram if p not in ja and ('"%s"' % p) not in s]
        if not boas:
            print("  ja tinha: %s" % eid)
            continue
        novo = dict(e)
        novo["perguntas"] = ja + boas
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k)); sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        novas += len(boas)
        print("  +%d pt-PT: %s" % (len(boas), eid))
    if not n:
        print("nada mudou."); return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d portas em portugues europeu." % (n, novas))


if __name__ == "__main__":
    main()
