/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Design System Button Component
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emerald' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-extrabold uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-[#C8102E] hover:bg-[#A00D24] text-white focus:ring-[#C8102E]/40 border border-red-700/20',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-900/40 border border-slate-800',
    outline: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 focus:ring-slate-400/20',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 shadow-none border-0',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-600/40 border border-emerald-700/20',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-600/40'
  };

  const sizeStyles = {
    sm: 'text-[10px] px-3 py-1.5 gap-1.5 h-8',
    md: 'text-xs px-4 py-2.5 gap-2 h-10',
    lg: 'text-sm px-6 py-3.5 gap-2.5 h-12'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Carregando...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
