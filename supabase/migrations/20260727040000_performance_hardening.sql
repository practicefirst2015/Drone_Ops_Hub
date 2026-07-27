-- Performance hardening (applied to live DB 2026-07-26 via Claude)
-- 1. Index all single-column foreign keys that lack a covering index (63 added).
do $$
declare r record;
begin
  for r in
    select format('create index if not exists idx_fk_%s_%s on public.%I (%I)', c.relname, a.attname, c.relname, a.attname) as stmt
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_attribute a on a.attrelid = c.oid and a.attnum = con.conkey[1]
    where con.contype = 'f'
      and c.relnamespace = 'public'::regnamespace
      and array_length(con.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.oid and i.indkey[0] = con.conkey[1]
      )
  loop
    execute r.stmt;
  end loop;
end $$;

-- 2. RLS initplan optimization: wrap auth.uid() in a scalar subquery so it is
-- evaluated once per statement instead of once per row (supabase lint 0003).
do $$
declare r record; sql text;
begin
  for r in
    select * from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
      and coalesce(qual, '') not like '%SELECT auth.uid()%'
      and coalesce(with_check, '') not like '%SELECT auth.uid()%'
  loop
    sql := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if r.qual is not null then
      sql := sql || format(' using (%s)', regexp_replace(r.qual, 'auth\.uid\(\)', '(select auth.uid())', 'g'));
    end if;
    if r.with_check is not null then
      sql := sql || format(' with check (%s)', regexp_replace(r.with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g'));
    end if;
    execute sql;
  end loop;
end $$;
