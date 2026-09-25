-- Felipe Health / stage 1. Apply using Supabase migrations or SQL editor.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Felipe', timezone text not null default 'Europe/London' check(timezone='Europe/London'),
 water_shortcuts integer[] not null default array[650,590], created_at timestamptz not null default now()
);
create function public.valid_targets(value jsonb) returns boolean language plpgsql immutable set search_path=public as $$
declare item jsonb; key text; kind text; lo numeric; hi numeric;
begin
 if jsonb_typeof(value)<>'object' then return false; end if;
 for key,item in select * from jsonb_each(value) loop
  if key not in ('water','calories','protein','carbs','fat','saturated_fat','fibre','steps','exercise','sleep') then return false; end if;
  kind:=item->>'kind'; lo:=(item->>'min')::numeric; hi:=(item->>'max')::numeric;
  if kind is null or kind not in ('minimum','maximum','range','exact') then return false; end if;
  if kind in ('minimum','exact','range') and (lo is null or lo<=0) then return false; end if;
  if kind in ('maximum','range') and (hi is null or hi<=0) then return false; end if;
  if kind='range' and lo>hi then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
create table public.target_templates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 name text not null, day_type text not null check(day_type in ('descanso','normal','tênis leve','tênis moderado','tênis intenso','customizado')),
 targets jsonb not null check(public.valid_targets(targets)), unique(user_id,day_type)
);
create table public.days (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 local_date date not null, day_type text not null default 'normal',
 targets jsonb not null check(public.valid_targets(targets)), unique(user_id,local_date)
);
create table public.events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 timestamp timestamptz not null, local_date date not null, timezone text not null default 'Europe/London' check(timezone='Europe/London'),
 type text not null check(type in ('water','meal','checkin')),
 source text not null default 'manual', measurement_type text not null check(measurement_type in ('exact','measured','estimated','subjective','unknown')),
 estimated boolean not null default false, confidence numeric check(confidence between 0 and 1),
 import_source text, source_record_id text, data jsonb not null, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(estimated=(measurement_type='estimated')),
 check(data->>'kind'=type), unique(user_id,import_source,source_record_id)
);
create index events_user_date_time on public.events(user_id,local_date,timestamp);
create index events_data_search on public.events using gin(data);
create table public.event_revisions (
 id uuid primary key default gen_random_uuid(), event_id uuid not null, user_id uuid not null references auth.users on delete cascade,
 operation text not null, previous_record jsonb not null, changed_at timestamptz not null default now()
);
create table public.foods (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 name text not null, brand text not null default '', nutrition jsonb not null,
 favorite boolean not null default false, created_at timestamptz not null default now()
);
comment on column public.foods.nutrition is 'Nutrients per 100 grams; null means unknown. sodium in mg, other macros in g, energy in kcal.';
create table public.meal_templates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 name text not null, items jsonb not null check(jsonb_typeof(items)='array'), created_at timestamptz not null default now()
);
create table public.checkin_drafts (
 user_id uuid primary key references auth.users on delete cascade, payload jsonb not null, updated_at timestamptz not null default now()
);
create function public.prepare_event() returns trigger language plpgsql set search_path=public as $$
declare score jsonb; key text; item jsonb;
begin
 if TG_OP='UPDATE' then
  if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Event identity cannot change'; end if;
  new.created_at:=old.created_at;
 end if;
 new.local_date:=(new.timestamp at time zone new.timezone)::date; new.updated_at:=now();
 if new.data->>'kind' is distinct from new.type then raise exception 'Invalid event kind'; end if;
 if new.type='water' then
  if new.data->>'volume' is null or (new.data->>'volume')::numeric<=0 or (new.data->>'volume')::numeric>10000 then raise exception 'Invalid water volume'; end if;
  if new.data->>'beverage' is null or new.data->>'beverage' not in ('água','outro líquido') then raise exception 'Invalid beverage'; end if;
 elsif new.type='checkin' then
  if jsonb_typeof(new.data->'scores') is distinct from 'object' then raise exception 'Invalid scores'; end if;
  for key,score in select * from jsonb_each(new.data->'scores') loop
   if score<>'null'::jsonb and (jsonb_typeof(score)<>'number' or score::text::numeric<0 or score::text::numeric>10) then raise exception 'Score outside 0 to 10'; end if;
  end loop;
 elsif new.type='meal' then
  if jsonb_typeof(new.data->'items') is distinct from 'array' then raise exception 'Invalid meal'; end if;
  for item in select * from jsonb_array_elements(new.data->'items') loop
   if (item->>'grams') is null or (item->>'grams')::numeric<=0 then raise exception 'Invalid portion'; end if;
  end loop;
 end if;
 return new;
end $$;
create trigger prepare_event before insert or update on public.events for each row execute function public.prepare_event();
create function public.audit_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.event_revisions(event_id,user_id,operation,previous_record) values(old.id,old.user_id,TG_OP,to_jsonb(old));
 return old;
end $$;
create trigger audit_event after update or delete on public.events for each row execute function public.audit_event();
-- RLS applies to all private tables. There are no service-role keys in the application.
alter table public.profiles enable row level security;
create policy own_profile_select on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
do $$ declare tbl text; begin
 foreach tbl in array array['target_templates','days','events','foods','meal_templates','checkin_drafts'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('create policy own_rows on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',tbl);
 end loop;
end $$;
alter table public.event_revisions enable row level security;
create policy own_revisions on public.event_revisions for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.event_revisions from anon,authenticated;
grant select on public.event_revisions to authenticated;
create function public.initialize_user() returns trigger language plpgsql security definer set search_path=public as $$
declare base jsonb := '{"calories":{"kind":"range","min":2100,"max":2350},"protein":{"kind":"range","min":105,"max":120},"carbs":{"kind":"range","min":180,"max":220},"fat":{"kind":"range","min":55,"max":70},"saturated_fat":{"kind":"maximum","min":null,"max":20},"fibre":{"kind":"range","min":25,"max":30},"water":{"kind":"range","min":2500,"max":2800}}'; kind text;
begin
 insert into public.profiles(id) values(new.id);
 foreach kind in array array['descanso','normal','tênis leve','tênis moderado','tênis intenso','customizado'] loop
  insert into public.target_templates(user_id,name,day_type,targets) values(new.id,initcap(kind),kind,
   case when kind like 'tênis%' then jsonb_set(base,'{water}','{"kind":"range","min":2800,"max":3500}') else base end);
 end loop;
 return new;
end $$;
create trigger initialize_health_user after insert on auth.users for each row execute function public.initialize_user();
revoke execute on function public.initialize_user() from public;
revoke execute on function public.audit_event() from public;
-- No storage bucket is created in stage 1: photo uploads belong to a later module.
create function public.clear_checkin_draft() returns trigger language plpgsql set search_path=public as $$
begin
 if new.type='checkin' then delete from public.checkin_drafts where user_id=new.user_id; end if;
 return new;
end $$;
create trigger clear_checkin_draft after insert on public.events for each row execute function public.clear_checkin_draft();
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.target_templates,public.days,public.events,public.foods,public.meal_templates,public.checkin_drafts to authenticated;
grant select,update on public.profiles to authenticated;
