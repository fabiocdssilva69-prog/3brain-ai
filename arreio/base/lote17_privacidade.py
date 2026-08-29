# -*- coding: utf-8 -*-
"""LOTE 17 — o assistente passa a saber responder sobre a própria coleta.

Desde 29/08/2026 o chat guarda a pergunta feita, para a base crescer pelas
palavras de quem pergunta em vez das nossas. Pôs-se a linha no rodapé; falta a
outra metade, que é o assistente saber responder quando alguém perguntar
directamente — e quem se importa com isso pergunta ao chat antes de procurar
no rodapé.

A resposta diz as duas coisas que importam, nesta ordem: **o que se guarda** e
**o que não se guarda**. Aviso de privacidade que só diz "guardamos algumas
informações" não informa ninguém — o que tranquiliza é a lista do que ficou de
fora, porque é ela que prova que houve uma decisão em vez de um descuido.
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

NOVA = {
    "id": "guardamos-a-pergunta",
    "secao": "#contato",
    "tags": ["metodo", "honestidade", "juridico"],
    "perguntas": [
        "voces guardam minhas perguntas",
        "essa conversa fica gravada",
        "o que voces fazem com o que eu escrevo aqui",
        "voces coletam dados de quem usa o chat",
        "isso e privado",
        "do you store my questions",
        "is this conversation recorded",
        "what do you do with what i type here",
    ],
    "pt": "**Guardamos a pergunta, e só ela.** Fica registado o que foi perguntado, em "
          "que idioma, qual motor respondeu e se o assistente soube responder — porque é "
          "assim que a base melhora pelas palavras de quem pergunta, e não pelas nossas. "
          "**Não guardamos IP, navegador, sessão, referência nem qualquer coisa que "
          "identifique quem perguntou**, e a pergunta é cortada em 400 caracteres. A lista "
          "do que fica de fora é mais importante que a do que fica dentro: é ela que "
          "mostra que houve uma decisão, e não um descuido. Se preferir falar sem registo "
          "nenhum, o contacto directo com o fundador está nesta página.",
    "en": "**We store the question, and only that.** What was asked, in which language, "
          "which engine answered and whether the assistant knew the answer — because that "
          "is how the knowledge base improves through the words of the people asking "
          "rather than our own. **We do not store IP, browser, session, referrer or "
          "anything that identifies who asked**, and the question is truncated at 400 "
          "characters. The list of what is left out matters more than the list of what is "
          "kept: it is the one that shows a decision was made rather than an oversight. If "
          "you would rather talk with no record at all, direct contact with the founder is "
          "on this page.",
    "fonte": "Decisão de produto 3BRAIN, 29/08/2026",
    "encaminha": "nao",
}


def main():
    s = L9.carrega()
    original = s
    if ('"id":"%s"' % NOVA["id"]) in s:
        print("ja existe."); return
    for p in NOVA["perguntas"]:
        if ('"%s"' % p) in s:
            print("ABORTADO -- a pergunta '%s' ja existe noutra entrada" % p)
            sys.exit(1)
    ancora = L9.entrada(s, "contato") or L9.entrada(s, "lgpd-savi")
    if ancora is None:
        print("ABORTADO -- nao achei ancora"); sys.exit(1)
    s = (s[:ancora[1]] + ","
         + json.dumps(NOVA, ensure_ascii=False, separators=(",", ":"))
         + s[ancora[1]:])
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves"); sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("entrada nova: %s" % NOVA["id"])


if __name__ == "__main__":
    main()
