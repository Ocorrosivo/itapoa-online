/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * QuickSearchInput — input "O que voce esta buscando" com lupa, debounce,
 * sugestoes agrupadas por tipo e navegação por teclado. Acento-insensivel.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Search, Building2, Calendar, MapPin, Newspaper, Briefcase, ChevronRight } from 'lucide-react';
import { quickSearch, groupLabel, QuickSearchItem, QuickSearchGroup } from '../../services/quickSearchService';

interface Props {
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
  placeholder?: string;
  compact?: boolean;
}

const groupIcon: Record<QuickSearchGroup, React.ReactNode> = {
  empresas: <Building2 className="w-3.5 h-3.5" />,
  eventos: <Calendar className="w-3.5 h-3.5" />,
  turismo: <MapPin className="w-3.5 h-3.5" />,
  blog: <Newspaper className="w-3.5 h-3.5" />,
  empregos: <Briefcase className="w-3.5 h-3.5" />,
};

const GROUP_ORDER: QuickSearchGroup[] = ['empresas', 'eventos', 'turismo', 'blog', 'empregos'];

export const QuickSearchInput: React.FC<Props> = ({
  onNavigateCompany,
  onNavigateTab,
  placeholder = 'Digite o nome da empresa, serviço, bairro ou produto…',
  compact = false,
}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<QuickSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce + fetch agrupado
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      if (!q) setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    const handle = setTimeout(async () => {
      const res = await quickSearch(q);
      setItems(res);
      setActiveIndex(0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Fechar ao clicar fora + ESC
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const goTo = (item: QuickSearchItem) => {
    setOpen(false);
    setQuery('');
    if (item.group === 'empresas') onNavigateCompany(item.slug);
    else if (item.group === 'eventos' || item.group === 'turismo') onNavigateTab('turismo');
    else if (item.group === 'blog') onNavigateTab('turismo');
    else if (item.group === 'empregos') onNavigateTab('empregos');
  };

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: items.filter((it) => it.group === g),
  })).filter((g) => g.items.length > 0);

  // Navegação por teclado (cima/baixo/enter)
  const flatItems = items;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((v) => Math.min(v + 1, Math.max(0, flatItems.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((v) => Math.max(0, v - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = flatItems[activeIndex];
      if (chosen) goTo(chosen);
      else if (query.trim().length >= 2 && flatItems.length === 0) {
        onNavigateTab('empresas');
        setOpen(false);
      }
    }
  };

  return (
    <div ref={wrapRef} className={compact ? 'relative w-full' : 'relative w-full max-w-2xl mx-auto'}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Busca rapida"
          aria-expanded={open}
          aria-controls="quicksearch-listbox"
          className={`w-full pl-10 pr-4 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/25 focus:border-[#C8102E]/40 placeholder:text-slate-400 ${
            compact ? 'py-2.5 border-slate-200' : 'py-3.5 border-slate-200 shadow-sm'
          }`}
          autoComplete="off"
        />
      </div>

      {open && (
        <div
          id="quicksearch-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-40 max-h-[min(68vh,520px)] overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-[#C8102E] rounded-full animate-spin" aria-hidden />
              Buscando…
            </div>
          ) : flatItems.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">Nenhum resultado para “{query.trim()}”</p>
              <p className="text-xs text-slate-500 mt-1">Tente: mercado, pousada, cafe, itapoa, even</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigateTab('empresas');
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#C8102E] hover:underline"
              >
                Ver todas as empresas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(({ group, items: groupItems }) => (
                <div key={group} className="py-1">
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="text-slate-400">{groupIcon[group]}</span>
                    {groupLabel(group)}
                    <span className="ml-1 text-[10px] font-bold text-slate-400">· {groupItems.length}</span>
                  </div>
                  <ul className="px-1">
                    {groupItems.map((it) => {
                      const flatIdx = flatItems.indexOf(it);
                      const active = flatIdx === activeIndex;
                      return (
                        <li key={`${it.group}-${it.id}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => goTo(it)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition ${
                              active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900'
                            }`}
                          >
                            {it.image ? (
                              <img
                                src={it.image}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/5"
                              />
                            ) : (
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                  active ? 'bg-white/15 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'
                                }`}
                              >
                                {groupIcon[it.group]}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[13px] font-bold leading-tight truncate ${active ? 'text-white' : 'text-slate-900'}`}>
                                {it.title}
                              </span>
                              {it.subtitle ? (
                                <span className={`block text-[11px] truncate ${active ? 'text-white/70' : 'text-slate-500'}`}>{it.subtitle}</span>
                              ) : null}
                            </span>
                            <ChevronRight className={`w-4 h-4 shrink-0 ${active ? 'text-white/80' : 'text-slate-300'}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="px-3 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNavigateTab('empresas');
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-black transition"
                >
                  Ver todos os resultados
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickSearchInput;
