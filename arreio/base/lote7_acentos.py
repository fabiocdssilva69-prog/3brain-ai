# -*- coding: utf-8 -*-
"""Lote 7: devolve o ACENTO ao texto que o visitante le.

Medido em 28/08/2026: 56 das 136 entradas tinham o campo `pt` escrito sem
acento -- "nao" 99 vezes, "numero" 21, "so" 17, "ja" 16, "sao" 14, "tres" 12.
Nao e cosmetico e nao e invisivel: assistente.js linha 712 faz
`var txt = forte(e[l] || e.pt)` e mostra a entrada LITERAL na tela sempre que
os motores estao fora -- que foi a tarde inteira de 27/08, com a franquia de
neuronios esgotada. Numa pagina cujo argumento e "medido, nao estimado",
"instituicao de saude" na tela trabalha contra o proprio argumento.

A causa nao foi descuido de escrita: as entradas escritas a mao TEM acento; as
que entraram pelos lote2/lote3 nao tem. Os scripts foram escritos sem acento
para fugir do cp1252 do console, e o texto foi junto no caminho.

A TRAVA: este script so pode mexer em ACENTO. Antes de gravar, compara
sem_acento(antes) com sem_acento(depois) de cada entrada -- se diferirem em um
unico caractere, entao uma palavra, um numero ou uma pontuacao mudou, e o
script aborta sem gravar nada. E invariante, nao caso de teste: cobre as 56
entradas de uma vez, e cobriria 560.

Uso:  python lote7_acentos.py --ver    (mostra o que faria, nao grava)
      python lote7_acentos.py          (grava)
"""
import io
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lote4 import ARQ, recorta  # noqa: E402


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


# ---------------------------------------------------------------- palavras
# Trocadas em QUALQUER entrada, sem olhar o contexto: sao palavras que so
# existem em portugues com acento. Ficaram DE FORA de proposito as ambiguas,
# que dependem do sentido e por isso viajam em CONTEXTO, mais abaixo:
#   publica/publico -> adjetivo leva acento, verbo nao ("quem publica em loja")
#   pratica         -> idem ("a consequencia pratica" x "quem pratica")
#   e / esta / ha / as / ai / le -> conjuncao ou verbo, so o sentido decide
PALAVRAS = {
    "nao": "não", "sao": "são", "voce": "você", "voces": "vocês",
    "saude": "saúde", "instituicao": "instituição",
    "instituicoes": "instituições", "servico": "serviço",
    "servicos": "serviços", "numero": "número", "numeros": "números",
    "codigo": "código", "proprio": "próprio", "propria": "própria",
    "proprios": "próprios", "proprias": "próprias", "tambem": "também",
    "ate": "até", "apos": "após", "alem": "além", "porem": "porém",
    "entao": "então", "mes": "mês", "ja": "já", "so": "só", "tres": "três",
    "clinica": "clínica", "clinicas": "clínicas", "clinico": "clínico",
    "medico": "médico", "medicos": "médicos", "prontuario": "prontuário",
    "usuario": "usuário", "usuarios": "usuários", "negocio": "negócio",
    "negocios": "negócios", "comercio": "comércio", "relatorio": "relatório",
    "obrigatorio": "obrigatório", "automatico": "automático",
    "basico": "básico", "unico": "único", "unica": "única",
    "unicos": "únicos", "unicas": "únicas", "minimo": "mínimo",
    "maximo": "máximo", "padrao": "padrão", "versao": "versão",
    "versoes": "versões", "decisao": "decisão", "decisoes": "decisões",
    "gestao": "gestão", "operacao": "operação", "operacoes": "operações",
    "informacao": "informação", "informacoes": "informações",
    "aplicacao": "aplicação", "integracao": "integração",
    "validacao": "validação", "implantacao": "implantação",
    "penetracao": "penetração", "reputacao": "reputação",
    "analise": "análise", "nivel": "nível", "dificil": "difícil",
    "facil": "fácil", "possivel": "possível", "responsavel": "responsável",
    "disponivel": "disponível", "util": "útil", "dolar": "dólar",
    "contratacao": "contratação", "contratacoes": "contratações",
    "reclamacao": "reclamação", "reclamacoes": "reclamações",
    "uniao": "união", "endereco": "endereço", "enderecos": "endereços",
    "milhao": "milhão", "milhoes": "milhões", "apresentacao": "apresentação",
    "anuncio": "anúncio", "coracao": "coração", "extracao": "extração",
    "extraida": "extraída", "extraido": "extraído",
    "intermediario": "intermediário", "proibem": "proíbem",
    "automacao": "automação", "robo": "robô", "mudanca": "mudança",
    "misterio": "mistério", "formulario": "formulário",
    "generico": "genérico", "medicao": "medição", "familias": "famílias",
    "descricao": "descrição", "sitio": "sítio", "laboratorio": "laboratório",
    "inicio": "início", "metodo": "método", "unitario": "unitário",
    "dominio": "domínio", "comparacao": "comparação", "metrica": "métrica",
    "metricas": "métricas", "devolucao": "devolução",
    "devolucoes": "devoluções", "autopsia": "autópsia",
    "saudavel": "saudável", "suspensao": "suspensão", "antivirus": "antivírus",
    "seguranca": "segurança", "auditavel": "auditável",
    "publicavel": "publicável", "exportacao": "exportação",
    "configuracao": "configuração", "diario": "diário", "grafico": "gráfico",
    "ancora": "âncora", "verificavel": "verificável",
    "licitacao": "licitação", "precos": "preços", "preco": "preço",
    "destroi": "destrói", "vigilancia": "vigilância", "tecnico": "técnico",
    "orcamento": "orçamento", "cabeca": "cabeça", "estrategia": "estratégia",
    "contribuicao": "contribuição", "tecnica": "técnica",
    "raciocinio": "raciocínio", "variavel": "variável",
    "negociacao": "negociação", "permanencia": "permanência", "mao": "mão",
    "economico": "econômico", "pais": "país", "aquisicao": "aquisição",
    "proximo": "próximo", "proxima": "próxima", "proximas": "próximas",
    "construida": "construída", "construido": "construído",
    "impressao": "impressão", "organizacoes": "organizações",
    "prospeccao": "prospecção", "reunioes": "reuniões", "reuniao": "reunião",
    "pagina": "página", "instruido": "instruído", "proposito": "propósito",
    "autenticacao": "autenticação", "documentacao": "documentação",
    "producao": "produção", "emergencia": "emergência",
    "copiavel": "copiável", "fragil": "frágil", "secao": "seção",
    "saida": "saída", "multiplo": "múltiplo", "trajetoria": "trajetória",
    "condicoes": "condições", "especificas": "específicas",
    "convencao": "convenção", "referencia": "referência", "rotulo": "rótulo",
    "criticos": "críticos", "capitulos": "capítulos", "critico": "crítico",
    "conclusao": "conclusão", "diligencia": "diligência",
    "conversao": "conversão", "instalacao": "instalação", "razao": "razão",
    "razoes": "razões", "midia": "mídia", "monetizacao": "monetização",
    "aritmetica": "aritmética", "preferencia": "preferência",
    "cosmetico": "cosmético", "vinculo": "vínculo", "historia": "história",
    "mantem": "mantém", "inflacao": "inflação", "intencao": "intenção",
    "declaracao": "declaração", "captacao": "captação",
    "institucionalizacao": "institucionalização", "populacao": "população",
    "consequencia": "consequência", "alcancar": "alcançar",
    "alcancavel": "alcançável", "predicao": "predição",
    "sanitario": "sanitário", "comercializacao": "comercialização",
    "avaliacao": "avaliação", "licao": "lição", "depreciacao": "depreciação",
    "destinatario": "destinatário", "destinatarios": "destinatários",
    # segunda passagem, 28/08: o censo achou estas depois de a primeira rodar
    "alcancado": "alcançado", "alcancada": "alcançada",
    "previsivel": "previsível", "favoravel": "favorável",
    "distancia": "distância", "excluido": "excluído", "excluida": "excluída",
    "edicao": "edição", "prudencia": "prudência", "portao": "portão",
    "bilhoes": "bilhões", "bilhao": "bilhão", "dao": "dão",
    "confirmacao": "confirmação", "publicos": "públicos",
    "publicas": "públicas", "extraidos": "extraídos",
    "extraidas": "extraídas", "estao": "estão", "conteudo": "conteúdo",
    "criterio": "critério", "criterios": "critérios", "duvidas": "dúvidas",
    "obvio": "óbvio", "possiveis": "possíveis", "niveis": "níveis",
    "areas": "áreas", "area": "área", "media": "média", "medias": "médias",
    # terceira passagem, 28/08: achadas lendo o texto final inteiro, nao por
    # censo -- "ha", "ninguem", "la" e "ai" nao existem em portugues sem acento
    "ha": "há", "ninguem": "ninguém", "diferenca": "diferença",
    "alcanca": "alcança", "la": "lá", "ai": "aí", "rapido": "rápido",
    "comecou": "começou", "comeca": "começa", "comecar": "começar",
    "importancia": "importância", "capitulo": "capítulo",
    "divisao": "divisão", "jose": "josé",
    "consciencia": "consciência", "referencias": "referências",
    "regua": "régua", "ambicao": "ambição", "unicornio": "unicórnio",
    "construcao": "construção", "marcacao": "marcação", "contabil": "contábil",
    "ultimo": "último", "ultima": "última", "comparaveis": "comparáveis",
    "estrangulado": "estrangulado", "atencao": "atenção",
    "projecao": "projeção", "projecoes": "projeções",
    "manutencao": "manutenção", "excecao": "exceção", "excecoes": "exceções",
    "necessario": "necessário", "necessarios": "necessários",
    "necessaria": "necessária", "salario": "salário", "horario": "horário",
    "credito": "crédito", "debito": "débito", "duvida": "dúvida",
    "experiencia": "experiência", "eficiencia": "eficiência",
    "frequencia": "frequência", "sequencia": "sequência",
    "residencia": "residência", "estavel": "estável",
    "sustentavel": "sustentável", "confiavel": "confiável",
}

# ---------------------------------------------------------------- contexto
# Aqui entra o que a lista de palavras NAO pode decidir sozinha, sobretudo
# "e" x "e" (conjuncao x verbo) e "esta" x "esta". Cada troca tem de casar
# EXATAMENTE UMA VEZ na entrada; zero ou duas abortam o script, porque uma
# troca ambigua e pior do que nao trocar.
CONTEXTO = {
    "prova-do-canal": [
        ("E o funil agora esta medido", "E o funil agora está medido"),
        ("sem numero auditavel e o WhatsApp", "sem numero auditavel é o WhatsApp"),
    ],
    "uniao-nao-soma": [
        ("2.126.099, e a uniao", "2.126.099, é a uniao"),
        ("removida. E o tipo de escolha", "removida. É o tipo de escolha"),
    ],
    "vagas-com-email": [
        ("saude**. E o coracao", "saude**. É o coracao"),
        ("e-mails, e esta somado assim", "e-mails, e está somado assim"),
    ],
    "cobertura-plataformas": [
        ("o conserto e de minutos", "o conserto é de minutos"),
        ("Esta e a capacidade", "Esta é a capacidade"),
    ],
    "candidaturas-conversao": [
        ("O que falha nao e misterio", "O que falha nao é misterio"),
        ("Catarina e esta **desatualizado**", "Catarina e está **desatualizado**"),
    ],
    "entrevistas-medidas": [
        ("cortadas a mao", "cortadas à mão"),
        ("2.881 mensagens pre-filtradas", "2.881 mensagens pré-filtradas"),
    ],
    "entrevistas-portugal": [
        ("distintos esta um ou dois abaixo", "distintos está um ou dois abaixo"),
    ],
    "contratacao-imas": [
        ("a caixa e nominal de setor", "a caixa é nominal de setor"),
        # sujeito plural: "os 13 ledgers ... TEM zero"
        ("de plataforma tem **zero**", "de plataforma têm **zero**"),
        ("saiu em 14/08 as 20h55", "saiu em 14/08 às 20h55"),
        ("Nao e provavelmente veio dai: e o endereco",
         "Nao é provavelmente veio daí: é o endereco"),
        ("**E o achado que corrige", "**É o achado que corrige"),
    ],
    "custo-unitario-motor": [
        ("E por isso que a comparacao", "É por isso que a comparacao"),
        ("de vendas nao e apertada: e de outra ordem",
         "de vendas nao é apertada: é de outra ordem"),
    ],
    "entrega-email": [
        ("0,008%**, que e **12 vezes", "0,008%**, que é **12 vezes"),
        ("A reclamacao e a metrica", "A reclamacao é a metrica"),
        ("e-mail, e e justamente a que esta sadia",
         "e-mail, e é justamente a que está sadia"),
        ("**julho e desconhecida**", "**julho é desconhecida**"),
    ],
    "devolucao-autopsia": [
        # "da" e preposicao E verbo; so o contexto decide, entao fica aqui
        ("o que da cerca de 4,0%", "o que dá cerca de 4,0%"),
        ("diz de quem e a culpa", "diz de quem é a culpa"),
        ("**37% e reputacao", "**37% é reputacao"),
        ("11% e caixa cheia", "11% é caixa cheia"),
        ("**52% e caixa morta", "**52% é caixa morta"),
        ("a lista em si esta em ~4%", "a lista em si está em ~4%"),
        ("que e saudavel - o resto e problema de IP",
         "que é saudavel - o resto é problema de IP"),
    ],
    "portao-envio": [
        ("O envio esta **pausado", "O envio está **pausado"),
        ("e a regra e parar antes", "e a regra é parar antes"),
        ("o portao e nosso", "o portao é nosso"),
        ("parar por nos.", "parar por nós."),
    ],
    "ressalva-clique": [
        ("por cento e a assinatura", "por cento é a assinatura"),
        ("hospital e clinica tem isso", "hospital e clinica têm isso"),
    ],
    "ressalva-aberturas": [
        ("e isso e um piso", "e isso é um piso"),
        ("A abertura e medida por pixel", "A abertura é medida por pixel"),
        ("O curioso e que", "O curioso é que"),
        ("a abertura e subcontada", "a abertura é subcontada"),
        ("o clique e superestimado", "o clique é superestimado"),
    ],
    "ressalva-whatsapp": [
        ("portugueses - e e o canal", "portugueses - e é o canal"),
        ("o numero nao e auditavel", "o numero nao é auditavel"),
        ("a da Meta e so Business", "a da Meta é so Business"),
    ],
    "metricas-que-nao-usamos": [
        ("e essa e uma regra escrita", "e essa é uma regra escrita"),
        ("O que entra e o tamanho", "O que entra é o tamanho"),
    ],
    "ancora-into": [
        ("uma ancora publica e verificavel", "uma ancora pública e verificavel"),
        ("por leito esta a 59,6%", "por leito está a 59,6%"),
    ],
    "savi-unidade-leito": [
        ("sem acesso e um turno inteiro", "sem acesso é um turno inteiro"),
    ],
    "savi-segmentos": [
        ("A ordem de prioridade e essa", "A ordem de prioridade é essa"),
        ("38 residentes e a porta de entrada", "38 residentes é a porta de entrada"),
        ("**nao e o mercado principal**", "**nao é o mercado principal**"),
    ],
    "savi-ilpi-nao-paga": [
        ("Por isso ILPI e prova, e hospital e negocio",
         "Por isso ILPI é prova, e hospital é negocio"),
    ],
    "savi-incerteza-leito": [
        ("do modelo nao e tecnica, e **de unidade**",
         "do modelo nao é tecnica, é **de unidade**"),
        ("resposta. E a primeira pergunta", "resposta. É a primeira pergunta"),
    ],
    "savi-modelo-ia": [
        ("O custo de modelo e a **maior despesa", "O custo de modelo é a **maior despesa"),
    ],
    "savi-piloto": [
        ("residentes**, que e onde o produto", "residentes**, que é onde o produto"),
        ("de cliente e o tipo de enfeite", "de cliente é o tipo de enfeite"),
    ],
    "conta-pequena": [
        ("**e por isso que esse mercado", "**é por isso que esse mercado"),
        ("Nao da para sustentar", "Nao dá para sustentar"),
        ("no pais inteiro** tem 20 pessoas", "no pais inteiro** têm 20 pessoas"),
    ],
    "whatsapp-porta": [
        ("anuncio. E a porta que a 3BRAIN", "anuncio. É a porta que a 3BRAIN"),
        ("entao nao e impressao de mercado", "entao nao é impressao de mercado"),
    ],
    "alcance-vs-comprador": [
        ("com comprador e o erro", "com comprador é o erro"),
        ("endereco em registro publico", "endereco em registro público"),
        ("dessas empresas tem 10 ou mais", "dessas empresas têm 10 ou mais"),
    ],
    "custo-de-vendedor": [
        ("comprador alcancado e de", "comprador alcancado é de"),
        ("A comparacao honesta nao e essa", "A comparacao honesta nao é essa"),
        ("nao e no preco por reuniao, e no **volume",
         "nao é no preco por reuniao, é no **volume"),
    ],
    "onde-roda-a-ia": [
        ("A pagina e publica e qualquer um le o codigo",
         "A pagina é pública e qualquer um lê o codigo"),
        ("chave que estiver ali esta a vista", "chave que estiver ali está à vista"),
    ],
    "assistente-como-funciona": [
        ("que e instruido a nao sair", "que é instruido a nao sair"),
        ("delas. E de proposito", "delas. É de proposito"),
    ],
    "stack-tecnica": [
        ("que diz isso esta errada", "que diz isso está errada"),
        ("O BarberGO e **Flutter", "O BarberGO é **Flutter"),
        ("**Nao e React Native**", "**Nao é React Native**"),
        ("A camada de IA e servida", "A camada de IA é servida"),
        ("O motor de aquisicao e Python puro", "O motor de aquisicao é Python puro"),
        ("dos tres e o proprio fundador", "dos tres é o proprio fundador"),
    ],
    "preco-barbergo-plano": [
        ("O preco **publico hoje** e Silver", "O preco **público hoje** é Silver"),
        ("por mes, e e esse que vale", "por mes, e é esse que vale"),
        ("o numero que vale e o de hoje", "o numero que vale é o de hoje"),
        # sujeito plural: "preco anunciado E preco cobrado"
        ("preco cobrado tem de ser", "preco cobrado têm de ser"),
    ],
    "porta-de-servico": [
        ("e essa e a parte que um concorrente", "e essa é a parte que um concorrente"),
    ],
    "risco-copia": [
        ("O codigo e copiavel", "O codigo é copiavel"),
        ("porque o canal e proprio", "porque o canal é proprio"),
        ("contatos de registro publico", "contatos de registro público"),
    ],
    "o-que-nao-funciona": [
        ("o envio de e-mail esta pausado", "o envio de e-mail está pausado"),
        ("ele e canal interno", "ele é canal interno"),
        ("**a entrega de julho e desconhecida**",
         "**a entrega de julho é desconhecida**"),
        ("que e o canal com mais conversa", "que é o canal com mais conversa"),
        ("ponta a ponta e uma contratacao", "ponta a ponta é uma contratacao"),
        ("Nada disso e segredo: esta escrito",
         "Nada disso é segredo: está escrito"),
    ],
    "como-verificar": [
        ("onde a medicao e fragil", "onde a medicao é fragil"),
        # plural: "todos os numeros ... TEM fonte" pede "tem"
        ("da pagina tem **fonte", "da pagina têm **fonte"),
        # adjetivo, ao contrario de "quem publica em loja", que e verbo
        ("sem metodologia publica", "sem metodologia pública"),
    ],
    "dois-setores-numeros": [
        ("ativo do pais** esta num", "ativo do pais** está num"),
    ],
    "multiplo-de-saida": [
        ("**nao e tecnologia: e validacao externa publicada**",
         "**nao é tecnologia: é validacao externa publicada**"),
        ("e a diferenca e de mais de vinte", "e a diferenca é de mais de vinte"),
    ],
    "venture-scale-honesto": [
        ("e **nao e** o caso de um fundo", "e **nao é** o caso de um fundo"),
        ("confundi-las e o que custa", "confundi-las é o que custa"),
        ("nao migra - e **um excelente", "nao migra - é **um excelente"),
        ("faz essa divisao sozinho", "faz essa divisão sozinho"),
    ],
    "condicoes-venture": [
        ("por leito ja e convencao declarada", "por leito ja é convencao declarada"),
        ("Portugal nao e o mercado, e a **prova**",
         "Portugal nao é o mercado, é a **prova**"),
        ("o que ele sustenta e a referencia", "o que ele sustenta é a referencia"),
        ("o que muda o rotulo e validacao externa",
         "o que muda o rotulo é validacao externa"),
        ("muda o veredito e nossa:", "muda o veredito é nossa:"),
        ("o numero grande e conversa", "o numero grande é conversa"),
    ],
    "barbergo-conta-nao-fecha": [
        ("nao fecha - e o numero e nosso", "nao fecha - e o numero é nosso"),
        ("o problema nao e a margem por assinante",
         "o problema nao é a margem por assinante"),
        ("E por isso que a monetizacao", "É por isso que a monetizacao"),
        ("usado e de referencia de mercado", "usado é de referencia de mercado"),
        ("o nosso proprio e a lacuna mais cara",
         "o nosso proprio é a lacuna mais cara"),
    ],
    "barbergo-quem-paga": [
        ("do estabelecimento e cerca de cinco vezes",
         "do estabelecimento é cerca de cinco vezes"),
        ("O lado do consumidor e justamente", "O lado do consumidor é justamente"),
        ("quantas pessoas e preciso convencer", "quantas pessoas é preciso convencer"),
    ],
    "tam-que-nao-usamos": [
        ("e a razao e simples", "e a razao é simples"),
        ("O nosso numero e contado de baixo para cima e e muito menor",
         "O nosso numero é contado de baixo para cima e é muito menor"),
        ("Usa-lo para dimensionar", "Usá-lo para dimensionar"),
    ],
    "barbeiro-carteira-dois-numeros": [
        ("jun/26) - e um **fluxo**", "jun/26) - é um **fluxo**"),
        ("**544** e o **estoque**", "**544** é o **estoque**"),
        ("**210** e o numero de", "**210** é o numero de"),
        # sujeito plural: "768.830 pessoas MANTEM"
        ("pessoas** mantem um MEI", "pessoas** mantêm um MEI"),
    ],
    "ipca-barbearia": [
        ("e isso e mais forte", "e isso é mais forte"),
        ("porque e comportamento medido", "porque é comportamento medido"),
        ("do MEI e de **R$ 6.750 por mes**, e e essa a caixa",
         "do MEI é de **R$ 6.750 por mes**, e é essa a caixa"),
    ],
    "squire-custo-por-loja": [
        ("A Squire e a prova documentada", "A Squire é a prova documentada"),
        ("A leitura que tiramos e que dinheiro", "A leitura que tiramos é que dinheiro"),
        ("que e exatamente o que a nossa conta",
         "que é exatamente o que a nossa conta"),
    ],
    "demografia-ilpi": [
        ("O argumento nao e ha muitos idosos - e que",
         "O argumento nao é há muitos idosos - é que"),
        ("de institucionalizacao e de **0,71%", "de institucionalizacao é de **0,71%"),
        ("**45,6% tem 80 anos", "**45,6% têm 80 anos"),
    ],
    "cadastro-ilpi-nao-existe": [
        ("A ILPI **nao e tipo de estabelecimento", "A ILPI **nao é tipo de estabelecimento"),
        ("levantamento nacional e do IPEA", "levantamento nacional é do IPEA"),
        ("A consequencia pratica e que", "A consequencia prática é que"),
        ("achar o cliente e estruturalmente", "achar o cliente é estruturalmente"),
        ("a lista **e publica**, e e uma das razoes",
         "a lista **é pública**, e é uma das razoes"),
    ],
    "por-que-portugal": [
        ("**Portugal e a prova, nao o mercado**",
         "**Portugal é a prova, nao o mercado**"),
        ("por unidade e 46% maior**", "por unidade é 46% maior**"),
        ("de clientes e publica**", "de clientes é pública**"),
        ("sustenta sozinho e pequeno", "sustenta sozinho é pequeno"),
        ("de verdade e a **referencia", "de verdade é a **referencia"),
        ("por leito ja e convencao", "por leito ja é convencao"),
        ("dimensionados por nos**", "dimensionados por nós**"),
    ],
    "epic-sepsis": [
        # "porque" aqui e substantivo -- "o porquê", com artigo antes
        ("Hoje nos nao prometemos", "Hoje nós nao prometemos"),
        ("explica o porque e de outra empresa", "explica o porquê é de outra empresa"),
        ("O que o SAVI afirma agora e **captura", "O que o SAVI afirma agora é **captura"),
        ("a camada preditiva e etapa planejada", "a camada preditiva é etapa planejada"),
        ("O contraexemplo e o **Epic", "O contraexemplo é o **Epic"),
        ("grita demais e desligado pela equipe, e ai o sistema",
         "grita demais é desligado pela equipe, e aí o sistema"),
    ],
    "base-nao-e-o-ativo": [
        ("**O ativo nao e a base", "**O ativo nao é a base"),
        ("**O ativo e a engenharia", "**O ativo é a engenharia"),
        ("e e a unica coisa do motor", "e é a unica coisa do motor"),
    ],
    "heyreach-precedente": [
        # "marco" e substantivo em 4 outras entradas (marco de validacao) e mes
        # so aqui -- por isso nao entra na lista de palavras
        ("em **marco de 2026", "em **março de 2026"),
        ("e o precedente e recente", "e o precedente é recente"),
        ("A licao que tiramos e a razao", "A licao que tiramos é a razao"),
        ("ser construido como e:", "ser construido como é:"),
        ("**o que sobrevive e canal proprio**", "**o que sobrevive é canal proprio**"),
        ("ali a regra e contrato", "ali a regra é contrato"),
    ],
    "comparaveis-sem-capital": [
        ("Sim, e o detalhe que importa e **como**",
         "Sim, e o detalhe que importa é **como**"),
        ("investimento**. E o mesmo primitivo", "investimento**. É o mesmo primitivo"),
        ("o alvo honesto aqui e uma empresa", "o alvo honesto aqui é uma empresa"),
        ("e essa e a mesma faixa", "e essa é a mesma faixa"),
    ],
    "o-que-nao-sabemos": [
        ("as proprias lacunas e pior que estudo curto",
         "as proprias lacunas é pior que estudo curto"),
        ("o teto de preco e a margem", "o teto de preco é a margem"),
    ],
}

# ------------------------------------------------------------------ fontes
# A fonte tambem vai para a tela: assistente.js linha 713 imprime
# `<div class="as-fonte">` logo abaixo da resposta. Sao 18, curtas, e vao
# escritas por extenso em vez de por lista de palavras porque tem ambiguidade
# ("Preco publico no app" -> publico e adjetivo aqui). A mesma trava vale.
FONTES = {
    "prova-do-canal":
        "Ledgers da operação HuntAI e API do Elastic Email, medidos em 22-23/08/2026",
    "motor-numeros": "Ledgers da operação HuntAI, medidos em 23/08/2026",
    "uniao-nao-soma": "Ledgers da operação HuntAI, medidos em 23/08/2026",
    "vagas-com-email": "Ledgers da operação HuntAI, medidos em 23/08/2026",
    "cobertura-plataformas":
        "Inventário de adaptadores da operação HuntAI, 23/08/2026",
    "candidaturas-conversao": "Ledgers da operação HuntAI, medidos em 23/08/2026",
    "contratacao-imas":
        "Ledgers da operação HuntAI e caixa por IMAP, 23/08/2026",
    "custo-unitario-motor": "Custo próprio medido, ago/2026",
    "devolucao-autopsia":
        "Autópsia de devolução da operação HuntAI, 15/08/2026",
    "portao-envio": "Operação HuntAI e painel do Elastic Email, ago/2026",
    "savi-unidade-leito": "Decisão de preço 3BRAIN, ago/2026",
    "savi-segmentos":
        "Definição de mercado 3BRAIN, ago/2026; CNES/DATASUS jun/2026",
    "alcance-vs-comprador": "IBGE CEMPRE 2024, comércio excluído: +200.274",
    "preco-barbergo-plano":
        "Preço público no app; decisão de preço 3BRAIN, ago/2026",
    "ipca-barbearia":
        "IBGE/IPCA, subitem cabeleireiro e barbeiro, 12 meses até ago/2026; LC 123/2006",
    "squire-custo-por-loja":
        "Contrary Research e imprensa do setor; valores reportados, não auditados",
    "demografia-ilpi": "Censo IBGE 2022; OCDE Health at a Glance; projeção IBGE",
    "base-nao-e-o-ativo":
        "ZoomInfo, resultados e projeção 2026; operação HuntAI",
}

# IGNORECASE porque a primeira versao era sensivel a maiuscula e deixava passar
# justamente o inicio de frase -- "Tres condicoes", "Nao usamos". E com ela vem
# o caso TODO EM CAIXA ALTA, que tem de virar "NAO" -> "NÃO", nao "Não".
RE_PALAVRA = re.compile(r"\b(" + "|".join(sorted(PALAVRAS, key=len, reverse=True))
                        + r")\b", re.IGNORECASE)


def acentua(txt):
    def troca(m):
        p = m.group(0)
        nova = PALAVRAS[p.lower()] if p.lower() in PALAVRAS else None
        if nova is None:
            return p
        if p.isupper() and len(p) > 1:
            return nova.upper()
        if p[0].isupper():
            return nova[0].upper() + nova[1:]
        return nova
    return RE_PALAVRA.sub(troca, txt)


def sem_chave_repetida():
    """Chave repetida num dicionario literal NAO e erro em Python: a ultima
       vence e a primeira some em silencio. Aconteceu aqui em 28/08 -- eu
       acrescentei "risco-copia" uma segunda vez e as duas trocas que ela ja
       tinha desapareceram sem aviso. Como o interpretador nao ve, a trava le
       o proprio codigo-fonte."""
    import ast
    fonte = io.open(os.path.abspath(__file__), encoding="utf8").read()
    for no in ast.walk(ast.parse(fonte)):
        if not isinstance(no, ast.Dict):
            continue
        chaves = [c.value for c in no.keys
                  if isinstance(c, ast.Constant) and isinstance(c.value, str)]
        for c in sorted(set(chaves)):
            if chaves.count(c) > 1:
                print("ABORTADO -- chave repetida em dicionario literal: %r"
                      " (a primeira sumiria em silencio)" % c)
                sys.exit(1)


def main():
    ver = "--ver" in sys.argv
    sem_chave_repetida()
    s = io.open(ARQ, encoding="utf8", newline="").read()
    i, j = recorta(s)
    base = json.loads(s[i:j])
    por_id = {e["id"]: e for e in base["entradas"]}

    erros, mudadas, trocas = [], 0, 0
    for eid, pares in CONTEXTO.items():
        if not pares:
            continue
        if eid not in por_id:
            erros.append("id inexistente: %s" % eid)
            continue
        t = por_id[eid].get("pt", "")
        for antes, depois in pares:
            n = t.count(antes)
            if n != 1:
                erros.append("%s: %d ocorrencias de %r" % (eid, n, antes[:48]))
                continue
            t = t.replace(antes, depois)
        por_id[eid]["_novo"] = t

    if erros:
        print("ABORTADO -- contexto que nao casa exatamente uma vez:")
        for e in erros:
            print("   " + e)
        sys.exit(1)

    for e in base["entradas"]:
        velho = e.get("pt", "")
        novo = acentua(e.pop("_novo", velho))
        if novo == velho:
            continue
        # A TRAVA: so acento pode ter mudado.
        if sem_acento(velho) != sem_acento(novo):
            print("ABORTADO -- %s mudou mais que acento" % e["id"])
            for a, b in zip(sem_acento(velho), sem_acento(novo)):
                if a != b:
                    break
            sys.exit(1)
        trocas += sum(1 for a, b in zip(sem_acento(velho), novo) if a != b)
        mudadas += 1
        if ver:
            print("  %-30s %d acentos" % (e["id"], sum(
                1 for a, b in zip(velho, novo) if a != b)))
        else:
            e["pt"] = novo

    fontes = 0
    for e in base["entradas"]:
        velha = e.get("fonte", "") or ""
        # A lista explicita ganha, porque e onde moram os ambiguos ("Preco
        # publico no app"). Todo o resto passa pela MESMA lista de palavras do
        # texto -- na primeira versao so as 18 listadas eram tratadas, e sobrou
        # "Secao 07 - Fontes, pagina 3BRAIN" na tela.
        nova = FONTES.get(e["id"]) or acentua(velha)
        if nova == velha:
            continue
        if sem_acento(velha) != sem_acento(nova):
            print("ABORTADO -- a fonte de %s mudou mais que acento" % e["id"])
            print("   antes: %s" % e.get("fonte", ""))
            print("   nova : %s" % nova)
            sys.exit(1)
        fontes += 1
        if not ver:
            e["fonte"] = nova

    print("")
    print("entradas com acento devolvido: %d | caracteres acentuados: %d | fontes: %d"
          % (mudadas, trocas, fontes))
    if ver:
        print("(--ver: nada foi gravado)")
        return
    novo_json = json.dumps(base, ensure_ascii=False, separators=(",", ":"))
    io.open(ARQ, "w", encoding="utf8", newline="").write(s[:i] + novo_json + s[j:])
    print("gravado em %s" % ARQ)


if __name__ == "__main__":
    main()
