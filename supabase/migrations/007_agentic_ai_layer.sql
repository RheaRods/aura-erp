/*
# Phase 2 — Agentic AI evaluation layer

## Purpose
Adds the vendor scoring/ranking layer on top of the Phase 1 manual
flow, without touching any existing table, policy, or function.

## New tables

### vendor_quotes
A manual price quote entered against a specific request for a specific
vendor (there is no live web-scraping in this build — Price is only
ever scored when a real quote has been entered).
- id, request_id (FK), vendor_id (FK), quoted_price, quoted_by, quoted_at
- UNIQUE (request_id, vendor_id)

### vendor_ai_scores
One row per (request, vendor) evaluation. Re-running the evaluation for
a request replaces its rows.
- id, request_id, vendor_id
- price_score, delivery_score, reliability_score, performance_score
  (all nullable — null means "no evidence", never a fabricated zero)
- risk_score (not nullable — always derivable from vendor flags)
- dimensions_scored (0-5), composite_score, confidence
- evidence (jsonb, for transparency in the UI)
- rank, evaluated_at

## Security
vendor_ai_scores has a SELECT policy only. No INSERT/UPDATE/DELETE
policy exists for it, so with RLS enabled, only a SECURITY DEFINER
function (which runs with the bypass-RLS privileges of its owner) can
write to it. That function is evaluate_vendors_for_request() below —
this is the DB-level enforcement of "the AI never writes directly to
purchase_orders/vendors/goods_receipts": its only write surface is this
one table plus an audit_log entry. Generating an actual PO from a
recommendation is done by the frontend calling the exact same
createPurchaseOrder() a human uses for the manual "Create PO" button —
no new PO-writing code path is introduced.

## Scoring logic (fixes the v1 weighting bug)
Each vendor's composite score is the average of whichever dimensions
actually have evidence, NOT a fixed 20%-each split. A vendor with only
2 of 5 dimensions scored has those 2 renormalized to ~50% each, not
diluted by three phantom zeros. confidence = dimensions_scored / 5.
*/

-- ============================================================
-- vendor_quotes
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  quoted_price numeric(12,2) NOT NULL CHECK (quoted_price >= 0),
  quoted_by uuid REFERENCES user_profiles(id),
  quoted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, vendor_id)
);

ALTER TABLE vendor_quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_request ON vendor_quotes(request_id);

DROP POLICY IF EXISTS "select_vendor_quotes" ON vendor_quotes;
CREATE POLICY "select_vendor_quotes"
  ON vendor_quotes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_vendor_quotes" ON vendor_quotes;
CREATE POLICY "insert_vendor_quotes"
  ON vendor_quotes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "update_vendor_quotes" ON vendor_quotes;
CREATE POLICY "update_vendor_quotes"
  ON vendor_quotes FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('buyer', 'manager', 'admin'))
  WITH CHECK (public.current_user_role() IN ('buyer', 'manager', 'admin'));

DROP POLICY IF EXISTS "delete_vendor_quotes" ON vendor_quotes;
CREATE POLICY "delete_vendor_quotes"
  ON vendor_quotes FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ============================================================
-- vendor_ai_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_ai_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  price_score numeric(4,3),
  delivery_score numeric(4,3),
  reliability_score numeric(4,3),
  risk_score numeric(4,3) NOT NULL,
  performance_score numeric(4,3),
  dimensions_scored int NOT NULL,
  composite_score numeric(4,3) NOT NULL,
  confidence numeric(4,3) NOT NULL,
  evidence jsonb,
  rank int,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_ai_scores ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vas_request ON vendor_ai_scores(request_id);

-- SELECT only. No INSERT/UPDATE/DELETE policy is defined on purpose —
-- only evaluate_vendors_for_request() (SECURITY DEFINER, below) can
-- write here.
DROP POLICY IF EXISTS "select_vendor_ai_scores" ON vendor_ai_scores;
CREATE POLICY "select_vendor_ai_scores"
  ON vendor_ai_scores FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- evaluate_vendors_for_request RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_vendors_for_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_quote numeric;
  v_max_quote numeric;
  rec RECORD;
  v_price numeric;
  v_reliability numeric;
  v_delivery numeric;
  v_performance numeric;
  v_risk numeric;
  v_scored int;
  v_sum numeric;
  v_composite numeric;
  v_confidence numeric;
  v_top_vendor_id uuid;
  v_top_score numeric;
  v_top_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM procurement_requests WHERE id = p_request_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Re-running an evaluation replaces the previous run for this request.
  DELETE FROM vendor_ai_scores WHERE request_id = p_request_id;

  SELECT min(quoted_price), max(quoted_price) INTO v_min_quote, v_max_quote
  FROM vendor_quotes WHERE request_id = p_request_id;

  FOR rec IN
    SELECT * FROM vendors WHERE status = 'active'
  LOOP
    -- Price: only scored if THIS vendor quoted for THIS request. Cheapest
    -- quote among everyone who quoted scores 1.0, priciest scores 0.
    SELECT quoted_price INTO v_price FROM vendor_quotes
      WHERE request_id = p_request_id AND vendor_id = rec.id;
    IF v_price IS NOT NULL AND v_max_quote IS NOT NULL AND v_max_quote > v_min_quote THEN
      v_price := 1 - ((v_price - v_min_quote) / (v_max_quote - v_min_quote));
    ELSIF v_price IS NOT NULL THEN
      v_price := 1.0;
    END IF;

    -- Reliability / delivery / performance: only scored if this vendor
    -- has at least one recorded evaluation. Never fabricated for a
    -- vendor with none on file.
    SELECT avg(quality_score) / 5.0, avg(delivery_score) / 5.0, avg(overall_rating) / 5.0
      INTO v_reliability, v_delivery, v_performance
      FROM vendor_evaluations WHERE vendor_id = rec.id;

    -- Risk: rule-based off flags every vendor already has, so always scored.
    v_risk := CASE
      WHEN rec.source_type = 'existing' AND rec.is_verified THEN 1.0
      WHEN rec.source_type = 'existing' AND NOT rec.is_verified THEN 0.6
      WHEN rec.source_type = 'new' AND rec.is_verified THEN 0.85
      ELSE 0.35
    END;

    v_scored := (CASE WHEN v_price IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_reliability IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_delivery IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_performance IS NOT NULL THEN 1 ELSE 0 END)
              + 1; -- risk always counts

    v_sum := COALESCE(v_price, 0) + COALESCE(v_reliability, 0)
           + COALESCE(v_delivery, 0) + COALESCE(v_performance, 0) + v_risk;

    -- Renormalized average over SCORED dimensions only -- this is the
    -- v1 bug fix. A vendor scored on only 2 dimensions is not diluted
    -- by three phantom zeros.
    v_composite := v_sum / v_scored;
    v_confidence := v_scored / 5.0;

    INSERT INTO vendor_ai_scores (
      request_id, vendor_id, price_score, delivery_score, reliability_score,
      risk_score, performance_score, dimensions_scored, composite_score,
      confidence, evidence, evaluated_at
    ) VALUES (
      p_request_id, rec.id, v_price, v_delivery, v_reliability, v_risk, v_performance,
      v_scored, v_composite, v_confidence,
      jsonb_build_object(
        'source_type', rec.source_type,
        'is_verified', rec.is_verified,
        'had_quote', v_price IS NOT NULL,
        'evaluation_count', (SELECT count(*) FROM vendor_evaluations WHERE vendor_id = rec.id)
      ),
      now()
    );
  END LOOP;

  UPDATE vendor_ai_scores v SET rank = ranked.rnk
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY composite_score DESC) AS rnk
    FROM vendor_ai_scores WHERE request_id = p_request_id
  ) ranked
  WHERE v.id = ranked.id;

  SELECT vas.vendor_id, vas.composite_score, v.name
    INTO v_top_vendor_id, v_top_score, v_top_name
    FROM vendor_ai_scores vas JOIN vendors v ON v.id = vas.vendor_id
    WHERE vas.request_id = p_request_id AND vas.rank = 1;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(), 'AI_EVALUATION_RUN', 'procurement_request', p_request_id,
    jsonb_build_object('top_vendor', v_top_name, 'top_score', v_top_score)
  );

  RETURN jsonb_build_object(
    'success', true,
    'top_vendor_id', v_top_vendor_id,
    'top_vendor_name', v_top_name,
    'top_score', v_top_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_vendors_for_request(uuid) TO authenticated;
