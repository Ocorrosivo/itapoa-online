import React from 'react';
import { Instagram, Facebook, Globe, MapPin } from 'lucide-react';
import { ProfileDetails } from '../../../utils/companyProfileDetails';

interface ProfileSocialFieldsProps {
  instagram: string;
  facebook: string;
  tiktok?: string;
  details: ProfileDetails;
  onUpdateSocial: (field: 'instagram' | 'facebook' | 'tiktok', val: string) => void;
  onUpdateDetails: (details: ProfileDetails) => void;
}

const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500 pl-11';

// Ícone SVG moderno do X (antigo Twitter)
function XTwitterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Ícone do Google Meu Negócio
function GoogleBusinessIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}

export function ProfileSocialFields({
  instagram,
  facebook,
  tiktok,
  details,
  onUpdateSocial,
  onUpdateDetails,
}: ProfileSocialFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Instagram */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Instagram className="w-3.5 h-3.5 text-pink-400" />
            Instagram
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none">
              <Instagram className="w-4 h-4" />
            </div>
            <input
              type="text"
              maxLength={255}
              value={instagram}
              onChange={e => onUpdateSocial('instagram', e.target.value)}
              placeholder="https://instagram.com/suaempresa"
              className={inputClass}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ex: https://instagram.com/suaempresa ou @suaempresa</p>
        </div>

        {/* Facebook */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Facebook className="w-3.5 h-3.5 text-blue-400" />
            Facebook
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
              <Facebook className="w-4 h-4" />
            </div>
            <input
              type="text"
              maxLength={255}
              value={facebook}
              onChange={e => onUpdateSocial('facebook', e.target.value)}
              placeholder="https://facebook.com/suaempresa"
              className={inputClass}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ex: https://facebook.com/suaempresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* X (antigo Twitter) */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <XTwitterIcon className="w-3.5 h-3.5 text-slate-200" />
            X (antigo Twitter)
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
              <XTwitterIcon className="w-4 h-4" />
            </div>
            <input
              type="url"
              maxLength={500}
              value={details.x}
              onChange={e => onUpdateDetails({ ...details, x: e.target.value })}
              placeholder="https://x.com/suaempresa"
              className={inputClass}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ex: https://x.com/suaempresa</p>
        </div>

        {/* Google Meu Negócio / Perfil da Empresa no Google */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <GoogleBusinessIcon className="w-3.5 h-3.5 text-emerald-400" />
            Google Meu Negócio / Perfil no Google
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
              <GoogleBusinessIcon className="w-4 h-4" />
            </div>
            <input
              type="url"
              maxLength={500}
              value={details.googleBusiness}
              onChange={e => onUpdateDetails({ ...details, googleBusiness: e.target.value })}
              placeholder="https://maps.app.goo.gl/exemplo"
              className={inputClass}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">URL pública do seu perfil no Google Maps</p>
        </div>
      </div>

      {/* TikTok se já estiver cadastrado ou em uso */}
      {tiktok !== undefined && (
        <div className="pt-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            TikTok (Opcional)
          </label>
          <input
            type="text"
            maxLength={255}
            value={tiktok || ''}
            onChange={e => onUpdateSocial('tiktok', e.target.value)}
            placeholder="https://tiktok.com/@suaempresa ou @suaempresa"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
          />
        </div>
      )}
    </div>
  );
}
