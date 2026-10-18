/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Design System Loading & Skeleton Component
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullPage = false,
  text = 'Carregando dados...'
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className={`${sizeMap[size]} text-[#C8102E] animate-spin`} />
      {text && <span className="text-xs font-bold text-slate-600 tracking-wider uppercase">{text}</span>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden p-4 space-y-4 animate-pulse">
    <div className="w-full h-44 bg-slate-200 rounded-2xl" />
    <div className="h-4 w-3/4 bg-slate-200 rounded" />
    <div className="h-3 w-1/2 bg-slate-200 rounded" />
    <div className="h-10 w-full bg-slate-200 rounded-xl pt-4" />
  </div>
);
