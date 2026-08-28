# -*- coding: utf-8 -*-
"""Lote 4: fecha a LACUNA DE VOCABULARIO.

Medido em 27/08/2026 sobre 36 perguntas de visitante comum: em 8 delas a entrada
certa NAO PONTUAVA NEM UMA VEZ. A causa nao e o reordenador nem a peneira -- e
que a base foi escrita com as NOSSAS palavras (LGPD, verificar, publicado,
precificacao) e o visitante usa as DELE (seguro, confiar, iphone, caro).

Palavra que nao existe no indice tem pontuacao zero em toda a base: nenhuma
reordenacao posterior resgata o que a busca nunca ofereceu.

Um gatilho novo NAO pode ser generico: palavra comum espalha peso pelo indice e
rouba pergunta de outra entrada (regressao medida em 25/08 com "ja estao
vendendo"). Por isso as 53 do arreio rodam depois deste script -- e se cairem,
o gatilho culpado sai.
"""
import io
import json

ARQ = r"c:\workspaces\fabiocdssilva69-prog\3brain-ai\assistente.js"
PRE = "window.BASE_3BRAIN = "

# id -> gatilhos a acrescentar. So palavra que o visitante usa e a base nao tinha.
GATILHOS = {
    "onde-publicado": [
        "funciona no iphone", "funciona no android", "tem para ios",
        "preciso instalar alguma coisa", "precisa instalar",
        "tem versão web", "roda no navegador", "é aplicativo ou site",
    ],
    "precos-resumo": [
        "é caro", "está caro", "é barato", "sai caro",
        "tem plano grátis", "tem versão grátis",
    ],
    "lgpd-savi": [
        "é seguro", "isso é seguro", "meus dados estão seguros",
        "que segurança vocês têm", "é seguro usar",
    ],
    "como-verificar": [
        "por que eu deveria confiar", "posso confiar em vocês",
        "como sei que isso é verdade", "dá pra confiar", "por que confiar",
    ],
    "contato": [
        "qual o email de contato", "vocês têm email", "tem whatsapp",
        "qual o telefone", "como entro em contato",
    ],
    "rodada": [
        "posso investir em vocês", "quero investir",
        "como faço para investir", "aceitam investimento",
    ],
    "tamanho-time": [
        "quantas pessoas trabalham aí", "vocês estão contratando",
        "quantos vocês são",
    ],
    "onde-roda-a-ia": [
        "meus dados ficam onde", "onde ficam os dados",
    ],
}

# Lacuna de corpus de verdade: a base nao tinha ONDE a empresa fica.
NOVA = {
    "id": "onde-ficamos",
    "tags": ["empresa", "localizacao", "contato"],
    "perguntas": [
        "onde vocês ficam?", "de que cidade vocês são?", "onde fica a empresa?",
        "qual a sede de vocês?", "vocês são de onde?", "vocês são brasileiros?",
        "tem escritório?", "where are you based", "vocês atendem presencialmente?",
    ],
    "pt": ("A 3BRAIN é brasileira e opera a partir da Grande Florianópolis, em Santa "
           "Catarina. O CNPJ 66.447.959/0001-88 foi aberto em abril de 2026, sob o regime "
           "Inova Simples. Não há escritório aberto ao público nem time comercial: são "
           "dois fundadores, e a porta de entrada é a conversa de 20 minutos desta "
           "página. O atendimento é remoto."),
    "en": ("3BRAIN is a Brazilian company and operates out of the Greater Florianópolis "
           "area, in Santa Catarina. Company ID (CNPJ) 66.447.959/0001-88 was registered "
           "in April 2026 under the Inova Simples regime. There is no office open to the "
           "public and no sales team: there are two founders, and the way in is the "
           "20-minute conversation on this page. Support is remote."),
    "fonte": "Cadastro CNPJ 66.447.959/0001-88, abril/2026; sede declarada da 3BRAIN",
    "encaminha": "falar-com-fundador",
}


def recorta(s):
    """Acha o JSON da base sem regex: conta chaves fora de string."""
    i = s.index(PRE) + len(PRE)
    prof, esc, instr, j = 0, False, False, i
    while j < len(s):
        c = s[j]
        if instr:
            if esc:
                esc = False
            elif c == chr(92):
                esc = True
            elif c == chr(34):
                instr = False
        else:
            if c == chr(34):
                instr = True
            elif c == "{":
                prof += 1
            elif c == "}":
                prof -= 1
                if prof == 0:
                    j += 1
                    break
        j += 1
    return i, j


def main():
    s = io.open(ARQ, encoding="utf8", newline="").read()
    i, j = recorta(s)
    base = json.loads(s[i:j])
    ent = base["entradas"]
    por_id = {e["id"]: e for e in ent}

    novos = 0
    for eid, gs in GATILHOS.items():
        if eid not in por_id:
            print("  ! id inexistente, pulado: %s" % eid)
            continue
        p = por_id[eid].setdefault("perguntas", [])
        for g in gs:
            if g not in p:
                p.append(g)
                novos += 1
        print("  + %-18s %d gatilhos (total %d)" % (eid, len(gs), len(p)))

    if NOVA["id"] in por_id:
        print("  = entrada %s ja existe, nao duplicada" % NOVA["id"])
    else:
        ent.append(NOVA)
        print("  + entrada NOVA: %s (%d gatilhos)" % (NOVA["id"], len(NOVA["perguntas"])))

    novo_json = json.dumps(base, ensure_ascii=False, separators=(",", ":"))
    io.open(ARQ, "w", encoding="utf8", newline="").write(s[:i] + novo_json + s[j:])
    print()
    print("entradas: %d | gatilhos novos: %d" % (len(ent), novos))


if __name__ == "__main__":
    main()
