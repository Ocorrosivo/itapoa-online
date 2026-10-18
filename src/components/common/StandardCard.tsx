/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Design System Standard Card Component
 */

import React from 'react';
import { ArrowRight, Phone, MapPin, Tag } from 'lucide-react';
import { Button } from './Button';

export interface StandardCardProps {
  title: string;
  category?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  badgeText?: string;
  badgeType?: 'vip' | 'new' | 'solidarity' | 'default';
  whatsapp?: string;
  actionText?: string;
  onAction?: () => void;
  onClick?: () => void;
  className?: string;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  title,
  category,
  location,
  description,
  imageUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  logoUrl,
  badgeText,
  badgeType = 'default',
  whatsapp,
  actionText = 'CLIQUE AQUI ↗',
  onAction,
  onClick,
  className = ''
}) => {
  const badgeStyles = {
    vip: 'bg-[#C8102E] text-white',
    new: 'bg-emerald-600 text-white',
    solidarity: 'bg-amber-500 text-slate-900',
    default: 'bg-slate-900 text-white'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 shadow-sm hover:shadow-xl hover:border-[#C8102E] group flex flex-col justify-between ${className}`}
    >
      <div className="space-y-4">
        {/* Cover Image & Badges */}
        <div className="relative h-48 overflow-hidden bg-slate-100">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />

          {badgeText && (
            <div className={`absolute top-3 left-3 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md ${badgeStyles[badgeType]}`}>
              {badgeText}
            </div>
          )}

          {logoUrl && (
            <div className="absolute bottom-3 right-3 w-12 h-12 bg-white border border-slate-200 rounded-2xl p-1 shadow-md">
              <img src={logoUrl} alt={title} className="w-full h-full object-contain rounded-xl" />
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-5 space-y-2">
          {(category || location) && (
            <span className="text-[10px] font-extrabold text-[#C8102E] uppercase tracking-wider block flex items-center gap-1">
              {category && <span>{category}</span>}
              {category && location && <span>•</span>}
              {location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {location}
                </span>
              )}
            </span>
          )}

          <h3 className="text-base font-black text-slate-900 leading-tight group-hover:text-[#C8102E] transition line-clamp-1">
            {title}
          </h3>

          {description && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {whatsapp ? (
          <Button
            variant="emerald"
            size="sm"
            className="flex-1"
            icon={<Phone className="w-3.5 h-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://wa.me/55${whatsapp.replace(/\D/g, '')}`, '_blank');
            }}
          >
            WhatsApp
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onAction) onAction();
            else if (onClick) onClick();
          }}
          icon={<ArrowRight className="w-3.5 h-3.5" />}
          iconPosition="right"
        >
          {actionText}
        </Button>
      </div>
    </div>
  );
};
