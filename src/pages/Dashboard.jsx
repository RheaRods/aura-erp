import React from 'react';
import { Warehouse, Clock, AlertTriangle, TrendingUp, ArrowUpRight, CheckCircle } from 'lucide-react';

export function Dashboard({ purchaseOrders }) {
  const kpis = [
    { title: 'Total Stock Value', value: '₹24,86,420', change: '+8.4% vs last month', icon: Warehouse, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Pending Orders', value: '42', change: '12 require approval', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Low Stock Alerts', value: '18', change: '5 critical items', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Today\'s Sales', value: '₹3,42,850', change: '+12.6% vs yesterday', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Greeting */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Good afternoon, Rhea</h2>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening across your retail operations today.</p>
        </div>
        <div className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
          Last updated: Today at 5:49 PM
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`${kpi.bg} ${kpi.color} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  {kpi.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart Simulation */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Sales Velocity (Last 7 Days)</h3>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-md">Live Stream</span>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 pt-6 px-2 border-b border-slate-100">
            {[
              { day: 'Mon', amount: '₹2.4L', height: '60%' },
              { day: 'Tue', amount: '₹2.8L', height: '70%' },
              { day: 'Wed', amount: '₹3.1L', height: '78%' },
              { day: 'Thu', amount: '₹2.7L', height: '68%' },
              { day: 'Fri', amount: '₹3.4L', height: '85%' },
              { day: 'Sat', amount: '₹4.1L', height: '100%' },
              { day: 'Sun', amount: '₹3.8L', height: '92%' },
            ].map((bar, i) => (
              // FIX: Added 'h-full' and 'justify-end' to the parent div below
              <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group h-full">
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">{bar.amount}</span>
                <div 
                  style={{ height: bar.height }} 
                  className="w-full bg-blue-600/90 rounded-t-md group-hover:bg-blue-700 transition-all"
                ></div>
                <span className="text-xs font-medium text-slate-600">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Health Donut Simulation */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Inventory Health</h3>
            <p className="text-xs text-slate-500">Stock distribution across warehouses</p>
          </div>
          <div className="space-y-4 my-6">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Healthy Stock (82%)</span>
                <span className="text-slate-900">820 SKUs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[82%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Low Stock Warnings (13%)</span>
                <span className="text-slate-900">130 SKUs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[13%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Out of Stock (5%)</span>
                <span className="text-slate-900">50 SKUs</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full w-[5%]"></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Automated restock triggers active via AURA Intelligence.</span>
          </div>
        </div>
      </div>

      {/* Recent PO Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-base">Recent Purchase Orders</h3>
          <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">View All</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">PO Number</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.slice(0, 4).map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-medium text-slate-900">{po.id}</td>
                  <td className="px-6 py-4">{po.product}</td>
                  <td className="px-6 py-4">{po.supplier}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{po.estimatedCost.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      po.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      po.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}