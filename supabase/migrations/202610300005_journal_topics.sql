-- Fixed topics for the journal (chosen from Configurações › Diário), apart from free tags.
alter table public.journal_entries add column if not exists topics text[] not null default '{}' check(cardinality(topics)<=20);
create index if not exists journal_entries_topics on public.journal_entries using gin(topics);
