import { useState } from 'react';
import { Plus, Loader2, Trash2, Send, Check, X, Ban, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import type { PurchaseOrder, POLine, Vendor, ProcurementRequest } from '@/lib/procurement/types';
import type { POStatus } from '@/lib/procurement/types';
import {
  createPurchaseOrder,
  updatePOLine,
  addPOLine,
  deletePOLine,
  updatePOStatus,
  recordVendorConfirmation,
  cancelPO,
} from '@/lib/procurement/queries';
import { canCancelPO } from '@/lib/procurement/stateMachine';
import { formatCurrency, formatDate } from '@/lib/procurement/format';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-amber-100 text-amber-700',
  received: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-400',
  cancelled: 'bg-red-100 text-red-700',
};

const CONFIRM_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

interface Props {
  orders: PurchaseOrder[];
  vendors: Vendor[];
  approvedRequests: ProcurementRequest[];
  onChanged: () => void;
}

export default function OrdersTab({ orders, vendors, approvedRequests, onChanged }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendPO = async (poId: string) => {
    setLoading(true);
    setError(null);
    try {
      await updatePOStatus(poId, 'sent');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send PO');
    }
    setLoading(false);
  };

  const handleConfirm = async (poId: string, status: 'confirmed' | 'rejected') => {
    setLoading(true);
    setError(null);
    try {
      await recordVendorConfirmation(poId, status);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update confirmation');
    }
    setLoading(false);
  };

  const handleCancel = async (poId: string) => {
    setLoading(true);
    setError(null);
    try {
      await cancelPO(poId, cancelReason);
      setCancelId(null);
      setCancelReason('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel PO');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="text-sm text-slate-500 mt-1">{orders.length} orders total</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <POForm
          vendors={vendors}
          approvedRequests={approvedRequests}
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No purchase orders yet.</div>
        )}
        {orders.map(po => {
          const expanded = expandedId === po.id;
          const cancellable = canCancelPO(po.status);
          return (
            <div key={po.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedId(expanded ? null : po.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{po.po_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[po.status]}`}>
                      {po.status}
                    </span>
                    {po.status !== 'draft' && po.status !== 'cancelled' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIRM_STYLES[po.vendor_confirmation_status]}`}>
                        vendor: {po.vendor_confirmation_status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">{po.vendor?.name || 'Unknown vendor'}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order: {formatDate(po.order_date)} • Expected: {formatDate(po.expected_delivery)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(po.total_amount)}</div>
                  <div className="text-xs text-slate-400">{po.lines?.length ?? 0} line items</div>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>

              {expanded && (
                <PODetail
                  po={po}
                  cancellable={cancellable}
                  loading={loading}
                  onSendPO={() => handleSendPO(po.id)}
                  onConfirm={(s) => handleConfirm(po.id, s)}
                  onCancelClick={() => setCancelId(po.id)}
                  cancelMode={cancelId === po.id}
                  cancelReason={cancelReason}
                  setCancelReason={setCancelReason}
                  onConfirmCancel={() => handleCancel(po.id)}
                  onCancelCancel={() => { setCancelId(null); setCancelReason(''); }}
                  onLinesChanged={onChanged}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PODetail({
  po,
  cancellable,
  loading,
  onSendPO,
  onConfirm,
  onCancelClick,
  cancelMode,
  cancelReason,
  setCancelReason,
  onConfirmCancel,
  onCancelCancel,
  onLinesChanged,
}: {
  po: PurchaseOrder;
  cancellable: boolean;
  loading: boolean;
  onSendPO: () => void;
  onConfirm: (s: 'confirmed' | 'rejected') => void;
  onCancelClick: () => void;
  cancelMode: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  onConfirmCancel: () => void;
  onCancelCancel: () => void;
  onLinesChanged: () => void;
}) {
  const [newLineDesc, setNewLineDesc] = useState('');
  const [newLineQty, setNewLineQty] = useState('1');
  const [newLinePrice, setNewLinePrice] = useState('0');
  const [lineError, setLineError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const isDraft = po.status === 'draft';

  const handleAddLine = async () => {
    setLineError(null);
    try {
      await addPOLine(po.id, {
        item_description: newLineDesc,
        quantity: parseFloat(newLineQty),
        unit_price: parseFloat(newLinePrice),
      });
      setNewLineDesc('');
      setNewLineQty('1');
      setNewLinePrice('0');
      onLinesChanged();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Failed to add line');
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    setLineError(null);
    try {
      await deletePOLine(lineId);
      onLinesChanged();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Failed to delete line');
    }
  };

  const handleSaveLine = async (lineId: string) => {
    setLineError(null);
    try {
      await updatePOLine(lineId, {
        quantity: parseFloat(editQty),
        unit_price: parseFloat(editPrice),
        item_description: editDesc,
      });
      setEditingId(null);
      onLinesChanged();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Failed to update line');
    }
  };

  const startEdit = (line: POLine) => {
    setEditingId(line.id);
    setEditQty(String(line.quantity));
    setEditPrice(String(line.unit_price));
    setEditDesc(line.item_description);
  };

  return (
    <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
      {po.cancellation_reason && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <strong>Cancelled:</strong> {po.cancellation_reason}
        </div>
      )}

      {lineError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {lineError}
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Line Items</h4>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600">#</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Description</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Qty</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Unit Price</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Total</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Received</th>
                {isDraft && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(po.lines ?? []).map(line => (
                <tr key={line.id}>
                  <td className="px-3 py-2 text-slate-400">{line.line_number}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {editingId === line.id ? (
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                    ) : (
                      line.item_description
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {editingId === line.id ? (
                      <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right" />
                    ) : (
                      line.quantity
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {editingId === line.id ? (
                      <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-right" />
                    ) : (
                      formatCurrency(line.unit_price)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(line.line_total)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{line.received_quantity}</td>
                  {isDraft && (
                    <td className="px-3 py-2 text-right">
                      {editingId === line.id ? (
                        <button onClick={() => handleSaveLine(line.id)} className="text-emerald-600 hover:text-emerald-700 mr-2">
                          <Check className="w-3.5 h-3.5 inline" />
                        </button>
                      ) : (
                        <button onClick={() => startEdit(line)} className="text-slate-400 hover:text-slate-600 mr-2 text-xs">
                          edit
                        </button>
                      )}
                      <button onClick={() => handleDeleteLine(line.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {isDraft && (
                <tr className="bg-slate-50/50">
                  <td className="px-3 py-2 text-slate-400">+</td>
                  <td className="px-3 py-2">
                    <input value={newLineDesc} onChange={e => setNewLineDesc(e.target.value)} placeholder="Item description" className="w-full px-2 py-1 border border-slate-300 rounded text-xs" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={newLineQty} onChange={e => setNewLineQty(e.target.value)} className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={newLinePrice} onChange={e => setNewLinePrice(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-right" />
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={handleAddLine} disabled={!newLineDesc} className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50">
                      Add
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-200">
        {isDraft && (
          <button
            onClick={onSendPO}
            disabled={loading || (po.lines?.length ?? 0) === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Send to Vendor
          </button>
        )}

        {po.status === 'sent' && po.vendor_confirmation_status === 'pending' && (
          <>
            <span className="text-xs text-slate-500 mr-2">Vendor confirmation:</span>
            <button
              onClick={() => onConfirm('confirmed')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm
            </button>
            <button
              onClick={() => onConfirm('rejected')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </>
        )}

        {po.vendor_confirmation_status === 'confirmed' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Truck className="w-3.5 h-3.5" />
            Vendor confirmed on {formatDate(po.vendor_confirmed_at)}
          </span>
        )}

        {cancellable && !cancelMode && (
          <button
            onClick={onCancelClick}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition disabled:opacity-50 ml-auto"
          >
            <Ban className="w-3.5 h-3.5" />
            Cancel PO
          </button>
        )}

        {cancelMode && (
          <div className="flex items-center gap-2 w-full ml-auto">
            <input
              type="text"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Cancellation reason..."
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={onConfirmCancel}
              disabled={loading || !cancelReason}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition disabled:opacity-50"
            >
              Confirm Cancel
            </button>
            <button
              onClick={onCancelCancel}
              className="px-3 py-1.5 text-slate-500 text-xs"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function POForm({
  vendors,
  approvedRequests,
  onCancel,
  onCreated,
}: {
  vendors: Vendor[];
  approvedRequests: ProcurementRequest[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [vendorId, setVendorId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [lines, setLines] = useState<{ item_description: string; quantity: string; unit_price: string }[]>([
    { item_description: '', quantity: '1', unit_price: '0' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLine = (idx: number, field: 'item_description' | 'quantity' | 'unit_price', value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    setLines(next);
  };

  const addLineRow = () => {
    setLines([...lines, { item_description: '', quantity: '1', unit_price: '0' }]);
  };

  const removeLineRow = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }
    if (lines.some(l => !l.item_description)) {
      setError('All line items need a description');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createPurchaseOrder({
        vendor_id: vendorId,
        procurement_request_id: requestId || undefined,
        expected_delivery: expectedDelivery || undefined,
        lines: lines.map(l => ({
          item_description: l.item_description,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PO');
    }
    setLoading(false);
  };

  const activeVendors = vendors.filter(v => v.status === 'active');

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Purchase Order (Draft)</h3>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendor *</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700">
            <option value="">— Select vendor —</option>
            {activeVendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From approved request (optional)</label>
          <select value={requestId} onChange={e => setRequestId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700">
            <option value="">— None —</option>
            {approvedRequests.map(r => (
              <option key={r.id} value={r.id}>{r.request_number}: {r.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expected Delivery</label>
          <input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-2">Line Items</label>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={line.item_description}
                onChange={e => updateLine(idx, 'item_description', e.target.value)}
                placeholder="Item description"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
              <input
                type="number"
                value={line.quantity}
                onChange={e => updateLine(idx, 'quantity', e.target.value)}
                placeholder="Qty"
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
              <input
                type="number"
                value={line.unit_price}
                onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                placeholder="Price"
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
              <span className="text-sm text-slate-500 w-24 text-right">
                {formatCurrency((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0))}
              </span>
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLineRow(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addLineRow} className="mt-2 text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add line
        </button>
      </div>

      <div className="flex items-center justify-between mt-5">
        <div className="text-sm font-semibold text-slate-900">Total: {formatCurrency(total)}</div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Draft PO
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-800">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
