/*
# Fix goods receipt idempotency and over-receipt capping

## Problem being fixed
The original client-side flow in queries.ts did this:
  1. INSERT a new row into goods_receipts (always succeeds, always a
     brand-new id)
  2. Call upsert_inventory_on_receipt(receipt_id = that brand-new id, ...)

Step 2's idempotency check compares the *just-generated* id against
inventory.last_receipt_id. A freshly generated UUID can never already be
stored anywhere, so the check could never fire — a double-click or a
retried network request would insert a second receipt row and add to
inventory a second time.

Separately, the full quantity_received was always added to both
po_lines.received_quantity and inventory, even when it exceeded what was
still outstanding on the line (an over-receipt) — it was flagged as an
over-receipt but never actually held back.

## Fix
One atomic, SECURITY DEFINER function that:
  - Checks for an identical receipt (same PO line, same quantities)
    recorded in the last 30 seconds before inserting anything (real
    idempotency check, done BEFORE the row exists rather than after).
    The 30-second window matters: without it, a legitimate second
    delivery of the same size (e.g. 50 + 50 against a line of 100)
    would be wrongly dropped as a duplicate.
  - Caps the quantity actually applied to po_lines.received_quantity and
    to inventory at whatever is still outstanding on the line, per the
    over-receipt business rule (excess is recorded but not silently
    added to stock).
  - Updates the PO's overall status (partially_received / received) and
    inventory in the same transaction as the receipt itself.

queries.ts's createGoodsReceipt() is updated to call this single RPC
instead of the previous four separate round trips.
*/

CREATE OR REPLACE FUNCTION public.record_goods_receipt(
  p_po_id uuid,
  p_po_line_id uuid,
  p_quantity_received numeric,
  p_quantity_accepted numeric,
  p_sku text,
  p_product_name text,
  p_location text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line po_lines%ROWTYPE;
  v_remaining numeric;
  v_qty_to_apply numeric;
  v_is_over boolean;
  v_existing_id uuid;
  v_receipt_id uuid;
  v_all_done boolean;
  v_any_received boolean;
  v_qty_on_hand numeric;
BEGIN
  -- Real idempotency check, done BEFORE inserting anything: an identical
  -- receipt (same line, same quantities) recorded within the last 30
  -- seconds is treated as a double-click / retry and not applied again.
  -- The time window matters: without it, a legitimate second delivery of
  -- the same size (e.g. 50 + 50 against a line of 100) would be wrongly
  -- dropped as a duplicate.
  SELECT id INTO v_existing_id
  FROM goods_receipts
  WHERE po_line_id = p_po_line_id
    AND quantity_received = p_quantity_received
    AND quantity_accepted = p_quantity_accepted
    AND created_at > now() - interval '30 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT quantity_on_hand INTO v_qty_on_hand FROM inventory WHERE sku = p_sku;
    RETURN jsonb_build_object(
      'receipt_id', v_existing_id,
      'inventoryResult', jsonb_build_object(
        'success', true,
        'already_processed', true,
        'quantity_on_hand', COALESCE(v_qty_on_hand, 0)
      )
    );
  END IF;

  SELECT * INTO v_line FROM po_lines WHERE id = p_po_line_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO line % not found', p_po_line_id;
  END IF;

  v_remaining := v_line.quantity - v_line.received_quantity;
  v_is_over := (p_quantity_received > v_remaining) OR (p_quantity_accepted > v_remaining);
  -- Never apply more than what's actually still outstanding on the line,
  -- even if more was physically received/accepted.
  v_qty_to_apply := LEAST(p_quantity_accepted, GREATEST(v_remaining, 0));

  INSERT INTO goods_receipts (
    po_id, po_line_id, quantity_received, quantity_accepted,
    is_over_receipt, received_by, notes
  ) VALUES (
    p_po_id, p_po_line_id, p_quantity_received, p_quantity_accepted,
    v_is_over, auth.uid(), p_notes
  ) RETURNING id INTO v_receipt_id;

  UPDATE po_lines
    SET received_quantity = v_line.received_quantity + v_qty_to_apply
    WHERE id = p_po_line_id;

  SELECT
    bool_and(received_quantity >= quantity),
    bool_or(received_quantity > 0)
  INTO v_all_done, v_any_received
  FROM po_lines WHERE po_id = p_po_id;

  UPDATE purchase_orders
    SET status = CASE
      WHEN v_all_done THEN 'received'
      WHEN v_any_received THEN 'partially_received'
      ELSE status
    END
    WHERE id = p_po_id;

  INSERT INTO inventory (sku, product_name, location, quantity_on_hand, last_receipt_id, updated_at)
  VALUES (p_sku, p_product_name, p_location, v_qty_to_apply, v_receipt_id, now())
  ON CONFLICT (sku) DO UPDATE SET
    quantity_on_hand = inventory.quantity_on_hand + v_qty_to_apply,
    product_name = EXCLUDED.product_name,
    location = COALESCE(EXCLUDED.location, inventory.location),
    last_receipt_id = v_receipt_id,
    updated_at = now()
  RETURNING quantity_on_hand INTO v_qty_on_hand;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(), 'RECEIVE', 'goods_receipt', v_receipt_id,
    jsonb_build_object(
      'is_over_receipt', v_is_over,
      'quantity_received', p_quantity_received,
      'quantity_applied', v_qty_to_apply
    )
  );

  RETURN jsonb_build_object(
    'receipt_id', v_receipt_id,
    'inventoryResult', jsonb_build_object(
      'success', true,
      'already_processed', false,
      'quantity_on_hand', v_qty_on_hand
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_goods_receipt(uuid, uuid, numeric, numeric, text, text, text, text) TO authenticated;
