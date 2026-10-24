-- Life journal (/diario): one row per entry so it can grow for decades without rewriting the profile.
create table public.journal_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 occurred_on date not null,
 occurred_time text not null default '' check(occurred_time ~ '^$|^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 kind text not null default 'momento' check(kind in ('momento','conquista','aprendizado','reflexao','gratidao','decisao','ideia','memoria')),
 title text not null default '' check(char_length(title)<=200),
 body text not null default '' check(char_length(body)<=20000),
 mood smallint check(mood between 0 and 10),
 tags text[] not null default '{}' check(cardinality(tags)<=30),
 people text[] not null default '{}' check(cardinality(people)<=30),
 place text not null default '' check(char_length(place)<=200),
 milestone boolean not null default false,
 revisit_on date,
 source text not null default 'site' check(source in ('site','mcp')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(char_length(title)>0 or char_length(body)>0)
);
create index journal_entries_user_date on public.journal_entries(user_id,occurred_on desc);
create index journal_entries_tags on public.journal_entries using gin(tags);
create index journal_entries_people on public.journal_entries using gin(people);
alter table public.journal_entries enable row level security;
create policy own_journal_entries on public.journal_entries for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.journal_entries to authenticated;
create function public.journal_touch() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger journal_entries_touch before update on public.journal_entries for each row execute function public.journal_touch();
