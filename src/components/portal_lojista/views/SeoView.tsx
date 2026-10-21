/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SEO & Schemas — editar campos de SEO do mini-site
 */

import React, { useState, useEffect } from 'react';
import {
  Layers, Save, AlertCircle, Loader2, CheckCircle2, ExternalLink, Info
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company } from '../../../types';

interface SeoViewProps {
  company: Company | null;
  onNavigateCompany?: (slug: string) => void;
}

export const SeoView: React.FC<SeoViewProps> = ({ company, onNavigateCompany }) => {
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [keywords, setKeywords] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!company) return;
    // Pre-fill with company data as sensible defaults
    setMetaTitle((company as any).metaTitle ?? `${company.name} — Itapoá Online`);
    setMetaDesc((company as any).metaDescription ?? company.description ?? '');
    setKeywords((company as any).keywords ?? '');
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/api/companies/${encodeURIComponent(company.id)}`, {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDesc.trim(),
        keywords: keywords.trim(),
      });
      setSuccess('Dados de SEO salvos. As alterações refletem no mini-site público em alguns instantes.');
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar as configurações de SEO.');
    } finally {
      setBusy(false);
    }
  };

  if (!company) return null;

  const charLimitTitle = 60;
  const charLimitDesc = 160;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">SEO &amp; Schemas</h1>
        <p className="text-xs text-slate-400 mt-1">
          Edite os campos que aparecem nas buscas do Google para o seu mini-site.
        </p>
      </div>

      <div className="p-4 bg-blue-950/40 border border-blue-800/40 rounded-2xl flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 space-y-1">
          <p>Os dados estruturados (Schema.org/LocalBusiness) são gerados automaticamente a partir das informações do seu cadastro.</p>
          <p>Para melhores resultados: mantenha nome, endereço, telefone e horários atualizados em "Editar Mini-Site".</p>
          <p className="font-bold">Não prometemos posições no Google. O SEO depende de múltiplos fatores externos.</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título SEO</label>
            <span className={`text-[10px] font-bold ${metaTitle.length > charLimitTitle ? 'text-red-400' : 'text-slate-500'}`}>
              {metaTitle.length}/{charLimitTitle}
            </span>
          </div>
          <input
            type="text"
            maxLength={100}
            value={metaTitle}
            onChange={e => setMetaTitle(e.target.value)}
            placeholder={`${company.name} — Itapoá Online`}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
          <p className="text-[10px] text-slate-500">Recomendado: até {charLimitTitle} caracteres. Aparece como título da aba e no Google.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Descrição</label>
            <span className={`text-[10px] font-bold ${metaDesc.length > charLimitDesc ? 'text-red-400' : 'text-slate-500'}`}>
              {metaDesc.length}/{charLimitDesc}
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={300}
            value={metaDesc}
            onChange={e => setMetaDesc(e.target.value)}
            placeholder="Descreva sua empresa em 1-2 frases para aparecer nos resultados de busca…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
          />
          <p className="text-[10px] text-slate-500">Recomendado: até {charLimitDesc} caracteres. Aparece como descrição no Google.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Palavras-chave</label>
          <input
            type="text"
            maxLength={500}
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="Separe por vírgula: padaria, itapoá, pão artesanal…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
          <p className="text-[10px] text-slate-500">Palavras-chave não garantem posicionamento mas ajudam em alguns casos.</p>
        </div>

        {/* Schema preview */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Dados Estruturados gerados automaticamente</label>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap break-all">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": company.name,
  "description": company.description,
  "address": company.address,
  "telephone": company.phone,
  "url": `https://itapoa.online/empresa/${company.slug}`,
  "openingHours": company.hours,
}, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition shadow-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar configurações de SEO
          </button>

          {company.slug && onNavigateCompany && (
            <button
              type="button"
              onClick={() => onNavigateCompany(company.slug)}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
            >
              <ExternalLink className="w-4 h-4" />
              Ver mini-site
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
