-- ============================================================
-- Migration 004: Multi-tenant — profiles, bank_accounts, owner_id, user_id
-- ============================================================

-- 1. Tabla de perfiles (uno por usuario registrado)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  phone      text,           -- número SINPE Móvil
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario gestiona su propio perfil
CREATE POLICY "profiles_self" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Usuarios autenticados pueden leer todos los perfiles
-- (selector de admin en EventForm)
CREATE POLICY "profiles_read_auth" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Anónimos también pueden leer perfiles
-- (necesario para la tarjeta "¿Cómo pagar?" en PaymentDetail vía link)
CREATE POLICY "profiles_read_anon" ON profiles
  FOR SELECT TO anon
  USING (true);

-- 2. Cuentas bancarias — múltiples por usuario, cualquier banco, CRC o USD
CREATE TABLE IF NOT EXISTS bank_accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name  text NOT NULL,
  currency   text NOT NULL DEFAULT 'CRC',   -- 'CRC' | 'USD'
  account    text,
  iban       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Dueño del perfil gestiona sus propias cuentas
CREATE POLICY "bank_accounts_self" ON bank_accounts
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Autenticados y anónimos pueden leer cuentas (tarjeta de pago)
CREATE POLICY "bank_accounts_read_auth" ON bank_accounts
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "bank_accounts_read_anon" ON bank_accounts
  FOR SELECT TO anon
  USING (true);

-- 3. owner_id en events: quién pagó / administrador del evento
ALTER TABLE events ADD COLUMN IF NOT EXISTS
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. user_id en participants: link a cuenta registrada (opcional)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Índices
CREATE INDEX IF NOT EXISTS events_owner_id_idx      ON events (owner_id);
CREATE INDEX IF NOT EXISTS participants_user_id_idx ON participants (user_id);
CREATE INDEX IF NOT EXISTS bank_accounts_profile_idx ON bank_accounts (profile_id);

-- 6. Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Crear perfil para usuarios existentes sin perfil
INSERT INTO profiles (id, name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
