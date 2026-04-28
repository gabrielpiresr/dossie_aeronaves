-- Cache de negociações derivadas da tabela history_month_per_month.
-- Objetivo: evitar recalcular a cada consulta no frontend/API.

create table if not exists public.history_transactions_cache (
  id bigserial primary key,
  marca text not null,
  data_anterior text not null,
  data_nova text not null,
  proprietario_anterior text not null,
  proprietario_novo text not null,
  operador text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca, data_anterior, data_nova, proprietario_anterior, proprietario_novo)
);

create index if not exists idx_history_transactions_cache_marca
  on public.history_transactions_cache (marca);

create index if not exists idx_history_transactions_cache_data_nova
  on public.history_transactions_cache (data_nova);

create or replace function public.parse_history_data_registro(p_val text)
returns date
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := nullif(trim(p_val), '');

  if v is null then
    return null;
  end if;

  if v ~ '^\d{4}-\d{2}-\d{2}$' then
    return to_date(v, 'YYYY-MM-DD');
  elsif v ~ '^\d{2}/\d{2}/\d{4}$' then
    return to_date(v, 'DD/MM/YYYY');
  else
    return null;
  end if;
end;
$$;

create or replace function public.touch_updated_at_history_transactions_cache()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_updated_at_history_transactions_cache
  on public.history_transactions_cache;

create trigger trg_touch_updated_at_history_transactions_cache
before update on public.history_transactions_cache
for each row
execute function public.touch_updated_at_history_transactions_cache();

create or replace function public.refresh_history_transactions_cache_by_marca(p_marca text)
returns void
language plpgsql
as $$
begin
  if nullif(trim(p_marca), '') is null then
    return;
  end if;

  delete from public.history_transactions_cache
  where marca = trim(upper(p_marca));

  with ordered as (
    select
      trim(upper(h.marca)) as marca_norm,
      h.data_registro,
      h.proprietario,
      h.operador,
      lag(h.proprietario) over (
        partition by trim(upper(h.marca))
        order by public.parse_history_data_registro(h.data_registro), h.data_registro, h.proprietario, h.operador
      ) as proprietario_anterior,
      lag(h.data_registro) over (
        partition by trim(upper(h.marca))
        order by public.parse_history_data_registro(h.data_registro), h.data_registro, h.proprietario, h.operador
      ) as data_anterior
    from public.history_month_per_month h
    where trim(upper(h.marca)) = trim(upper(p_marca))
  )
  insert into public.history_transactions_cache (
    marca,
    data_anterior,
    data_nova,
    proprietario_anterior,
    proprietario_novo,
    operador
  )
  select
    o.marca_norm,
    o.data_anterior,
    o.data_registro as data_nova,
    trim(o.proprietario_anterior) as proprietario_anterior,
    trim(o.proprietario) as proprietario_novo,
    o.operador
  from ordered o
  where nullif(trim(o.proprietario_anterior), '') is not null
    and nullif(trim(o.proprietario), '') is not null
    and trim(o.proprietario_anterior) is distinct from trim(o.proprietario)
    and nullif(trim(o.data_anterior), '') is not null
    and nullif(trim(o.data_registro), '') is not null;
end;
$$;

create or replace function public.refresh_history_transactions_cache_all()
returns void
language plpgsql
as $$
declare
  v_marca text;
begin
  for v_marca in
    select distinct trim(upper(marca))
    from public.history_month_per_month
    where nullif(trim(marca), '') is not null
  loop
    perform public.refresh_history_transactions_cache_by_marca(v_marca);
  end loop;
end;
$$;

create or replace function public.sync_history_transactions_cache_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_history_transactions_cache_by_marca(new.marca);
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.refresh_history_transactions_cache_by_marca(old.marca);
    perform public.refresh_history_transactions_cache_by_marca(new.marca);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_history_transactions_cache_by_marca(old.marca);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_sync_history_transactions_cache
  on public.history_month_per_month;

create trigger trg_sync_history_transactions_cache
after insert or update or delete on public.history_month_per_month
for each row
execute function public.sync_history_transactions_cache_trigger();

-- Backfill inicial (execute uma vez ao rodar a migration).
select public.refresh_history_transactions_cache_all();
