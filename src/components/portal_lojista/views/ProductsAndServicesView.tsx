/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Produtos e Serviços — Gestão Integrada de Catálogo e Promoções
 *
 * Menu 3 Oficial:
 * - Aba 1: Produtos & Serviços (Bronze: 0, Gold: 5, Diamond: 30)
 * - Aba 2: Promoções & Cupons (Bronze: 0, Gold: 1, Diamond: 3)
 * Bloqueios e limites de planos explicados de forma clara.
 */

import React, { useState } from 'react';
import { Package, Ticket, Sparkles, Zap, Lock, ArrowUpRight } from 'lucide-react';
import { Company } from '../../../types';
import { ProductsView } from './ProductsView';
import { CouponsView } from './CouponsView';

interface ProductsAndServicesViewProps {
  company: Company | null;
  onNavigateTab?: (tab: string) => void;
}

export const ProductsAndServicesView: React.FC<ProductsAndServicesViewProps> = ({ company, onNavigateTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'coupons'>('products');

  if (!company) return null;

  const rawPlan = (company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;

  const maxProducts = isDiamond ? 30 : isGold ? 5 : 0;
  const maxCoupons = isDiamond ? 3 : isGold ? 1 : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl">
      
      {/* Header com Diagnóstico de Limites por Plano */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Módulo Comercial
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isDiamond 
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                : isGold 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {isDiamond && <Sparkles className="w-2.5 h-2.5 fill-amber-300" />}
              {isGold && <Zap className="w-2.5 h-2.5 fill-indigo-300" />}
              Plano {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Produtos & Promoções</h1>
          <p className="text-xs text-slate-400 mt-1">
            Administre seu catálogo de produtos, serviços e ofertas promocionais do guia.
          </p>
        </div>

        {/* Informação de Capacidade */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl text-xs">
          <span className="text-slate-400">Capacidade do plano:</span>
          <span className="font-bold text-white">
            {maxProducts} produtos • {maxCoupons} promoção{maxCoupons > 1 ? 'ões' : ''}
          </span>
        </div>
      </div>

      {/* Alerta Educativo para Plano Bronze */}
      {isBronze && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white">Presença Essencial no Guia (Plano Bronze)</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  Seu plano atual inclui todas as informações de contato, horários e endereço essenciais. 
                  Para cadastrar novos produtos e publicar promoções com destaque na página inicial, faça upgrade para o plano <strong>Gold VIP</strong> ou <strong>Diamond</strong>. 
                  (Itens cadastrados anteriormente são preservados sem perda de dados).
                </p>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('plan')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer"
              >
                <span>Fazer Upgrade</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navegação entre as 2 Áreas Correspondentes */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'products'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo de Produtos & Serviços</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('coupons')}
          className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'coupons'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Promoções & Cupons de Desconto</span>
        </button>
      </div>

      {/* Conteúdo da Área Ativa */}
      {activeSubTab === 'products' ? (
        <ProductsView company={company} />
      ) : (
        <CouponsView company={company} />
      )}

    </div>
  );
};
