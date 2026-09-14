-- Exige aceite dos termos LGPD no backend (KAN-28)
-- Ver docs/business-rules/REG-LGPD-001-aceite-lgpd-backend.md
--
-- IMPORTANTE: assim como a 0001 e a 0002, este arquivo precisa ser aplicado
-- manualmente no SQL Editor de cada projeto Supabase (homolog primeiro,
-- depois produção), não é aplicado automaticamente por este repo.

-- ============================================================
-- profiles.terms_accepted_at
-- ============================================================

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

-- ============================================================
-- handle_new_user() — passa a exigir o aceite dos termos
-- ============================================================

-- Hoje o aceite de LGPD só é checado no front (src/pages/Register.jsx)
-- antes de chamar supabase.auth.signUp — quem chama o Supabase Auth
-- diretamente (bypass da UI) cria a conta sem nenhum registro de aceite.
-- Esta função passa a recusar o cadastro se o app não mandar
-- `terms_accepted: true` no metadata (options.data) do signUp. Como a
-- trigger roda dentro da mesma transação do insert em auth.users, o
-- `raise exception` aborta a transação inteira e o signUp retorna erro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ->> 'terms_accepted' is distinct from 'true' then
    raise exception 'terms_accepted is required';
  end if;

  insert into public.profiles (id, username, first_name, last_name, participant_type, course, period, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'participant_type',
    new.raw_user_meta_data ->> 'course',
    nullif(new.raw_user_meta_data ->> 'period', '')::integer,
    now()
  );
  return new;
end;
$$;

-- A trigger on_auth_user_created (migration 0001) já aponta pra esta
-- função por nome, não precisa recriar o trigger em si.
