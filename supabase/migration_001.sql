-- ============================================================
-- SplitPay — Migración 001
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Agregar amount_paid a participants (para pagos parciales)
alter table participants
  add column if not exists amount_paid numeric(12, 2) not null default 0;

-- Agregar service_tax_rate a events (impuesto de servicio, default 10%)
alter table events
  add column if not exists service_tax_rate numeric(5, 4) not null default 0.10;

-- Actualizar el evento de prueba con el impuesto de servicio
update events
set service_tax_rate = 0.10
where slug = 'sala-de-despecho-247';

-- Actualizar Sofi como pago parcial con amount_paid
update participants
set amount_paid = 12000
where payment_token = 'SOFI0004';
