# Bot Afiliado para Discord

Bot em **Node.js + discord.js v14** que recebe uma URL de produto, usa somente APIs oficiais para obter os dados e cria/publica embeds de ofertas. Não há scraping nem Puppeteer.

> Antes de publicar, valide as regras, aprovação da conta e o formato de assinatura exibidos no painel da sua aplicação. As APIs de afiliados podem habilitar métodos, campos e endpoints diferentes por país/conta.

## Recursos

- `/afiliado link:<url>`: retorna um embed privado com o link rastreado.
- `/postar link:<url>`: evita produto repetido em SQLite e manda a oferta ao `CANAL_POSTAGEM_ID`.
- `/definir-afiliado-ml parametros:<query-string>`: administrador configura os parâmetros do Mercado Livre sem editar código; o valor fica no SQLite e substitui `ML_AFFILIATE_PARAMS`.
- Retentativas com backoff para timeouts, HTTP 429 e erros 5xx.
- Serviços separados em `services/`, comandos em `commands/` e cache/HTTP/embeds em `utils/`.

## Credenciais oficiais

### Shopee

1. Crie/cadastre a aplicação e solicite acesso ao **Shopee Affiliate Open API** no portal Shopee Open Platform/Affiliate da região.
2. Copie o **App ID** e **App Secret** aprovados para `SHOPEE_APP_ID` e `SHOPEE_APP_SECRET`.
3. Copie do painel/documentação regional a URL GraphQL autorizada para `SHOPEE_API_URL`.

O serviço envia o JSON GraphQL exatamente como assinado e calcula `HMAC-SHA256(payload, App Secret)`, colocando App ID e assinatura nos headers. O `productOfferV2` fornece o produto e `generateShortLink` o link curto. Caso o portal da sua conta exija nomes de header, mutation ou endpoint distintos, altere-os somente em `services/shopee.js`, mantendo a assinatura de acordo com a documentação exibida para sua aplicação.

### AliExpress

1. Cadastre-se no **AliExpress Affiliate Portal/Open Platform** e crie uma app para receber **App Key**, **App Secret** e **Tracking ID**.
2. Habilite os métodos `aliexpress.affiliate.link.generate` e `aliexpress.affiliate.product.detail.get` no painel.
3. Preencha as três variáveis `ALIEXPRESS_*`; se necessário, forneça a URL regional oficial em `ALIEXPRESS_API_URL`.

A assinatura MD5 implementada concatena `App Secret + parâmetros ordenados (chave+valor) + App Secret`, em hexadecimal maiúsculo. `sign` e `sign_method` não entram no hash. Isso fica isolado e comentado em `services/aliexpress.js`.

### Mercado Livre

1. Entre no portal **Mercado Livre Afiliados** e obtenha seus parâmetros rastreáveis, como `matt_word` e `matt_tool`.
2. Defina `ML_AFFILIATE_PARAMS=matt_word=...&matt_tool=...` ou execute `/definir-afiliado-ml` como administrador.
3. O bot consulta os dados públicos em `https://api.mercadolibre.com/items/{item_id}`. `ML_ACCESS_TOKEN` é opcional e enviado como Bearer se definido.

O Mercado Livre não possui endpoint público para criar link de afiliado. Portanto, o bot preserva o permalink oficial do item e anexa **somente** os parâmetros fornecidos por você; ele não inventa códigos de rastreamento.

## Configuração local

```bash
cp .env.example .env
# edite .env com credenciais e IDs reais
npm install
npm run register
npm start
```

`DISCORD_GUILD_ID` é recomendado inicialmente: os comandos aparecem quase imediatamente no servidor de testes. Sem ele, o registro é global e pode levar até uma hora para propagar. Para obter os IDs, ative o modo de desenvolvedor no Discord; o bot precisa de escopos `bot` e `applications.commands`, permissão para enviar mensagens e incorporar links no canal de postagem.

Principais variáveis:

| Variável | Uso |
| --- | --- |
| `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` | login e registro dos comandos |
| `DISCORD_GUILD_ID` | opcional, acelera testes |
| `CANAL_POSTAGEM_ID` | canal que recebe `/postar` |
| `DATABASE_PATH` | padrão `./data/botafiliado.sqlite` |
| `REQUEST_TIMEOUT_MS` | timeout HTTP, padrão 15000 |

## Docker (mini PC/ZimaOS)

A imagem usa `node:20-alpine`, dependências de produção, usuário sem privilégios e um volume local mínimo para SQLite.

```bash
cp .env.example .env
# configure .env e registre os comandos uma vez (localmente ou com node no container)
docker compose up -d --build
docker compose logs -f
```

O diretório `./data` persiste o histórico de postagens e a configuração do Mercado Livre. Para registrar dentro da imagem: `docker compose run --rm botafiliado npm run register`.

## Operação e erros

- A deduplicação é por plataforma + ID do produto e só grava após a mensagem ser enviada com sucesso.
- Erros de assinatura, credenciais inválidas, token expirado ou produto inexistente retornam uma mensagem privada com o texto da API quando disponível.
- Para rate limit (429), indisponibilidade 5xx e falhas de rede, há até três retentativas com espera exponencial. Falhas 4xx não transitórias não são repetidas.
- Nunca inclua `.env` no Git. Rotacione segredos que tenham sido expostos.

## Testes

```bash
npm test
```

## Painel de configuração web

O container também inicia um processo Express leve para configuração local. Defina estas variáveis **no `.env` antes da primeira inicialização**:

```dotenv
WEB_PORT=3000
WEB_ADMIN_USER=admin
WEB_ADMIN_PASSWORD=use-uma-senha-longa-e-unica
```

Com o Compose em execução, acesse `http://<ip-do-servidor>:3000` e autentique com HTTP Basic Auth. O painel permite salvar as credenciais do Discord, Shopee, AliExpress e Mercado Livre, canal de postagem, timeout e caminho do banco. Os valores são armazenados na tabela SQLite `settings`; eles têm prioridade sobre o `.env`. Assim, quem já usa apenas `.env` continua compatível, enquanto configurações alteradas no painel são usadas nas próximas chamadas às APIs sem editar arquivo ou reiniciar o container.

Segredos e tokens aparecem apenas como `••••••••`: deixe o campo vazio para preservar o segredo atual ou digite um novo valor para substituí-lo. O placeholder nunca é persistido. A tela também oferece verificações de conectividade por plataforma; Discord valida o token em `/users/@me`, e Mercado Livre faz uma chamada pública simples.

> **Segurança:** o painel expõe configuração sensível. Não publique a porta `WEB_PORT` diretamente na internet. Restrinja-a à rede local ou coloque-a atrás de um proxy reverso HTTPS com autenticação adicional, como Cloudflare Tunnel. `WEB_ADMIN_USER` e `WEB_ADMIN_PASSWORD` continuam no `.env` porque são necessários para proteger o painel antes de abrir o SQLite.

O `docker-compose.yml` publica `${WEB_PORT:-3000}` e mantém apenas um serviço/container. Internamente, o processo do bot e o processo web usam a mesma imagem e o mesmo volume SQLite, mantendo o consumo adequado para o Celeron J1800.
