/*
# Make creator/approver columns nullable for seed data

## Purpose
The purchase_orders.created_by and approved_by columns were NOT NULL,
but no auth users exist yet to populate them. Making them nullable allows
seed POs to exist without a creator. Once users sign up through the app,
new POs will always include created_by.

## Changes
- purchase_orders.created_by: NOT NULL -> nullable
- procurement_requests.requested_by: already nullable (no change)
*/

ALTER TABLE purchase_orders ALTER COLUMN created_by DROP NOT NULL;
