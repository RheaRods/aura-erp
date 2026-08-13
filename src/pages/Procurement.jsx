import React, { useState } from 'react';
import { Plus, Check, X, Eye, Edit3, ShieldAlert } from 'lucide-react';

export function Procurement({ purchaseOrders, onUpdateStatus, onAddPO }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier: 'Goa Wholesale Mart',
    product: 'Kunafa Chocolate 200g',
    quantity: 100,
    unitCost: 450,
    expectedDate: '2026-08-20',
    notes: 'Urgent restock for trending item'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product || !formData.quantity) return;

    const newPO = {
      id: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      product: formData.product,
      supplier: formData.supplier,
      quantity: Number(formData.quantity),
      estimatedCost: Number(formData.quantity) * Number(formData.unitCost),
      status: 'Pending',
      created: new Date().toISOString().split('T')[0],
      requestedBy: 'Rhea Rodrigues'
    };

    onAddPO(newPO);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Procurement & Purchase Orders</h2>
          <p className="text-sm text-slate-500 mt-1">Manage purchase orders, suppliers and procurement approvals.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Pending Approval</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">{purchaseOrders.filter(p => p.status === 'Pending').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Approved Orders</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{purchaseOrders.filter(p => p.status === 'Approved').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Procurement Value</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{purchaseOrders.reduce((acc, curr) => acc + curr.estimatedCost, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Active Suppliers</span>
          <p className="text-2xl font-bold text-blue-600 mt-2">8</p>
        </div>
      </div>

      {/* Primary Procurement Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Active Purchase Orders</h3>
          <span className="text-xs text-slate-500 font-medium">Showing all branch requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">PO Number</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Estimated Cost</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-medium text-slate-900">{po.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{po.product}</td>
                  <td className="px-6 py-4">{po.supplier}</td>
                  <td className="px-6 py-4">{po.quantity} units</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{po.estimatedCost.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      po.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      po.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      po.status === 'Received' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {po.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => onUpdateStatus(po.id, 'Approved')}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-md transition-colors"
                          title="Approve PO"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onUpdateStatus(po.id, 'Rejected')}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-1.5 rounded-md transition-colors"
                          title="Reject PO"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-lg">Create Purchase Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Supplier</label>
                <select 
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>Goa Wholesale Mart</option>
                  <option>Coastal Distributors</option>
                  <option>Metro FMCG Supply</option>
                  <option>MiddleEast Imports India</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Product Name</label>
                <input 
                  type="text" 
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Est. Unit Cost (₹)</label>
                  <input 
                    type="number" 
                    value={formData.unitCost}
                    onChange={(e) => setFormData({...formData, unitCost: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-600">Total Calculated Cost:</span>
                <span className="text-blue-600">₹{(Number(formData.quantity) * Number(formData.unitCost)).toLocaleString()}</span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}