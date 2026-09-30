import { useCallback, useEffect, useState } from 'react';
import { LogOut, FileText, Users, ClipboardList, Package, Sparkles } from 'lucide-react';
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

type TabId = 'requests' | 'vendors' | 'orders' | 'receipts' | 'ai';

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'requests', label: 'Requests', icon: FileText },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'ai', label: 'AI Evaluation', icon: Sparkles },
  { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
  { id: 'receipts', label: 'Goods Receipts', icon: Package },
];

function ProcurementContent() {
  const { session, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('requests');

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

  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <div>
      {/* Toolbar: sits inside the ERP shell, which already provides the app header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Procurement</h1>
          <p className="text-sm text-slate-500">
            {profile?.full_name || 'User'} · <span className="capitalize">{profile?.role || 'buyer'}</span>
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                active
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {dataError && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {dataError}
        </div>
      )}

      {dataLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading procurement data...</div>
      ) : (
        <>
          {activeTab === 'requests' && (
            <RequestsTab
              requests={requests}
              vendors={vendors}
              thresholds={thresholds}
              onChanged={loadAll}
            />
          )}
          {activeTab === 'vendors' && <VendorsTab vendors={vendors} onChanged={loadAll} />}
          {activeTab === 'ai' && (
            <AIEvaluationTab
              requests={requests}
              vendors={vendors}
              orders={orders}
              onChanged={loadAll}
            />
          )}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              vendors={vendors}
              approvedRequests={approvedRequests}
              onChanged={loadAll}
            />
          )}
          {activeTab === 'receipts' && (
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
