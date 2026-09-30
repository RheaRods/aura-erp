import { TrendingUp } from 'lucide-react';
import type { ProcurementRequest, PurchaseOrder } from '@/lib/procurement/types';
import { CC, glass } from './ccTheme';

interface Props {
  requests: ProcurementRequest[];
  orders: PurchaseOrder[];
}

export default function DemandSummary({ requests, orders }: Props) {
  // Open demand = requests still waiting on a PO (pending approval, or approved but not yet ordered).
  const withPO = new Set(orders.map(o => o.procurement_request_id).filter(Boolean));
  const open = requests.filter(r => ['pending', 'approved'].includes(r.status) && !withPO.has(r.id));

  const byProduct = new Map<string, { name: string; qty: number; count: number }>();
  for (const r of open) {
    const name = r.product_name || r.title;
    const entry = byProduct.get(name) ?? { name, qty: 0, count: 0 };
    entry.qty += Number(r.quantity ?? 0);
    entry.count += 1;
    byProduct.set(name, entry);
  }
  const rows = Array.from(byProduct.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  return (
    <section style={glass({ padding: 20 })}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} color={CC.cyan} />
          Open demand
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 7,
            background: 'rgba(34,211,238,0.12)',
            color: '#9FEFFF',
            border: '1px solid rgba(34,211,238,0.30)',
          }}
        >
          From requests
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: CC.textLo, marginBottom: 6 }}>Requested but not yet ordered</div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 12.5, color: CC.textMid, padding: '14px 0' }}>
          No open demand. Requests waiting for a PO show up here.
        </p>
      ) : (
        rows.map((r, i) => (
          <div
            key={r.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${CC.borderSoft}`,
            }}
          >
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: CC.textLo, marginTop: 2 }}>
                {r.count} request{r.count === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: CC.cyan, fontWeight: 600 }}>{r.qty.toLocaleString('en-IN')} u</div>
          </div>
        ))
      )}
    </section>
  );
}
