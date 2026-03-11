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

### 4. Configurar as credenciais
No painel → **Settings** → **API** → copie:
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`

Edite o arquivo `src/services/supabaseClient.js`:
```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';   // ← cole aqui
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';           // ← cole aqui
```

### 5. Abrir no navegador
Abra o arquivo `index.html` diretamente no navegador, ou use a extensão **Live Server** no VS Code.

> **Dica:** Use Live Server para evitar problemas com ES Modules (CORS). Clique com botão direito em `index.html` → "Open with Live Server".

---

## 📂 Estrutura do Projeto

```
/job_da_facu
  index.html         ← Página de Login/Cadastro
  app.html           ← SPA Principal (roteador + layout)
  /src
    /services/       ← Integração com Supabase
      supabaseClient.js
      authService.js
      studentService.js
      workService.js
      paymentService.js
      fileService.js
      dashboardService.js
    /views/          ← Módulos de cada página
      dashboard.js
      students.js
      works.js
      finance.js
      settings.js
    /utils/          ← Funções utilitárias
      dateHelpers.js
      statusHelpers.js
      uiHelpers.js
  /sql/
    schema.sql       ← DDL + RLS Policies
  /stitch/           ← Layouts originais de referência
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
| **Segurança** | RLS — cada usuário acessa apenas seus próprios dados |

## 🔐 Segurança
- Row Level Security (RLS) ativo em todas as tabelas
- Arquivos no Storage protegidos por `user_id` no path
- Sessão gerenciada automaticamente pelo Supabase Auth
