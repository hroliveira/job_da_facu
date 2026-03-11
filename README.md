# 🎓 Academic Work Manager

SaaS para gerenciamento de trabalhos acadêmicos, alunos, pagamentos e arquivos.

## ⚡ Setup em 5 Passos

### 1. Criar conta no Supabase
Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito.

### 2. Configurar o banco de dados
No painel do Supabase → **SQL Editor** → cole e execute o conteúdo de `sql/schema.sql`.

### 3. Criar o bucket de arquivos
No painel → **Storage** → **New Bucket** → Nome: `work-files` → **Private** (não público).

Em seguida, no SQL Editor, execute:
```sql
insert into storage.buckets (id, name, public) values ('work-files', 'work-files', false)
on conflict do nothing;

create policy "storage_select" on storage.objects
  for select using (bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_insert" on storage.objects
  for insert with check (bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_delete" on storage.objects
  for delete using (bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Configurar as credenciais no `.env`
No painel do Supabase → **Settings** → **API** → copie:
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`

Crie o arquivo `.env` na raiz do projeto (copie de `.env.example` se existir):
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

### 5. Instalar dependências e iniciar
```bash
# Instalar dependências
npm install

# Modo desenvolvimento (recarrega automático)
npm run dev

# Ou modo produção
npm start
```

Acesse em `http://localhost:3000`

---

## 🐳 Com Docker

### Build e rodas
```bash
# Build e inicia em background
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down
```

Acesse em `http://localhost:3000`

**Requisitos:** Docker e Docker Compose instalados

---

## 📂 Estrutura do Projeto

```
/job_da_facu
  ├── server.js             ← Servidor Express + SPA
  ├── package.json          ← Dependências
  ├── .env                  ← Credenciais (gitignored)
  ├── .env.example          ← Template
  ├── Dockerfile            ← Build multi-stage
  ├── docker-compose.yml    ← Orquestração
  │
  ├── index.html            ← Página de Login/Signup
  ├── app.html              ← SPA Principal (roteador + layout)
  │
  ├── api/                  ← Backend Express
  │   ├── index.js          ← Router principal
  │   ├── auth.js           ← Autenticação Supabase
  │   ├── students.js
  │   ├── works.js
  │   ├── payments.js
  │   ├── files.js
  │   ├── dashboard.js
  │   ├── team.js
  │   └── middleware/
  │       └── auth.js       ← Auth guard para rotas
  │
  ├── src/
  │   ├── services/         ← Cliente Supabase
  │   │   ├── supabaseClient.js    (obtém config de /api/config)
  │   │   ├── authService.js
  │   │   ├── studentService.js
  │   │   ├── workService.js
  │   │   ├── paymentService.js
  │   │   ├── fileService.js
  │   │   ├── dashboardService.js
  │   │   └── teamService.js
  │   ├── views/            ← Módulos de cada página
  │   │   ├── dashboard.js
  │   │   ├── students.js
  │   │   ├── works.js
  │   │   ├── finance.js
  │   │   ├── settings.js
  │   │   └── team.js
  │   └── utils/            ← Funções utilitárias
  │       ├── dateHelpers.js
  │       ├── statusHelpers.js
  │       └── uiHelpers.js
  │
  ├── sql/
  │   └── schema.sql        ← DDL + RLS Policies
  │
  └── stitch/               ← Layouts originais (referência)
```

## 🗂️ Funcionalidades

| Módulo | Features |
|--------|----------|
| **Autenticação** | Login, Cadastro, Logout, Sessão persistente |
| **Alunos** | CRUD completo, Busca, Paginação, Perfil com trabalhos |
| **Trabalhos** | Kanban, Filtros, Busca, Mudança de status inline |
| **Finanças** | Pagamentos, Gráfico de receita, Totais, Pendências |
| **Arquivos** | Upload, Download (URL assinada), Delete — Supabase Storage |
| **Dashboard** | Métricas reais, Deadlines, Gráfico, Alunos recentes |
| **Equipe** | Gerenciamento de permissões e roles |
| **Segurança** | RLS — cada usuário acessa apenas seus próprios dados |

## 🔐 Segurança

- **Row Level Security (RLS)** ativo em todas as tabelas
- **Arquivos no Storage** protegidos por `user_id` no path
- **Sessão** gerenciada automaticamente pelo Supabase Auth
- **API /api/config** expõe apenas credenciais públicas do Supabase
- **Variáveis sensíveis** (.env, credenciais service role) não saem do servidor
- **Docker**: Usuário não-root, Health checks, Multi-stage build

## 📋 Scripts npm

```bash
npm start           # Inicia o servidor (produção)
npm run dev         # Inicia com nodemon (desenvolvimento)
npm run docker:up   # Docker compose up
npm run docker:down # Docker compose down
```

## 🔧 Tecnologia

- **Frontend:** Vanilla JS (ES Modules), Tailwind CSS
- **Backend:** Express.js
- **Database:** Supabase (PostgreSQL + Auth)
- **Storage:** Supabase Storage
- **Container:** Docker + Compose
- **CDN:** Tailwind, Fonts, Supabase JS SDK (CDN)
