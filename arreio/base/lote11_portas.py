# -*- coding: utf-8 -*-
"""LOTE 11 — as PORTAS para os números que os lotes 9 e 10 puseram na base.

Medido depois do lote 10, com doze perguntas escritas como um visitante as
faria: 9 de 12 chegam ao top 5 (que é o que o modelo lê) e 4 ficam em 1º. Três
não chegam:

    o que rende uma base de 8 mil ............ 8º   (custo-unitario-motor)
    quanto vale um assinante por ano ........ 35º   (modelo-receita-barbergo)
    quantos dias a mais o paciente fica ..... 15º   (dano-e-mortes)

O número ESTÁ na entrada. O que falta é a porta: a camada de busca compara
palavras, e essas perguntas não usam nenhuma das que a entrada tem cadastradas.
É o retrato pequeno do problema grande — a base decora as perguntas que alguém
escreveu, não o assunto. O índice semântico resolveria isto de raiz; enquanto
não existe, cadastrar a porta é o conserto honesto e barato.

Só se acrescenta `perguntas`. Não se toca em `pt`, `en`, `tags` nem `fonte`:
gatilho novo é onde a regra da casa nº 6 costuma ser violada, então quanto
menos superfície, melhor.
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
    "custo-unitario-motor": [
        "o que rende uma base de 8 mil",
        "quantas reunioes por mes o motor entrega",
        "quanto eu recebo por mes",
        "what does an 8k base yield",
    ],
    "modelo-receita-barbergo": [
        "quanto vale um assinante por ano",
        "quanto rende cada assinante",
        "receita por assinante",
        "how much is a subscriber worth",
    ],
    "dano-e-mortes": [
        "quantos dias a mais o paciente fica internado",
        "quanto custa um paciente com dano evitavel",
        "how many extra days does a harmed patient stay",
    ],
    # Acrescentada na SEGUNDA corrida: ao abrir porta nas três de cima, esta
    # pergunta caiu de 5º para 6º e saiu do top 5. Porta nova numa entrada
    # embaralha a ordem das outras — por isso se mede DEPOIS de cada lote, e
    # não só no fim.
    "custo-chegar-comprador": [
        "quanto custa comparado com linkedin ads",
        "quanto custa comparado com anuncio",
        "e mais barato que trafego pago",
        "how does it compare to paid ads",
    ],
}


def main():
    s = L9.carrega()
    original = s
    mexidos = 0

    for eid, novas in PORTAS.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("ABORTADO -- '%s' nao existe" % eid)
            sys.exit(1)
        ini, fim, e = achado
        ja = list(e.get("perguntas", []))

        # TRAVA 1: pergunta que ja existe EM QUALQUER entrada nao entra.
        # Foi pergunta duplicada em duas entradas que obrigou a fusao de
        # para-quem-savi com savi-segmentos em 28/08.
        entram = []
        for p in novas:
            if p in ja:
                continue
            if ('"%s"' % p) in s:
                print("ABORTADO -- a pergunta '%s' ja existe noutra entrada" % p)
                sys.exit(1)
            entram.append(p)
        if not entram:
            print("  ja tinha: %s" % eid)
            continue

        novo = dict(e)
        novo["perguntas"] = ja + entram

        # TRAVA 2: so `perguntas` muda.
        for k in set(list(e.keys()) + list(novo.keys())):
            if k != "perguntas" and e.get(k) != novo.get(k):
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)

        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        mexidos += 1
        print("  +%d portas: %-26s %s" % (len(entram), eid, entram[0]))

    if not mexidos:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)

    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas ganharam porta." % mexidos)


if __name__ == "__main__":
    main()
