# -*- coding: utf-8 -*-
"""Lote 3 - o que o estudo de mercado de 21/08 tem e a base ainda nao tinha:
a aritmetica de saida, a conta que NAO fecha no BarberGO, a demografia que
sustenta o timing do SAVI, e as lacunas declaradas.

Regra seguida aqui: nenhuma entrada pode contradizer outra ja publicada. Por
isso NAO entra SAM em reais - a entrada mercado-savi declara que nao publicamos
mercado em reais enquanto o preco nao estiver fechado no recorte atual, e duas
entradas se contradizendo e pior do que uma entrada faltando.
"""
F_ESTUDO = "Estudo de mercado 3BRAIN, ago/2026"
F_ECON = "Estudo de mercado 3BRAIN, cap. economia, ago/2026"
F_BG = "Estudo de mercado 3BRAIN, cap. BarberGO, ago/2026"
F_SAVI = "Estudo de mercado 3BRAIN, cap. SAVI, ago/2026"
F_HUNT = "Estudo de mercado 3BRAIN, cap. HuntAI, ago/2026"

E = [

# ---------------------------------------------------------------- economia

{"id": "multiplo-de-saida", "secao": "#receita", "tags": ["investidor", "saida", "multiplo"],
 "perguntas": ["qual o multiplo de saida", "como avaliam a empresa", "quanto a empresa vale",
               "que multiplo voces usam", "por quanto voces sairiam", "exit multiple",
               "how do you value the company", "multiplo de receita"],
 "pt": "Depende inteiramente da **categoria em que o mercado nos puser**, e a diferenca e de mais de vinte vezes para a mesma empresa e o mesmo codigo. Software de lar de idosos negocia a **2,2x receita** (MatrixCare, 8-K da SEC); SaaS vertical com crescimento forte, a **cerca de 12,5x ARR**; escriba clinico, a **cerca de 45x ARR** no pico (Abridge, jun/2025). Para uma saida de US$ 100 milhoes isso exigiria, respectivamente, **R$ 235,7 milhoes**, **R$ 41,5 milhoes** ou **R$ 11,5 milhoes** de receita anual. E o que separa 2,2x de 12,5x **nao e tecnologia: e validacao externa publicada** - e nenhum concorrente que levantamos tem uma.",
 "en": "It depends entirely on **which category the market puts us in**, and the spread is more than twentyfold for the same company and the same code. Senior-living software trades at **2.2x revenue** (MatrixCare, SEC 8-K); a fast-growing vertical SaaS at **about 12.5x ARR**; a clinical scribe at **about 45x ARR** at peak (Abridge, Jun 2025). For a US$100M exit that would require, respectively, **R$ 235.7M**, **R$ 41.5M** or **R$ 11.5M** in annual revenue. And what separates 2.2x from 12.5x **is not technology: it is published external validation** - and none of the competitors we surveyed has one.",
 "fonte": "Estudo de mercado 3BRAIN, ago/2026; 8-K da SEC (MatrixCare); Abridge, jun/2025"},

{"id": "venture-scale-honesto", "secao": "#receita", "tags": ["investidor", "saida", "ressalva"],
 "perguntas": ["isso e venture scale", "da retorno de fundo", "cabe num fundo de venture",
               "voces sao caso de venture", "da pra fazer 10x", "is this venture scale",
               "fund returner"],
 "pt": "**No recorte atual, nao - e dizemos antes de perguntarem.** No multiplo de software de lar de idosos, uma saida de US$ 100 milhoes exigiria **R$ 235,7 milhoes de receita anual**, e o mercado que contamos de baixo para cima nao comporta isso. A trajetoria base do SAVI - **R$ 3,93 milhoes de ARR no ano 3** e **R$ 16,1 milhoes no ano 6**, com churn estruturalmente baixo porque prontuario de residente nao migra - e **um excelente resultado para dois fundadores** e **nao e** o caso de um fundo que precisa de 10x sobre o cheque. As duas coisas sao verdade ao mesmo tempo, e confundi-las e o que custa a rodada. Um investidor experiente faz essa divisao sozinho na segunda leitura: preferimos que ela ja esteja escrita.",
 "en": "**In the current framing, no - and we say it before being asked.** At the senior-living-software multiple, a US$100M exit would require **R$ 235.7M in annual revenue**, and the market we counted bottom-up does not support that. SAVI's base trajectory - **R$ 3.93M ARR in year 3** and **R$ 16.1M in year 6**, with structurally low churn because a resident's record does not migrate - is **an excellent outcome for two founders** and is **not** a case for a fund that needs 10x on its cheque. Both are true at once, and conflating them is what costs the round. An experienced investor does that division himself on the second read: we would rather it were already written down.",
 "fonte": F_ECON},

{"id": "condicoes-venture", "secao": "#receita", "tags": ["investidor", "saida", "europa"],
 "perguntas": ["o que mudaria esse veredito", "o que faria virar venture", "como isso fica grande",
               "o que precisa acontecer pra escalar", "what would change that", "caminho para escala"],
 "pt": "Tres condicoes, e sao especificas. **Primeira:** o preco por leito precisa ser cerca de **3x o teto brasileiro**, e isso so se sustenta na Europa, onde cobrar por leito ja e convencao declarada pelos proprios fornecedores. **Segunda:** Portugal nao e o mercado, e a **prova** - o que ele sustenta e a referencia auditavel que abre Espanha, Reino Unido e Irlanda. **Terceira:** o rotulo de categoria vale mais que qualquer melhoria de produto, e o que muda o rotulo e validacao externa publicada. **A lacuna que mais muda o veredito e nossa:** Espanha, Reino Unido e Irlanda **nao foram dimensionados** com a mesma disciplina, e ate que sejam, o numero grande e conversa.",
 "en": "Three conditions, and they are specific. **First:** the price per bed needs to be around **3x the Brazilian ceiling**, and that only holds in Europe, where charging per bed is already declared convention among vendors. **Second:** Portugal is not the market, it is the **proof** - what it sustains is the auditable reference that opens Spain, the UK and Ireland. **Third:** the category label is worth more than any product improvement, and what changes the label is published external validation. **The gap that most changes the verdict is ours:** Spain, the UK and Ireland **have not been sized** with the same discipline, and until they are, the big number is talk.",
 "fonte": F_SAVI},

{"id": "criticos-adversariais", "secao": "#fontes", "tags": ["metodo", "estudo", "investidor"],
 "perguntas": ["como voces validaram o estudo", "quem revisou esses numeros",
               "como sabem que o estudo esta certo", "tem revisao independente",
               "how was the study reviewed", "quem criticou o estudo"],
 "pt": "Treze frentes de pesquisa, quatro capitulos escritos sobre elas, e **um critico adversarial por capitulo, instruido a derrubar o texto** - TAM inflado, conta que nao fecha, conclusao que nao decorre do dado. O achado mais util foi o mesmo nos quatro, de forma **independente**: nenhum capitulo tinha uma linha de **imposto**, e toda margem bruta estava apresentada como se fosse operacional. Uma margem de 85% anunciada a investidor que vira 69% na diligencia custa mais credibilidade do que os 16 pontos custam em dinheiro. Por isso as margens que publicamos ja saem com o imposto dentro.",
 "en": "Thirteen research fronts, four chapters written on top of them, and **one adversarial critic per chapter, instructed to knock the text down** - inflated TAM, arithmetic that does not close, conclusions that do not follow from the data. The most useful finding was the same in all four, **independently**: no chapter had a **tax** line, and every gross margin was presented as if it were operating margin. An 85% margin announced to an investor that becomes 69% in diligence costs more credibility than the 16 points cost in money. That is why the margins we publish already have tax inside.",
 "fonte": F_ESTUDO},

# ---------------------------------------------------------------- BarberGO

{"id": "barbergo-conta-nao-fecha", "secao": "#barbergo", "tags": ["barbergo", "cac", "ressalva"],
 "perguntas": ["a conta do barbergo fecha", "qual o CAC do barbergo", "ltv cac do app",
               "vale a pena comprar usuario", "o app da lucro por assinante",
               "unit economics barbergo", "paga a aquisicao"],
 "pt": "**No preco de consumo, nao fecha - e o numero e nosso.** Com conversao de 1,5% e custo por instalacao de R$ 2,00, o CAC por assinante fica em **R$ 133** e a razao **LTV:CAC em 0,80:1**: o produto **perde dinheiro em cada assinante comprado por midia**. Nenhum ajuste de taxa de loja conserta isso, porque o problema nao e a margem por assinante e sim o preco da aquisicao contra o ticket escolhido. E por isso que a monetizacao se move para o **estabelecimento** - por aritmetica, nao por preferencia. **Ressalva:** o custo por instalacao usado e de referencia de mercado; medir o nosso proprio e a lacuna mais cara desse capitulo.",
 "en": "**At the consumer price it does not close - and the number is ours.** With 1.5% conversion and a R$ 2.00 cost per install, CAC per subscriber lands at **R$ 133** and the **LTV:CAC ratio at 0.80:1**: the product **loses money on every subscriber bought through paid media**. No store-fee adjustment fixes that, because the problem is not margin per subscriber but the price of acquisition against the chosen ticket. That is why monetisation moves to the **shop** - by arithmetic, not by preference. **Caveat:** the cost per install used is a market reference; measuring our own is the most expensive gap in that chapter.",
 "fonte": F_BG},

{"id": "barbergo-quem-paga", "secao": "#barbergo", "tags": ["barbergo", "modelo", "preco"],
 "perguntas": ["por que cobrar do estabelecimento", "por que nao cobrar do barbeiro",
               "quantos assinantes voces precisam", "quantas barbearias pagam a equipe",
               "why charge the shop", "de que lado vem o dinheiro"],
 "pt": "Pela conta de quantas pessoas e preciso convencer. Para bancar uma **equipe de tres pessoas** sao **3.666 assinantes de consumo** ou **527 barbearias pagantes**. O ticket do estabelecimento e cerca de cinco vezes maior, e a barbearia ja compra software - paga **R$ 79,90 por mes na mediana** so por agenda. O lado do consumidor e justamente a ponta que este vertical ja provou, em treze anos e centenas de milhoes de agendamentos, que **nao paga**: o maior player brasileiro nao cobra um centavo do cliente final.",
 "en": "By the arithmetic of how many people you must convince. To fund a **three-person team** you need **3,666 consumer subscribers** or **527 paying barbershops**. The shop ticket is roughly five times larger, and the shop already buys software - it pays a **median R$ 79.90 a month** for scheduling alone. The consumer side is precisely the end this vertical has already proven, over thirteen years and hundreds of millions of bookings, **does not pay**: the largest Brazilian player charges the end customer nothing.",
 "fonte": F_BG},

{"id": "tam-que-nao-usamos", "secao": "#fontes", "tags": ["metodo", "tam", "barbergo", "ressalva"],
 "perguntas": ["o mercado de beleza nao e de 200 bilhoes", "e o numero do setor de beleza",
               "por que nao usam o TAM do setor", "abihpec", "euromonitor",
               "the beauty market is huge", "mercado de beleza brasileiro"],
 "pt": "**Nao usamos, e a razao e simples: aquele numero mede outra coisa.** O TAM de cerca de R$ 200 bilhoes que circula no setor mede **produto de beleza no varejo** - shampoo, cosmetico, prateleira - e nao **servico de barbearia**. Usa-lo para dimensionar um software de barbearia queima a credibilidade da apresentacao inteira em dois minutos, porque o investidor conhece a fonte. O nosso numero e contado de baixo para cima e e muito menor: **900.868 CNPJs ativos** na atividade de cabeleireiro, barbeiro e manicure, dos quais **85 de cada 100 sao MEI**, ou seja, uma pessoa so.",
 "en": "**We do not use it, and the reason is simple: that number measures something else.** The roughly R$ 200bn TAM that circulates in the sector measures **retail beauty products** - shampoo, cosmetics, shelf space - not **barbershop services**. Using it to size barbershop software burns the credibility of the entire pitch in two minutes, because the investor knows the source. Our number is counted bottom-up and is far smaller: **900,868 active companies** in the hairdresser/barber/manicure activity, of which **85 in every 100 are sole traders**.",
 "fonte": "Estudo de mercado 3BRAIN, ago/2026; Mapa de Empresas, 2o quad./2025"},

{"id": "barbeiro-carteira-dois-numeros", "secao": "#barbergo", "tags": ["barbergo", "emprego", "metodo"],
 "perguntas": ["quantos barbeiros tem carteira assinada", "o setor emprega quanto",
               "quantos barbeiros sao empregados", "por que dois numeros de emprego",
               "how many barbers are employed", "carteira assinada no setor"],
 "pt": "Dois numeros circulam e medem **coisas diferentes**, entao publicamos os dois com o denominador. **210** e o numero de **contratacoes** de barbeiro com carteira em doze meses no Brasil inteiro (Novo CAGED/MTE, CBO 516105, jul/25 a jun/26) - e um **fluxo**. **544** e o **estoque** de barbeiros com vinculo formal declarado (RAIS) - quantos existem, nao quantos entraram. Os dois contam a mesma historia por caminhos independentes: **o setor praticamente nao emprega**, enquanto **768.830 pessoas** mantem um MEI ativo na atividade. Somar fluxo com estoque seria o tipo de erro que derruba uma apresentacao.",
 "en": "Two figures circulate and they measure **different things**, so we publish both with the denominator. **210** is the number of formal **hires** of barbers in twelve months in all of Brazil (Novo CAGED/MTE, occupation code 516105, Jul/25 to Jun/26) - a **flow**. **544** is the **stock** of barbers with a declared formal contract (RAIS) - how many exist, not how many joined. Both tell the same story by independent routes: **the sector barely employs anyone**, while **768,830 people** keep an active sole-trader registration in the activity. Adding a flow to a stock is the kind of error that sinks a pitch.",
 "fonte": "Novo CAGED/MTE, CBO 516105, jul/25 a jun/26; RAIS; Mapa de Empresas, 2o quad./2025"},

{"id": "ipca-barbearia", "secao": "#barbergo", "tags": ["barbergo", "preco", "macro"],
 "perguntas": ["o barbeiro consegue repassar preco", "a barbearia tem margem",
               "o setor esta ganhando mais", "inflacao do setor de barbearia",
               "can barbers raise prices", "poder de repasse"],
 "pt": "Ha um sinal favoravel que quase ninguem cita: o subitem **cabeleireiro e barbeiro** do IPCA subiu **7,71% em doze meses** contra **4,44%** da inflacao cheia, e **8,05% em 2025** contra **4,26%**. Quem repassa preco acima da inflacao **dois anos seguidos** tem margem para pagar mensalidade - e isso e mais forte do que qualquer pesquisa de intencao, porque e comportamento medido, nao declaracao. Vale junto com a ressalva do outro lado: o teto do MEI e de **R$ 6.750 por mes**, e e essa a caixa em que qualquer preco tem de caber.",
 "en": "There is a favourable signal almost nobody cites: the IPCA sub-item for **hairdressers and barbers** rose **7.71% over twelve months** against **4.44%** for headline inflation, and **8.05% in 2025** against **4.26%**. Anyone passing on prices above inflation **two years running** has room to pay a subscription - and that is stronger than any intent survey, because it is measured behaviour, not a statement. It goes together with the caveat on the other side: the sole-trader ceiling is **R$ 6,750 a month**, and that is the box any price must fit into.",
 "fonte": "IBGE/IPCA, subitem cabeleireiro e barbeiro, 12 meses ate ago/2026; LC 123/2006"},

{"id": "squire-custo-por-loja", "secao": "#barbergo", "tags": ["barbergo", "concorrencia", "cac"],
 "perguntas": ["quanto a squire gastou por barbearia", "capital queimado pela squire",
               "por que capital nao resolve", "da pra comprar esse mercado",
               "can you buy this market", "custo por estabelecimento conquistado"],
 "pt": "A Squire e a prova documentada de que **nao ha saida por capital neste mercado**: cerca de **US$ 167 milhoes levantados** para chegar a **cerca de 3.000 barbearias** - **US$ 55.667 de capital queimado por barbearia conquistada** - e cinco anos sem captacao nova, com o valuation de US$ 750 milhoes nunca remarcado. **A empresa nao morreu:** ela atingiu o tamanho natural do mercado que escolheu. A leitura que tiramos e que dinheiro nao compra este vertical, entao a entrada tem de ser por canal proprio e ticket de estabelecimento - que e exatamente o que a nossa conta de aquisicao ja dizia.",
 "en": "Squire is the documented proof that **there is no way to buy this market**: roughly **US$167M raised** to reach **about 3,000 barbershops** - **US$55,667 of capital burned per shop won** - and five years with no new round, its US$750M valuation never marked. **The company did not die:** it reached the natural size of the market it chose. Our reading is that money does not buy this vertical, so entry has to be through an owned channel and a shop-level ticket - which is exactly what our own acquisition arithmetic already said.",
 "fonte": "Contrary Research e imprensa do setor; valores reportados, nao auditados"},

# ---------------------------------------------------------------- SAVI

{"id": "demografia-ilpi", "secao": "#savi", "tags": ["savi", "mercado", "demografia", "timing"],
 "perguntas": ["por que agora", "por que esse mercado cresce", "quantas pessoas moram em ILPI",
               "o brasil esta envelhecendo", "why now", "qual o timing disso",
               "quantos idosos institucionalizados"],
 "pt": "O argumento nao e ha muitos idosos - e que **a demanda descola do crescimento populacional**. No Brasil, **160.784 pessoas vivem em instituicao de longa permanencia** (Censo IBGE 2022), das quais **45,6% tem 80 anos ou mais**. A taxa de institucionalizacao e de **0,71% dos maiores de 65**, contra mediana de **3,5% na OCDE**. E o grupo de **80 anos ou mais cresce 2,80x ate 2050**, enquanto a populacao total **para de crescer em 2041**. Ou seja: o pais para de crescer e a faixa que consome cuidado quase triplica.",
 "en": "The argument is not there are many elderly people - it is that **demand decouples from population growth**. In Brazil, **160,784 people live in long-term care institutions** (IBGE Census 2022), of whom **45.6% are 80 or older**. The institutionalisation rate is **0.71% of those over 65**, against an OECD median of **3.5%**. And the **80-plus group grows 2.80x by 2050**, while the total population **stops growing in 2041**. In short: the country stops growing while the band that consumes care nearly triples.",
 "fonte": "Censo IBGE 2022; OCDE Health at a Glance; projecao IBGE"},

{"id": "cadastro-ilpi-nao-existe", "secao": "#savi", "tags": ["savi", "ressalva", "cac", "mercado"],
 "perguntas": ["como voces acham essas casas", "existe lista de ILPI",
               "de onde sai a lista de clientes", "quantas ILPI privadas existem",
               "is there a registry", "por que o CAC e alto no brasil"],
 "pt": "**Nao existe cadastro das casas privadas com fins lucrativos no Brasil, e isso encarece a venda.** A ILPI **nao e tipo de estabelecimento no CNES**, e o ultimo levantamento nacional e do IPEA com coleta de **2007-2009** - por isso as 3.548 casas que citamos sao **piso**, nao contagem atual. A consequencia pratica e que **o custo de achar o cliente e estruturalmente mais alto aqui**, porque a lista tem de ser construida. Em Portugal a lista **e publica**, e e uma das razoes pelas quais o mercado de la sai mais barato de alcancar apesar de ser trinta vezes menor.",
 "en": "**There is no register of private for-profit homes in Brazil, and that makes selling more expensive.** Long-term care homes are **not an establishment type in CNES**, and the last national survey is IPEA's, collected in **2007-2009** - which is why the 3,548 homes we cite are a **floor**, not a current count. The practical consequence is that **the cost of finding the customer is structurally higher here**, because the list has to be built. In Portugal the list **is public**, and that is one reason that market is cheaper to reach despite being thirty times smaller.",
 "fonte": "CNES/DATASUS; IPEA, coleta 2007-2009"},

{"id": "por-que-portugal", "secao": "#savi", "tags": ["savi", "portugal", "internacional"],
 "perguntas": ["por que portugal", "voces vao pra europa", "o que portugal resolve",
               "mercado portugues de vocês", "why portugal", "expansao internacional"],
 "pt": "Porque **Portugal e a prova, nao o mercado**. Um universo **trinta vezes menor** que o brasileiro produz **mais receita alcancavel em tres anos** - R$ 2,37 milhoes contra R$ 1,56 milhao - por duas razoes concretas: o **preco por unidade e 46% maior** e **a lista de clientes e publica**, o que derruba o custo de achar quem compra. O que Portugal sustenta sozinho e pequeno; o que ele sustenta de verdade e a **referencia auditavel** que abre Espanha, Reino Unido e Irlanda, onde cobrar por leito ja e convencao. **Esses tres ainda nao foram dimensionados por nos**, e ate que sejam, nao afirmamos tamanho.",
 "en": "Because **Portugal is the proof, not the market**. A universe **thirty times smaller** than Brazil's produces **more reachable revenue over three years** - R$ 2.37M against R$ 1.56M - for two concrete reasons: the **price per unit is 46% higher** and **the customer list is public**, which collapses the cost of finding buyers. What Portugal sustains on its own is small; what it really sustains is the **auditable reference** that opens Spain, the UK and Ireland, where per-bed pricing is already convention. **We have not sized those three**, and until we do, we claim no size.",
 "fonte": F_SAVI},

{"id": "epic-sepsis", "secao": "#savi", "tags": ["savi", "ia", "ressalva", "predicao"],
 "perguntas": ["e se a IA errar", "por que nao prometem predicao", "modelo preditivo funciona",
               "ia clinica nao falha", "alerta demais cansa a equipe", "alert fatigue",
               "what if the model is wrong", "risco de falso alarme"],
 "pt": "Porque ja existe o caso que mostra o preco de prometer sem publicar. O **Epic Sepsis Model**, embarcado em centenas de hospitais americanos, prometia AUC de 0,76 a 0,83 e entregou **0,63** na avaliacao externa: **sensibilidade de 33%** - deixou passar dois tercos dos casos - e **109 alertas para cada caso realmente detectado** (JAMA Internal Medicine, 2021). Alerta que grita demais e desligado pela equipe, e ai o sistema piora o cuidado em vez de melhorar. Por isso a nossa camada preditiva e **etapa planejada com registro sanitario**, e nao promessa de folheto: **o que afirmamos hoje e captura e vigilancia do que ficou em branco ou fora de faixa**.",
 "en": "Because the case that shows the cost of promising without publishing already exists. The **Epic Sepsis Model**, embedded in hundreds of US hospitals, promised an AUC of 0.76-0.83 and delivered **0.63** on external evaluation: **33% sensitivity** - it missed two thirds of cases - and **109 alerts for every case actually detected** (JAMA Internal Medicine, 2021). An alarm that cries wolf gets switched off by the staff, and then the system makes care worse rather than better. That is why our predictive layer is a **planned stage with regulatory clearance**, not a brochure promise: **what we claim today is capture and surveillance of what was left blank or out of range**.",
 "fonte": "Wong et al., JAMA Internal Medicine, 2021 (Epic Sepsis Model)"},

# ---------------------------------------------------------------- motor

{"id": "base-nao-e-o-ativo", "secao": "#motor", "tags": ["huntai", "ativo", "ressalva"],
 "perguntas": ["a base de e-mails vale quanto", "voces vendem a base",
               "o ativo de voces e a lista", "quanto vale essa base", "por que nao vender a lista",
               "is the list the asset", "qual e o ativo do motor"],
 "pt": "**O ativo nao e a base - e dizemos isso contra o nosso proprio interesse de apresentacao.** O mercado ja reprecificou lista de contatos verificados como **ativo em depreciacao**: a ZoomInfo faz **US$ 1,25 bilhao de receita**, projeta **queda** e vale **0,90x receita**. Lista parada perde valor sozinha. **O ativo e a engenharia de entrega com limites medidos** - saber a que ritmo se pode operar sem ser estrangulado, e que o tipo de pedido pesa mais que o volume. Isso **nao se copia num fim de semana**, e e a unica coisa do motor sobre a qual se pode dizer isso.",
 "en": "**The asset is not the list - and we say that against our own pitching interest.** The market has already repriced verified contact lists as a **depreciating asset**: ZoomInfo does **US$1.25bn in revenue**, projects a **decline** and trades at **0.90x revenue**. A static list loses value on its own. **The asset is the delivery engineering with measured limits** - knowing the rate at which you can operate without being throttled, and that the type of request weighs more than the volume. That **cannot be copied over a weekend**, and it is the only thing about the engine of which that can be said.",
 "fonte": "ZoomInfo, resultados e projecao 2026; operacao HuntAI"},

{"id": "heyreach-precedente", "secao": "#motor", "tags": ["huntai", "risco", "plataforma"],
 "perguntas": ["e se a plataforma banir voces", "ja aconteceu de alguem ser desligado",
               "precedente de banimento", "risco de depender de plataforma",
               "what if you get banned", "heyreach"],
 "pt": "Ja aconteceu com um concorrente, e o precedente e recente: em **marco de 2026 a HeyReach teve cerca de 30.000 usuarios desligados num unico dia**. Nao houve tribunal nem aviso - a plataforma pode desligar a empresa e o fundador **em semanas, por contrato**. A licao que tiramos e a razao de o motor ser construido como e: **o que sobrevive e canal proprio** - dominio, IP e reputacao de entrega nossos. Onde o motor encosta em plataforma de terceiro, ele trabalha **abaixo de limites medidos em operacao**, e nao de palpite, porque ali a regra e contrato e nao lei.",
 "en": "It already happened to a competitor, and the precedent is recent: in **March 2026 HeyReach had around 30,000 users cut off in a single day**. There was no court and no warning - the platform can switch off the company and the founder **within weeks, by contract**. The lesson we drew is the reason the engine is built the way it is: **what survives is an owned channel** - our own domain, IP and sending reputation. Where the engine touches a third-party platform it works **below limits measured in operation**, not guessed, because there the rule is contract, not law.",
 "fonte": "Estudo de mercado 3BRAIN, cap. HuntAI, ago/2026; imprensa do setor, mar/2026"},

{"id": "comparaveis-sem-capital", "secao": "#motor", "tags": ["huntai", "comparaveis", "receita"],
 "perguntas": ["alguem ganha dinheiro com isso", "tem empresa parecida que deu certo",
               "quem mais faz esse motor", "da pra crescer sem levantar dinheiro",
               "bootstrapped comparables", "quanto essas empresas faturam"],
 "pt": "Sim, e o detalhe que importa e **como** elas chegaram la. A Instantly fez **US$ 38 milhoes de ARR** e a Smartlead **US$ 20 milhoes**, ambas **sem levantar um dolar de investimento**. E o mesmo primitivo que o nosso motor usa - entrega em escala com reputacao propria - e mostra que a categoria **paga a propria conta antes de precisar de capital**. Serve tambem de regua para a ambicao: o alvo honesto aqui e uma empresa de **R$ 5 a 10 milhoes por ano**, nao um unicornio, e essa e a mesma faixa em que essas duas operam.",
 "en": "Yes, and the detail that matters is **how** they got there. Instantly reached **US$38M ARR** and Smartlead **US$20M**, both **without raising a dollar**. It is the same primitive our engine uses - delivery at scale on your own reputation - and it shows the category **pays its own way before needing capital**. It also sets the yardstick for ambition: the honest target here is a **R$ 5-10M a year** company, not a unicorn, and that is the same band those two operate in.",
 "fonte": "ARR reportado por Instantly e Smartlead, 2024-2025"},

# ---------------------------------------------------------------- lacunas

{"id": "o-que-nao-sabemos", "secao": "#fontes", "tags": ["ressalva", "metodo", "lacunas"],
 "perguntas": ["o que voces nao sabem", "quais sao as lacunas", "o que falta medir",
               "onde o estudo e fraco", "what do you not know", "quais as incertezas",
               "o que voces ainda nao mediram"],
 "pt": "Estudo que esconde as proprias lacunas e pior que estudo curto, entao aqui estao as nossas. **Nao existe dimensionamento publicado** da categoria de ferramentas para candidato por nenhuma casa de research - todo tamanho ali e construcao nossa. **Nenhum concorrente daquela camada divulga receita ou usuarios**, nem os bem financiados. **Nao confirmamos em fonte primaria se ha reembolso** por software de cuidado no SUS, na ANS ou na Seguranca Social portuguesa - se nao houver, o teto de preco e a margem da propria casa. **O custo e o prazo de organismo notificado para marcacao CE nao foram fechados.** **Espanha, Reino Unido e Irlanda nao foram dimensionados.** E o enquadramento por fator R **precisa de confirmacao contabil**.",
 "en": "A study that hides its own gaps is worse than a short study, so here are ours. **There is no published sizing** of the candidate-tools category by any research house - every figure there is our own construction. **No competitor in that layer discloses revenue or users**, not even the well-funded ones. **We have not confirmed in a primary source whether there is reimbursement** for care software under Brazil's public system, private health plans, or Portuguese social security - if there is none, the price ceiling is the home's own margin. **The cost and timeline of a notified body for CE marking are not settled.** **Spain, the UK and Ireland have not been sized.** And the tax-bracket classification **needs accounting confirmation**.",
 "fonte": F_ESTUDO},

]
