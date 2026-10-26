import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessPopupProps {
  message: string;
  onClose: () => void;
  title?: string;
  duration?: number;
}

export function SuccessPopup({ message, onClose, title = 'Salvo com Sucesso!', duration = 2800 }: SuccessPopupProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
        </div>
        <p className="text-[10px] text-slate-500">Fechando automaticamente…</p>
      </div>
    </div>
  );
}
