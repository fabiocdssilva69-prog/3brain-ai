# Ponte de IA da landing — como subir

O que isto é: um Cloudflare Worker que fica entre a página (pública, no GitHub Pages) e o
modelo. **A chave de API mora aqui e em nenhum outro lugar.** A página nunca a vê.

Custo: **R$ 0**. Workers free (100.000 requisições/dia), Groq free, Workers AI free
(10.000 neurons/dia). Nenhum dos três cobra ao estourar — todos param.

---

## Subir pela primeira vez (~15 min)

Precisa de Node instalado e de uma conta Cloudflare (grátis, sem cartão).

```bash
cd 3brain-ai/worker
npm install -g wrangler        # precisa ser >= 4.36 por causa do rate limit
wrangler login                 # abre o navegador
```

### 1. Pegue a chave da Groq
console.groq.com → API Keys → Create API Key. Copie — ela só aparece uma vez.

### 2. Publique ANTES de gravar o segredo

Esta ordem não é gosto: `wrangler secret put` **exige que o Worker já exista** na conta.
Ao contrário, você trava num impasse: o deploy falha porque falta o segredo, e o segredo
não entra porque falta o Worker.

```bash
wrangler deploy                      # 1º deploy, ainda sem chave
wrangler secret put GROQ_API_KEY     # cola a chave quando ele pedir
wrangler deploy                      # sobe de novo, agora com a chave
```

Depois de gravada, a chave fica **ilegível até para você** no painel. Quem invadir o painel
também não a lê.

O comando imprime a URL: `https://3brain-api.<seu-subdominio>.workers.dev`. Teste:

```bash
curl -X POST https://3brain-api.SEU.workers.dev \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://fabiocdssilva69-prog.github.io' \
  -d '{"pergunta":"o que e o SAVI?","idioma":"pt","contexto":[{"texto":"O SAVI captura dado clinico por microfone e imagem.","fonte":"teste"}]}'
```

Tem que voltar `{"texto":"...","motor":"groq"}`.

### 3. Aponte a página para ele

Em `assistente.js`, no topo, troque:

```js
var API = '';                          // vazio = só base local
var API = 'https://3brain-api.SEU.workers.dev';   // com o Worker
```

Commit e push. Pronto.

---

## Depois, quando quiser (nada disso é obrigatório)

### Domínio próprio
Quando `3brain.com.br` estiver na Cloudflare com a zona **Active**, descomente o bloco
`routes` do `wrangler.jsonc` e rode `wrangler deploy`. Ele cria DNS e certificado sozinho.

⚠️ Confira antes que **não exista** registro DNS para `api.3brain.com.br`. Custom Domain não
sobe em cima de CNAME existente, e o erro que ele dá não diz isso.

### Turnstile (o captcha invisível)
O Worker já aceita, mas **só liga se o segredo existir** — sem ele, sobe e funciona.
Dashboard → Turnstile → Add widget. Cadastre **os dois** hostnames:
`fabiocdssilva69-prog.github.io` **e** `3brain.com.br`. Esquecer o primeiro dá
`invalid-input-response` e você caça o bug no lugar errado.

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

⚠️ O token do Turnstile é de **uso único e dura 300 s**. Se a página mandar o mesmo token em
duas mensagens, a segunda volta `timeout-or-duplicate`. Ou chama `turnstile.reset()` a cada
envio, ou o Worker emite um cookie de sessão curto. Não deixei nada disso ligado ainda.

### AI Gateway (cache, teto e observabilidade)
Dashboard → AI → Create Gateway, nome `landing`. Depois:

```bash
wrangler secret put CF_ACCOUNT_ID
wrangler secret put CF_GATEWAY      # o nome do gateway
```

Só a URL base muda; o Worker já trata. Lá dentro dá para pôr teto por hora e ver cada
chamada.

⚠️ **Para o SAVI, use outra conta Cloudflare.** O token do AI Gateway é escopado na conta
inteira — não dá para restringir a um gateway. Misturar as duas significa que um token da
landing alcança o gateway do produto clínico.

---

## Os limites que importam

| | teto | ao estourar |
|---|---|---|
| Groq free | **8.000 tokens/min** e 200.000/dia | 429, não cobra |
| Workers free | 100.000 req/dia · **10 ms de CPU** | erro 1027, não cobra |
| Workers AI free | 10.000 neurons/dia (~600 turnos) | erro, não cobra |

**O teto real da Groq é token, não requisição.** Os 30 pedidos/minuto que aparecem na
documentação são folclore para este caso: com ~1.100 tokens por turno, o limite verdadeiro
é de **6 a 7 turnos por minuto**. É por isso que o prompt de sistema é curto, o histórico
para em 3 turnos e o contexto para em 3 entradas — cada uma dessas travas está fixada **no
servidor**, para que nada que a página mande possa aumentar o gasto.

Os 10 ms de CPU do plano free assustam mas não mordem: **espera de rede não conta**, e este
Worker praticamente só espera. Ele passaria a contar se eu ficasse remontando o texto do
stream em JavaScript — que é uma das razões de a resposta não vir em streaming.

## Se der errado

| sintoma | causa |
|---|---|
| `{"erro":"origem"}` 403 | a origem não está em `ORIGENS` no `wrangler.jsonc` |
| `{"erro":"cota"}` 429 | o rate limit pegou. 3 por 10 s, 10 por minuto, por visitante |
| `{"erro":"motores"}` 503 | Groq e Workers AI falharam — **a página cai na base local sozinha** |
| resposta com o "pensamento" do modelo | `reasoning_format: "hidden"` saiu do código |
| `wrangler deploy` reclama de rate limit | wrangler abaixo de 4.36 |
