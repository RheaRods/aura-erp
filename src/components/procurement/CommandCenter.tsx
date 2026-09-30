import type { ReactNode } from 'react';
import { Sparkles, FileText, ClipboardList, Users, Truck, Package } from 'lucide-react';
import type { ProcurementRequest, Vendor, PurchaseOrder, InventoryItem } from '@/lib/procurement/types';

import { CC } from './ccTheme';
import ErrorBoundary from './ErrorBoundary';
import LowStockPanel from './LowStockPanel';
import DemandSummary from './DemandSummary';
import VendorEvaluationWorkspace from './VendorEvaluationWorkspace';

interface Props {
  requests: ProcurementRequest[];
  vendors: Vendor[];
  orders: PurchaseOrder[];
  inventory: InventoryItem[];
  onChanged: () => void;
}

function KPI({
  icon,
  label,
  value,
  note,
  warn,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
  warn?: boolean;
}) {
  return (
    <div style={{ background: CC.glassStrong, border: `1px solid ${CC.borderSoft}`, borderRadius: 14, padding: '16px 16px 14px' }}>
      <div style={{ fontSize: 11, color: CC.textMid, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, marginTop: 6, color: warn ? CC.orange : CC.textLo }}>{note}</div>
    </div>
  );
}

export default function CommandCenter({ requests, vendors, orders, inventory, onChanged }: Props) {
  const now = Date.now();
  const todayStr = new Date().toDateString();
  const todayISO = new Date().toISOString().split('T')[0];

  const draftPOs = orders.filter(o => o.status === 'draft');
  const draftToday = draftPOs.filter(o => new Date(o.created_at).toDateString() === todayStr).length;

  const pending = requests.filter(r => r.status === 'pending');
  const aging = pending.filter(r => now - new Date(r.created_at).getTime() > 24 * 60 * 60 * 1000).length;

  const unverified = vendors.filter(v => !v.is_verified && v.status === 'active');
  const unverifiedNew = unverified.filter(v => v.source_type === 'new').length;

  const incoming = orders.filter(o => ['sent', 'partially_received'].includes(o.status));
  const overdue = incoming.filter(o => o.expected_delivery && o.expected_delivery < todayISO).length;

  const unitsOnHand = inventory.reduce((sum, i) => sum + Number(i.quantity_on_hand), 0);

  return (
    <div
      style={{
        background: `radial-gradient(700px 260px at 15% 0%, rgba(59,130,246,0.16), transparent 65%), radial-gradient(600px 260px at 100% 10%, rgba(139,92,246,0.18), transparent 60%), ${CC.bg}`,
        color: CC.textHi,
        borderRadius: 20,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${CC.violet}, ${CC.blue})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={21} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AI Procurement Command Center</h2>
            <div style={{ fontSize: 12.5, color: CC.textMid, marginTop: 3 }}>
              Live view of requests, vendor evaluation and approvals across the procurement pipeline.
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 7,
            background: 'rgba(139,92,246,0.14)',
            color: '#CBB6FF',
            border: '1px solid rgba(139,92,246,0.32)',
          }}
        >
          Scoring engine · 5 dimensions
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginTop: 24 }}>
        <KPI icon={<FileText size={13} />} label="Draft POs" value={draftPOs.length} note={`${draftToday} created today`} />
        <KPI
          icon={<ClipboardList size={13} />}
          label="Pending approvals"
          value={pending.length}
          note={aging > 0 ? `${aging} waiting over 24h` : 'None aging'}
          warn={aging > 0}
        />
        <KPI
          icon={<Users size={13} />}
          label="Unverified vendors"
          value={unverified.length}
          note={unverifiedNew > 0 ? `${unverifiedNew} new, need verification` : 'All checked'}
          warn={unverifiedNew > 0}
        />
        <KPI
          icon={<Truck size={13} />}
          label="Incoming deliveries"
          value={incoming.length}
          note={overdue > 0 ? `${overdue} past expected date` : 'On schedule'}
          warn={overdue > 0}
        />
        <KPI
          icon={<Package size={13} />}
          label="Units on hand"
          value={unitsOnHand.toLocaleString('en-IN')}
          note={`Across ${inventory.length} items`}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <ErrorBoundary name="Low stock">
            <LowStockPanel inventory={inventory} requests={requests} onChanged={onChanged} />
          </ErrorBoundary>
          <ErrorBoundary name="Open demand">
            <DemandSummary requests={requests} orders={orders} />
          </ErrorBoundary>
        </div>
        <div style={{ flex: '3 1 440px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <ErrorBoundary name="Vendor evaluation">
            <VendorEvaluationWorkspace requests={requests} vendors={vendors} orders={orders} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
