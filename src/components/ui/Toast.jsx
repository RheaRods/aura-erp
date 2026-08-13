import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 animate-slide-up">
      {toast.type === 'error' ? (
        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
      )}
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-white ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}