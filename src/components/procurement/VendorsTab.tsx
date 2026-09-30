import { useState } from 'react';
import { Plus, Loader2, Check, X, Scale } from 'lucide-react';
import type { Vendor } from '@/lib/procurement/types';
import { createVendor } from '@/lib/procurement/queries';
import { useAuth } from '@/lib/procurement/AuthContext';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  blacklisted: 'bg-red-100 text-red-700',
};

interface Props {
  vendors: Vendor[];
  onChanged: () => void;
}

export default function VendorsTab({ vendors, onChanged }: Props) {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canManage = profile?.role === 'manager' || profile?.role === 'admin';

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedVendors = vendors.filter(v => selectedIds.has(v.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendors</h2>
          <p className="text-sm text-slate-500 mt-1">{vendors.length} vendors registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
          >
            <Scale className="w-4 h-4" />
            Compare ({selectedIds.size})
          </button>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <VendorForm
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      {showCompare && selectedVendors.length >= 2 && (
        <ComparisonTable vendors={selectedVendors} onClose={() => setShowCompare(false)} />
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {showCompare && <th className="w-10 px-4 py-3"></th>}
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Source</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Payment Terms</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Verified</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.length === 0 && (
              <tr><td colSpan={showCompare ? 8 : 7} className="text-center py-12 text-slate-400">No vendors yet.</td></tr>
            )}
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-slate-50 transition">
                {showCompare && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelect(v.id)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.source_type === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {v.source_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{v.email || '—'}</div>
                  <div className="text-xs text-slate-400">{v.phone || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{v.payment_terms || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{v.rating > 0 ? `${v.rating}/5` : '—'}</td>
                <td className="px-4 py-3">
                  {v.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <X className="w-3.5 h-3.5" /> Unverified
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[v.status]}`}>
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCompare && selectedVendors.length < 2 && (
        <p className="text-sm text-slate-400 mt-4 text-center">Select at least 2 vendors to compare.</p>
      )}
    </div>
  );
}

function ComparisonTable({ vendors, onClose }: { vendors: Vendor[]; onClose: () => void }) {
  const fields: { key: keyof Vendor; label: string; format?: (v: Vendor) => string }[] = [
    { key: 'source_type', label: 'Source Type' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'payment_terms', label: 'Payment Terms' },
    { key: 'rating', label: 'Rating', format: v => (v.rating > 0 ? `${v.rating}/5` : '—') },
    { key: 'is_verified', label: 'Verified', format: v => (v.is_verified ? 'Yes' : 'No') },
    { key: 'status', label: 'Status' },
    { key: 'tax_id', label: 'Tax ID' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Vendor Comparison</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 font-medium text-slate-600 w-32">Attribute</th>
              {vendors.map(v => (
                <th key={v.id} className="text-left py-2 px-3 font-medium text-slate-900">{v.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(field => (
              <tr key={String(field.key)} className="border-b border-slate-50">
                <td className="py-2 px-3 text-slate-500 font-medium">{field.label}</td>
                {vendors.map(v => (
                  <td key={v.id} className="py-2 px-3 text-slate-700">
                    {field.format ? field.format(v) : String(v[field.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VendorForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<'existing' | 'new'>('new');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createVendor({
        name,
        source_type: sourceType,
        email,
        phone,
        address,
        tax_id: taxId,
        payment_terms: paymentTerms,
        is_verified: isVerified,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Vendor</h3>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Source Type *</label>
          <select value={sourceType} onChange={e => setSourceType(e.target.value as 'existing' | 'new')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700">
            <option value="new">New</option>
            <option value="existing">Existing</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tax ID</label>
          <input value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label>
          <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Net 30" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-700" />
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Vendor is verified (defaults to unchecked for new vendors)</span>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Add Vendor
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-800">
          Cancel
        </button>
      </div>
    </form>
  );
}
