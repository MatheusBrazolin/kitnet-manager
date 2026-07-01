# Gestor de Kitnets

Sistema de gestão de kitnets/imóveis para aluguel: cadastro de kitnets, inquilinos, controle de pagamentos e alertas de vencimento, com um dashboard geral.

🔗 **Aplicação online:** [kitnet-manager.onrender.com](https://kitnet-manager.onrender.com)

## Stack

- **Backend:** Django 4.2 + Django REST Framework, PostgreSQL (Supabase)
- **Frontend:** React 19 + Vite + Tailwind CSS, servido pelo próprio Django em produção (mesmo domínio, sem CORS)
- **Autenticação:** Token (DRF `TokenAuthentication`) — API totalmente protegida, sem acesso anônimo
- **Deploy:** Docker no [Render](https://render.com)

## Funcionalidades

- **Kitnets:** cadastro, status (alugada / vaga / manutenção), valor do aluguel, dia de vencimento
- **Inquilinos:** vínculo com kitnet, dados de contato, período de locação
- **Pagamentos:** controle de pendências, atrasos e histórico por kitnet
- **Alertas:** vencimentos próximos, pagamentos atrasados, kitnets vagas
- **Dashboard:** visão geral (ocupação, receita mensal, pendências)

## Rodando localmente

### Backend

```bash
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

cp .env.example .env           # e preencha com seus dados
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Variáveis de ambiente (`.env`), veja `.env.example`:

| Variável | Descrição |
|---|---|
| `SECRET_KEY` | Chave secreta do Django |
| `DEBUG` | `True` em desenvolvimento |
| `ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula |
| `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Conexão com o Postgres (uso local) — em produção, ver `DATABASE_URL` abaixo |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas pelo CORS (dev: o Vite roda em `http://localhost:5173`) |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

A API é consumida em `/api` — em desenvolvimento, configure o proxy do Vite ou aponte para `http://localhost:8000`.

## Deploy (Render)

O deploy é feito via Docker (`Dockerfile`), que builda o frontend e serve tudo pelo Django/Whitenoise. Configuração em `render.yaml`.

Variáveis de ambiente no Render (aba **Environment** do serviço):

| Variável | Valor |
|---|---|
| `SECRET_KEY` | gerado automaticamente pelo Render |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `.onrender.com` |
| `CORS_ALLOW_ALL_ORIGINS` | `False` |
| `DATABASE_URL` | connection string do Supabase (ver aviso abaixo) |

**⚠️ Atenção ao usuário na `DATABASE_URL` do Supabase:** ao conectar pelo *pooler* (`aws-0-us-east-1.pooler.supabase.com`), o usuário precisa ser `postgres.<ID_DO_PROJETO>` (ex: `postgres.qvqflzuodwscagytkynd`), **não** apenas `postgres`. Use a connection string da aba **Connect → Direct → Session pooler** no painel do Supabase. Usar só `postgres` causa `FATAL: password authentication failed`.

Formato esperado:
```
postgresql://postgres.<ID_DO_PROJETO>:<SENHA>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## Autenticação da API

Todos os endpoints exigem token:

```bash
# login
curl -X POST https://kitnet-manager.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "seu-usuario", "password": "sua-senha"}'
# -> {"token": "...", "username": "..."}

# uso do token
curl https://kitnet-manager.onrender.com/api/kitnets/ \
  -H "Authorization: Token SEU_TOKEN_AQUI"
```

## Estrutura do projeto

```
kitnet_manager/     # settings, urls, wsgi/asgi do Django
properties/         # app principal: models, views, serializers, admin
frontend/           # SPA React (Vite)
Dockerfile          # build unificado (frontend + backend) para deploy
render.yaml         # configuração do serviço no Render
```
