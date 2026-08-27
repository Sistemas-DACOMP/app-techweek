-- Persistência de gameplay (pontos, missões, ranking) no Supabase
-- Ver changes/2026/08/19/persistencia-supabase/SPEC.md e PLAN.md
--
-- IMPORTANTE: este arquivo ainda NÃO foi aplicado em nenhum projeto Supabase
-- (homolog ou produção). Rodar manualmente no SQL Editor de cada projeto,
-- ou via `supabase db push`, depois de revisado.

-- ============================================================
-- profiles
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null,
  last_name text,
  participant_type text,
  course text,
  period integer,
  mascot text not null default 'blue' check (mascot in ('blue', 'purple')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Preenche profiles automaticamente a partir do cadastro em auth.users
-- (o app já envia esses campos em auth.signUp({ options: { data: { ... } } }))
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name, participant_type, course, period)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'participant_type',
    new.raw_user_meta_data ->> 'course',
    nullif(new.raw_user_meta_data ->> 'period', '')::integer
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- point_events
-- ============================================================

create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('scan', 'challenge', 'manual_challenge')),
  reference_id text not null,
  points integer not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  -- Garante no banco a regra do SPEC de "não pode repetir a mesma ação":
  -- um código escaneado ou uma missão só rendem pontos uma vez por usuário.
  unique (user_id, event_type, reference_id)
);

create index if not exists point_events_user_id_idx on public.point_events (user_id);

alter table public.point_events enable row level security;

create policy "point_events_select_own"
  on public.point_events for select
  using (auth.uid() = user_id);

create policy "point_events_insert_own"
  on public.point_events for insert
  with check (auth.uid() = user_id);

-- Não existem policies de update/delete: point_events é um log append-only.

-- ============================================================
-- ranking (view agregada — só total de pontos + nome, nunca os eventos)
-- ============================================================

create or replace view public.ranking as
select
  p.id as user_id,
  p.username,
  p.first_name,
  p.created_at as profile_created_at,
  coalesce(sum(pe.points), 0) as total_points,
  -- timestamp do evento mais recente: usado só pra desempate (regra abaixo)
  max(pe.created_at) as last_scored_at
from public.profiles p
left join public.point_events pe on pe.user_id = p.id
group by p.id, p.username, p.first_name, p.created_at
-- Desempate: quem atingiu aquele total de pontos primeiro fica na frente
-- (não é ordem de cadastro — é ordem de conclusão/pontuação).
order by total_points desc, last_scored_at asc;

-- A view roda com o dono dela (postgres), então enxerga todas as linhas de
-- profiles/point_events mesmo com RLS restringindo o acesso direto às tabelas
-- a "só o próprio usuário" — é assim que o Ranking mostra todo mundo sem
-- expandir o que cada participante pode ler diretamente.
grant select on public.ranking to authenticated;
