/*
# Make user-reference columns nullable for seed data

## Purpose
goods_receipts.received_by and vendor_evaluations.evaluated_by are
NOT NULL but no auth users exist yet. Making them nullable lets seed
data load. The app will populate them when users are signed in.

## Changes
- goods_receipts.received_by: NOT NULL -> nullable
- vendor_evaluations.evaluated_by: NOT NULL -> nullable
*/

ALTER TABLE goods_receipts ALTER COLUMN received_by DROP NOT NULL;
ALTER TABLE vendor_evaluations ALTER COLUMN evaluated_by DROP NOT NULL;
