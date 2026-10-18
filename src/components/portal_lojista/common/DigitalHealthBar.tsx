/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Digital Health Bar Component (Score 0 to 100)
 */

import React from 'react';
import { Activity, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Company } from '../../../types';

interface DigitalHealthBarProps {
  company: Company | null;
  onOpenModal: () => void;
}

export const DigitalHealthBar: React.FC<DigitalHealthBarProps> = ({ company, onOpenModal }) => {
  if (!company) return null;

  // Calculate Digital Health Score (0-100)
  let score = 0;
  if (company.logo) score += 10;
  if (company.coverImage) score += 10;
  if (company.description) score += 10;
  if (company.whatsapp) score += 15;
  if (company.hours) score += 10;
  if (company.address) score += 10;
  if (company.products && company.products.length > 0) score += 15;
  if (company.instagram || company.facebook) score += 10;
  if (company.rating >= 4.5) score += 10;

  const finalScore = Math.min(score, 100);

  let statusColor = 'text-red-400 bg-red-500/20 border-red-500/30';
  let progressColor = 'bg-red-500';
  if (finalScore >= 80) {
    statusColor = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    progressColor = 'bg-emerald-500';
  } else if (finalScore >= 50) {
    statusColor = 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    progressColor = 'bg-amber-500';
  }

  return (
    <div
      onClick={onOpenModal}
      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 cursor-pointer transition shadow-md flex items-center gap-3 group"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${statusColor} shrink-0`}>
        <Activity className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-[140px]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-bold text-slate-300 group-hover:text-white transition">Saúde Digital</span>
          <span className="font-black text-white">{finalScore}/100</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
            style={{ width: `${finalScore}%` }}
          ></div>
        </div>
      </div>

      <button className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition shrink-0">
        <span>Otimizar</span>
        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      </button>
    </div>
  );
};
