import { useState } from 'react';
import { Plus, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProcurementRequest, Vendor, ApprovalThreshold, UserProfile } from '@/lib/procurement/types';
import type { Role } from '@/lib/procurement/types';
import { createRequest, approveRequest } from '@/lib/procurement/queries';
import { formatCurrency, formatDate } from '@/lib/procurement/format';
import { useAuth } from '@/lib/procurement/AuthContext';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  fulfilled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

interface Props {
  requests: ProcurementRequest[];
  vendors: Vendor[];
  thresholds: ApprovalThreshold[];
  onChanged: () => void;
}

export default function RequestsTab({ requests, vendors, thresholds, onChanged }: Props) {
  const { profile, session } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionId, setRejectionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = profile?.role ?? 'buyer';

  const getThresholdForRole = (r: Role): number => {
    const t = thresholds.find(t => t.role === r);
    return t?.max_amount ?? 0;
  };

  const canApprove = (req: ProcurementRequest): boolean => {
    if (req.status !== 'pending') return false;
    if (!session?.user?.id) return false;
    if (req.requested_by === session.user.id) return false;
    const limit = getThresholdForRole(role);
    return req.total_estimate <= limit;
  };

  const handleApprove = async (reqId: string, decision: 'approve' | 'reject') => {
    setLoading(true);
    setError(null);
    try {
      const result = await approveRequest(reqId, decision, decision === 'reject' ? rejectionReason : undefined);
      if (!result.success) {
        setError(result.error || 'Approval failed');
      } else {
        setRejectionId(null);
        setRejectionReason('');
        onChanged();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Procurement Requests</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your approval limit: {formatCurrency(getThresholdForRole(role))}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <RequestForm
          vendors={vendors}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      <div className="space-y-3">
        {requests.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No procurement requests yet.</div>
        )}
        {requests.map(req => {
          const expanded = expandedId === req.id;
          const approvable = canApprove(req);
          return (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedId(expanded ? null : req.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{req.request_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status]}`}>
                      {req.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[req.priority]}`}>
                      {req.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 truncate">{req.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.product_name} • Qty: {req.quantity} • {req.location} • Needed: {formatDate(req.required_date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(req.total_estimate)}</div>
                  <div className="text-xs text-slate-400">{formatDate(req.created_at)}</div>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {expanded && (
                <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Description</p>
                      <p className="text-sm text-slate-700">{req.description || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Reason</p>
                      <p className="text-sm text-slate-700">{req.reason || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Requested By</p>
                      <p className="text-sm text-slate-700">{req.requester?.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Vendor</p>
                      <p className="text-sm text-slate-700">{req.vendor?.name || 'Unassigned'}</p>
                    </div>
                    {req.approved_by && (
                      <>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Approved By</p>
                          <p className="text-sm text-slate-700">{req.approver?.full_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Approved At</p>
                          <p className="text-sm text-slate-700">{formatDate(req.approved_at)}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      {approvable ? (
                        <>
                          <button
                            onClick={() => handleApprove(req.id, 'approve')}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500 transition disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          {rejectionId === req.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="Rejection reason..."
                                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <button
                                onClick={() => handleApprove(req.id, 'reject')}
                                disabled={loading || !rejectionReason}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => { setRejectionId(null); setRejectionReason(''); }}
                                className="px-3 py-1.5 text-slate-500 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectionId(req.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">
                          {req.requested_by === session?.user?.id
                            ? 'You cannot approve your own request.'
                            : role === 'buyer' && req.total_estimate > getThresholdForRole('buyer')
                            ? `Amount exceeds your approval limit (${formatCurrency(getThresholdForRole(role))}).`
                            : 'You do not have permission to approve this request.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Create Request Form ----

function RequestForm({
  vendors,
  onCancel,
  onCreated,
}: {
  vendors: Vendor[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [totalEstimate, setTotalEstimate] = useState('0');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createRequest({
        title,
        description,
        product_name: productName,
        quantity: parseFloat(quantity),
        priority,
        location,
        reason,
        required_date: requiredDate,
        vendor_id: vendorId || undefined,
        total_estimate: parseFloat(totalEstimate) || 0,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Procurement Request</h3>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
          <input value={productName} onChange={e => setProductName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
          <input type="number" min="1" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Priority *</label>
          <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Location *</label>
          <input value={location} onChange={e => setLocation(e.target.value)} required placeholder="Warehouse A" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Required Date *</label>
          <input type="date" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Total Estimate ($)</label>
          <input type="number" min="0" step="any" value={totalEstimate} onChange={e => setTotalEstimate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor (optional)</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700">
            <option value="">— Unassigned —</option>
            {vendors.filter(v => v.status === 'active').map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Reason / Justification *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Request
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-800">
          Cancel
        </button>
      </div>
    </form>
  );
}
