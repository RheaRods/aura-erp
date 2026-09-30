/*
# Seed Procurement Sample Data

## Purpose
Populates all procurement tables with realistic sample data.

## What gets inserted
1. 6 vendors — 3 existing, 3 new
2. 3 approval_thresholds — buyer/manager/admin
3. 2 procurement_requests
4. 2 purchase_orders
5. 4 po_lines
6. 2 goods_receipts
7. 2 vendor_evaluations
8. 3 audit_log entries

All inserts use ON CONFLICT DO NOTHING for idempotency.
*/

INSERT INTO vendors (id, name, source_type, email, phone, address, tax_id, payment_terms, rating, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Acme Industrial Supply',   'existing', 'sales@acmeindustrial.com',   '+1-555-0101', '1200 Factory Rd, Cleveland OH 44101',     'US-44-1029384', 'Net 30', 4.5, 'active'),
  ('a2222222-2222-2222-2222-222222222222', 'Pinnacle Components Ltd',  'existing', 'orders@pinnaclecomp.com',     '+1-555-0102', '88 Commerce Blvd, Austin TX 78701',       'US-74-5588221', 'Net 45', 4.2, 'active'),
  ('a3333333-3333-3333-3333-333333333333', 'Sterling Logistics Co',    'existing', 'info@sterlinglogistics.com',  '+1-555-0103', '4500 Dock St, Long Beach CA 90802',       'US-91-3344556', 'Net 15', 3.8, 'active'),
  ('a4444444-4444-4444-4444-444444444444', 'BrightWave Electronics',   'new',      'contact@brightwave.io',       '+1-555-0104', '27 Tech Park, San Jose CA 95110',         'US-77-9988776', 'Net 30', 0.0, 'active'),
  ('a5555555-5555-5555-5555-555555555555', 'GreenLeaf Packaging',      'new',      'hello@greenleafpack.com',     '+1-555-0105', '9 Sustainable Way, Portland OR 97201',    'US-66-2211998', 'Net 60', 0.0, 'active'),
  ('a6666666-6666-6666-6666-666666666666', 'Fortress Security Systems', 'new',     'sales@fortresssec.com',       '+1-555-0106', '300 Sentinel Ave, Arlington VA 22201',    'US-51-6677889', 'Net 30', 0.0, 'inactive')
ON CONFLICT (id) DO NOTHING;

INSERT INTO approval_thresholds (id, role, max_amount, is_active)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'buyer',    5000.00,    true),
  ('b2222222-2222-2222-2222-222222222222', 'manager',  50000.00,   true),
  ('b3333333-3333-3333-3333-333333333333', 'admin',    1000000.00, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO procurement_requests (id, request_number, title, description, vendor_id, status, total_estimate, required_date)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'PR-2026-0001', 'Q3 Office Supplies Restock', 'Bulk order of office consumables for Q3',             'a1111111-1111-1111-1111-111111111111', 'pending',  3200.00,  '2026-10-01'),
  ('c2222222-2222-2222-2222-222222222222', 'PR-2026-0002', 'New Server Rack Equipment',  'Two 42U server racks with PDUs and cable management', 'a4444444-4444-4444-4444-444444444444', 'approved', 18500.00, '2026-09-30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_orders (id, po_number, procurement_request_id, vendor_id, status, total_amount, order_date, expected_delivery)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'PO-2026-0001', 'c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'sent',  3200.00,  '2026-09-10', '2026-09-25'),
  ('d2222222-2222-2222-2222-222222222222', 'PO-2026-0002', NULL,                                      'a4444444-4444-4444-4444-444444444444', 'draft', 18500.00, '2026-09-14', '2026-10-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO po_lines (id, po_id, line_number, item_description, quantity, unit_price, received_quantity)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 1, 'A4 Paper Reams (500 sheets)',   200, 4.50,    200),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 2, 'Toner Cartridge HP 26X',        30,  78.33,   30),
  ('e3333333-3333-3333-3333-333333333333', 'd2222222-2222-2222-2222-222222222222', 1, '42U Server Rack with PDU',      2,   6500.00, 0),
  ('e4444444-4444-4444-4444-444444444444', 'd2222222-2222-2222-2222-222222222222', 2, 'Cable Management Kit (100pc)',  5,   1100.00, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO goods_receipts (id, po_id, po_line_id, quantity_received, received_date, notes)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 200, '2026-09-20', 'Full delivery received in good condition'),
  ('f2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'e2222222-2222-2222-2222-222222222222', 30,  '2026-09-20', 'All toner units verified')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendor_evaluations (id, vendor_id, quality_score, delivery_score, cost_score, comments, evaluation_date)
VALUES
  ('0e111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 5, 4, 4, 'Reliable supplier, consistent quality. Delivery occasionally slips by 1-2 days.', '2026-08-15'),
  ('0e222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 4, 5, 3, 'Excellent on-time delivery. Pricing slightly above market average.',              '2026-08-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_log (id, action, entity_type, entity_id, new_values)
VALUES
  ('0f111111-1111-1111-1111-111111111111', 'CREATE', 'vendor',              'a1111111-1111-1111-1111-111111111111', jsonb_build_object('name', 'Acme Industrial Supply', 'source_type', 'existing')),
  ('0f222222-2222-2222-2222-222222222222', 'CREATE', 'procurement_request', 'c2222222-2222-2222-2222-222222222222', jsonb_build_object('request_number', 'PR-2026-0002', 'status', 'approved')),
  ('0f333333-3333-3333-3333-333333333333', 'CREATE', 'purchase_order',      'd1111111-1111-1111-1111-111111111111', jsonb_build_object('po_number', 'PO-2026-0001', 'status', 'sent'))
ON CONFLICT (id) DO NOTHING;
