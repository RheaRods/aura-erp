import { useState } from 'react';
import { Package, Loader2, AlertTriangle, Check } from 'lucide-react';
import type { PurchaseOrder, POLine, GoodsReceipt, InventoryItem } from '@/lib/procurement/types';
import { createGoodsReceipt } from '@/lib/procurement/queries';
import { formatCurrency, formatDate } from '@/lib/procurement/format';

interface Props {
  orders: PurchaseOrder[];
  receipts: GoodsReceipt[];
  inventory: InventoryItem[];
  onChanged: () => void;
}

export default function ReceiptsTab({ orders, receipts, inventory, onChanged }: Props) {
  const [selectedPOId, setSelectedPOId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // POs that can receive goods: sent, partially_received
  const receivablePOs = orders.filter(po => ['sent', 'partially_received'].includes(po.status));

  const selectedPO = receivablePOs.find(po => po.id === selectedPOId);

  const handleReceipt = async (line: POLine, qtyReceived: string, qtyAccepted: string, sku: string, location: string, notes: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const received = parseFloat(qtyReceived);
      const accepted = parseFloat(qtyAccepted);
      const remaining = line.quantity - line.received_quantity;
      const isOver = received > remaining;

      const result = await createGoodsReceipt({
        po_id: selectedPOId,
        po_line_id: line.id,
        quantity_received: received,
        quantity_accepted: accepted,
        sku: sku || `SKU-${line.id.slice(0, 8)}`,
        product_name: line.item_description,
        location: location || 'Warehouse A',
        notes,
      });

      setSuccess(
        `Receipt recorded: ${received} units received${isOver ? ' (OVER-RECEIPT)' : ''}, ${accepted} accepted. ` +
        `Inventory now has ${result.inventoryResult.quantity_on_hand} units. ` +
        (result.inventoryResult.already_processed ? '(This receipt was already processed — no duplicate inventory update.)' : '')
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record receipt');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Goods Receipts</h2>
        <p className="text-sm text-slate-500 mt-1">Record received goods against purchase orders</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{success}</div>
      )}

      {receivablePOs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No purchase orders are awaiting receipt. Send a PO to a vendor first.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Select Purchase Order</label>
            <select
              value={selectedPOId}
              onChange={e => setSelectedPOId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              <option value="">— Select a PO —</option>
              {receivablePOs.map(po => (
                <option key={po.id} value={po.id}>
                  {po.po_number} — {po.vendor?.name} ({po.status})
                </option>
              ))}
            </select>
          </div>

          {selectedPO && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{selectedPO.po_number}</span>
                    <span className="text-xs text-slate-500 ml-2">{selectedPO.vendor?.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">Expected: {formatDate(selectedPO.expected_delivery)}</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {(selectedPO.lines ?? []).map(line => (
                  <ReceiptLineForm
                    key={line.id}
                    line={line}
                    loading={loading}
                    onSubmit={handleReceipt}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent receipts */}
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-3">Recent Receipts</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">PO</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Received</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Accepted</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Over?</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No goods receipts yet.</td></tr>
              )}
              {receipts.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.received_date)}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.po?.po_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.po_line?.item_description || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.quantity_received}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.quantity_accepted}</td>
                  <td className="px-4 py-3">
                    {r.is_over_receipt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                        <AlertTriangle className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-slate-600" />
          <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">Inventory</h3>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">On Hand</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No inventory items yet.</td></tr>
              )}
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${item.quantity_on_hand > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {item.quantity_on_hand}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.location || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReceiptLineForm({
  line,
  loading,
  onSubmit,
}: {
  line: POLine;
  loading: boolean;
  onSubmit: (line: POLine, qtyReceived: string, qtyAccepted: string, sku: string, location: string, notes: string) => void;
}) {
  const [qtyReceived, setQtyReceived] = useState('');
  const [qtyAccepted, setQtyAccepted] = useState('');
  const [sku, setSku] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const remaining = line.quantity - line.received_quantity;
  const fullyReceived = line.received_quantity >= line.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qtyReceived) return;
    if (!qtyAccepted) setQtyAccepted(qtyReceived);
    onSubmit(line, qtyReceived, qtyAccepted || qtyReceived, sku, location, notes);
    setQtyReceived('');
    setQtyAccepted('');
    setSku('');
    setLocation('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{line.item_description}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordered: {line.quantity} • Received: {line.received_quantity} • Remaining: {remaining}
          </p>
        </div>
        {fullyReceived ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="w-3.5 h-3.5" /> Fully received
          </span>
        ) : showForm ? (
          <button onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700"
          >
            Record Receipt
          </button>
        )}
      </div>

      {showForm && !fullyReceived && (
        <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Qty Received *</label>
            <input
              type="number"
              min="0"
              step="any"
              value={qtyReceived}
              onChange={e => {
                setQtyReceived(e.target.value);
                if (!qtyAccepted) setQtyAccepted(e.target.value);
              }}
              required
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
            {parseFloat(qtyReceived) > remaining && parseFloat(qtyReceived) > 0 && (
              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Over-receipt by {parseFloat(qtyReceived) - remaining}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Qty Accepted</label>
            <input
              type="number"
              min="0"
              step="any"
              value={qtyAccepted}
              onChange={e => setQtyAccepted(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">SKU</label>
            <input
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="Auto if blank"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Warehouse A"
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <div className="flex gap-2">
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
