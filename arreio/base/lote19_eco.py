# -*- coding: utf-8 -*-
"""LOTE 19 — eco de vocabulário nas 47 entradas frágeis restantes.

Aplicação sistemática da regra provada no lote 18: o que torna uma entrada
robusta não é ter palavra distintiva — todas têm — é essa palavra **aparecer em
mais de uma pergunta**. Ficha que mora numa pergunta só é ponto único de falha
para aquela frase.

O lote 18 tratou 11 entradas à mão e levou-as de 0% a 64% de sobrevivência. Este
trata as 47 que sobraram, e cada lista abaixo foi escrita a partir das **fichas
órfãs medidas** de cada entrada — as distintivas que hoje aparecem uma vez só.
Não é vocabulário novo: é eco do que já lá está.

O que este lote NÃO faz, de propósito: não inventa assunto, não acrescenta
palavra que a entrada não tinha, e não toca em `pt`, `en`, `tags` ou `fonte`.
Vocabulário novo aumenta cobertura e cria concorrência com as vizinhas; eco
aumenta robustez sem criar rival — foi medido no lote 18, quando repetir
"custa" numa entrada derrubou a pergunta "quanto custa" de outra.
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
    "entrevistas-medidas": [
        "quantas entrevistas o motor gerou",
        "o huntai gerou entrevista de verdade",
        "how many interviews did it generate",
    ],
    "estagio-produtos": [
        "qual deles esta em producao hoje",
        "algum ja esta vendendo de verdade",
        "which product is live and which is not",
    ],
    "guardamos-a-pergunta": [
        "voces guardam o que eu escrevo aqui",
        "as perguntas ficam guardadas",
        "do you keep the questions people ask",
    ],
    "o-que-nao-funciona": [
        "qual a parte mais fraca de voces",
        "o que e mais fraco no negocio",
        "what is the weakest part of this",
    ],
    "ressalvas-publicas": [
        "voces publicam as proprias ressalvas",
        "que ressalvas voces mostram na pagina",
        "which caveats do you publish yourselves",
    ],
    "condicoes-venture": [
        "o que mudaria esse veredito",
        "o que faria isso virar caso de venture",
        "what would change the verdict",
    ],
    "barbergo-quem-paga": [
        "quem paga, o barbeiro ou o estabelecimento",
        "o estabelecimento e que paga a conta",
        "which side pays, barber or shop",
    ],
    "ipca-barbearia": [
        "a barbearia consegue repassar preco",
        "o setor repassa a inflacao ao cliente",
        "can barbershops pass on price increases",
    ],
    "squire-custo-por-loja": [
        "quanto a squire gastou por loja conquistada",
        "quanto capital a squire queimou",
        "how much did squire burn per shop",
    ],
    "demografia-ilpi": [
        "quantos idosos moram em ILPI no brasil",
        "isso cresce com o envelhecimento",
        "how many elderly live in care homes",
    ],
    "tempo-juntos": [
        "ha quanto tempo voces trabalham juntos",
        "quando voces viraram socios",
        "how long have the two of you worked together",
    ],
    "portao-envio": [
        "voces estao enviando agora",
        "o envio esta ativo neste momento",
        "are you sending right now",
    ],
    "fosso-barbergo": [
        "qual a defensabilidade do barbergo",
        "existe efeito de rede no barbergo",
        "what stops someone copying barbergo",
    ],
    "precos-concorrentes-savi": [
        "quanto o concorrente cobra hoje",
        "o que os concorrentes cobram por leito",
        "what do the competitors charge today",
    ],
    "usuarios-barbergo": [
        "quantos usuarios cadastrados voces tem",
        "quantos barbeiros estao cadastrados",
        "how many registered users are there",
    ],
    "mercado-outbound": [
        "quem compraria essa capacidade",
        "existe mercado para prospeccao no brasil",
        "who would buy this prospecting capability",
    ],
    "comparaveis-sem-capital": [
        "tem empresa parecida que cresceu sem capital",
        "quais os comparaveis de voces",
        "any comparable that grew without funding",
    ],
    "mercado-savi": [
        "quantos hospitais sao clientes possiveis",
        "qual o mercado enderecavel do savi",
        "what is the SAM and the SOM",
    ],
    "riscos-do-canal": [
        "quais sao os riscos desse canal",
        "e se bloquearem o canal de voces",
        "what are the risks of the channel",
    ],
    "problema-barbergo": [
        "que problema o barbergo resolve mesmo",
        "quem pagaria para resolver esse problema",
        "what problem does barbergo actually solve",
    ],
    "concorrentes-barbergo": [
        "quem sao os concorrentes do barbergo",
        "com quem voces competem no setor de beleza",
        "who are your competitors in beauty",
    ],
    "prova-do-canal": [
        "o canal entregou alguma coisa de verdade",
        "qual a prova real do canal",
        "what did the channel actually deliver",
    ],
    "quem-escreve-codigo": [
        "quem escreve o codigo de voces",
        "voces terceirizam o desenvolvimento",
        "who writes the code, is it outsourced",
    ],
    "motor-numeros": [
        "que numeros o motor ja fez",
        "quais os numeros do motor",
        "what numbers has the engine produced",
    ],
    "entrevistas-portugal": [
        "por que portugal deu melhor resultado",
        "portugal e o melhor pais para isso",
        "why did portugal give better results",
    ],
    "tam-que-nao-usamos": [
        "por que voces nao usam o TAM de bilhoes",
        "e o mercado de 200 bilhoes",
        "why not use the euromonitor number",
    ],
    "cadastro-ilpi-nao-existe": [
        "existe cadastro das ILPI privadas",
        "como voces acham as casas privadas",
        "is there a registry of private care homes",
    ],
    "fosso-savi": [
        "qual a vantagem competitiva do savi",
        "o que impede copiarem o savi",
        "what is savi's competitive advantage",
    ],
    "ancora-into": [
        "qual a ancora de preco de voces",
        "que precedente do governo voces usam",
        "what price anchor do you use",
    ],
    "dois-setores-numeros": [
        "os dois setores somados dao quanto",
        "quantas empresas nos dois somados",
        "how many businesses in both sectors",
    ],
    "multiplo-de-saida": [
        "por qual multiplo voces sairiam",
        "como o mercado avalia empresa assim",
        "what exit multiple would apply",
    ],
    "epic-sepsis": [
        "o que aconteceu com o epic sepsis",
        "por que voces nao prometem predicao",
        "why do you not promise prediction",
    ],
    "capacidade-de-pagamento": [
        "o barbeiro tem capacidade de pagamento",
        "esse cliente nao e pobre demais",
        "can this customer afford software",
    ],
    "preco-huntai": [
        "quanto voces cobrariam pelo huntai",
        "qual o preco do huntai",
        "what would you charge for huntai",
    ],
    "devolucao-autopsia": [
        "por que a taxa de devolucao subiu",
        "o que causou as devolucoes",
        "what caused the bounces",
    ],
    "whatsapp-porta": [
        "por que o whatsapp e a porta",
        "o comprador atende por onde",
        "why is whatsapp the door",
    ],
    "o-que-a-3brain-faz": [
        "o que a 3brain faz afinal",
        "qual e o negocio de voces",
        "what does 3brain actually do",
    ],
    "cambio-usado": [
        "que cambio voces usaram",
        "como converteram os valores para dolar",
        "which exchange rate did you apply",
    ],
    "break-even": [
        "qual o ponto de equilibrio de voces",
        "quantos clientes para ficar no azul",
        "what is your break even point",
    ],
    "candidaturas-conversao": [
        "quantas candidaturas deram certo",
        "qual a taxa de sucesso das tentativas",
        "what is the application success rate",
    ],
    "alcance-vs-comprador": [
        "alcance e comprador sao a mesma coisa",
        "quantas empresas podem comprar de verdade",
        "reach versus buyer, what is the difference",
    ],
    "preco-barbergo-plano": [
        "o preco do barbergo vai aumentar",
        "tem reajuste vindo",
        "is a price increase coming",
    ],
    "ia-no-barbergo": [
        "qual o papel da inteligencia artificial no app",
        "a ia ali e so um chatzinho",
        "what is the role of AI in the app",
    ],
    "aquisicao-e-canal": [
        "como voces adquirem cliente",
        "vao fazer trafego pago",
        "how do you acquire customers",
    ],
    "onde-ficamos": [
        "em que cidade voces ficam",
        "voces tem escritorio",
        "which city are you based in",
    ],
    "quanto-economiza": [
        "quanto isso economiza de verdade",
        "tem evidencia publicada da economia",
        "how much does it actually save",
    ],
    "concorrentes-savi": [
        "quem ja faz vigilancia clinica",
        "e o robo laura",
        "who else does clinical surveillance",
    ],
    "mercado-barbergo": [
        "quantas barbearias existem no brasil",
        "qual o tamanho do mercado de barbearia",
        "how many barbershops are there",
    ],
}


def main():
    s = L9.carrega()
    original = s
    n = novas = pulos = 0
    for eid, entram in ECO.items():
        achado = L9.entrada(s, eid)
        if achado is None:
            print("  (nao existe, pulado): %s" % eid)
            pulos += 1
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
                print("ABORTADO -- '%s' mexeu em '%s'" % (eid, k))
                sys.exit(1)
        s = s[:ini] + json.dumps(novo, ensure_ascii=False, separators=(",", ":")) + s[fim:]
        n += 1
        novas += len(boas)
    if not n:
        print("nada mudou.")
        return
    if original.count("{") - original.count("}") != s.count("{") - s.count("}"):
        print("ABORTADO -- desequilibrio de chaves")
        sys.exit(1)
    io.open(L9.ARQ, "w", encoding="utf8", newline="").write(s)
    print("")
    print("%d entradas com eco, %d perguntas novas, %d puladas." % (n, novas, pulos))


if __name__ == "__main__":
    main()
