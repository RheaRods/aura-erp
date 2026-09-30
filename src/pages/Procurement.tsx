import { useCallback, useEffect, useState } from 'react';
import {
  LogOut,
  FileText,
  Users,
  ClipboardList,
  Package,
  Sparkles,
  Activity,
  Truck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/procurement/AuthContext';
import {
  fetchVendors,
  fetchRequests,
  fetchPurchaseOrders,
  fetchGoodsReceipts,
  fetchInventory,
  fetchThresholds,
} from '@/lib/procurement/queries';
import type {
  Vendor,
  ProcurementRequest,
  PurchaseOrder,
  GoodsReceipt,
  InventoryItem,
  ApprovalThreshold,
} from '@/lib/procurement/types';
import Login from '@/components/procurement/Login';
import RequestsTab from '@/components/procurement/RequestsTab';
import VendorsTab from '@/components/procurement/VendorsTab';
import OrdersTab from '@/components/procurement/OrdersTab';
import ReceiptsTab from '@/components/procurement/ReceiptsTab';
import AIEvaluationTab from '@/components/procurement/AIEvaluationTab';

type Section = 'overview' | 'requests' | 'vendors' | 'ai' | 'orders' | 'receipts';

const SECTIONS: { id: Section; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'ai', label: 'AI Evaluation', icon: Sparkles },
  { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
  { id: 'receipts', label: 'Goods Receipts', icon: Package },
];

function ProcurementContent() {
  const { session, profile, loading, signOut } = useAuth();
  const [section, setSection] = useState<Section>('overview');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [thresholds, setThresholds] = useState<ApprovalThreshold[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [v, r, po, gr, inv, th] = await Promise.all([
        fetchVendors(),
        fetchRequests(),
        fetchPurchaseOrders(),
        fetchGoodsReceipts(),
        fetchInventory(),
        fetchThresholds(),
      ]);
      setVendors(v);
      setRequests(r);
      setOrders(po);
      setReceipts(gr);
      setInventory(inv);
      setThresholds(th);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load data');
    }
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (session) loadAll();
  }, [session, loadAll]);

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  // ---- Derived numbers ----
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const requestIdsWithPO = new Set(orders.map(o => o.procurement_request_id).filter(Boolean));
  const readyForVendor = approvedRequests.filter(r => !requestIdsWithPO.has(r.id));

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const draftPOs = orders.filter(o => o.status === 'draft');
  const awaitingVendor = orders.filter(
    o => o.status === 'sent' && o.vendor_confirmation_status === 'pending'
  );
  const openPOs = orders.filter(o => ['draft', 'sent', 'partially_received'].includes(o.status));
  const awaitingReceipt = orders.filter(o => ['sent', 'partially_received'].includes(o.status));
  const verifiedVendors = vendors.filter(v => v.is_verified).length;

  const totalAttention =
    pendingRequests.length + readyForVendor.length + draftPOs.length + awaitingVendor.length;

  const statCards = [
    { icon: FileText, label: 'Pending requests', value: pendingRequests.length },
    { icon: ClipboardList, label: 'Open POs', value: openPOs.length },
    { icon: Truck, label: 'Awaiting receipt', value: awaitingReceipt.length },
    { icon: Users, label: `Vendors (${verifiedVendors} verified)`, value: vendors.length },
    { icon: Package, label: 'Inventory items', value: inventory.length },
  ];

  const badgeFor = (id: Section): number => {
    switch (id) {
      case 'requests':
        return pendingRequests.length;
      case 'ai':
        return readyForVendor.length;
      case 'orders':
        return draftPOs.length + awaitingVendor.length;
      case 'receipts':
        return awaitingReceipt.length;
      default:
        return 0;
    }
  };

  const poProgress = (po: PurchaseOrder) => {
    const ordered = (po.lines ?? []).reduce((sum, l) => sum + Number(l.quantity), 0);
    const received = (po.lines ?? []).reduce((sum, l) => sum + Number(l.received_quantity), 0);
    return { ordered, received, pct: ordered > 0 ? Math.min(100, (received / ordered) * 100) : 0 };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 leading-tight">Procurement</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profile?.full_name || 'User'} · <span className="capitalize">{profile?.role || 'buyer'}</span>
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Compact stat strip: one bordered row, no nested cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 rounded-lg bg-white mb-5 overflow-hidden divide-x divide-y sm:divide-y-0 divide-slate-100">
        {statCards.map((s, i) => (
          <div key={i} className="px-3.5 py-3 flex items-center gap-2.5">
            <s.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-500 leading-none mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Section switcher */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-0.5">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          const count = badgeFor(id);
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {dataError && (
        <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {dataError}
        </div>
      )}

      {dataLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading procurement data...</div>
      ) : (
        <>
          {/* ===================== OVERVIEW ===================== */}
          {section === 'overview' && (
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-3 bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Order progress</h3>
                {openPOs.length === 0 ? (
                  <div className="py-8 text-center">
                    <TrendingUp className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No open purchase orders.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Approved requests turn into orders here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openPOs.map(po => {
                      const { ordered, received, pct } = poProgress(po);
                      return (
                        <div key={po.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-slate-600">
                              {po.vendor?.name?.charAt(0) || 'V'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-900 truncate">
                                {po.vendor?.name || 'Unknown vendor'}
                                <span className="text-xs font-normal text-slate-400 ml-2">{po.po_number}</span>
                              </span>
                              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                {po.status === 'draft' ? 'Draft' : `${received}/${ordered} received`}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-700 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-sm">Needs attention</h3>
                  {totalAttention > 0 && (
                    <span className="text-xs text-slate-400">{totalAttention} open</span>
                  )}
                </div>
                {totalAttention === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Nothing needs attention right now.</p>
                ) : (
                  <div className="divide-y divide-slate-100 -mx-4 px-4">
                    {pendingRequests.slice(0, 2).map(r => (
                      <AttentionRow
                        key={r.id}
                        title={r.title}
                        detail={`Request awaiting approval • ${r.priority} priority`}
                        onClick={() => setSection('requests')}
                      />
                    ))}
                    {readyForVendor.slice(0, 2).map(r => (
                      <AttentionRow
                        key={r.id}
                        title={r.title}
                        detail="Approved • needs a vendor"
                        onClick={() => setSection('ai')}
                      />
                    ))}
                    {draftPOs.slice(0, 2).map(po => (
                      <AttentionRow
                        key={po.id}
                        title={`${po.po_number} • ${po.vendor?.name || 'Unknown vendor'}`}
                        detail="Draft PO • ready to send"
                        onClick={() => setSection('orders')}
                      />
                    ))}
                    {awaitingVendor.slice(0, 2).map(po => (
                      <AttentionRow
                        key={po.id}
                        title={`${po.po_number} • ${po.vendor?.name || 'Unknown vendor'}`}
                        detail="Waiting for vendor confirmation"
                        onClick={() => setSection('orders')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== OTHER SECTIONS ===================== */}
          {section === 'requests' && (
            <RequestsTab
              requests={requests}
              vendors={vendors}
              thresholds={thresholds}
              onChanged={loadAll}
            />
          )}
          {section === 'vendors' && <VendorsTab vendors={vendors} onChanged={loadAll} />}
          {section === 'ai' && (
            <AIEvaluationTab
              requests={requests}
              vendors={vendors}
              orders={orders}
              onChanged={loadAll}
            />
          )}
          {section === 'orders' && (
            <OrdersTab
              orders={orders}
              vendors={vendors}
              approvedRequests={approvedRequests}
              onChanged={loadAll}
            />
          )}
          {section === 'receipts' && (
            <ReceiptsTab
              orders={orders}
              receipts={receipts}
              inventory={inventory}
              onChanged={loadAll}
            />
          )}
        </>
      )}
    </div>
  );
}

function AttentionRow({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-2.5 text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
    </button>
  );
}

// Named export matches how the ERP's App.jsx imports it: { Procurement }.
// AuthProvider lives here so App.jsx and the other pages stay untouched.
export function Procurement() {
  return (
    <AuthProvider>
      <ProcurementContent />
    </AuthProvider>
  );
}

export default Procurement;
