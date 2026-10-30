# KitManager

[![CI](https://github.com/MatheusBrazolin/kitnet-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusBrazolin/kitnet-manager/actions/workflows/ci.yml)
[![Verify deploy config](https://github.com/MatheusBrazolin/kitnet-manager/actions/workflows/verify-deploy-config.yml/badge.svg)](https://github.com/MatheusBrazolin/kitnet-manager/actions/workflows/verify-deploy-config.yml)
![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel&logoColor=white)

SaaS de gestão de kitnets: cadastro de kitnets, moradores e controle de pagamentos, com dashboard geral e planos por usuário (FREE / PRO).

## Stack

- **Backend:** NestJS + TypeScript, PostgreSQL, Prisma ORM
- **Frontend:** React 19 + TypeScript + Vite
- **Autenticação:** JWT (`@nestjs/jwt` + `passport-jwt` + `bcrypt`)
- **Deploy:** Vercel (frontend estático + backend como função serverless) + PostgreSQL na nuvem (Supabase)

## Funcionalidades

- **Contas de usuário:** cada dono de kitnets tem sua própria conta; dados isolados por usuário
- **Planos:** FREE (até 3 kitnets) e PRO (até 50 kitnets)
- **Imóveis:** agrupam as kitnets (nome, endereço)
- **Kitnets:** cadastro, número, valor do aluguel, status (`vaga` / `ocupada`, atualizado automaticamente conforme moradores)
- **Moradores:** vínculo com kitnet, nome, telefone e dia de vencimento do aluguel
- **Pagamentos:** um lançamento por morador/mês de competência, vencimento, status pago/pendente/atrasado
- **Gastos:** despesas por kitnet (descrição, valor, data)
- **Equipe (membros):** convite de outras pessoas para a conta, com papel `GERENTE` (acesso total) ou `VISUALIZADOR` (somente leitura)
- **Dashboard:** total de kitnets, ocupação, valor mensal e próximos vencimentos

## Estrutura do projeto

```
backend/
├── src/
│   ├── modules/         # auth, users, imoveis, kitnets, moradores, gastos,
│   │                    # pagamentos, membros, dashboard
│   ├── database/        # PrismaService/PrismaModule
│   ├── common/          # guards, decorators, ContaService e utilitários
│   │                    # compartilhados entre módulos
│   ├── config/          # configuração tipada (ex: JWT)
│   ├── app.ts           # bootstrap da aplicação Nest (usado por main.ts e pelos testes e2e)
│   └── main.ts
├── prisma/               # schema.prisma e migrations
└── Dockerfile

frontend/
├── src/
│   ├── pages/            # Login, Dashboard, Imoveis, Moradores, Gastos,
│   │                     # Pagamentos, Equipe
│   ├── components/       # Sidebar, Header, Card, Table, Modal, ConfirmDialog,
│   │                     # KitnetDetailModal, MoradorDetailModal, NotificationBell,
│   │                     # PasswordField, UnitPicker, charts/
│   ├── services/         # api.ts (axios)
│   ├── context/          # AuthContext
│   ├── hooks/            # useAuth
│   ├── styles/           # tokens e estilos globais
│   ├── utils/
│   └── types/
└── Dockerfile

docker-compose.yml
vercel.json           # config de deploy (frontend estático + backend serverless num só projeto Vercel)
```

## Rodando localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env    # preencha DATABASE_URL e JWT_SECRET
npx prisma migrate dev
npm run start:dev
```

A API sobe em `http://localhost:3000`.

Variáveis de ambiente (`backend/.env`):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `JWT_SECRET` | Segredo usado para assinar os tokens JWT |
| `JWT_EXPIRES_IN` | Validade do token (ex: `7d`) |
| `PORT` | Porta da API (padrão `3000`) |
| `CORS_ORIGIN` | Origem do frontend permitida no CORS |
| `LOG_LEVEL` | Nível do logger (`debug`, `info`, `warn`, `error`; padrão `info`) |
| `SENTRY_DSN` | Opcional. DSN do [Sentry](https://sentry.io) para monitoramento de erros. Sem essa variável o Sentry fica desativado |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env    # aponte VITE_API_URL para http://localhost:3000/api
npm run dev
```

O app sobe em `http://localhost:5173`.

Variáveis de ambiente (`frontend/.env`):

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API |
| `VITE_SENTRY_DSN` | Opcional. DSN do Sentry para o frontend — sem ela, o SDK nem entra no bundle final |

### Com Docker

```bash
JWT_SECRET=um-segredo-forte docker compose up --build
```

Sobe Postgres local, backend (`:3000`) e frontend (`:5173`).

## Testes

```bash
cd backend
npm test          # testes unitários dos services
npm run test:e2e  # testes e2e (guards, validação) — precisa de Postgres
npm run lint      # verifica (não corrige; use lint:fix pra corrigir)
npm run typecheck
```

```bash
cd frontend
npm test          # vitest (utils, componentes, contexto de auth)
npm run lint
npm run typecheck
```

O CI roda lint, typecheck, testes e build dos dois lados em todo PR.

## Autenticação da API

```bash
# criar conta
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Seu Nome","email":"voce@exemplo.com","password":"senha123"}'
# -> {"token": "...", "user": {...}}

# uso do token
curl http://localhost:3000/api/kitnets \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Deploy (Vercel — projeto único, mesma origem)

Frontend e backend sobem juntos num único projeto Vercel usando o modelo de **services**, definido pelo `vercel.json` na raiz do repo:

- `frontend` (`root: frontend`, `framework: vite`) → build estático do Vite;
- `backend` (`root: backend`) → NestJS detectado automaticamente pela Vercel (entrypoint `src/main.ts`) e publicado como Vercel Function.

> ⚠️ **Não remova o `buildCommand` do serviço `backend` no `vercel.json`.** Ele existe de propósito, é um no-op (`echo ...`). Sem ele, a Vercel roda o script `"build": "nest build"` do `backend/package.json` **antes** da própria detecção zero-config de NestJS — o resultado é um build "sem função deployável" e todo request na API quebra em produção com `FUNCTION_INVOCATION_FAILED: Cannot find module '@nestjs/common'` (mesmo com a dependência certinha no `package.json`). Isso já aconteceu várias vezes neste projeto; se for tocar no `vercel.json`, mantenha esse override. Ver commit `c6c0c95`.
>
> Há uma trava automática pra isso: `scripts/verify-vercel-config.js`, rodado em CI (`.github/workflows/verify-deploy-config.yml`) a cada push/PR que toque em `vercel.json` ou `backend/package.json`. Se essa checagem falhar, é sinal de que o `buildCommand` do backend voltou a ficar arriscado.

Os `rewrites` no topo do `vercel.json` expõem os dois serviços publicamente: `/api/*` vai pro `backend`, o resto vai pro `frontend` — tudo na mesma origem, sem CORS.

1. No Vercel, **Add New → Project** → importe o repo. Ele detecta os dois serviços (frontend/backend) automaticamente a partir do `vercel.json` (deixe o *Root Directory* como a raiz do repositório).
2. Em **Environment Variables** do projeto, adicione: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (ex: `7d`). Opcionalmente, `SENTRY_DSN` e `VITE_SENTRY_DSN` para monitoramento de erros.
3. Deploy.

Não precisa configurar `VITE_API_URL` nem `CORS_ORIGIN` em produção — como front e back respondem no mesmo domínio, o frontend já chama `/api` por padrão.

> `backend/src/main.ts` sempre sobe com `app.listen()` — localmente, no Docker/VPS e também na Vercel, cujo runtime de services intercepta esse listen e roteia as requisições para a função por trás dos panos (zero-config para NestJS).

Pra rodar os dois serviços localmente do jeito que a Vercel roda em produção: `vercel dev` (requer Vercel CLI ≥ 48.4.0).

**Migrações:** o Vercel não roda `prisma migrate deploy` sozinho. Isso é automatizado pelo workflow
[`migrate-production.yml`](.github/workflows/migrate-production.yml), que roda a cada push no `master`
que toque `backend/prisma/` — e também pode ser disparado à mão pelo painel do Actions.

Para funcionar, ele precisa do secret **`DATABASE_URL_PRODUCTION`** em
*Settings → Secrets and variables → Actions*. Sem o secret, o job para com um aviso em vez de
falhar com erro de conexão confuso.

Se precisar aplicar à mão (ex.: antes de configurar o secret):
```bash
cd backend
DATABASE_URL="<url-de-produção>" npx prisma migrate deploy
```

**Se o Prisma disser "migration was modified after it was applied":** ele guarda o SHA-256 de cada
arquivo no momento em que o aplicou, e recusa a rodar se o arquivo mudou depois — editado antes de
commitar, recriado, ou inserido à mão no SQL editor sem a soma certa.

A saída que ele oferece nessa hora é `prisma migrate reset`, que **apaga o banco inteiro**. Quase
nunca é o que se quer: se o esquema do banco já corresponde ao que as migrações produzem, o
problema é só o registro da soma. Para conferir e consertar sem tocar nos dados:

```bash
cd backend
node scripts/conferir-migracoes.js              # só relata
node scripts/conferir-migracoes.js --corrigir   # atualiza as somas divergentes
```

O script se recusa a corrigir quando o banco **não** bate com o `schema.prisma`: aí a divergência
pode ser real (DDL que nunca foi aplicada), e reescrever a soma esconderia o problema. Também serve
para olhar produção, passando a URL na frente:
`DATABASE_URL="<url>" node scripts/conferir-migracoes.js`.

**Variáveis obrigatórias:** `DATABASE_URL` e `JWT_SECRET` são conferidas no boot
([`env.validation.ts`](backend/src/config/env.validation.ts)). Faltando alguma, a API não sobe e o log
diz exatamente qual é e onde arrumar — em vez de morrer com um stack trace de dentro do `passport-jwt`.
Na Vercel, confira que estão marcadas para o ambiente **Production**.

**Diagnóstico de pane:** `GET /api/health` responde mesmo com o banco fora (o Prisma conecta
preguiçosamente, na primeira query). `200` com `database: "up"` quer dizer tudo certo; `503` com
`database: "down"` e uma `causa` quer dizer que a aplicação subiu mas o banco não respondeu. Se nem
essa rota responder, o problema é anterior: a função não subiu.

### Limitação a saber

O rate-limiting do login/registro (`@nestjs/throttler`) guarda tentativas em memória do processo. Não é um problema de segurança grave pra uso pessoal, só vale saber que reinícios do serviço zeram o contador.

### Alternativa: Docker (self-host)

Os `Dockerfile`s de `backend/` e `frontend/` e o `docker-compose.yml` continuam funcionando pra quem preferir um servidor tradicional (Fly.io, VPS) — nesse caso o backend roda `prisma migrate deploy` sozinho no start, e o nginx do frontend faz proxy de `/api` pro container do backend.
