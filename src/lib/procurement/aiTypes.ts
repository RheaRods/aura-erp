import type { Vendor } from './types';

export interface VendorQuote {
  id: string;
  request_id: string;
  vendor_id: string;
  quoted_price: number;
  quoted_by: string | null;
  quoted_at: string;
}

export interface VendorAIScore {
  id: string;
  request_id: string;
  vendor_id: string;
  price_score: number | null;
  delivery_score: number | null;
  reliability_score: number | null;
  risk_score: number;
  performance_score: number | null;
  dimensions_scored: number;
  composite_score: number;
  confidence: number;
  evidence: Record<string, unknown> | null;
  rank: number | null;
  evaluated_at: string;
  vendor?: Vendor | null;
}

export interface AIAuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}
