/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Marketplace Administration View Component
 */

import React, { useState } from 'react';
import { Tag, Search, Plus, CheckCircle2, XCircle, Star, Filter, Eye } from 'lucide-react';

export interface ProductItem {
  id: string;
  name: string;
  companyName: string;
  category: string;
  price: number;
  isFeatured: boolean;
  status: 'approved' | 'pending' | 'rejected';
  image: string;
}

export const MarketplaceView: React.FC<MarketplaceViewType> = () => {
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 'prod_1',
      name: 'Pizza Margherita Especial em Forno a Lenha',
      companyName: 'Pizzaria & Trattoria Central',
      category: 'Gastronomia',
      price: 68.00,
      isFeatured: true,
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'prod_2',
      name: 'Diária Suíte Vista Mar Deluxe',
      companyName: 'Hotel & Spa Beira Mar',
      category: 'Hospedagem',
      price: 380.00,
      isFeatured: true,
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'prod_3',
      name: 'Combo Néctar Sushi Prime (40 Peças)',
      companyName: 'Bistrô Néctar Sushi Prime',
      category: 'Gastronomia',
      price: 149.90,
      isFeatured: false,
      status: 'approved',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const toggleFeatured = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p));
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 p-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão Unificada do Marketplace</h1>
          <p className="text-xs text-slate-400 mt-1">
            Moderação de catálogos, ofertas em destaque, verificação de preços e aprovação de itens das empresas.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar produtos, serviços ou empresas..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="relative h-36 rounded-2xl overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => toggleFeatured(item.id)}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition ${
                    item.isFeatured ? 'bg-amber-500 text-slate-950' : 'bg-slate-950/70 text-slate-400'
                  }`}
                  title="Destaque em Vitrine"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-wider">{item.category} • {item.companyName}</span>
                <h3 className="text-sm font-bold text-white leading-tight mt-1">{item.name}</h3>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-base font-black text-emerald-400">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                  Aprovado
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
type MarketplaceViewType = {};
