# -*- coding: utf-8 -*-
"""LOTE 18 — a porta nova repete o vocabulário, em vez de trazer vocabulário novo.

O ACHADO QUE INVERTE A REGRA
-----------------------------
Medidas as 140 entradas contra o teste de exclusão, procurando o que separa as
54 frágeis das 86 robustas:

                        frágeis(54)   robustas(86)
    fichas distintivas        8            10
      destas, REPETIDAS       0             1     <- a diferença está aqui
      % repetidas            0%           14%
    correlação com sobreviver: 0.39

Não é falta de palavra distintiva — todas as 54 têm, e a mediana (8 contra 10)
quase não separa. É que nas frágeis **cada palavra-chave aparece em exactamente
uma pergunta**, e nas robustas pelo menos uma se repete em duas.

Palavra que mora numa pergunta só é ponto único de falha para aquela frase.
`barbergo-e-healthtech` tem 13 fichas distintivas e 0% de sobrevivência porque
"healthtech" está só na primeira pergunta, "relação" só na segunda, "manter" só
na terceira. Cada pergunta é uma ilha.

Isto inverte o que eu vinha fazendo. Ao "abrir portas" nos lotes 11, 14 e 16 eu
escrevia frases NOVAS com vocabulário NOVO — o que aumenta cobertura e não
aumenta robustez, e ainda paga o preço do adensamento do índice. A porta que
torna a entrada robusta é a que **repete a palavra-núcleo com outra frase**.

E tem uma propriedade boa de lado: repetir vocabulário que a entrada já tem não
introduz concorrência nova com as outras entradas — ao contrário de vocabulário
novo, que pode roubar pergunta de quem já a respondia.
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

# Cada lista REPETE a ficha-núcleo da entrada, noutra frase. Nada de palavra nova.
REPETICOES = {
    "barbergo-e-healthtech": [
        "uma healthtech com app de barbearia faz sentido",
        "por que a healthtech mantem o barbergo",
        "qual e o carro chefe de voces afinal",
        "o carro chefe e o savi ou o barbergo",
    ],
    "frente-candidato-encerrada": [
        "por que a frente do candidato foi encerrada",
        "encerraram mesmo a frente de emprego",
        "o que aconteceu com o produto para candidato",
    ],
    "dois-setores": [
        "o que saude e beleza tem a ver um com o outro",
        "por que esses dois setores e nao outros",
        "os dois setores nao sao distantes demais",
    ],
    "uniao-nao-soma": [
        "voces somam ou fazem uniao dos contatos",
        "a soma das fontes nao bate com o total",
        "tem contato repetido entre as fontes",
    ],
    "ressalva-clique": [
        "qual foi a taxa de clique medida",
        "quantos clicaram de verdade no e-mail",
        "o clique de voces e humano ou robo",
    ],
    "savi-unidade-leito": [
        "por que a unidade de cobranca e o leito",
        "cobrar por leito nao sai caro para a casa",
        "a cobranca por leito conta leito vazio",
    ],
    "capital-proprio": [
        "quanto saiu do bolso de voces",
        "o dinheiro ate agora foi proprio",
        "os fundadores investiram quanto do proprio",
    ],
    "conta-pequena": [
        "por que ninguem atende esse mercado ainda",
        "qual a barreira que deixa isso no papel",
        "por que continua no papel se a dor existe",
    ],
    "custo-de-vendedor": [
        "quanto custa contratar um vendedor",
        "vale a pena contratar SDR em vez do motor",
        "o custo de um vendedor compensa",
    ],
    "porta-de-servico": [
        "por que voces dois e nao outra dupla",
        "o que essa dupla tem de diferencial",
        "qual o diferencial de voces dois",
    ],
    "dois-setores-numeros": [
        "qual o tamanho dos dois setores juntos",
        "saude e beleza somados dao quanto",
        "quantas empresas nos dois setores",
    ],
    # SEGUNDA corrida, e ela prova o custo da propria regra. Ao repetir "custa"
    # em `custo-de-vendedor` ("quanto custa contratar um vendedor", "o custo de
    # um vendedor compensa"), a pergunta mais comum que existe -- "quanto
    # custa", solta -- caiu de 1.º para 6.º, porque `precos-resumo` tinha essa
    # ficha UMA vez só e a rival passou a ter três.
    #
    # Reforçar uma entrada enfraquece as vizinhas que dependem da mesma ficha.
    # Não e' argumento contra a regra: e' a regra a funcionar nos dois sentidos,
    # e o conserto e' o mesmo -- dar redundancia a quem ficou de fora.
    "precos-resumo": [
        "quanto custa o produto de voces",
        "quanto custa para usar",
        "quanto custa por mes",
        "o que custa para comecar",
    ],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = 0
    for eid, entram in REPETICOES.items():
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
        print("  +%d repeticoes: %s" % (len(boas), eid))

    if not n:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas, %d perguntas novas (todas repetindo vocabulario existente)." % (n, novas))


if __name__ == "__main__":
    main()
