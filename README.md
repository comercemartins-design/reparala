# Repara Lá

Plataforma de manutenção sob demanda para residências, empresas e condomínios.

## Estrutura do Projeto

```
reparala/
├── apps/
│   ├── client-app/     # App do cliente (React Native/Expo)
│   ├── tech-app/       # App do técnico (React Native/Expo)
│   └── admin-web/      # Painel administrativo (Next.js)
├── packages/
│   ├── api/            # Backend (Node.js + Fastify)
│   ├── db/             # Schema do banco (Prisma)
│   └── shared/         # Tipos e utilitários compartilhados
```

## Configuração Inicial

### 1. Pré-requisitos
- Node.js 18+ → [nodejs.org](https://nodejs.org)
- pnpm → `npm install -g pnpm`
- Git → [git-scm.com](https://git-scm.com)

### 2. Clone e instale dependências
```bash
git clone https://github.com/comercemartins-design/reparala.git
cd reparala
pnpm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com suas chaves do Supabase
```

### 4. Configure o banco de dados
```bash
pnpm db:generate    # Gera o cliente Prisma
pnpm db:migrate     # Cria as tabelas no Supabase
```

### 5. Inicie o desenvolvimento
```bash
# Backend API
pnpm dev:api

# Admin Web
pnpm dev:admin

# App Cliente (em outro terminal)
pnpm dev:client

# App Técnico (em outro terminal)
pnpm dev:tech
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta (nunca expor) |
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `JWT_SECRET` | String aleatória para assinar tokens |

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cadastrar usuário |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Dados do usuário logado |
| POST | `/orders` | Abrir chamado |
| GET | `/orders` | Listar chamados |
| GET | `/orders/:id` | Detalhes do chamado |
| PATCH | `/orders/:id/assign` | Admin atribui técnico |
| PATCH | `/orders/:id/accept` | Técnico aceita |
| PATCH | `/orders/:id/reject` | Técnico recusa |
| PATCH | `/orders/:id/status` | Atualizar status |
| POST | `/orders/:id/media` | Salvar foto |
| POST | `/orders/:id/rate` | Avaliar serviço |
| GET | `/technicians` | Listar técnicos |
| POST | `/technicians` | Criar técnico |
| GET | `/clients` | Listar clientes |

## Deploy

- **API** → Railway (conectado ao GitHub, auto-deploy)
- **Admin Web** → Vercel (conectado ao GitHub, auto-deploy)
- **Apps Mobile** → Expo EAS Build

---

Desenvolvido com Node.js, Fastify, Prisma, Supabase, React Native/Expo e Next.js.
