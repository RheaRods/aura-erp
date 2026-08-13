import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2 } from 'lucide-react';

export function Sales({ salesOrders, onCompleteSale }) {
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([
    { id: 1, name: 'Basmati Rice 5kg', price: 450, qty: 1 },
    { id: 2, name: 'Tata Salt 1kg', price: 32, qty: 2 }
  ]);

  const posProducts = [
    { id: 1, name: 'Basmati Rice 5kg', price: 450, category: 'Grains' },
    { id: 2, name: 'Tata Salt 1kg', price: 32, category: 'Groceries' },
    { id: 3, name: 'Parle-G Biscuits', price: 15, category: 'Snacks' },
    { id: 4, name: 'Surf Excel 2kg', price: 480, category: 'Household' },
    { id: 5, name: 'Amul Butter 500g', price: 290, category: 'Dairy' },
    { id: 6, name: 'Coca-Cola 750ml', price: 50, category: 'Beverages' },
  ];

  const addToCart = (prod) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? {...item, qty: item.qty + 1} : item);
      }
      return [...prev, { ...prod, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? {...item, qty: newQty} : null;
      }
      return item;
    }).filter(Boolean));
  };

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onCompleteSale({
      id: `ORD-${Math.floor(9000 + Math.random() * 900)}`,
      customer: 'Walk-in Customer',
      items: cart.reduce((acc, c) => acc + c.qty, 0),
      total: Math.round(grandTotal),
      payment: 'UPI / Cash',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Completed'
    });
    setCart([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sales & POS Terminal</h2>
          <p className="text-sm text-slate-500 mt-1">Manage counter billing and customer sales orders.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('pos')} 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'pos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            POS Terminal
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            Orders Log
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4">Quick POS Catalog</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {posProducts.map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="flex flex-col justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left bg-slate-50/50 group"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{prod.category}</span>
                    <h4 className="font-semibold text-slate-900 text-sm mt-1 group-hover:text-blue-600">{prod.name}</h4>
                  </div>
                  <div className="mt-4 flex items-center justify-between w-full">
                    <span className="font-bold text-slate-900">₹{prod.price}</span>
                    <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" /> Current Cart
                </h3>
                <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-md">
                  {cart.reduce((a, c) => a + c.qty, 0)} items
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-4">
                {cart.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-sm">Cart is empty. Tap items to add.</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900 text-sm">{item.name}</h4>
                        <span className="text-xs text-slate-500">₹{item.price} each</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>GST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" /> Complete Sale & Print
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Payment Mode</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-medium text-slate-900">{ord.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{ord.customer}</td>
                    <td className="px-6 py-4">{ord.items} items</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">₹{ord.total}</td>
                    <td className="px-6 py-4">{ord.payment}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ord.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}