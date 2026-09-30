import { useState } from 'react';
import { AlertTriangle, Zap, Loader2 } from 'lucide-react';
import type { InventoryItem, ProcurementRequest } from '@/lib/procurement/types';
import { createRequest } from '@/lib/procurement/queries';
import { CC, glass } from './ccTheme';

interface Props {
  inventory: InventoryItem[];
  requests: ProcurementRequest[];
  onChanged: () => void;
}

export default function LowStockPanel({ inventory, requests, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Low stock = on hand is below the item's reorder point (reorder_point 0 means "not tracked").
  const low = inventory
    .filter(i => Number(i.reorder_point) > 0 && Number(i.quantity_on_hand) < Number(i.reorder_point))
    .map(i => ({
      ...i,
      pct: Math.round((Number(i.quantity_on_hand) / Number(i.reorder_point)) * 100),
      // Suggested order brings stock up to twice the reorder point.
      suggested: Math.max(Number(i.reorder_point) * 2 - Number(i.quantity_on_hand), 0),
    }))
    .sort((a, b) => a.pct - b.pct);

  // Skip items that already have an open request, so the button can't create duplicates.
  const openNames = new Set(
    requests
      .filter(r => ['pending', 'approved'].includes(r.status))
      .map(r => (r.product_name || '').toLowerCase())
  );
  const toRequest = low.filter(i => !openNames.has(i.product_name.toLowerCase()));

  const handleCreate = async () => {
    if (toRequest.length === 0) return;
    if (!window.confirm(`Create ${toRequest.length} procurement request(s) for low-stock items?`)) return;
    setBusy(true);
    setMessage(null);
    const needed = new Date();
    needed.setDate(needed.getDate() + 7);
    const requiredDate = needed.toISOString().split('T')[0];
    let created = 0;
    try {
      // One at a time: request numbers are generated from a running count.
      for (const item of toRequest) {
        await createRequest({
          title: `Restock ${item.product_name}`,
          product_name: item.product_name,
          quantity: item.suggested,
          priority: item.pct < 40 ? 'high' : 'medium',
          location: item.location || 'Warehouse A',
          reason: `Stock is ${item.quantity_on_hand}, below the reorder point of ${item.reorder_point}.`,
          required_date: requiredDate,
        });
        created += 1;
      }
      setMessage(`Created ${created} request(s). They now wait for approval.`);
    } catch (err) {
      setMessage(
        `${created} created before an error: ${err instanceof Error ? err.message : 'request failed'}`
      );
    }
    setBusy(false);
    onChanged();
  };

  const th: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 10.5,
    color: CC.textLo,
    paddingBottom: 9,
    fontWeight: 600,
  };

  return (
    <section style={glass({ padding: 20 })}>
      <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={15} color={CC.orange} />
        Low stock
      </div>
      <div style={{ fontSize: 11.5, color: CC.textLo, marginTop: 2, marginBottom: 14 }}>
        {low.length} item{low.length === 1 ? '' : 's'} below reorder point
      </div>

      {low.length === 0 ? (
        <p style={{ fontSize: 12.5, color: CC.textMid, padding: '14px 0' }}>
          Nothing is below its reorder point. Set reorder points on inventory items to track them here.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={th}>Item</th>
              <th style={th}>On hand</th>
              <th style={th}>Suggested</th>
            </tr>
          </thead>
          <tbody>
            {low.slice(0, 6).map(r => (
              <tr key={r.id}>
                <td style={{ padding: '10px 0', borderTop: `1px solid ${CC.borderSoft}` }}>
                  <div style={{ fontWeight: 600 }}>{r.product_name}</div>
                  <div style={{ width: 56, height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 5 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(r.pct, 100)}%`,
                        background: r.pct < 40 ? CC.red : CC.orange,
                      }}
                    />
                  </div>
                </td>
                <td style={{ padding: '10px 0', borderTop: `1px solid ${CC.borderSoft}`, color: CC.textMid }}>
                  {r.quantity_on_hand} / {r.reorder_point}
                </td>
                <td style={{ padding: '10px 0', borderTop: `1px solid ${CC.borderSoft}`, fontWeight: 600, color: CC.orange }}>
                  +{r.suggested}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {message && <p style={{ fontSize: 12, color: CC.cyan, marginTop: 12 }}>{message}</p>}

      {low.length > 0 && (
        <>
          <button
            onClick={handleCreate}
            disabled={busy || toRequest.length === 0}
            style={{
              width: '100%',
              marginTop: 14,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12.5,
              padding: '9px 14px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${CC.blue}, ${CC.cyan})`,
              color: '#031018',
              cursor: busy || toRequest.length === 0 ? 'default' : 'pointer',
              opacity: busy || toRequest.length === 0 ? 0.55 : 1,
            }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {toRequest.length === 0 ? 'Already requested' : `Create ${toRequest.length} request${toRequest.length === 1 ? '' : 's'}`}
          </button>
          {toRequest.length === 0 && (
            <p style={{ fontSize: 11.5, color: CC.textLo, marginTop: 8 }}>
              Every low-stock item already has a pending or approved request.
            </p>
          )}
        </>
      )}
    </section>
  );
}
