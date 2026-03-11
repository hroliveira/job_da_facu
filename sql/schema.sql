-- ============================================================
-- Academic Work Manager — Schema SQL para Supabase PostgreSQL
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão de UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- TABELA: profiles (Roles e Perfis dos Usuários)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  role        text not null default 'aluno' check (role in ('admin', 'academico', 'aluno')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Qualquer um logado pode ver perfis (necessário para listar equipe)
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Usuário pode atualizar o próprio perfil (nome, avatar)
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Apenas admins podem mudar a 'role' de alguém (opcional, protegido no backend, mas bom ter no DB)
-- (Implementado via function/backend para simplificar, a RLS acima já restringe update geral)

-- ============================================================
-- TRIGGER: Criar profile automaticamente no signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    -- Define p/ admin se for o primeiro, senão aluno
    case 
      when (select count(*) from public.profiles) = 0 then 'admin'
      else 'aluno'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Remove o trigger se existir e recria
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABELA: students
-- ============================================================
create table if not exists public.students (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  course       text,
  institution  text,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "students_select" on public.students
  for select using (auth.uid() = user_id);

create policy "students_insert" on public.students
  for insert with check (auth.uid() = user_id);

create policy "students_update" on public.students
  for update using (auth.uid() = user_id);

create policy "students_delete" on public.students
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TABELA: works
-- ============================================================
create table if not exists public.works (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  student_id    uuid references public.students(id) on delete set null,
  title         text not null,
  subject       text,
  type          text default 'essay',
  description   text,
  delivery_date date,
  status        text not null default 'pending'
                  check (status in ('pending','in_progress','review','delivered','cancelled')),
  price         numeric(10,2) default 0,
  created_at    timestamptz not null default now()
);

alter table public.works enable row level security;

create policy "works_select" on public.works
  for select using (auth.uid() = user_id);

create policy "works_insert" on public.works
  for insert with check (auth.uid() = user_id);

create policy "works_update" on public.works
  for update using (auth.uid() = user_id);

create policy "works_delete" on public.works
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TABELA: payments
-- ============================================================
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  work_id         uuid not null references public.works(id) on delete cascade,
  amount          numeric(10,2) not null default 0,
  payment_method  text default 'pix',
  status          text not null default 'pending'
                    check (status in ('pending','partial','paid')),
  payment_date    date,
  created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

-- Policies via join com works (segurança por user_id do trabalho)
create policy "payments_select" on public.payments
  for select using (
    exists (
      select 1 from public.works w
      where w.id = payments.work_id
        and w.user_id = auth.uid()
    )
  );

create policy "payments_insert" on public.payments
  for insert with check (
    exists (
      select 1 from public.works w
      where w.id = payments.work_id
        and w.user_id = auth.uid()
    )
  );

create policy "payments_update" on public.payments
  for update using (
    exists (
      select 1 from public.works w
      where w.id = payments.work_id
        and w.user_id = auth.uid()
    )
  );

create policy "payments_delete" on public.payments
  for delete using (
    exists (
      select 1 from public.works w
      where w.id = payments.work_id
        and w.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABELA: files
-- ============================================================
create table if not exists public.files (
  id          uuid primary key default gen_random_uuid(),
  work_id     uuid not null references public.works(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  uploaded_at timestamptz not null default now()
);

alter table public.files enable row level security;

create policy "files_select" on public.files
  for select using (
    exists (
      select 1 from public.works w
      where w.id = files.work_id
        and w.user_id = auth.uid()
    )
  );

create policy "files_insert" on public.files
  for insert with check (
    exists (
      select 1 from public.works w
      where w.id = files.work_id
        and w.user_id = auth.uid()
    )
  );

create policy "files_delete" on public.files
  for delete using (
    exists (
      select 1 from public.works w
      where w.id = files.work_id
        and w.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: Criar bucket para arquivos
-- Execute separadamente se necessário
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('work-files', 'work-files', false)
-- on conflict do nothing;

-- Policy de storage: authenticated users acessam seus próprios arquivos
-- (o path do arquivo deve começar com o user_id)
-- create policy "storage_select" on storage.objects
--   for select using (
--     bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]
--   );
-- create policy "storage_insert" on storage.objects
--   for insert with check (
--     bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]
--   );
-- create policy "storage_delete" on storage.objects
--   for delete using (
--     bucket_id = 'work-files' and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ============================================================
-- INDEXES para performance
-- ============================================================
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_works_user_id on public.works(user_id);
create index if not exists idx_works_student_id on public.works(student_id);
create index if not exists idx_works_status on public.works(status);
create index if not exists idx_works_delivery_date on public.works(delivery_date);
create index if not exists idx_payments_work_id on public.payments(work_id);
create index if not exists idx_files_work_id on public.files(work_id);
