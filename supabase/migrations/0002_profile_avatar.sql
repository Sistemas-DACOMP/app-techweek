-- Foto de perfil (KAN-7) — coluna nova + bucket de Storage
-- Ver changes/2026/08/24/foto-perfil/ (a criar) e claude-context/smart-commits...
--
-- IMPORTANTE: assim como a 0001, este arquivo ainda NÃO foi aplicado em
-- nenhum projeto Supabase (homolog ou produção). Rodar manualmente no SQL
-- Editor de cada projeto, depois de revisado.

-- ============================================================
-- profiles.avatar_url
-- ============================================================

alter table public.profiles
  add column if not exists avatar_url text;

-- ============================================================
-- Storage bucket "avatars" (público — ver decisão registrada:
-- foto de perfil de evento não é dado sensível, leitura pública
-- facilita exibir no Ranking/Dashboard sem precisar de signed URL)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Convenção de path: cada upload vai em "<user_id>/<arquivo>" —
-- as policies abaixo usam o primeiro segmento do path pra checar dono.

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- ranking — recria a view pra incluir o avatar
-- ============================================================

create or replace view public.ranking as
select
  p.id as user_id,
  p.username,
  p.first_name,
  p.avatar_url,
  p.created_at as profile_created_at,
  coalesce(sum(pe.points), 0) as total_points,
  max(pe.created_at) as last_scored_at
from public.profiles p
left join public.point_events pe on pe.user_id = p.id
group by p.id, p.username, p.first_name, p.avatar_url, p.created_at
order by total_points desc, last_scored_at asc;

grant select on public.ranking to authenticated;
