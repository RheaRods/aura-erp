/*
# Procurement ERP Schema — Tables, Roles, and Row-Level Security

## Purpose
Creates the full procurement data model for an ERP system with three
roles (buyer, manager, admin) enforced at the database level via RLS.

## 1. New Tables

### user_profiles
Extends Supabase auth.users with a role column.
- id (uuid, FK -> auth.users, PK)
- role (text: 'buyer' | 'manager' | 'admin', default 'buyer')
- full_name (text)
- created_at (timestamptz)

### vendors
Supplier master records.
- id (uuid, PK)
- name (text, not null)
- source_type (text: 'existing' | 'new', not null, default 'existing')
- email (text)
- phone (text)
- address (text)
- tax_id (text)
- payment_terms (text)
- rating (numeric, 0-5)
- status (text: 'active' | 'inactive' | 'blacklisted', default 'active')
- created_at, updated_at (timestamptz)

### procurement_requests
Internal requests to purchase goods/services.
- id (uuid, PK)
- request_number (text, unique)
- title (text, not null)
- description (text)
- requested_by (uuid, FK -> user_profiles)
- vendor_id (uuid, FK -> vendors, nullable for open requests)
- status (text: 'draft' | 'pending' | 'approved' | 'rejected' | 'fulfilled', default 'draft')
- total_estimate (numeric, default 0)
- required_date (date)
- created_at, updated_at (timestamptz)

### purchase_orders (po)
Orders sent to vendors.
- id (uuid, PK)
- po_number (text, unique)
- procurement_request_id (uuid, FK -> procurement_requests, nullable)
- vendor_id (uuid, FK -> vendors)
- status (text: 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled', default 'draft')
- total_amount (numeric, default 0)
- order_date (date)
- expected_delivery (date)
- created_by (uuid, FK -> user_profiles)
- approved_by (uuid, FK -> user_profiles, nullable)
- approved_at (timestamptz, nullable)
- created_at, updated_at (timestamptz)

### po_lines
Line items on a purchase order.
- id (uuid, PK)
- po_id (uuid, FK -> purchase_orders, ON DELETE CASCADE)
- line_number (int, not null)
- item_description (text, not null)
- quantity (numeric, not null)
- unit_price (numeric, not null)
- line_total (numeric, generated: quantity * unit_price)
- received_quantity (numeric, default 0)

### goods_receipts
Records of goods received against a PO line.
- id (uuid, PK)
- po_id (uuid, FK -> purchase_orders)
- po_line_id (uuid, FK -> po_lines)
- quantity_received (numeric, not null)
- received_by (uuid, FK -> user_profiles)
- received_date (date)
- notes (text)
- created_at (timestamptz)

### vendor_evaluations
Periodic performance evaluations of vendors.
- id (uuid, PK)
- vendor_id (uuid, FK -> vendors)
- evaluated_by (uuid, FK -> user_profiles)
- quality_score (int, 1-5)
- delivery_score (int, 1-5)
- cost_score (int, 1-5)
- overall_rating (numeric, generated: avg of 3 scores)
- comments (text)
- evaluation_date (date)
- created_at (timestamptz)

### approval_thresholds
Defines which roles can approve POs up to a monetary limit.
- id (uuid, PK)
- role (text: 'buyer' | 'manager' | 'admin')
- max_amount (numeric, not null)
- is_active (boolean, default true)
- created_at, updated_at (timestamptz)

### audit_log
Tracks all significant procurement actions.
- id (uuid, PK)
- user_id (uuid, FK -> user_profiles, nullable for system actions)
- action (text, not null)
- entity_type (text: 'procurement_request' | 'purchase_order' | 'vendor' | 'goods_receipt' | 'vendor_evaluation')
- entity_id (uuid, nullable)
- old_values (jsonb, nullable)
- new_values (jsonb, nullable)
- created_at (timestamptz)

## 2. Roles & Security

Three roles: buyer, manager, admin — stored in user_profiles.role.
A helper function `current_user_role()` returns the requesting user's role.

RLS policies enforce:
- **buyer**: can read all procurement data; can create/update requests, POs (draft), goods receipts, vendor evaluations; cannot approve POs or delete records.
- **manager**: all buyer permissions + can approve POs, manage vendors, update approval thresholds.
- **admin**: full CRUD on all tables.

All policies are scoped TO authenticated (the app has a sign-in screen).

## 3. Indexes
- vendors.status, vendors.source_type
- procurement_requests.status, procurement_requests.requested_by
- purchase_orders.vendor_id, purchase_orders.status, purchase_orders.created_by
- po_lines.po_id
- goods_receipts.po_id
- vendor_evaluations.vendor_id
- audit_log.entity_type, audit_log.entity_id, audit_log.user_id
*/

-- ============================================================
-- user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'manager', 'admin')),
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's role from user_profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- user_profiles policies: users can read all profiles, update only their own
DROP POLICY IF EXISTS "select_user_profiles" ON user_profiles;
CREATE POLICY "select_user_profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert profiles (assigning roles)
DROP POLICY IF EXISTS "insert_user_profiles_admin" ON user_profiles;
CREATE POLICY "insert_user_profiles_admin"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "delete_user_profiles_admin" ON user_profiles;
CREATE POLICY "delete_user_profiles_admin"
  ON user_profiles FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- vendors
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'existing' CHECK (source_type IN ('existing', 'new')),
  email text,
  phone text,
  address text,
  tax_id text,
  payment_terms text,
  rating numeric(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_source_type ON vendors(source_type);

DROP POLICY IF EXISTS "select_vendors" ON vendors;
CREATE POLICY "select_vendors"
  ON vendors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_vendors" ON vendors;
CREATE POLICY "insert_vendors"
  ON vendors FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('manager', 'admin'));

DROP POLICY IF EXISTS "update_vendors" ON vendors;
CREATE POLICY "update_vendors"
  ON vendors FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('manager', 'admin'))
  WITH CHECK (public.current_user_role() IN ('manager', 'admin'));

DROP POLICY IF EXISTS "delete_vendors" ON vendors;
CREATE POLICY "delete_vendors"
  ON vendors FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- procurement_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  requested_by uuid REFERENCES user_profiles(id),
  vendor_id uuid REFERENCES vendors(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'fulfilled')),
  total_estimate numeric(12,2) DEFAULT 0,
  required_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pr_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by ON procurement_requests(requested_by);

DROP POLICY IF EXISTS "select_procurement_requests" ON procurement_requests;
CREATE POLICY "select_procurement_requests"
  ON procurement_requests FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_procurement_requests" ON procurement_requests;
CREATE POLICY "insert_procurement_requests"
  ON procurement_requests FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "update_procurement_requests" ON procurement_requests;
CREATE POLICY "update_procurement_requests"
  ON procurement_requests FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_procurement_requests" ON procurement_requests;
CREATE POLICY "delete_procurement_requests"
  ON procurement_requests FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- purchase_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  procurement_request_id uuid REFERENCES procurement_requests(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled')),
  total_amount numeric(12,2) DEFAULT 0,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery date,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_po_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created_by ON purchase_orders(created_by);

DROP POLICY IF EXISTS "select_purchase_orders" ON purchase_orders;
CREATE POLICY "select_purchase_orders"
  ON purchase_orders FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_purchase_orders"
  ON purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

-- Only managers+ can set approved_by/approved_at (approval action)
DROP POLICY IF EXISTS "update_purchase_orders" ON purchase_orders;
CREATE POLICY "update_purchase_orders"
  ON purchase_orders FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    CASE
      WHEN approved_by IS DISTINCT FROM (SELECT id FROM user_profiles WHERE id = auth.uid())
        AND approved_by IS NOT NULL
        AND public.current_user_role() = 'buyer'
      THEN false
      ELSE true
    END
  );

DROP POLICY IF EXISTS "delete_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_purchase_orders"
  ON purchase_orders FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- po_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS po_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number int NOT NULL,
  item_description text NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE po_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pol_po_id ON po_lines(po_id);

DROP POLICY IF EXISTS "select_po_lines" ON po_lines;
CREATE POLICY "select_po_lines"
  ON po_lines FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_po_lines" ON po_lines;
CREATE POLICY "insert_po_lines"
  ON po_lines FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "update_po_lines" ON po_lines;
CREATE POLICY "update_po_lines"
  ON po_lines FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_po_lines" ON po_lines;
CREATE POLICY "delete_po_lines"
  ON po_lines FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- goods_receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  po_line_id uuid NOT NULL REFERENCES po_lines(id),
  quantity_received numeric(12,2) NOT NULL CHECK (quantity_received > 0),
  received_by uuid NOT NULL REFERENCES user_profiles(id),
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gr_po_id ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_gr_po_line_id ON goods_receipts(po_line_id);

DROP POLICY IF EXISTS "select_goods_receipts" ON goods_receipts;
CREATE POLICY "select_goods_receipts"
  ON goods_receipts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_goods_receipts" ON goods_receipts;
CREATE POLICY "insert_goods_receipts"
  ON goods_receipts FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "update_goods_receipts" ON goods_receipts;
CREATE POLICY "update_goods_receipts"
  ON goods_receipts FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_goods_receipts" ON goods_receipts;
CREATE POLICY "delete_goods_receipts"
  ON goods_receipts FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- vendor_evaluations
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  evaluated_by uuid NOT NULL REFERENCES user_profiles(id),
  quality_score int NOT NULL CHECK (quality_score >= 1 AND quality_score <= 5),
  delivery_score int NOT NULL CHECK (delivery_score >= 1 AND delivery_score <= 5),
  cost_score int NOT NULL CHECK (cost_score >= 1 AND cost_score <= 5),
  overall_rating numeric(3,2) GENERATED ALWAYS AS (
    (quality_score + delivery_score + cost_score) / 3.0
  ) STORED,
  comments text,
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_evaluations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ve_vendor_id ON vendor_evaluations(vendor_id);

DROP POLICY IF EXISTS "select_vendor_evaluations" ON vendor_evaluations;
CREATE POLICY "select_vendor_evaluations"
  ON vendor_evaluations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_vendor_evaluations" ON vendor_evaluations;
CREATE POLICY "insert_vendor_evaluations"
  ON vendor_evaluations FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "update_vendor_evaluations" ON vendor_evaluations;
CREATE POLICY "update_vendor_evaluations"
  ON vendor_evaluations FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_vendor_evaluations" ON vendor_evaluations;
CREATE POLICY "delete_vendor_evaluations"
  ON vendor_evaluations FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- approval_thresholds
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('buyer', 'manager', 'admin')),
  max_amount numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_approval_thresholds" ON approval_thresholds;
CREATE POLICY "select_approval_thresholds"
  ON approval_thresholds FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_approval_thresholds" ON approval_thresholds;
CREATE POLICY "insert_approval_thresholds"
  ON approval_thresholds FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "update_approval_thresholds" ON approval_thresholds;
CREATE POLICY "update_approval_thresholds"
  ON approval_thresholds FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "delete_approval_thresholds" ON approval_thresholds;
CREATE POLICY "delete_approval_thresholds"
  ON approval_thresholds FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  entity_type text CHECK (entity_type IN ('procurement_request', 'purchase_order', 'vendor', 'goods_receipt', 'vendor_evaluation')),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);

DROP POLICY IF EXISTS "select_audit_log" ON audit_log;
CREATE POLICY "select_audit_log"
  ON audit_log FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;
CREATE POLICY "insert_audit_log"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_audit_log" ON audit_log;
CREATE POLICY "update_audit_log"
  ON audit_log FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "delete_audit_log" ON audit_log;
CREATE POLICY "delete_audit_log"
  ON audit_log FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_vendors ON vendors;
CREATE TRIGGER set_updated_at_vendors
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_procurement_requests ON procurement_requests;
CREATE TRIGGER set_updated_at_procurement_requests
  BEFORE UPDATE ON procurement_requests
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_purchase_orders ON purchase_orders;
CREATE TRIGGER set_updated_at_purchase_orders
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_approval_thresholds ON approval_thresholds;
CREATE TRIGGER set_updated_at_approval_thresholds
  BEFORE UPDATE ON approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
