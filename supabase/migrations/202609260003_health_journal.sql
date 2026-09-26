-- Extended private health journal: imported history, planning, recovery, supplements and tennis.
create table public.health_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 profile jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.health_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('daily_metrics','workout','meal_history','hydration_history','checkin_history','sleep','activity','bowel','supplement','tennis','schedule','body_metrics','profile_history')),
 recorded_on date not null, recorded_at timestamptz, payload jsonb not null, source text not null default 'manual', created_at timestamptz not null default now(),
 unique(user_id,category,recorded_on,recorded_at,payload)
);
create index health_records_user_category_date on public.health_records(user_id,category,recorded_on desc);
create table public.day_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 local_date date not null, day_type text not null, targets jsonb not null default '{}'::jsonb, agenda jsonb not null default '[]'::jsonb, rationale text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,local_date)
);
alter table public.target_templates drop constraint if exists target_templates_day_type_check;
alter table public.days drop constraint if exists days_day_type_check;
update public.target_templates set day_type=case day_type when 'normal' then 'dia sem tênis · caminhada com Caju' when 'descanso' then 'recuperação' when 'tênis leve' then 'dia de tênis · treino leve' when 'tênis moderado' then 'dia de tênis · treino intenso' when 'tênis intenso' then 'dia de tênis · jogo da liga' else day_type end;
update public.days set day_type=case day_type when 'normal' then 'dia sem tênis · caminhada com Caju' when 'descanso' then 'recuperação' when 'tênis leve' then 'dia de tênis · treino leve' when 'tênis moderado' then 'dia de tênis · treino intenso' when 'tênis intenso' then 'dia de tênis · jogo da liga' else day_type end;
alter table public.target_templates add constraint target_templates_day_type_check check(day_type in ('dia sem tênis · caminhada com Caju','dia de tênis · jogo da liga','dia de tênis · jogo amistoso','dia de tênis · treino leve','dia de tênis · treino intenso','recuperação','customizado')) not valid;
alter table public.days add constraint days_day_type_check check(day_type in ('dia sem tênis · caminhada com Caju','dia de tênis · jogo da liga','dia de tênis · jogo amistoso','dia de tênis · treino leve','dia de tênis · treino intenso','recuperação','customizado')) not valid;
alter table public.health_profiles enable row level security;
alter table public.health_records enable row level security;
alter table public.day_plans enable row level security;
create policy own_health_profile on public.health_profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_health_records on public.health_records for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_day_plans on public.day_plans for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.health_profiles,public.health_records,public.day_plans to authenticated;
