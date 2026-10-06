# seu voto decide

Sistema para organizar a campanha com criadores: lista de criadores separada por nicho, banco de pautas, distribuição (pauta definida ou criador escolhe entre opções), equipe de roteiro/edição e um quadro de acompanhamento.

- **Backend:** Node.js + Express (`server.js`), login em `auth.js`, travas em `security.js`
- **Frontend:** HTML/CSS/JS puro em `public/`

## Endereços

| Endereço | Quem usa | O que é |
|---|---|---|
| `/` | público | página inicial: "sou criador" ou "não sou criador" |
| `/participar` | público | cadastro (dois caminhos) |
| `/p/<link>` | cada participante | painel pessoal: pautas, roteiro, materiais, link do vídeo, ideias |
| `/enviar-video` | público | formulário aberto para mandar o link do vídeo, sem precisar de cadastro |
| `/admin` | equipe | controle interno com login individual |

O link do grupo do WhatsApp e o link do material das pautas são colados na aba **Ajustes** do controle interno. Eles aparecem logo depois do cadastro e no painel pessoal.

No controle interno, administradoras veem tudo. Quem tem acesso de **equipe** vê só as tarefas de produção que estão com ela.

**Primeiro acesso:** os logins `cintia`, `camilla` e `yara` são criados sozinhos, com a senha que estiver em `APP_PASSWORD` no Render. Cada uma troca a senha no primeiro login. Os acessos do resto da equipe já vêm criados (veja `acessosEquipe` no `seed.js`) e os novos são criados na aba Equipe. Todo mundo entra pela primeira vez com a mesma senha do `APP_PASSWORD` e cria a sua. "Redefinir senha" também volta para essa senha comum.
- **Banco:** Postgres quando existe `DATABASE_URL`; sem ela, salva em `data/db.json` (só para testar no computador)

Na primeira vez que o sistema sobe, ele já carrega os 20 criadores mapeados e os nichos. Se no futuro entrarem criadores novos no `seed.js`, eles são acrescentados no próximo deploy; quem vocês apagaram não volta. O campo **Sugestão de linha** vem em branco para a Camilla e a Yara preencherem direto na ficha (tudo salva sozinho).

## Rodar no computador

```bash
npm install
npm start
# abre http://localhost:3000
```

## Subir no Render (conta que já tem outro serviço)

O sistema é um serviço novo, separado do backend que já roda lá. Nada do outro é mexido.

**1. Banco de dados**
- Se já existe um Postgres na conta, pode reaproveitar: o sistema cria só a tabela `pautas_records` e não toca no resto. Copie a **Internal Database URL** dele.
- Se não existe: **New + → Postgres** → nome `pautas-db`, mesma região do serviço, plano Free → **Create Database**. Copie a **Internal Database URL**.
- O plano gratuito permite um Postgres por conta e ele expira depois de um tempo (o Render avisa na tela). Para algo permanente, use o plano pago ou um Postgres gratuito do Neon (neon.tech), colando a URL dele.

**2. Serviço web**
- **New + → Web Service** → conecte o repositório do GitHub.
- Language: `Node` · Branch: `main` · Build Command: `npm install` · Start Command: `npm start` · Instance: Free.
- Em **Environment Variables**:
  - `DATABASE_URL` = a Internal Database URL do passo 1
  - `APP_PASSWORD` = senha inicial das administradoras (cintia, camilla, yara); cada uma troca no primeiro login
- Em **Advanced → Health Check Path**: `/health`
- **Create Web Service**. Em uns 2 minutos o endereço `….onrender.com` fica no ar.

Cada `git push` na branch `main` atualiza o site sozinho. Os dados ficam no banco, então não se perdem no deploy.

O serviço gratuito dorme depois de ~15 min parado; o primeiro acesso depois disso leva uns 30 a 50 segundos.

O arquivo `render.yaml` é opcional (serve para criar tudo de uma vez pelo Blueprint). Seguindo os passos acima, pode ignorar.

## Telas

| Aba | Para quê |
|---|---|
| Criadores | Lista por nicho à esquerda, ficha do criador à direita: sugestão de linha, status, contato, roteiro, edição e pauta |
| Pautas | Banco de pautas por nicho, com linha sugerida e criador associado |
| Quadro | Kanban por status (Mapeado → Contatado → Topou → Em roteiro → Em edição → Publicado / Recusou). Arraste para mover; clique abre a ficha do criador |
| Equipe | Pessoas de roteiro/edição e quem está com cada uma |
| Nichos | Criar, renomear e colorir categorias |

Criadores e pautas podem ser exportados em CSV (abre no Excel ou Google Sheets).

## Segurança

- Login individual com senha guardada em hash (scrypt) e sessão em cookie protegido. 10 senhas erradas bloqueiam aquele IP e aquele login por 15 minutos.
- Links pessoais longos e aleatórios. Quem se cadastra com o @ de um criador que já está na lista não recebe o link dele: a equipe confere e envia.
- Limite de requisições por IP (600 a cada 5 min no geral; 5 inscrições a cada 10 min) e teto de 300 inscrições por hora no site todo.
- Formulário com campo-armadilha invisível e trava de tempo (envio em menos de 2,5 s é descartado como robô).
- Quem já está na lista não tem o contato sobrescrito por uma inscrição nova com o mesmo @.
- Cabeçalhos de proteção (CSP, anti-iframe, HSTS) e exportação CSV protegida contra fórmulas maliciosas.
- Verificação anti-robô opcional da Cloudflare (Turnstile): crie um widget grátis em dash.cloudflare.com → Turnstile, e coloque `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET` nas variáveis do Render. Sem elas, o formulário funciona sem a verificação.
