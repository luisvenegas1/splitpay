-- migration_005: Auto-close event when all participants are paid

CREATE OR REPLACE FUNCTION auto_close_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Si todos los participantes del evento tienen payment_status = 'paid'
  IF NOT EXISTS (
    SELECT 1 FROM participants
    WHERE event_id = NEW.event_id
      AND payment_status != 'paid'
  ) THEN
    -- Cerrar el evento
    UPDATE events SET status = 'closed' WHERE id = NEW.event_id;
  ELSE
    -- Si el evento estaba cerrado y hay un pago rechazado, reabrirlo
    UPDATE events SET status = 'active'
    WHERE id = NEW.event_id AND status = 'closed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_close_event ON participants;

CREATE TRIGGER trg_auto_close_event
AFTER UPDATE OF payment_status ON participants
FOR EACH ROW
EXECUTE FUNCTION auto_close_event();
