# -*- coding: utf-8 -*-
"""Confere a base do assistente. Roda local, de graca, e e o unico jeito de saber
que a base nao regrediu: contradicao entre entradas e pior que entrada faltando,
porque o modelo escolhe uma das duas e ninguem ve qual."""
import json
import re
import sys
import unicodedata

ARQ = r"c:\workspaces\fabiocdssilva69-prog\3brain-ai\assistente.js"

# numeros que NAO podem voltar a aparecer, com o motivo
PROIBIDOS = {
    "8.615": "candidaturas desatualizado (era so o lote de SC); o certo e 12.368",
    "277.645": "e-mails do CNES contados em duplicata; o certo e 275.919",
    "66.400": "tamanho de base antigo; o certo e 2.126.099",
    "66.431": "tamanho de base antigo; o certo e 2.126.099",
    "12 plataformas": "a tabela de candidaturas lista ~18 canais; usar 58 adaptadores",
    "69 de cada 100": "razao que nao fecha; 275.919/518.604 = 53 de cada 100",
    "5,4% de clique": "assinatura de varredor de seguranca, nao interesse humano",
    "sem uma reclamacao": "nao e exato; foram 2 reclamacoes, 0,008%",
}


def achata(t):
    """Tira acento. A regex de ressalva foi escrita SEM acento e o corpus TEM
       acento: sem achatar, "Nao ha cliente" nunca casa com "Nao ha cliente"
       escrito de verdade. Achatar aqui, e nao mexer no texto da base, porque
       arrumar o termometro nao e o mesmo que arrumar a febre."""
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def carrega(caminho):
    s = open(caminho, encoding="utf8").read()
    pre = "window.BASE_3BRAIN = "
    i = s.index(pre) + len(pre)
    prof = 0
    esc = False
    instr = False
    j = i
    aspa = chr(34)
    barra = chr(92)
    while j < len(s):
        c = s[j]
        if instr:
            if esc:
                esc = False
            elif c == barra:
                esc = True
            elif c == aspa:
                instr = False
        else:
            if c == aspa:
                instr = True
            elif c == "{":
                prof += 1
            elif c == "}":
                prof -= 1
                if prof == 0:
                    j += 1
                    break
        j += 1
    return json.loads(s[i:j])


def main():
    base = carrega(ARQ)
    ent = base["entradas"]
    erros = []
    avisos = []

    ids = [e["id"] for e in ent]
    rep = sorted({i for i in ids if ids.count(i) > 1})
    if rep:
        erros.append("id repetido: " + ", ".join(rep))

    for e in ent:
        for campo in ("id", "pt", "en", "fonte", "perguntas"):
            if not e.get(campo):
                erros.append("%s: sem %s" % (e.get("id", "?"), campo))
        if e.get("secao") and not str(e["secao"]).startswith("#"):
            avisos.append("%s: secao sem # (%s)" % (e["id"], e["secao"]))

    # gatilhos repetidos entre entradas confundem a busca: duas entradas competem
    vistos = {}
    for e in ent:
        for p in e.get("perguntas", []):
            k = re.sub(r"[^a-z0-9 ]", "", p.lower()).strip()
            if k in vistos and vistos[k] != e["id"]:
                avisos.append("gatilho %r em %s e %s" % (p, vistos[k], e["id"]))
            vistos[k] = e["id"]

    # EXCECAO PERMANENTE: entrada de ressalva CITA o numero errado de proposito,
    # para dizer que ele nao vale. Proibir ali seria proibir a propria correcao --
    # e falso positivo confirmado vira excecao, do mesmo jeito que bug vira regra.
    DECLARA_CORRECAO = {("8.615", "candidaturas-conversao"),
                        ("5,4% de clique", "ressalva-clique")}
    for termo, motivo in PROIBIDOS.items():
        quem = [e["id"] for e in ent
                if termo in e.get("pt", "") + e.get("en", "")
                and (termo, e["id"]) not in DECLARA_CORRECAO]
        if quem:
            erros.append("numero proibido %r em %s -- %s" % (termo, quem, motivo))

    # PADRAO PERMANENTE, de bug real (25/08/2026): numero HIPOTETICO escrito com
    # cara de fato realizado. A entrada dizia "527 barbearias pagantes" - que e
    # quantas SERIAM PRECISAS para bancar tres pessoas - e o modelo respondeu
    # "o BarberGO tem 527 barbearias pagantes". Instrucao nenhuma vence texto
    # que ja diz o que nao devia: a ressalva tem de estar GRUDADA no numero,
    # porque o modelo cita so a primeira oracao.
    FATO = re.compile(r"(?i)\b\d[\d.,]*\s*(?:mil|milh(?:ao|oes))?\s*"
                      r"(?:clientes?|assinantes?|usuarios?|pagantes?|"
                      r"barbearias? pagantes?|contratos? assinados?)")
    HIPOT = re.compile(r"(?i)(seriam? preciso|seria necessari|para chegar|para bancar|"
                       r"meta|cenario|projec|modelad|hipotet|plano|nao ha cliente|"
                       r"ainda nao|RevenueCat|HeyReach)")
    for e in ent:
        for lang in ("pt", "en"):
            t = e.get(lang, "")
            for m in FATO.finditer(achata(t)):
                janela = achata(t[max(0, m.start() - 120):m.end() + 60])
                if not HIPOT.search(janela):
                    avisos.append("%s/%s: %r sem marcador de hipotese perto"
                                  % (e["id"], lang, m.group(0).strip()))

    # PADRAO PERMANENTE (bug real, 27/08/2026): gatilho de uma entrada CONTIDO
    # no gatilho de outra. busca() tem um atalho de "uma frase contem a outra";
    # com dois casamentos ele devolvia o PRIMEIRO da ordem do arquivo, e a ordem
    # do arquivo passava a decidir conteudo -- "qual o maior risco", um dos seis
    # botoes de sugestao, caia em "qual o maior risco desse canal" (HuntAI) em
    # vez de "qual o maior risco do negocio". O atalho ja foi consertado para se
    # calar quando ha empate; isto aqui e para VER os empates enquanto existem.
    curtos = []
    for e in ent:
        for q in e.get("perguntas", []):
            k = achata(re.sub(r"[^a-z0-9 ]", "", q.lower())).strip()
            if len(k) >= 16:
                curtos.append((k, e["id"]))
    for k1, id1 in curtos:
        for k2, id2 in curtos:
            if id1 != id2 and k1 != k2 and k2.startswith(k1):
                avisos.append("gatilho %r (%s) cabe dentro de %r (%s): o atalho "
                              "de frase fica ambiguo" % (k1, id1, k2, id2))

    # PADRAO PERMANENTE (bug real, 27/08/2026): caractere de controle CRU no
    # fonte. Em assistente.js tres regexes sociais terminavam com o byte 0x08
    # em vez de , e as tres estavam mortas -- "oi" respondia "nao tenho essa
    # resposta". Nao da para ver lendo: o repr do JS mostra  para 0x08 igual.
    # Por isso a trava olha os BYTES do arquivo inteiro, nao a base.
    bruto = open(ARQ, encoding="utf8").read()
    for cod in (8, 11, 12, 0, 27):
        if chr(cod) in bruto:
            linhas = [i + 1 for i, l in enumerate(bruto.split(chr(10))) if chr(cod) in l]
            erros.append("caractere de controle 0x%02X cru no fonte, linhas %s "
                         "-- quase sempre um escape colapsado por ferramenta" % (cod, linhas))

    print("entradas: %d" % len(ent))
    print("com fonte: %d | com EN: %d" % (sum(1 for e in ent if e.get("fonte")),
                                          sum(1 for e in ent if e.get("en"))))
    print("gatilhos totais: %d" % sum(len(e.get("perguntas", [])) for e in ent))
    secs = {}
    for e in ent:
        secs[e.get("secao", "(sem)")] = secs.get(e.get("secao", "(sem)"), 0) + 1
    print("por secao: %s" % secs)
    print()
    if avisos:
        print("AVISOS (%d):" % len(avisos))
        for a in avisos[:12]:
            print("  - " + a)
    if erros:
        print("ERROS (%d):" % len(erros))
        for x in erros:
            print("  X " + x)
        sys.exit(1)
    print("OK: nenhuma regressao encontrada.")


if __name__ == "__main__":
    main()
