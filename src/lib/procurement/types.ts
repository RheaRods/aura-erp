export type Role = 'buyer' | 'manager' | 'admin';

export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type POStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled';
export type VendorConfirmationStatus = 'pending' | 'confirmed' | 'rejected';
export type VendorStatus = 'active' | 'inactive' | 'blacklisted';
export type SourceType = 'existing' | 'new';

export interface UserProfile {
  id: string;
  role: Role;
  full_name: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  source_type: SourceType;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  rating: number;
  status: VendorStatus;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  requested_by: string | null;
  vendor_id: string | null;
  status: RequestStatus;
  total_estimate: number;
  required_date: string | null;
  product_name: string | null;
  quantity: number | null;
  priority: Priority;
  location: string | null;
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor | null;
  requester?: UserProfile | null;
  approver?: UserProfile | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  procurement_request_id: string | null;
  vendor_id: string;
  status: POStatus;
  total_amount: number;
  order_date: string;
  expected_delivery: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  vendor_confirmed_at: string | null;
  vendor_confirmation_status: VendorConfirmationStatus;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor | null;
  lines?: POLine[];
}

export interface POLine {
  id: string;
  po_id: string;
  line_number: number;
  item_description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  received_quantity: number;
  created_at: string;
}

export interface GoodsReceipt {
  id: string;
  po_id: string;
  po_line_id: string;
  quantity_received: number;
  quantity_accepted: number;
  is_over_receipt: boolean;
  received_by: string | null;
  received_date: string;
  notes: string | null;
  created_at: string;
  po_line?: POLine;
  po?: PurchaseOrder;
}

export interface VendorEvaluation {
  id: string;
  vendor_id: string;
  evaluated_by: string | null;
  quality_score: number;
  delivery_score: number;
  cost_score: number;
  overall_rating: number;
  comments: string | null;
  evaluation_date: string;
  created_at: string;
}

export interface ApprovalThreshold {
  id: string;
  role: Role;
  max_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  product_name: string;
  quantity_on_hand: number;
  location: string | null;
  reorder_point: number;
  last_receipt_id: string | null;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
