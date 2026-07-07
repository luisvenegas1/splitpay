-- ============================================================
-- SplitPay — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type event_status as enum ('active', 'closed');
create type payment_status as enum ('pending', 'partial', 'paid');
create type invoice_file_type as enum ('image', 'pdf');

-- ============================================================
-- TABLA: events
-- ============================================================
create table events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  date          date not null,
  total_amount  numeric(12, 2) not null default 0,
  iv_rate       numeric(5, 4) not null default 0.13,
  status        event_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_events_slug   on events (slug);
create index idx_events_status on events (status);
create index idx_events_date   on events (date desc);

-- ============================================================
-- TABLA: participants
-- ============================================================
create table participants (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events (id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  payment_token   text not null unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  amount_owed     numeric(12, 2) not null default 0,
  payment_status  payment_status not null default 'pending',
  payment_method  text,
  payment_date    date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_participants_event_id      on participants (event_id);
create index idx_participants_payment_token on participants (payment_token);

-- ============================================================
-- TABLA: event_items
-- ============================================================
create table event_items (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events (id) on delete cascade,
  description    text not null,
  quantity       numeric(10, 4) not null default 1,
  unit_price     numeric(12, 2) not null,
  price_with_iv  numeric(12, 2) not null,
  created_at     timestamptz not null default now()
);

create index idx_event_items_event_id on event_items (event_id);

-- ============================================================
-- TABLA: item_splits
-- Registra qué porción de cada ítem corresponde a cada participante
-- ============================================================
create table item_splits (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references event_items (id) on delete cascade,
  participant_id  uuid not null references participants (id) on delete cascade,
  quantity        numeric(10, 4) not null default 0,
  amount          numeric(12, 2) not null default 0,
  unique (item_id, participant_id)
);

create index idx_item_splits_item_id        on item_splits (item_id);
create index idx_item_splits_participant_id on item_splits (participant_id);

-- ============================================================
-- TABLA: invoices
-- ============================================================
create table invoices (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  file_url    text not null,
  file_type   invoice_file_type not null,
  uploaded_at timestamptz not null default now()
);

create index idx_invoices_event_id on invoices (event_id);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

create trigger trg_participants_updated_at
  before update on participants
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table events       enable row level security;
alter table participants enable row level security;
alter table event_items  enable row level security;
alter table item_splits  enable row level security;
alter table invoices     enable row level security;

-- Lectura pública (visitantes sin sesión)
create policy "Public can read events"
  on events for select using (true);

create policy "Public can read participants"
  on participants for select using (true);

create policy "Public can read event_items"
  on event_items for select using (true);

create policy "Public can read item_splits"
  on item_splits for select using (true);

create policy "Public can read invoices"
  on invoices for select using (true);

-- Escritura solo para usuarios autenticados (administrador)
create policy "Auth can insert events"
  on events for insert with check (auth.role() = 'authenticated');

create policy "Auth can update events"
  on events for update using (auth.role() = 'authenticated');

create policy "Auth can delete events"
  on events for delete using (auth.role() = 'authenticated');

create policy "Auth can insert participants"
  on participants for insert with check (auth.role() = 'authenticated');

create policy "Auth can update participants"
  on participants for update using (auth.role() = 'authenticated');

create policy "Auth can delete participants"
  on participants for delete using (auth.role() = 'authenticated');

create policy "Auth can insert event_items"
  on event_items for insert with check (auth.role() = 'authenticated');

create policy "Auth can update event_items"
  on event_items for update using (auth.role() = 'authenticated');

create policy "Auth can delete event_items"
  on event_items for delete using (auth.role() = 'authenticated');

create policy "Auth can insert item_splits"
  on item_splits for insert with check (auth.role() = 'authenticated');

create policy "Auth can update item_splits"
  on item_splits for update using (auth.role() = 'authenticated');

create policy "Auth can delete item_splits"
  on item_splits for delete using (auth.role() = 'authenticated');

create policy "Auth can insert invoices"
  on invoices for insert with check (auth.role() = 'authenticated');

create policy "Auth can delete invoices"
  on invoices for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET para facturas
-- Crear en: Supabase Dashboard > Storage > New Bucket
-- Nombre: invoices | Public: true
-- ============================================================
