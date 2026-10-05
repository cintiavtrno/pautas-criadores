# Espelho de pautas

Sistema para organizar a campanha com criadores: lista de criadores separada por nicho, banco de pautas, distribuição (pauta definida ou criador escolhe entre opções), equipe de roteiro/edição e um quadro de acompanhamento.

- **Backend:** Node.js + Express (`server.js`), API REST em `/api/...`
- **Frontend:** HTML/CSS/JS puro em `public/`
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
  - `APP_PASSWORD` = uma senha para a equipe (quem abrir o link digita qualquer usuário e essa senha)
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
