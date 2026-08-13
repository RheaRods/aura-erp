import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, X } from 'lucide-react';

export function Accounts({ invoices, onAddInvoice }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState('idle'); // idle, processing, success

  const simulateOCR = () => {
    setUploadStep('processing');
    setTimeout(() => {
      setUploadStep('success');
    }, 2000);
  };

  const handleFinishUpload = () => {
    onAddInvoice({
      id: `INV-${Math.floor(6000 + Math.random() * 900)}`,
      supplier: 'Goa Wholesale Mart',
      invoiceDate: '2026-08-13',
      dueDate: '2026-08-28',
      amount: 34500,
      status: 'Processing'
    });
    setIsModalOpen(false);
    setUploadStep('idle');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Accounts & Invoices</h2>
          <p className="text-sm text-slate-500 mt-1">Manage payables, supplier bills and automated OCR invoice ingestion.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xs transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload Invoice (OCR)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Outstanding Payables</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">₹2,54,400</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Pending Invoices</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">{invoices.filter(i => i.status === 'Pending').length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Paid This Month</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">₹8,45,200</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Overdue</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">{invoices.filter(i => i.status === 'Overdue').length}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Invoice Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-medium text-slate-900">{inv.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{inv.supplier}</td>
                  <td className="px-6 py-4">{inv.invoiceDate}</td>
                  <td className="px-6 py-4">{inv.dueDate}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      inv.status === 'Processing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OCR Simulation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-lg">AI Invoice OCR Ingestion</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {uploadStep === 'idle' && (
                <div 
                  onClick={simulateOCR}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 bg-slate-50 transition-colors"
                >
                  <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-900">Click to simulate uploading supplier invoice PDF</p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF, PNG, JPG (Max 15MB)</p>
                </div>
              )}

              {uploadStep === 'processing' && (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-slate-900">Extracting fields via OCR & AI Vision...</p>
                  <p className="text-xs text-slate-500">Reading line items, batch numbers and tax totals.</p>
                </div>
              )}

              {uploadStep === 'success' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Invoice extracted successfully with 99.4% confidence.</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm border border-slate-200">
                    <div className="flex justify-between"><span className="text-slate-500">Supplier:</span><span className="font-semibold">Goa Wholesale Mart</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Invoice Number:</span><span className="font-semibold">INV-99823</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-semibold">2026-08-13</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tax (GST 5%):</span><span className="font-semibold">₹1,642</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-900 font-bold">Total Amount:</span><span className="font-bold text-blue-600">₹34,500</span></div>
                  </div>
                  <button 
                    onClick={handleFinishUpload}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors"
                  >
                    Confirm & Update ERP Ledger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}