/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Spotlight Search Modal (Ctrl + K) Component
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Building2, Package, User, MapPin, Tag, ArrowRight } from 'lucide-react';
import { useCompany } from '../../../context/CompanyContext';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const SpotlightSearchModal: React.FC<SpotlightSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateCompany,
  onNavigateTab
}) => {
  const { companies, categories, cities } = useCompany();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredCompanies = q
    ? companies.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).slice(0, 5)
    : companies.slice(0, 3);

  const filteredCategories = q
    ? categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 4)
    : categories.slice(0, 3);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          {/* Search Header Input */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
            <Search className="w-5 h-5 text-blue-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar empresas, produtos, usuários, cidades, faturas (Ctrl + K)..."
              className="flex-1 bg-transparent border-none text-white text-base focus:outline-none placeholder-slate-500"
            />
            <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-2 py-1 rounded-md">
              ESC
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results List */}
          <div className="p-4 overflow-y-auto space-y-6">
            
            {/* Companies */}
            {filteredCompanies.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Empresas Cadastradas ({filteredCompanies.length})</span>
                </h4>
                <div className="space-y-1">
                  {filteredCompanies.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onNavigateCompany(c.slug);
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 hover:border-blue-500/40 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-xl object-cover" />
                        <div>
                          <span className="text-sm font-semibold text-white group-hover:text-blue-400">{c.name}</span>
                          <span className="block text-xs text-slate-400 line-clamp-1">{c.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          {c.planLevel}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {filteredCategories.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Categorias</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {filteredCategories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        onNavigateTab('categories');
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-slate-800/30 hover:bg-slate-800 border border-slate-800 cursor-pointer transition flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
