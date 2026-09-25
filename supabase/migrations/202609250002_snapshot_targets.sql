-- Freeze the configured targets when the first event for a date is recorded.
create function public.snapshot_day_targets() returns trigger language plpgsql set search_path=public as $$
begin
 insert into public.days(user_id,local_date,day_type,targets)
 select new.user_id,new.local_date,day_type,targets from public.target_templates
 where user_id=new.user_id and day_type='normal'
 on conflict(user_id,local_date) do nothing;
 return new;
end $$;
create trigger snapshot_day_targets after insert on public.events for each row execute function public.snapshot_day_targets();
