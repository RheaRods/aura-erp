/*
# Phase 1 Schema Additions — Manual Core Flow

## Purpose
Adds columns and tables needed for the manual procurement workflow:
request priority/location/reason/quantity, vendor verification flag,
PO vendor confirmation, goods receipt accepted quantity, and an
inventory table with an idempotent upsert RPC.

## 1. Column additions

### procurement_requests
- product_name (text) — what is being requested
- quantity (numeric) — how many units
- priority (text: 'low'|'medium'|'high'|'urgent', default 'medium')
- location (text) — delivery location / facility
- reason (text) — business justification
- approved_by (uuid, FK -> user_profiles, nullable)
- approved_at (timestamptz, nullable)

### vendors
- is_verified (boolean, default false) — verification flag for new vendors

### purchase_orders
- vendor_confirmed_at (timestamptz, nullable)
- vendor_confirmation_status (text: 'pending'|'confirmed'|'rejected', default 'pending')
- cancellation_reason (text, nullable)

### goods_receipts
- quantity_accepted (numeric, default = quantity_received)
- is_over_receipt (boolean, default false)

## 2. New tables

### inventory
- id (uuid, PK)
- sku (text, unique)
- product_name (text, not null)
- quantity_on_hand (numeric, default 0)
- location (text)
- last_receipt_id (uuid, FK -> goods_receipts, nullable) — for idempotency
- updated_at (timestamptz)

## 3. RPC functions

### approve_procurement_request(request_uuid, approver_uuid)
Validates approver != requester, checks amount against approval_thresholds
for the approver's role, sets status to approved/rejected, sets approved_by/at.

### upsert_inventory_on_receipt(p_receipt_uuid, p_sku, p_product_name, p_location, p_qty)
Idempotent inventory increment: checks if last_receipt_id already processed;
if so returns existing quantity (no double-increment). Otherwise inserts
or updates inventory row.

NOTE: this function is superseded by record_goods_receipt() in migration
006_fix_goods_receipt_atomicity.sql, which fixes an idempotency bug in
this original version (see that migration's header for details). This
function is left in place for history; the frontend calls the newer one.

## 4. Auto-profile trigger
Creates a user_profiles row (role='buyer') automatically when a new
auth.users record is inserted (i.e., on signup).
*/

-- ============================================================
-- procurement_requests additions
-- ============================================================
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS quantity numeric(12,2);
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent'));
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id);
ALTER TABLE procurement_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- ============================================================
-- vendors additions
-- ============================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- ============================================================
-- purchase_orders additions
-- ============================================================
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_confirmed_at timestamptz;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_confirmation_status text NOT NULL DEFAULT 'pending' CHECK (vendor_confirmation_status IN ('pending','confirmed','rejected'));
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- ============================================================
-- goods_receipts additions
-- ============================================================
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS quantity_accepted numeric(12,2) DEFAULT 0;
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS is_over_receipt boolean NOT NULL DEFAULT false;

-- ============================================================
-- inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  product_name text NOT NULL,
  quantity_on_hand numeric(12,2) NOT NULL DEFAULT 0,
  location text,
  last_receipt_id uuid REFERENCES goods_receipts(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

DROP POLICY IF EXISTS "select_inventory" ON inventory;
CREATE POLICY "select_inventory"
  ON inventory FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_inventory" ON inventory;
CREATE POLICY "insert_inventory"
  ON inventory FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_inventory" ON inventory;
CREATE POLICY "update_inventory"
  ON inventory FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_inventory" ON inventory;
CREATE POLICY "delete_inventory"
  ON inventory FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- Auto-create user_profiles on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'buyer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- approve_procurement_request RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_procurement_request(
  p_request_uuid uuid,
  p_decision text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_approver_role text;
  v_threshold numeric;
  v_result jsonb;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM procurement_requests WHERE id = p_request_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Get approver role
  SELECT role INTO v_approver_role FROM user_profiles WHERE id = auth.uid();
  IF v_approver_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user profile found');
  END IF;

  -- Validate approver != requester
  IF v_request.requested_by = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approver cannot be the same as requester');
  END IF;

  -- Only pending requests can be approved/rejected
  IF v_request.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not in pending status');
  END IF;

  -- Get approval threshold for this role
  SELECT max_amount INTO v_threshold
  FROM approval_thresholds
  WHERE role = v_approver_role AND is_active = true
  LIMIT 1;

  IF v_threshold IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No approval threshold configured for your role');
  END IF;

  -- Check amount against threshold (only for approval, not rejection)
  IF p_decision = 'approve' AND v_request.total_estimate > v_threshold THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount ' || v_request.total_estimate || ' exceeds your approval limit of ' || v_threshold
    );
  END IF;

  -- Apply decision
  IF p_decision = 'approve' THEN
    UPDATE procurement_requests
    SET status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    WHERE id = p_request_uuid;

    -- Insert audit log
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'APPROVE', 'procurement_request', p_request_uuid,
            jsonb_build_object('status', 'approved', 'approved_by', auth.uid()));

    v_result := jsonb_build_object('success', true, 'status', 'approved');
  ELSIF p_decision = 'reject' THEN
    UPDATE procurement_requests
    SET status = 'rejected',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    WHERE id = p_request_uuid;

    INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'REJECT', 'procurement_request', p_request_uuid,
            jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason));

    v_result := jsonb_build_object('success', true, 'status', 'rejected');
  ELSE
    v_result := jsonb_build_object('success', false, 'error', 'Invalid decision. Use approve or reject.');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_procurement_request(uuid, text, text) TO authenticated;

-- ============================================================
-- upsert_inventory_on_receipt RPC (idempotent) — superseded, see note above
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_inventory_on_receipt(
  p_receipt_uuid uuid,
  p_sku text,
  p_product_name text,
  p_location text,
  p_qty numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_existing_receipt_id uuid;
BEGIN
  -- Check if this receipt was already processed (idempotency)
  SELECT last_receipt_id INTO v_existing_receipt_id
  FROM inventory
  WHERE sku = p_sku;

  IF v_existing_receipt_id = p_receipt_uuid THEN
    -- Already processed, return current quantity without double-incrementing
    SELECT quantity_on_hand INTO v_inv.quantity_on_hand FROM inventory WHERE sku = p_sku;
    RETURN jsonb_build_object('success', true, 'already_processed', true, 'quantity_on_hand', v_inv.quantity_on_hand);
  END IF;

  -- Upsert inventory
  INSERT INTO inventory (sku, product_name, location, quantity_on_hand, last_receipt_id, updated_at)
  VALUES (p_sku, p_product_name, p_location, p_qty, p_receipt_uuid, now())
  ON CONFLICT (sku)
  DO UPDATE SET
    quantity_on_hand = inventory.quantity_on_hand + p_qty,
    product_name = EXCLUDED.product_name,
    location = COALESCE(EXCLUDED.location, inventory.location),
    last_receipt_id = p_receipt_uuid,
    updated_at = now()
  RETURNING quantity_on_hand INTO v_inv.quantity_on_hand;

  RETURN jsonb_build_object('success', true, 'already_processed', false, 'quantity_on_hand', v_inv.quantity_on_hand);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_inventory_on_receipt(uuid, text, text, text, numeric) TO authenticated;

-- ============================================================
-- Seed inventory for the already-received goods
-- ============================================================
INSERT INTO inventory (sku, product_name, location, quantity_on_hand, last_receipt_id)
VALUES
  ('A4-REAM-500', 'A4 Paper Reams (500 sheets)', 'Warehouse A', 200, 'f1111111-1111-1111-1111-111111111111'),
  ('TONER-HP-26X', 'Toner Cartridge HP 26X', 'Warehouse A', 30, 'f2222222-2222-2222-2222-222222222222')
ON CONFLICT (sku) DO NOTHING;
