import { supabase } from './supabaseClient';
import type {
  Vendor,
  ProcurementRequest,
  PurchaseOrder,
  POLine,
  GoodsReceipt,
  InventoryItem,
  ApprovalThreshold,
  UserProfile,
  POStatus,
} from './types';

// ---- Vendors ----

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vendor[];
}

export async function createVendor(input: {
  name: string;
  source_type: 'existing' | 'new';
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  is_verified?: boolean;
}): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name: input.name,
      source_type: input.source_type,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      tax_id: input.tax_id || null,
      payment_terms: input.payment_terms || null,
      is_verified: input.is_verified ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Vendor;
}

// ---- Procurement Requests ----

export async function fetchRequests(): Promise<ProcurementRequest[]> {
  const { data, error } = await supabase
    .from('procurement_requests')
    .select('*, vendor:vendors(*), requester:user_profiles!requested_by(*), approver:user_profiles!approved_by(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProcurementRequest[];
}

export async function createRequest(input: {
  title: string;
  description?: string;
  product_name: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  reason: string;
  required_date: string;
  vendor_id?: string;
  total_estimate?: number;
}): Promise<ProcurementRequest> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  // Generate request number: PR-YYYY-NNNN
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('procurement_requests')
    .select('*', { count: 'exact', head: true })
    .like('request_number', `PR-${year}-%`);

  const seq = String((count ?? 0) + 1).padStart(4, '0');
  const request_number = `PR-${year}-${seq}`;

  const { data, error } = await supabase
    .from('procurement_requests')
    .insert({
      request_number,
      title: input.title,
      description: input.description || null,
      product_name: input.product_name,
      quantity: input.quantity,
      priority: input.priority,
      location: input.location,
      reason: input.reason,
      required_date: input.required_date,
      vendor_id: input.vendor_id || null,
      total_estimate: input.total_estimate || 0,
      requested_by: userId,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProcurementRequest;
}

export async function approveRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string; status?: string }> {
  const { data, error } = await supabase.rpc('approve_procurement_request', {
    p_request_uuid: requestId,
    p_decision: decision,
    p_rejection_reason: rejectionReason || null,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; status?: string };
}

// ---- Purchase Orders ----

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, vendor:vendors(*), lines:po_lines(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PurchaseOrder[];
}

export async function createPurchaseOrder(input: {
  vendor_id: string;
  procurement_request_id?: string;
  expected_delivery?: string;
  lines: { item_description: string; quantity: number; unit_price: number }[];
}): Promise<PurchaseOrder> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .like('po_number', `PO-${year}-%`);

  const seq = String((count ?? 0) + 1).padStart(4, '0');
  const po_number = `PO-${year}-${seq}`;

  const total = input.lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_number,
      vendor_id: input.vendor_id,
      procurement_request_id: input.procurement_request_id || null,
      expected_delivery: input.expected_delivery || null,
      total_amount: total,
      order_date: new Date().toISOString().split('T')[0],
      created_by: userId,
      status: 'draft',
    })
    .select()
    .single();
  if (poError) throw poError;

  const poId = (po as PurchaseOrder).id;
  const lineInserts = input.lines.map((line, idx) => ({
    po_id: poId,
    line_number: idx + 1,
    item_description: line.item_description,
    quantity: line.quantity,
    unit_price: line.unit_price,
  }));

  const { error: linesError } = await supabase.from('po_lines').insert(lineInserts);
  if (linesError) throw linesError;

  return po as PurchaseOrder;
}

export async function updatePOLine(
  lineId: string,
  updates: { quantity?: number; unit_price?: number; item_description?: string }
): Promise<void> {
  const { error } = await supabase.from('po_lines').update(updates).eq('id', lineId);
  if (error) throw error;
}

export async function addPOLine(
  poId: string,
  line: { item_description: string; quantity: number; unit_price: number }
): Promise<void> {
  const { data: existing } = await supabase
    .from('po_lines')
    .select('line_number')
    .eq('po_id', poId)
    .order('line_number', { ascending: false })
    .limit(1);

  const nextLine = (existing?.[0]?.line_number ?? 0) + 1;

  const { error } = await supabase.from('po_lines').insert({
    po_id: poId,
    line_number: nextLine,
    item_description: line.item_description,
    quantity: line.quantity,
    unit_price: line.unit_price,
  });
  if (error) throw error;
}

export async function deletePOLine(lineId: string): Promise<void> {
  const { error } = await supabase.from('po_lines').delete().eq('id', lineId);
  if (error) throw error;
}

export async function updatePOStatus(
  poId: string,
  status: POStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status, ...extra })
    .eq('id', poId);
  if (error) throw error;
}

export async function recordVendorConfirmation(
  poId: string,
  confirmation: 'confirmed' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      vendor_confirmation_status: confirmation,
      vendor_confirmed_at: new Date().toISOString(),
    })
    .eq('id', poId);
  if (error) throw error;
}

export async function cancelPO(poId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
    })
    .eq('id', poId);
  if (error) throw error;
}

// ---- Goods Receipts ----

export async function fetchGoodsReceipts(): Promise<GoodsReceipt[]> {
  const { data, error } = await supabase
    .from('goods_receipts')
    .select('*, po_line:po_lines(*), po:purchase_orders(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as GoodsReceipt[];
}

export async function createGoodsReceipt(input: {
  po_id: string;
  po_line_id: string;
  quantity_received: number;
  quantity_accepted: number;
  notes?: string;
  sku: string;
  product_name: string;
  location: string;
}): Promise<{ receipt: GoodsReceipt; inventoryResult: { success: boolean; already_processed: boolean; quantity_on_hand: number } }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  // Check for over-receipt
  const { data: line } = await supabase
    .from('po_lines')
    .select('quantity, received_quantity')
    .eq('id', input.po_line_id)
    .single();

  const orderedQty = line?.quantity ?? 0;
  const alreadyReceived = line?.received_quantity ?? 0;
  const remaining = orderedQty - alreadyReceived;
  const isOver = input.quantity_received > remaining;

  const { data: receipt, error } = await supabase
    .from('goods_receipts')
    .insert({
      po_id: input.po_id,
      po_line_id: input.po_line_id,
      quantity_received: input.quantity_received,
      quantity_accepted: input.quantity_accepted,
      is_over_receipt: isOver,
      received_by: userId,
      received_date: new Date().toISOString().split('T')[0],
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Update received_quantity on the PO line
  const newReceivedQty = alreadyReceived + input.quantity_received;
  const { error: lineUpdateError } = await supabase
    .from('po_lines')
    .update({ received_quantity: newReceivedQty })
    .eq('id', input.po_line_id);
  if (lineUpdateError) throw lineUpdateError;

  // Update PO status based on receipt progress
  const { data: poLines } = await supabase
    .from('po_lines')
    .select('quantity, received_quantity')
    .eq('po_id', input.po_id);

  const allFullyReceived = poLines?.every(l => l.received_quantity >= l.quantity) ?? false;
  const anyReceived = poLines?.some(l => l.received_quantity > 0) ?? false;

  let newPOStatus: 'partially_received' | 'received' = 'partially_received';
  if (allFullyReceived) newPOStatus = 'received';

  if (anyReceived) {
    await supabase.from('purchase_orders').update({ status: newPOStatus }).eq('id', input.po_id);
  }

  // Idempotent inventory update via RPC
  const { data: invResult, error: invError } = await supabase.rpc('upsert_inventory_on_receipt', {
    p_receipt_uuid: (receipt as GoodsReceipt).id,
    p_sku: input.sku,
    p_product_name: input.product_name,
    p_location: input.location,
    p_qty: input.quantity_accepted,
  });
  if (invError) throw invError;

  return {
    receipt: receipt as GoodsReceipt,
    inventoryResult: invResult as { success: boolean; already_processed: boolean; quantity_on_hand: number },
  };
}

// ---- Inventory ----

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as InventoryItem[];
}

// ---- Approval Thresholds ----

export async function fetchThresholds(): Promise<ApprovalThreshold[]> {
  const { data, error } = await supabase
    .from('approval_thresholds')
    .select('*')
    .eq('is_active', true)
    .order('max_amount', { ascending: true });
  if (error) throw error;
  return data as ApprovalThreshold[];
}

// ---- User Profile ----

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserProfile | null;
}