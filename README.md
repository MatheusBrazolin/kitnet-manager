# KitManager

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

### Frontend

```bash
cd frontend
npm install
cp .env.example .env    # aponte VITE_API_URL para http://localhost:3000/api
npm run dev
```

O app sobe em `http://localhost:5173`.

### Com Docker

```bash
JWT_SECRET=um-segredo-forte docker compose up --build
```

Sobe Postgres local, backend (`:3000`) e frontend (`:5173`).

## Testes

```bash
cd backend
npm test          # testes unitários dos services
npm run test:e2e  # testes e2e (guards, validação)
```

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
2. Em **Environment Variables** do projeto, adicione: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (ex: `7d`).
3. Deploy.

Não precisa configurar `VITE_API_URL` nem `CORS_ORIGIN` em produção — como front e back respondem no mesmo domínio, o frontend já chama `/api` por padrão.

> `backend/src/main.ts` sempre sobe com `app.listen()` — localmente, no Docker/VPS e também na Vercel, cujo runtime de services intercepta esse listen e roteia as requisições para a função por trás dos panos (zero-config para NestJS).

Pra rodar os dois serviços localmente do jeito que a Vercel roda em produção: `vercel dev` (requer Vercel CLI ≥ 48.4.0).

**Migrações:** o Vercel não roda `prisma migrate deploy` sozinho. Rode localmente antes de cada deploy com schema novo:
```bash
cd backend
DATABASE_URL="<url-de-produção>" npx prisma migrate deploy
```

### Limitação a saber

O rate-limiting do login/registro (`@nestjs/throttler`) guarda tentativas em memória do processo. Não é um problema de segurança grave pra uso pessoal, só vale saber que reinícios do serviço zeram o contador.

### Alternativa: Docker (self-host)

Os `Dockerfile`s de `backend/` e `frontend/` e o `docker-compose.yml` continuam funcionando pra quem preferir um servidor tradicional (Fly.io, VPS) — nesse caso o backend roda `prisma migrate deploy` sozinho no start, e o nginx do frontend faz proxy de `/api` pro container do backend.
