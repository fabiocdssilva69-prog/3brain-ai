# -*- coding: utf-8 -*-
"""Lote 8: funde `para-quem-savi` em `savi-segmentos`.

O rivais.py media 43% de sobreposicao de gatilho entre as duas -- a maior da
base. Nao e ambiguidade de vocabulario, e a MESMA PERGUNTA CADASTRADA DUAS
VEZES: "para quem serve o savi?" esta numa e "para quem e o SAVI" na outra.
Nenhuma busca separa isso, nem lexica nem semantica; e as duas abrem com a
mesma frase e tem as mesmas tres tags. Duas entradas que respondem a mesma
pergunta gastam DUAS das cinco vagas de contexto com o mesmo conteudo.

Por que sobrevive a `savi-segmentos` e nao a outra: o texto dela e a correcao
permanente que o dono ja fez mais de uma vez -- "serve qualquer instituicao de
saude, porque todas precisam registrar; o alvo maior sao hospitais e clinicas
especializadas, e ILPI tambem, como cabeca de ponte e nao como teto". A ILPI
confundida com o mercado principal e o erro que ele corrige desde 21/08.

O que `para-quem-savi` tinha e a outra nao: os numeros do CNES (6.612
hospitais, 92.356 clinicas) -- que JA ESTAO em `mercado-savi`, a entrada que
existe para contar mercado -- e o crescimento comparado. So o crescimento e
unico, e ele e argumento de ALVO, nao de tamanho: e a razao de a clinica
especializada vir antes. Por isso ele muda de entrada em vez de morrer.

Uso:  python lote8_funde_para_quem_savi.py --ver   (nao grava)
      python lote8_funde_para_quem_savi.py
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lote4 import ARQ, recorta  # noqa: E402

MORRE = "para-quem-savi"
FICA = "savi-segmentos"

# O unico fato que so existia na entrada que morre. Entra depois da ordem de
# prioridade, que e onde ele explica alguma coisa.
DEPOIS_DE_PT = "depois ILPI, depois home care."
CRESCIMENTO_PT = (" E a que cresce é a clínica especializada: **119,2% em dez anos**"
                  " contra 8,3% dos hospitais, contado no registro e não projetado.")
DEPOIS_DE_EN = "then care homes, then home care."
CRESCIMENTO_EN = (" And the one that is growing is the specialty clinic: **up 119.2%"
                  " in ten years** against 8.3% for hospitals, counted on the register"
                  " rather than projected.")

FONTE = ("Definição de mercado 3BRAIN, ago/2026; CNES/DATASUS jun/2026"
         " e série dez/2015 a dez/2025")

# Migrar as OITO perguntas custou o 1o lugar de "o que e o savi", que passou a
# devolver savi-segmentos com a definicao em 2o -- medido, e o piso local so
# mostra a primeira, entao com os motores fora o visitante leria a segmentacao
# no lugar da definicao. A causa e a regra 6 da casa: gatilho novo nao pode
# trazer a palavra que ja e nucleo de outra entrada. Cinco das oito NAO trazem
# superficie nova, so repetem em outra forma o que a entrada ja tinha, e cada
# repeticao engorda "savi" e "serve" no indice:
#   "para quem serve o savi?" ~ "para quem e o SAVI"
#   "serve para hospital?"    ~ "vende para hospital" E "savi serve para hospital"
#   "serve pra clinica?"      ~ "savi atende clinica"
#   "who is it for"           ~ "who is SAVI for"
#   "isso e so pra asilo?"    ~ "e so para ILPI" E "so lar de idosos"
# Ficam so as tres que trazem palavra que a entrada nao tinha: cliente, publico
# alvo e compra.
NAO_MIGRA = {
    "para quem serve o savi?",
    "serve para hospital?",
    "serve pra clinica?",
    "who is it for",
    "isso é só pra asilo?",
}


def main():
    ver = "--ver" in sys.argv
    s = io.open(ARQ, encoding="utf8", newline="").read()
    i, j = recorta(s)
    base = json.loads(s[i:j])
    ent = base["entradas"]
    por_id = {e["id"]: e for e in ent}

    if MORRE not in por_id:
        print("nada a fazer: %s ja nao existe" % MORRE)
        return
    morre, fica = por_id[MORRE], por_id[FICA]

    # Trava de ordem: o lote 7 tem de ter passado antes, senao o texto novo
    # entraria acentuado num paragrafo que ainda nao esta.
    if "prioridade é essa" not in fica["pt"]:
        print("ABORTADO -- rode lote7_acentos.py primeiro:"
              " o texto de %s ainda esta sem acento" % FICA)
        sys.exit(1)

    novas = [p for p in morre.get("perguntas", [])
             if p not in fica["perguntas"] and p not in NAO_MIGRA]
    fica["perguntas"] = fica["perguntas"] + novas

    for campo, ancora, trecho in (("pt", DEPOIS_DE_PT, CRESCIMENTO_PT),
                                  ("en", DEPOIS_DE_EN, CRESCIMENTO_EN)):
        if fica[campo].count(ancora) != 1:
            print("ABORTADO -- ancora de %s nao casa uma vez so: %r"
                  % (campo, ancora))
            print("   texto: %s" % fica[campo])
            sys.exit(1)
        if trecho.strip() in fica[campo]:
            continue
        fica[campo] = fica[campo].replace(ancora, ancora + trecho)

    fica["fonte"] = FONTE
    # a entrada que morre levava o visitante a secao do SAVI; isso nao se perde
    fica.setdefault("encaminha", morre.get("encaminha", "ver-secao"))
    fica.setdefault("secao", morre.get("secao", "#savi"))

    ent[:] = [e for e in ent if e["id"] != MORRE]

    print("  - %s removida (%d perguntas migradas)" % (MORRE, len(novas)))
    print("  + %s: %d perguntas, pt com %d chars, en com %d"
          % (FICA, len(fica["perguntas"]), len(fica["pt"]), len(fica["en"])))
    print("")
    print("entradas: %d" % len(ent))
    if ver:
        print("")
        print(fica["pt"])
        print("")
        print("(--ver: nada foi gravado)")
        return
    novo_json = json.dumps(base, ensure_ascii=False, separators=(",", ":"))
    io.open(ARQ, "w", encoding="utf8", newline="").write(s[:i] + novo_json + s[j:])
    print("gravado em %s" % ARQ)


if __name__ == "__main__":
    main()
