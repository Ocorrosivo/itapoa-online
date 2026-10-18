/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Instant PIX Payment Modal with 30-Minute Real-Time Countdown Timer
 */

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Clock, RefreshCw, QrCode, ShieldCheck } from 'lucide-react';
import { PixDetails } from '../../services/BillingService';

interface PixPaymentModalProps {
  pixData: PixDetails;
  onClose: () => void;
  onRegeneratePix: () => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  pixData,
  onClose,
  onRegeneratePix
}) => {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(pixData.expiresInSeconds || 1800);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white">Pagamento PIX Instantâneo</h3>
          <p className="text-xs text-slate-400">
            Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.
          </p>
        </div>

        {/* Amount & Countdown Timer */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Total</span>
            <span className="text-xl font-black text-emerald-400">R$ {pixData.amount.toFixed(2)}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Expira em</span>
            </span>
            <span className={`text-lg font-mono font-bold ${secondsLeft < 300 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              {secondsLeft > 0 ? formatTimer(secondsLeft) : 'EXPIRADO'}
            </span>
          </div>
        </div>

        {/* QR Code Image / Expired Placeholder */}
        {secondsLeft > 0 ? (
          <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixData.qrCode)}`}
              alt="PIX QR Code Mercado Pago"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="bg-red-950/40 border border-red-900/60 p-6 rounded-2xl text-center space-y-3">
            <span className="text-xs font-bold text-red-400 block">O tempo deste PIX expirou</span>
            <button
              onClick={onRegeneratePix}
              className="w-full py-3 bg-[#C8102E] hover:bg-red-700 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Gerar Novo PIX</span>
            </button>
          </div>
        )}

        {/* Copy/Paste Code Button */}
        {secondsLeft > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Código Copia e Cola</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={pixData.qrCode}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-mono text-slate-300 focus:outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pagamento Seguro via Mercado Pago & Antifraude Webhook</span>
        </div>

      </div>
    </div>
  );
};
