-- Rules the database enforces on its own, whatever the app code does.

-- 1. Approved proofs are the locked production artwork.
--    Once a proof is approved it can't be edited, replaced or deleted, no new proof can be added to that order,
--    and the proof's file can't be changed or deleted.
CREATE OR REPLACE FUNCTION ssd_lock_approved_proof() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM proofs WHERE order_id = NEW.order_id AND status = 'approved') THEN
      RAISE EXCEPTION 'Order already has an approved proof; it is locked for production';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'Proof v% is approved and locked for production', OLD.version;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER proofs_lock_approved
  BEFORE INSERT OR UPDATE OR DELETE ON proofs
  FOR EACH ROW EXECUTE FUNCTION ssd_lock_approved_proof();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ssd_lock_approved_file() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM proofs WHERE file_id = OLD.id AND status = 'approved') THEN
    RAISE EXCEPTION 'File % is approved production artwork and is locked', OLD.id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER files_lock_approved
  BEFORE UPDATE OR DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION ssd_lock_approved_file();
--> statement-breakpoint

-- 2. orders.updated_at follows every change.
CREATE OR REPLACE FUNCTION ssd_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION ssd_touch_updated_at();
--> statement-breakpoint

-- 3. Emails are stored lowercase so sign-in and order lookup match.
ALTER TABLE customers ADD CONSTRAINT customers_email_lowercase CHECK (email = lower(email));
--> statement-breakpoint

-- 4. Nobody reaches these tables directly from a browser. Row-level security is on with no policies,
--    so Supabase's public API (anon / authenticated keys) sees nothing. Our server connects as the database owner,
--    which bypasses RLS, and checks permissions in code.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE files ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
