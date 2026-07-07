-- ============================================================
-- SplitPay — Datos de prueba
-- Basado en la plantilla original de factura
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Evento principal
insert into events (id, slug, name, description, date, total_amount, iv_rate, status)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'sala-de-despecho-247',
  'Sala de Despecho 24/7',
  'Salida con los amigos. Se pagó Old Parr Litro compartido entre Meme, Palmo y Tito.',
  '2025-07-01',
  203279.997,
  0.13,
  'active'
);

-- Participantes (con tokens fijos para prueba fácil)
insert into participants (id, event_id, name, payment_token, amount_owed, payment_status)
values
  ('bb000001-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Meme',  'MEME0001', 56205.02, 'paid'),
  ('bb000001-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Palmo', 'PALM0002', 48215.01, 'pending'),
  ('bb000001-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Tito',  'TITO0003', 48470.00, 'pending'),
  ('bb000001-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Sofi',  'SOFI0004', 23900.00, 'partial'),
  ('bb000001-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Raque', 'RAQE0005', 26489.99, 'pending');

-- Actualizar Meme como pagado
update participants
set payment_status = 'paid',
    payment_method = 'SINPE Móvil',
    payment_date   = '2025-07-02'
where id = 'bb000001-0000-0000-0000-000000000001';

-- Actualizar Sofi como parcial
update participants
set payment_status = 'partial',
    payment_method = 'Efectivo',
    payment_date   = '2025-07-03'
where id = 'bb000001-0000-0000-0000-000000000004';

-- Ítems de la factura (precio sin IV → precio con IV +13%)
insert into event_items (id, event_id, description, quantity, unit_price, price_with_iv)
values
  ('cc000001-0001-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Ultra',          7, 2357.72,  2899.9956),
  ('cc000001-0001-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Luis Miguel',    1, 5682.93,  6990.0039),
  ('cc000001-0001-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Cazuela',        1, 5682.93,  6990.0039),
  ('cc000001-0001-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Oaxaca Negroni', 1, 5284.55,  6499.9965),
  ('cc000001-0001-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 'Old Parr Litro', 1, 69512.20, 85500.006),
  ('cc000001-0001-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 'Soda',           3, 2032.52,  2499.9996),
  ('cc000001-0001-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 'Agua',           3, 2032.52,  2499.9996),
  ('cc000001-0001-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 'Aperol',         1, 5284.55,  6499.9965),
  ('cc000001-0001-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001', 'Gin Tonic',      3, 5284.55,  6499.9965),
  ('cc000001-0001-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 'Old Parr Copa',  8, 3658.54,  4500.0042);

-- Item splits (quién consumió qué — basado exactamente en tu plantilla)
-- Ultra: Tito x1, Sofi x6
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000003', 1, 2899.9956),
  ('cc000001-0001-0000-0000-000000000001', 'bb000001-0000-0000-0000-000000000004', 6, 17399.9736);

-- Luis Miguel: Meme x1
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000002', 'bb000001-0000-0000-0000-000000000001', 1, 6990.0039);

-- Cazuela: Raque x1
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000003', 'bb000001-0000-0000-0000-000000000005', 1, 6990.0039);

-- Oaxaca Negroni: Palmo x1
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000004', 'bb000001-0000-0000-0000-000000000002', 1, 6499.9965);

-- Old Parr Litro: Meme 33%, Palmo 33%, Tito 34%
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000005', 'bb000001-0000-0000-0000-000000000001', 0.33, 28215.00198),
  ('cc000001-0001-0000-0000-000000000005', 'bb000001-0000-0000-0000-000000000002', 0.33, 28215.00198),
  ('cc000001-0001-0000-0000-000000000005', 'bb000001-0000-0000-0000-000000000003', 0.34, 29070.00204);

-- Soda: Tito x3
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000006', 'bb000001-0000-0000-0000-000000000003', 3, 7499.9988);

-- Agua: Meme x3
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000007', 'bb000001-0000-0000-0000-000000000001', 3, 7499.9988);

-- Aperol: Sofi x1
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000008', 'bb000001-0000-0000-0000-000000000004', 1, 6499.9965);

-- Gin Tonic: Raque x3
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000009', 'bb000001-0000-0000-0000-000000000005', 3, 19499.9895);

-- Old Parr Copa: Meme x3, Palmo x3, Tito x2
insert into item_splits (item_id, participant_id, quantity, amount) values
  ('cc000001-0001-0000-0000-000000000010', 'bb000001-0000-0000-0000-000000000001', 3, 13500.0126),
  ('cc000001-0001-0000-0000-000000000010', 'bb000001-0000-0000-0000-000000000002', 3, 13500.0126),
  ('cc000001-0001-0000-0000-000000000010', 'bb000001-0000-0000-0000-000000000003', 2, 9000.0084);

-- ============================================================
-- URLs para probar en el navegador:
--   / → Inicio (verás el evento en el dropdown)
--   /evento/sala-de-despecho-247 → Detalle completo
--   /pago/MEME0001 → Vista de Meme  (pagado ✅)
--   /pago/PALM0002 → Vista de Palmo (pendiente 🔴)
--   /pago/TITO0003 → Vista de Tito  (pendiente 🔴)
--   /pago/SOFI0004 → Vista de Sofi  (parcial 🟡)
--   /pago/RAQE0005 → Vista de Raque (pendiente 🔴)
-- ============================================================
