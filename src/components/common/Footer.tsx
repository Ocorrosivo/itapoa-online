/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Restored Footer Component - Original Layout (Dark Blue)
 */

import React from 'react';
import { Facebook, Instagram, Youtube, LayoutGrid } from 'lucide-react';
import { ITAPOA_CITY_CONFIG } from '../../constants/itapoaData';

interface FooterProps {
  onNavigateTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  return (
    <footer className="bg-[#050511] text-[#4b5563] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Top Social Section */}
        <div className="text-center space-y-6">
          <h4 className="text-[11px] font-black text-white uppercase tracking-widest">NOSSAS MÍDIAS</h4>
          <div className="flex items-center justify-center gap-4">
            <a href="#" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#050511] hover:bg-slate-200 transition">
              <Facebook className="w-4 h-4 fill-current" />
            </a>
            <a href="#" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#050511] hover:bg-slate-200 transition">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#050511] hover:bg-slate-200 transition font-bold text-sm leading-none">
              <span className="mb-0.5">w</span>
            </a>
            <a href="#" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#050511] hover:bg-slate-200 transition">
              <Youtube className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[9px] font-medium tracking-wider text-slate-600 mt-4">
            © 2026 ITAPOÁ ONLINE - Todos os direitos reservados. Guia Comercial e Marketplace.
          </p>
        </div>

        {/* 4 Columns Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pt-8">
          
          {/* Col 1: ITAPOÁ ONLINE */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/logotipo.png" alt="Itapoá Online" className="h-10 w-auto object-contain" />
              <span className="text-[11px] font-black text-white tracking-widest uppercase">
                ITAPOÁ ONLINE
              </span>
            </div>
            <p className="text-[9px] leading-relaxed text-slate-500 font-medium max-w-[220px]">
              O portal oficial de conexões comerciais, gastronomia, turismo e serviços locais do município de Itapoá SC.
            </p>
          </div>

          {/* Col 2: CIDADES ATENDIDAS */}
          <div>
            <h4 className="text-[9px] font-bold text-white uppercase tracking-wider mb-4">CIDADES ATENDIDAS</h4>
            <ul className="space-y-2 text-[9px] text-slate-500 font-medium">
              <li>• Itapoá - SC (Sede Litoral)</li>
              <li>• Joinville - SC</li>
              <li>• Curitiba - PR</li>
              <li>• Florianópolis - SC</li>
            </ul>
          </div>

          {/* Col 3: ÁREAS COMERCIAIS */}
          <div>
            <h4 className="text-[9px] font-bold text-white uppercase tracking-wider mb-4">ÁREAS COMERCIAIS</h4>
            <ul className="space-y-2 text-[9px] text-slate-500 font-medium">
              <li>• Gastronomia & Fast-Food</li>
              <li>• Pousadas e Hotelaria</li>
              <li>• Comércio e Serviços Gerais</li>
              <li>• Construção & Imobiliárias</li>
            </ul>
          </div>

          {/* Col 4: SELO CORPORATIVO */}
          <div className="space-y-4">
            <h4 className="text-[9px] font-bold text-white uppercase tracking-wider mb-4">SELO CORPORATIVO</h4>
            <div className="inline-block border border-emerald-900/50 bg-emerald-950/40 px-2 py-1.5 rounded text-[8px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 w-max">
              <span>✓ PORTAL SEGURO SSL VERIFICADO 2026</span>
            </div>
            <p className="text-[8px] text-slate-600 font-medium leading-relaxed max-w-[180px]">
              Conformidade total com LGPD brasileira de segurança de dados e privacidade.
            </p>
          </div>

        </div>

        {/* Bottom Small Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900/50">
          <p className="text-[9px] text-slate-600 font-medium uppercase tracking-widest">
            © {new Date().getFullYear()} ITAPOÁ ONLINE. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-[9px] text-slate-600 font-medium uppercase tracking-widest">
            <button onClick={() => onNavigateTab('termos-de-uso')} className="hover:text-slate-400">Termos de Uso</button>
            <button onClick={() => onNavigateTab('politica-de-privacidade')} className="hover:text-slate-400">Política de Privacidade</button>
          </div>
        </div>

      </div>
    </footer>
  );
};
