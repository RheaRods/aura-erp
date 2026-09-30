import { supabase } from './supabaseClient';
import type { VendorQuote, VendorAIScore, AIAuditEntry } from './aiTypes';

export async function fetchVendorQuotes(requestId: string): Promise<VendorQuote[]> {
  const { data, error } = await supabase
    .from('vendor_quotes')
    .select('*')
    .eq('request_id', requestId);
  if (error) throw error;
  return data as VendorQuote[];
}

export async function upsertVendorQuote(
  requestId: string,
  vendorId: string,
  quotedPrice: number
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('vendor_quotes').upsert(
    {
      request_id: requestId,
      vendor_id: vendorId,
      quoted_price: quotedPrice,
      quoted_by: userData.user?.id,
      quoted_at: new Date().toISOString(),
    },
    { onConflict: 'request_id,vendor_id' }
  );
  if (error) throw error;
}

export async function runVendorEvaluation(
  requestId: string
): Promise<{ success: boolean; error?: string; top_vendor_id?: string; top_vendor_name?: string; top_score?: number }> {
  const { data, error } = await supabase.rpc('evaluate_vendors_for_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data as {
    success: boolean;
    error?: string;
    top_vendor_id?: string;
    top_vendor_name?: string;
    top_score?: number;
  };
}

export async function fetchVendorScores(requestId: string): Promise<VendorAIScore[]> {
  const { data, error } = await supabase
    .from('vendor_ai_scores')
    .select('*, vendor:vendors(*)')
    .eq('request_id', requestId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return data as VendorAIScore[];
}

export async function fetchAITimeline(requestId: string): Promise<AIAuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_type', 'procurement_request')
    .eq('entity_id', requestId)
    .like('action', 'AI_%')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AIAuditEntry[];
}
