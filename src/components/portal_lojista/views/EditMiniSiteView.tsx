/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Editar Mini-Site — formulário completo de edição da empresa
 */

import React, { useEffect, useState } from 'react';
import {
  Save, AlertCircle, CheckCircle2, Loader2, Building2, Globe, Phone,
  Instagram, Facebook, MapPin, Clock, Image, ExternalLink, Camera
} from 'lucide-react';
import { Company } from '../../../types';
import { useCompany } from '../../../context/CompanyContext';
import { api } from '../../../lib/apiClient';

interface EditMiniSiteViewProps {
  company: Company;
  onSaved: () => void;
  onNavigateCompany?: (slug: string) => void;
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function EditMiniSiteView({ company, onSaved, onNavigateCompany }: EditMiniSiteViewProps) {
  const { cities, categories, refreshData } = useCompany();

  const [form, setForm] = useState({
    name: company.name ?? '',
    categoryId: company.categoryId ?? '',
    cityId: company.cityId ?? '',
    description: company.description ?? '',
    detailedDescription: company.detailedDescription ?? '',
    phone: company.phone ?? '',
    whatsapp: company.whatsapp ?? '',
    address: company.address ?? '',
    hours: company.hours ?? '',
    logo: company.logo ?? '',
    coverImage: company.coverImage ?? '',
    instagram: company.instagram ?? '',
    facebook: company.facebook ?? '',
    website: company.website ?? '',
    latitude: company.latitude ? String(company.latitude) : '',
    longitude: company.longitude ? String(company.longitude) : '',
  });

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({
      name: company.name ?? '',
      categoryId: company.categoryId ?? '',
      cityId: company.cityId ?? '',
      description: company.description ?? '',
      detailedDescription: company.detailedDescription ?? '',
      phone: company.phone ?? '',
      whatsapp: company.whatsapp ?? '',
      address: company.address ?? '',
      hours: company.hours ?? '',
      logo: company.logo ?? '',
      coverImage: company.coverImage ?? '',
      instagram: company.instagram ?? '',
      facebook: company.facebook ?? '',
      website: company.website ?? '',
      latitude: company.latitude ? String(company.latitude) : '',
      longitude: company.longitude ? String(company.longitude) : '',
    });
    setDirty(false);
  }, [company.id]);

  const update = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    if (!form.categoryId) { setError('Selecione uma categoria.'); return; }
    if (!form.cityId) { setError('Selecione uma cidade.'); return; }

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        cityId: form.cityId,
        description: form.description.trim(),
        detailedDescription: form.detailedDescription.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
        hours: form.hours.trim(),
        logo: form.logo.trim(),
        coverImage: form.coverImage.trim(),
        instagram: form.instagram.trim(),
        facebook: form.facebook.trim(),
        website: form.website.trim(),
      };
      if (form.latitude) payload.latitude = parseFloat(form.latitude);
      if (form.longitude) payload.longitude = parseFloat(form.longitude);

      await api.put(`/api/companies/${encodeURIComponent(company.id)}`, payload);
      await refreshData();
      onSaved();
      setSuccess('Informações salvas e refletidas no mini-site público!');
      setDirty(false);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Editar Mini-Site</h1>
          <p className="text-xs text-slate-400 mt-1">
            Todas as alterações aparecem imediatamente na sua página pública.
          </p>
        </div>
        {company.slug && onNavigateCompany && (
          <button
            type="button"
            onClick={() => onNavigateCompany(company.slug)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            Ver mini-site
          </button>
        )}
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identification */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Identificação
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Nome da empresa *">
              <input
                type="text"
                required
                maxLength={255}
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Categoria *">
              <select
                required
                value={form.categoryId}
                onChange={e => update('categoryId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Cidade *">
              <select
                required
                value={form.cityId}
                onChange={e => update('cityId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Selecione a cidade</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FieldRow>
          </div>
        </section>

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2">Descrição</h2>
          <FieldRow label="Descrição curta" hint="Exibida no card do diretório. Máx 300 caracteres.">
            <textarea
              rows={2}
              maxLength={300}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
            />
            <span className="text-[10px] text-slate-500 mt-1">{form.description.length}/300</span>
          </FieldRow>
          <FieldRow label="Descrição completa" hint="Aparece no mini-site com mais detalhes sobre sua empresa.">
            <textarea
              rows={5}
              maxLength={5000}
              value={form.detailedDescription}
              onChange={e => update('detailedDescription', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-y"
            />
          </FieldRow>
        </section>

        {/* Contact */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            Contato
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Telefone">
              <input
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="(47) 3456-7890"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="WhatsApp" hint="Número com DDI e DDD: 5547912345678">
              <input
                type="tel"
                maxLength={30}
                value={form.whatsapp}
                onChange={e => update('whatsapp', e.target.value)}
                placeholder="5547912345678"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Website">
              <input
                type="url"
                maxLength={500}
                value={form.website}
                onChange={e => update('website', e.target.value)}
                placeholder="https://seusite.com.br"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
        </section>

        {/* Social */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2">Redes Sociais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Instagram" hint="URL completa ou @usuario">
              <input
                type="text"
                maxLength={255}
                value={form.instagram}
                onChange={e => update('instagram', e.target.value)}
                placeholder="https://instagram.com/suaempresa"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Facebook">
              <input
                type="text"
                maxLength={255}
                value={form.facebook}
                onChange={e => update('facebook', e.target.value)}
                placeholder="https://facebook.com/suaempresa"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" />
            Localização
          </h2>
          <FieldRow label="Endereço completo">
            <input
              type="text"
              maxLength={255}
              value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="Rua das Flores, 123 — Centro, Itapoá SC"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="Latitude" hint="Coordenadas para o mapa">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => update('latitude', e.target.value)}
                placeholder="-26.1234"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Longitude">
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => update('longitude', e.target.value)}
                placeholder="-48.6145"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
          <FieldRow label="Horários de funcionamento" hint="Ex: Seg-Sex 9h-18h · Sáb 9h-13h">
            <input
              type="text"
              maxLength={255}
              value={form.hours}
              onChange={e => update('hours', e.target.value)}
              placeholder="Seg-Sex 9h-18h · Sáb 9h-13h"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </FieldRow>
        </section>

        {/* Images */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-400" />
            Imagens
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Logo</label>
              {form.logo && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                  <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <input
                type="url"
                maxLength={1000}
                value={form.logo}
                onChange={e => update('logo', e.target.value)}
                placeholder="https://…/logo.png"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Imagem de capa</label>
              {form.coverImage && (
                <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                  <img src={form.coverImage} alt="Capa" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                type="url"
                maxLength={1000}
                value={form.coverImage}
                onChange={e => update('coverImage', e.target.value)}
                placeholder="https://…/capa.jpg"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 pt-2 sticky bottom-0 bg-slate-950/90 backdrop-blur py-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-slate-800">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
          {dirty && <span className="text-xs text-amber-400">Alterações não salvas</span>}
        </div>
      </form>
    </div>
  );
}
