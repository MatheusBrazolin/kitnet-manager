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
- **Kitnets:** cadastro, número, valor do aluguel, status (`vaga` / `ocupada`, atualizado automaticamente conforme moradores)
- **Moradores:** vínculo com kitnet, nome e telefone
- **Pagamentos:** lançamento por morador, vencimento, status pago/pendente/atrasado
- **Dashboard:** total de kitnets, ocupação, valor mensal e próximos vencimentos

## Estrutura do projeto

```
backend/
├── src/
│   ├── modules/       # auth, users, kitnets, moradores, pagamentos, dashboard
│   ├── database/       # PrismaService/PrismaModule
│   ├── common/         # guards, decorators e utilitários compartilhados
│   └── main.ts
├── prisma/              # schema.prisma e migrations
└── Dockerfile

frontend/
├── src/
│   ├── pages/           # Login, Dashboard, Kitnets, Moradores, Pagamentos
│   ├── components/      # Sidebar, Header, Card, Table, Modal
│   ├── services/        # api.ts (axios)
│   ├── context/         # AuthContext
│   ├── hooks/           # useAuth
│   └── types/
└── Dockerfile

docker-compose.yml
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
cp .env.example .env    # aponte VITE_API_URL para a API
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
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Seu Nome","email":"voce@exemplo.com","password":"senha123"}'
# -> {"token": "...", "user": {...}}

# uso do token
curl http://localhost:3000/kitnets \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Deploy (Vercel)

Backend e frontend são dois projetos Vercel separados, apontando pro mesmo repositório GitHub — sem servidor "dormindo", sem cartão de crédito.

### 1. Backend

1. No Vercel, **Add New → Project** → importe o repo → em **Root Directory** escolha `backend`.
2. O Vercel detecta o `vercel.json` e builda `src/lambda.ts` como função serverless (roda `npx prisma generate` no build).
3. Em **Environment Variables**, adicione: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (ex: `7d`), `CORS_ORIGIN` (a URL do projeto do frontend, ex: `https://kitmanager-frontend.vercel.app`).
4. Deploy. A URL gerada (ex: `https://kitmanager-api.vercel.app`) é a API.

**Migrações:** o Vercel não roda `prisma migrate deploy` sozinho (não tem um passo de "start" como o Docker). Rode localmente antes de cada deploy com schema novo:
```bash
cd backend
DATABASE_URL="<url-de-produção>" npx prisma migrate deploy
```

### 2. Frontend

1. **Add New → Project** → mesmo repo → **Root Directory** = `frontend`.
2. O Vercel detecta Vite automaticamente.
3. Em **Environment Variables**, adicione `VITE_API_URL` com a URL do backend (etapa anterior). Como é usada em build-time, qualquer troca exige um redeploy.
4. Deploy.

### Limitação a saber

O rate-limiting do login/registro (`@nestjs/throttler`) guarda tentativas em memória. Como cada instância serverless pode ser nova, o limite reseta entre cold starts — não é um problema de segurança grave pra uso pessoal, só não é tão rígido quanto num servidor sempre ligado.

### Alternativa: Docker (self-host)

Os `Dockerfile`s de `backend/` e `frontend/` e o `docker-compose.yml` continuam funcionando pra quem preferir um servidor tradicional (Render, Railway, Fly.io, VPS) em vez de serverless — nesse caso o backend roda `prisma migrate deploy` sozinho no start.
