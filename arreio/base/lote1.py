# -*- coding: utf-8 -*-
"""Lote 1 - o motor de aquisicao com os numeros medidos em 22-23/08/2026,
e as ressalvas que impedem citar numero que engana."""
F_LEDGER = "Ledgers da operacao HuntAI, medidos em 23/08/2026"
F_ELASTIC = "API do Elastic Email, medida ao vivo em 22/08/2026"
F_CORPO = "Varredura do corpo das mensagens, medida em 23/08/2026"

E = [
{"id": "motor-numeros", "secao": "#motor", "tags": ["huntai", "motor", "numeros"],
 "perguntas": ["quantos contatos voces tem", "qual o tamanho da base", "numeros do motor",
               "o que o motor ja fez", "how big is your list", "engine numbers"],
 "pt": "O retrato medido em 23/08/2026: **2.126.099 e-mails unicos** extraidos de 15 registros publicos, **240.314 vagas colhidas** das quais **79.828 vieram com o e-mail de quem contrata**, **58 adaptadores que submetem** candidatura (23 deles sistemas de recrutamento abertos por HTTP puro), **12.368 candidaturas** enviadas de 26.811 tentativas, **49.763 e-mails** disparados e **86 empregadores distintos** com conversa de entrevista. Uma contratacao real fecha a ponta, rastreada ate a caixa exata.",
 "en": "The picture measured on 23 Aug 2026: **2,126,099 unique e-mails** extracted from 15 public registers, **240,314 job postings harvested** of which **79,828 came with the hiring employer's e-mail**, **58 submitting adapters** (23 of them applicant-tracking systems opened by raw HTTP), **12,368 applications** sent out of 26,811 attempts, **49,763 e-mails** dispatched and **86 distinct employers** in interview conversations. One real hire closes the chain, traced to the exact inbox.",
 "fonte": F_LEDGER},

{"id": "uniao-nao-soma", "secao": "#motor", "tags": ["huntai", "base", "metodo"],
 "perguntas": ["como contam os contatos", "e soma ou uniao", "tem contato repetido",
               "por que nao 3,7 milhoes", "do you double count", "union or sum"],
 "pt": "Pela **uniao**, nunca pela soma. As 15 fontes somadas dao 3.782.070 enderecos, mas **43,8% se repete entre elas** - o mesmo CNPJ entra pela Receita Federal e pelo CNES. Contar a soma inflaria a base em **1,6 milhao de contatos que nao existem**. O numero que publicamos, 2.126.099, e a uniao com duplicata removida. E o tipo de escolha que separa numero medido de numero de apresentacao.",
 "en": "By **union**, never by sum. The 15 sources add up to 3,782,070 addresses, but **43.8% overlaps between them** - the same company enters through both the tax registry and CNES. Counting the sum would inflate the base by **1.6 million contacts that do not exist**. The figure we publish, 2,126,099, is the de-duplicated union. It is the kind of choice that separates a measured number from a pitch number.",
 "fonte": F_LEDGER},

{"id": "vagas-com-email", "secao": "#motor", "tags": ["huntai", "vagas", "extracao"],
 "perguntas": ["de onde vem as vagas", "quantas vagas voces tem", "o anuncio traz e-mail",
               "job postings with employer email", "how many vacancies"],
 "pt": "**240.314 registros de vaga colhidos**, e o que importa neles: **79.828 trouxeram o e-mail do empregador junto do anuncio** - 74% no geral, 79% em tecnologia e **100% em saude**. E o coracao do motor: o anuncio identifica quem contrata **e** entrega como falar com ele, na mesma extracao, sem intermediario e sem custo por lead. Ressalva contada: o total inclui portais que **proibem contato no texto** - o OLX entrega 9.100 vagas e zero e-mails, e esta somado assim.",
 "en": "**240,314 job-posting records harvested**, and the part that matters: **79,828 carried the employer's e-mail alongside the ad** - 74% overall, 79% in tech and **100% in healthcare**. That is the heart of the engine: the posting identifies who is hiring **and** hands over how to reach them, in one pass, with no middleman and no cost per lead. Stated caveat: the total includes portals that **forbid contact details in the ad** - OLX yields 9,100 postings and zero e-mails, and is counted that way.",
 "fonte": F_LEDGER},

{"id": "cobertura-plataformas", "secao": "#motor", "tags": ["huntai", "plataformas", "ats"],
 "perguntas": ["em quantas plataformas voces enviam", "quais ATS", "como submetem candidatura",
               "usam RPA ou robo", "which platforms", "how many integrations"],
 "pt": "**58 adaptadores que submetem** de verdade, e dentro deles **23 sistemas de recrutamento abertos por HTTP puro** - Greenhouse, Lever, Workable, Workday, iCIMS, SmartRecruiters, Personio, BambooHR e outros. **Sem nenhum servico pago de automacao e sem robo de tela**: robo de tela quebra a cada mudanca de layout e cobra por hora; HTTP puro quebra so quando o formulario muda de campo, e o conserto e de minutos. Esta e a capacidade do motor, nao o lote ja enviado.",
 "en": "**58 adapters that actually submit**, and within them **23 applicant-tracking systems opened by raw HTTP** - Greenhouse, Lever, Workable, Workday, iCIMS, SmartRecruiters, Personio, BambooHR and others. **No paid automation service and no screen robot**: a screen robot breaks on every layout change and bills by the hour; raw HTTP breaks only when a form changes a field, and the fix takes minutes. This is engine capacity, not the batch already sent.",
 "fonte": "Inventario de adaptadores da operacao HuntAI, 23/08/2026"},

{"id": "candidaturas-conversao", "secao": "#motor", "tags": ["huntai", "candidaturas", "conversao"],
 "perguntas": ["quantas candidaturas", "qual a taxa de sucesso", "quantas tentativas",
               "por que algumas falham", "application success rate"],
 "pt": "**12.368 candidaturas enviadas de 26.811 tentativas registradas - 46,1%.** O que falha nao e misterio: formulario que mudou de campo entre a colheita e o envio, e vaga fechada no intervalo. Os canais mais produtivos foram formulario generico (4.018), Trabalha Brasil (2.730), ATS direto (945), Indeed (866) e rotas do LinkedIn (864). O numero antigo de 8.615 que circulava era so o lote de Santa Catarina e esta **desatualizado**.",
 "en": "**12,368 applications sent out of 26,811 logged attempts - 46.1%.** What fails is no mystery: forms whose fields changed between harvest and submission, and postings closed in the meantime. The most productive channels were generic forms (4,018), Trabalha Brasil (2,730), direct ATS (945), Indeed (866) and LinkedIn routes (864). The older figure of 8,615 that circulated covered only the Santa Catarina batch and is **out of date**.",
 "fonte": F_LEDGER},

{"id": "entrevistas-medidas", "secao": "#motor", "tags": ["huntai", "entrevistas", "funil"],
 "perguntas": ["quantas entrevistas", "alguem respondeu", "o motor gerou entrevista",
               "qual o retorno real", "how many interviews", "did anyone reply"],
 "pt": "**154 mensagens de retorno em 86 empregadores distintos**, lidas no **corpo** de 2.881 mensagens pre-filtradas. A medicao anterior olhava so o **assunto** e por isso subcontava: o convite mais comum chega como Re: Candidatura para X, com a marcacao no corpo. Tres familias de falso positivo foram cortadas a mao - a propria carta do fundador devolvida no acuse de ticket, alerta de portal, e descricao de funil de ATS - e sem esse corte o numero **dobrava**. Nenhuma das tres saiu de regex: as tres apareceram olhando a amostra.",
 "en": "**154 reply messages across 86 distinct employers**, read in the **body** of 2,881 pre-filtered messages. The earlier measurement looked only at the **subject line** and therefore under-counted: the most common invitation arrives as Re: Application for X, with the marker in the body. Three families of false positive were removed by hand - the founder's own letter bounced back in a ticket acknowledgement, portal alerts, and ATS funnel descriptions - and without that cut the figure **doubled**. None of the three was found by regex: all three showed up by reading the sample.",
 "fonte": F_CORPO},

{"id": "entrevistas-portugal", "secao": "#motor", "tags": ["huntai", "portugal", "achado"],
 "perguntas": ["onde o motor funcionou melhor", "por que Portugal", "em que pais",
               "geografia dos resultados", "which country", "why Portugal"],
 "pt": "**60 dos 86 empregadores sao portugueses e apenas 2 sao brasileiros.** O motor produziu entrevista **sobretudo em Portugal**, e a medicao vinha olhando para o Brasil. Dois canais que nao se falam apontam para o mesmo sitio: a varredura de e-mail e, por caminho independente, mais de 150 contatos profissionais portugueses no WhatsApp. **Ressalva que fica junto:** entre os 86 ha enderecos de gmail e outlook - recrutador escrevendo de conta pessoal -, entao se dois forem da mesma empresa o total de empregadores distintos esta um ou dois abaixo.",
 "en": "**60 of the 86 employers are Portuguese and only 2 are Brazilian.** The engine produced interviews **mostly in Portugal**, while the measurement had been looking at Brazil. Two channels that do not talk to each other point the same way: the e-mail sweep and, independently, more than 150 Portuguese professional contacts on WhatsApp. **Caveat kept alongside:** among the 86 there are gmail and outlook addresses - recruiters writing from personal accounts - so if two belong to the same company the distinct-employer total is one or two lower.",
 "fonte": F_CORPO},

{"id": "contratacao-imas", "secao": "#motor", "tags": ["huntai", "contratacao", "atribuicao"],
 "perguntas": ["a contratacao foi real", "como sabem que veio de voces", "qual a prova",
               "atribuicao", "was the hire real", "how do you attribute it"],
 "pt": "**Auxiliar de laboratorio, no laboratorio do hospital infantil do IMAS, em Sao Jose/SC**, cerca de 30 dias depois do inicio do lote. Veio por **e-mail, nao por plataforma**: a caixa e nominal de setor, o envio saiu em 14/08 as 20h55, e os 13 ledgers de plataforma tem **zero** IMAS, o que descarta o resto. Nao e provavelmente veio dai: e o endereco, a data e a hora. **E o achado que corrige o metodo:** aquele contato estava na faixa C, 5,7% da fila, que o corte de qualidade teria excluido.",
 "en": "**Laboratory assistant, at the children's hospital laboratory of IMAS, in Sao Jose/SC**, about 30 days after the batch began. It came through **e-mail, not a platform**: the inbox is a named department address, the send went out on 14 Aug at 20:55, and the 13 platform ledgers contain **zero** IMAS, which rules out the rest. It is not it probably came from there: it is the address, the date and the time. **And it is the finding that corrects the method:** that contact sat in tier C, 5.7% of the queue, which the quality filter would have excluded.",
 "fonte": "Ledgers da operacao HuntAI e caixa por IMAP, 23/08/2026"},

{"id": "custo-unitario-motor", "secao": "#motor", "tags": ["huntai", "custo", "margem"],
 "perguntas": ["quanto custa rodar isso", "qual o custo por contato", "quanto gastam por mes",
               "custo por candidatura", "unit cost", "how much does it cost to run"],
 "pt": "**Cerca de US$ 0,0015 por candidatura e US$ 0,000009 por contato extraido.** O motor inteiro roda com **tres assinaturas, nenhuma acima de US$ 19 por mes** - Elastic Email no plano Starter, proxies e o dominio. O preenchimento de formulario custa **quase zero de modelo de linguagem**, porque um livro de respostas cobre 86% das perguntas de triagem sem chamar IA. E por isso que a comparacao com equipe de vendas nao e apertada: e de outra ordem de grandeza.",
 "en": "**About US$ 0.0015 per application and US$ 0.000009 per extracted contact.** The whole engine runs on **three subscriptions, none above US$ 19 a month** - Elastic Email Starter, proxies and the domain. Filling in forms costs **almost nothing in language-model calls**, because an answer book covers 86% of screening questions without calling AI. That is why the comparison with a sales team is not close: it is a different order of magnitude.",
 "fonte": "Custo proprio medido, ago/2026"},

{"id": "entrega-email", "secao": "#motor", "tags": ["huntai", "email", "entrega"],
 "perguntas": ["a entrega e boa", "quantos e-mails chegam", "taxa de reclamacao",
               "voces sao spam", "deliverability", "complaint rate"],
 "pt": "Em agosto de 2026 foram **24.518 enviados, 21.920 entregues (89,4%)** e **2 reclamacoes de spam - 0,008%**, que e **12 vezes abaixo do limite de 0,10%** que faz provedor suspender remetente. A reclamacao e a metrica que derruba operacao de e-mail, e e justamente a que esta sadia. **Ressalva:** a entrega de **julho e desconhecida** - o provedor anterior recebia a devolucao no lugar da gente, e so de agosto em diante ha medicao.",
 "en": "In August 2026 there were **24,518 sent, 21,920 delivered (89.4%)** and **2 spam complaints - 0.008%**, which is **12 times below the 0.10% threshold** that gets a sender suspended. Complaint rate is the metric that kills an e-mail operation, and it is exactly the one that is healthy. **Caveat:** July's delivery is **unknown** - the previous provider received the bounces instead of us, and measurement only exists from August onward.",
 "fonte": F_ELASTIC},

{"id": "devolucao-autopsia", "secao": "#motor", "tags": ["huntai", "devolucao", "lista"],
 "perguntas": ["a lista esta velha", "quantos e-mails voltam", "bounce", "devolucao",
               "a base e boa", "how bad are your bounces"],
 "pt": "A devolucao de agosto foi de 10,5%, e a autopsia de 1.890 devolucoes diz de quem e a culpa: **37% e reputacao do nosso IP** (endereco compartilhado em lista de bloqueio), 11% e caixa cheia do destinatario, e **52% e caixa morta, o que da cerca de 4,0% da campanha**. Ou seja: **a lista em si esta em ~4% de endereco morto**, que e saudavel - o resto e problema de IP, e problema de IP se resolve com IP proprio, nao com lista nova.",
 "en": "August bounces ran at 10.5%, and the autopsy of 1,890 bounces says where the fault lies: **37% is our own IP reputation** (a shared address on a blocklist), 11% is a full recipient mailbox, and **52% is a dead mailbox, which works out to about 4.0% of the campaign**. In other words: **the list itself sits at ~4% dead addresses**, which is healthy - the rest is an IP problem, and an IP problem is solved with a dedicated IP, not with a new list.",
 "fonte": "Autopsia de devolucao da operacao HuntAI, 15/08/2026"},

{"id": "portao-envio", "secao": "#motor", "tags": ["huntai", "operacao", "risco"],
 "perguntas": ["voces estao enviando agora", "por que pararam", "o envio esta ativo",
               "are you sending now", "is the channel running"],
 "pt": "O envio esta **pausado por decisao nossa**, nao por suspensao: agosto fechou em 10,5% de devolucao contra um **teto interno de 8%**, e a regra e parar antes de o provedor parar por nos. A conta segue **ativa, com reputacao 96,88**. Vale o que isso diz do metodo: o portao e nosso e mais apertado que o do mercado, porque reputacao de remetente demora meses para recuperar e horas para perder.",
 "en": "Sending is **paused by our own decision**, not by suspension: August closed at 10.5% bounces against an **internal ceiling of 8%**, and the rule is to stop before the provider stops for us. The account remains **active, with a 96.88 reputation**. What that says about the method matters: the gate is ours and tighter than the market's, because sender reputation takes months to rebuild and hours to lose.",
 "fonte": "Operacao HuntAI e painel do Elastic Email, ago/2026"},

{"id": "ressalva-clique", "secao": "#fontes", "tags": ["ressalva", "metrica", "huntai"],
 "perguntas": ["qual a taxa de clique", "quantos clicaram", "engajamento do e-mail",
               "click rate", "how many clicked"],
 "pt": "**Nao usamos essa metrica, e a razao importa.** Foram 1.173 cliques para 1.521 aberturas - **77% de quem abriu clicou**. Campanha humana fica entre 5% e 15%. Setenta e sete por cento e a assinatura de **varredor de seguranca**: o antivirus corporativo abre a mensagem e visita todo link antes de entregar, e hospital e clinica tem isso ligado por padrao. Citar 5,4% de clique como interesse humano seria um numero que **cai no primeiro investidor que perguntar como foi medido**.",
 "en": "**We do not use that metric, and the reason matters.** There were 1,173 clicks against 1,521 opens - **77% of those who opened clicked**. A human campaign runs between 5% and 15%. Seventy-seven per cent is the signature of a **security scanner**: the corporate antivirus opens the message and visits every link before delivering it, and hospitals and clinics have that on by default. Quoting a 5.4% click rate as human interest would be a number that **collapses with the first investor who asks how it was measured**.",
 "fonte": F_ELASTIC},

{"id": "ressalva-aberturas", "secao": "#fontes", "tags": ["ressalva", "metrica", "huntai"],
 "perguntas": ["qual a taxa de abertura", "quantos abriram", "open rate"],
 "pt": "**6,9% dos entregues, e isso e um piso, nao um total.** A abertura e medida por pixel de imagem, e quem bloqueia imagem no cliente de e-mail nunca conta. O curioso e que **o mesmo par de numeros erra para os dois lados**: a abertura e subcontada por bloqueio de imagem, e o clique e superestimado por varredor de seguranca. Por isso publicamos os dois com a ressalva, em vez de escolher o que fica bonito.",
 "en": "**6.9% of delivered, and that is a floor, not a total.** Opens are measured by a tracking pixel, and anyone blocking images in their mail client never counts. The interesting part is that **the same pair of numbers errs in both directions**: opens are under-counted by image blocking, and clicks are over-counted by security scanners. That is why we publish both with the caveat, rather than picking the flattering one.",
 "fonte": F_ELASTIC},

{"id": "ressalva-whatsapp", "secao": "#fontes", "tags": ["ressalva", "whatsapp", "metrica"],
 "perguntas": ["e o WhatsApp", "quantos contatos no WhatsApp", "o canal de WhatsApp funciona",
               "whatsapp results"],
 "pt": "Ha **mais de 150 contatos profissionais distintos** contados nas conversas entre janeiro e agosto de 2026, quase todos portugueses - e e o canal com mais conversa humana de toda a operacao. **Mas o numero nao e auditavel e por isso nao entra na pagina:** foi contado em captura de tela, nao em exportacao. Para virar numero publicavel precisa da exportacao da conversa e da contagem no arquivo. **Nao existe API para mensagem de conta pessoal** - a da Meta e so Business e so do momento da configuracao em diante.",
 "en": "There are **more than 150 distinct professional contacts** counted in conversations between January and August 2026, almost all Portuguese - and it is the channel with the most human conversation in the whole operation. **But the figure is not auditable and therefore does not go on the page:** it was counted from screenshots, not from an export. To become publishable it needs the conversation export and a count from the file. **There is no API for personal-account messages** - Meta's is Business-only and only from the moment it is set up.",
 "fonte": "Contagem em captura de tela, 22/08/2026 - piso declarado"},

{"id": "metricas-que-nao-usamos", "secao": "#fontes", "tags": ["metodo", "investidor", "ressalva"],
 "perguntas": ["quantos testes voces tem", "quantas linhas de codigo", "quantas telas",
               "quantos downloads", "quantos cadastrados", "vanity metrics"],
 "pt": "Nao publicamos **metrica de produto no lugar de metrica de mercado**, e essa e uma regra escrita. Ficam de fora: numero de testes, cobertura, linhas de codigo, numero de telas ou de rotas, quantidade de modelos de IA integrados, downloads, cadastrados sem uso diario, e grafico cumulativo. Sao numeros que sobem sozinhos com o tempo e nao dizem nada sobre quem paga. O que entra e o tamanho da **dor** com denominador, o tamanho do **mercado** contado de baixo para cima, e **quem paga**.",
 "en": "We do not publish **product metrics in place of market metrics**, and that is a written rule. Left out: number of tests, coverage, lines of code, number of screens or routes, how many AI models are integrated, downloads, sign-ups without daily use, and cumulative charts. Those are numbers that rise on their own with time and say nothing about who pays. What goes in is the size of the **pain** with a denominator, the size of the **market** counted bottom-up, and **who pays**.",
 "fonte": "Regra editorial 3BRAIN para material de investidor, ago/2026"},
]
