/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Minha Empresa — Edição Completa e Galeria de Fotos Conforme o Plano
 *
 * Regras:
 * - Logo e capa não contam na galeria.
 * - Limite de fotos da galeria: Bronze = 3, Gold VIP = 15, Diamond = 30.
 * - Uploads reais via /api/upload e persistência em media_items.
 * - Bloqueios de plano explicados com transparência.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Save, AlertCircle, CheckCircle2, Loader2, Building2, Globe, Phone,
  Instagram, Facebook, MapPin, Clock, ExternalLink, Camera, Plus, Trash2,
  Sparkles, Zap, Lock, UploadCloud
} from 'lucide-react';
import { Company } from '../../../types';
import { useCompany } from '../../../context/CompanyContext';
import { api, apiFetch } from '../../../lib/apiClient';
import { maskPhone } from '../../../utils/validators';

interface EditMiniSiteViewProps {
  company: Company;
  onSaved: () => void;
  onNavigateCompany?: (slug: string) => void;
}

interface MediaItem {
  id: string;
  url: string;
  fileType?: string;
  createdAt: string;
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

  const ALLOWED_CITIES = ['city_itapoa', 'city_curitiba'];
  const rawPlan = (company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;
  const maxGalleryPhotos = isDiamond ? 30 : isGold ? 15 : 3;

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

  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryUploadBusy, setGalleryUploadBusy] = useState(false);
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);
  const [coverUploadBusy, setCoverUploadBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [planLimitWarning, setPlanLimitWarning] = useState('');
  const [dirty, setDirty] = useState(false);

  const galleryFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const fetchGallery = async () => {
    if (!company.id) return;
    setLoadingGallery(true);
    try {
      const items = await api.get<MediaItem[]>(`/api/companies/${encodeURIComponent(company.id)}/media`);
      setGallery(items || []);
    } catch {
      // silencioso
    } finally {
      setLoadingGallery(false);
    }
  };

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
    fetchGallery();
  }, [company.id]);

  const update = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
    setSuccess('');
    setError('');
  };

  // Upload vinculado à empresa (anti-IDOR: ?companyId= + companies_users)
  const handleUploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const companyIdParam = company?.id ? `?companyId=${encodeURIComponent(company.id)}` : '';
    const res = await apiFetch(`/api/upload${companyIdParam}`, {
      method: 'POST',
      headers: {
        ...(company?.id ? { 'x-company-id': company.id } : {})
      },
      body: formData
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao enviar arquivo.');
    }
    const data = await res.json();
    return data.url;
  };

  // Upload Logo
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadBusy(true);
    setError('');
    try {
      const url = await handleUploadFile(file);
      update('logo', url);
      setSuccess('Logotipo atualizado! Clique em "Salvar Alterações" para gravar no guia.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível fazer upload do logo.');
    } finally {
      setLogoUploadBusy(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  // Upload Capa
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploadBusy(true);
    setError('');
    try {
      const url = await handleUploadFile(file);
      update('coverImage', url);
      setSuccess('Imagem de capa atualizada! Clique em "Salvar Alterações" para gravar no guia.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível fazer upload da capa.');
    } finally {
      setCoverUploadBusy(false);
      if (coverFileRef.current) coverFileRef.current.value = '';
    }
  };

  // Upload Múltiplo de Fotos para a Galeria
  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const availableSlots = maxGalleryPhotos - gallery.length;
    if (availableSlots <= 0) {
      setPlanLimitWarning(`Limite de fotos atingido (${gallery.length} de ${maxGalleryPhotos} fotos).`);
      if (galleryFileRef.current) galleryFileRef.current.value = '';
      return;
    }

    const allFiles = Array.from(fileList) as File[];
    const filesToUpload: File[] = allFiles.slice(0, availableSlots);
    const skippedCount = allFiles.length - filesToUpload.length;

    setGalleryUploadBusy(true);
    setPlanLimitWarning('');
    setError('');

    let successCount = 0;
    const uploadErrors: string[] = [];

    for (const file of filesToUpload) {
      try {
        const url = await handleUploadFile(file);
        await api.post(`/api/companies/${encodeURIComponent(company.id)}/media`, {
          url,
          fileType: file.type
        });
        successCount++;
      } catch (err: any) {
        uploadErrors.push(err?.message || file.name);
      }
    }

    await fetchGallery();

    if (successCount > 0) {
      let msg = successCount === 1 ? 'Foto adicionada à galeria!' : `${successCount} fotos adicionadas à galeria com sucesso!`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} foto(s) ignorada(s) para não exceder o limite de ${maxGalleryPhotos} fotos).`;
      }
      setSuccess(msg);
    }

    if (uploadErrors.length > 0) {
      setError(`Falha ao enviar ${uploadErrors.length} foto(s).`);
    }

    setGalleryUploadBusy(false);
    if (galleryFileRef.current) galleryFileRef.current.value = '';
  };

  // Excluir Foto Galeria
  const handleDeleteGalleryItem = async (mediaId: string) => {
    if (!confirm('Deseja realmente remover esta foto da galeria?')) return;
    setError('');
    setPlanLimitWarning('');
    try {
      await api.del(`/api/companies/${encodeURIComponent(company.id)}/media/${encodeURIComponent(mediaId)}`);
      await fetchGallery();
      setSuccess('Foto removida da galeria.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir a foto.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome da empresa é obrigatório.'); return; }
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
      setSuccess('Informações da empresa salvas com sucesso no guia!');
      setDirty(false);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar os dados da empresa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-8">
      
      {/* Título e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gerenciamento
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
          <h1 className="text-2xl font-black text-white tracking-tight">Minha Empresa</h1>
          <p className="text-xs text-slate-400 mt-1">
            Mantenha as informações e fotos da sua empresa sempre atualizadas para os clientes.
          </p>
        </div>

        {company.slug && onNavigateCompany && (
          <button
            type="button"
            onClick={() => onNavigateCompany(company.slug)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            Ver no Guia
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

      {planLimitWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-950/60 border border-amber-800 rounded-2xl text-amber-300 text-xs">
          <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Limite do Plano Atingido</span>
            <p>{planLimitWarning}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* 1. DADOS DE IDENTIFICAÇÃO */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Identificação Principal
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
                <option value="">Selecione uma categoria…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FieldRow>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Cidade *">
              <select
                required
                value={form.cityId}
                onChange={e => update('cityId', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">Selecione a cidade…</option>
                {cities
                  .filter(c => ALLOWED_CITIES.includes(c.id) || c.id === form.cityId || c.id === company.cityId)
                  .map(c => {
                    const isHistorical = !ALLOWED_CITIES.includes(c.id);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {isHistorical ? '(Atual)' : ''}
                      </option>
                    );
                  })}
              </select>
            </FieldRow>
            <FieldRow label="Descrição Curta" hint="Apresentação em 1 ou 2 linhas">
              <input
                type="text"
                maxLength={255}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Ex: O melhor restaurante de frutos do mar de Itapoá"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
          <FieldRow label="Sobre a Empresa / Descrição Detalhada">
            <textarea
              rows={4}
              value={form.detailedDescription}
              onChange={e => update('detailedDescription', e.target.value)}
              placeholder="Descreva a história, especialidades, diferenciais e serviços oferecidos..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-y"
            />
          </FieldRow>
        </section>

        {/* 2. CONTATOS E ATENDIMENTO */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            Canais de Contato & Redes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="WhatsApp (com DDD)" hint="Ex: (47) 99999-8888">
              <input
                type="tel"
                maxLength={15}
                value={form.whatsapp}
                onChange={e => update('whatsapp', maskPhone(e.target.value))}
                placeholder="(47) 99999-8888"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Telefone Fixo / Comercial" hint="Ex: (47) 3443-1234">
              <input
                type="tel"
                maxLength={15}
                value={form.phone}
                onChange={e => update('phone', maskPhone(e.target.value))}
                placeholder="(47) 3443-1234"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Website Oficial">
              <input
                type="url"
                maxLength={500}
                value={form.website}
                onChange={e => update('website', e.target.value)}
                placeholder="https://suaempresa.com.br"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Instagram" hint="@usuario ou link">
              <input
                type="text"
                maxLength={255}
                value={form.instagram}
                onChange={e => update('instagram', e.target.value)}
                placeholder="@suaempresa"
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

        {/* 3. LOCALIZAÇÃO E HORÁRIOS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-black text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400" />
            Endereço & Horários
          </h2>
          <FieldRow label="Endereço Completo">
            <input
              type="text"
              maxLength={255}
              value={form.address}
              onChange={e => update('address', e.target.value)}
              placeholder="Av. André Rodrigues de Freitas, 1234 — Itapema do Norte, Itapoá - SC"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldRow label="Horários de Funcionamento">
              <input
                type="text"
                maxLength={255}
                value={form.hours}
                onChange={e => update('hours', e.target.value)}
                placeholder="Seg a Sáb: 08h às 19h"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Latitude (GPS)" hint="Ex: -26.1172">
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => update('latitude', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
            <FieldRow label="Longitude (GPS)" hint="Ex: -48.6145">
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => update('longitude', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </FieldRow>
          </div>
        </section>

        {/* 4. IMAGENS PRINCIPAIS (Logo e Capa - Não contam na galeria) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              Identidade Visual (Logo e Imagem de Capa)
            </h2>
            <span className="text-[10px] text-slate-400 font-bold">Não consom o limite da galeria</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Logo */}
            <div className="space-y-3 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Logotipo</label>
                  {logoUploadBusy && (
                    <span className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…
                    </span>
                  )}
                </div>

                {form.logo ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center p-2 shadow-inner">
                    <img src={form.logo} alt="Logo da empresa" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-2">
                    <Camera className="w-5 h-5 mb-1 opacity-50" />
                    <span>Sem logo</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={logoFileRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoFileChange}
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={logoUploadBusy}
                  className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  {form.logo ? 'Alterar logotipo' : 'Escolher arquivo'}
                </button>
                {form.logo && (
                  <button
                    type="button"
                    onClick={() => update('logo', '')}
                    className="p-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 rounded-xl transition cursor-pointer"
                    title="Remover logotipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Imagem de Capa */}
            <div className="space-y-3 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Imagem de Capa</label>
                  {coverUploadBusy && (
                    <span className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…
                    </span>
                  )}
                </div>

                {form.coverImage ? (
                  <div className="w-full h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-inner">
                    <img src={form.coverImage} alt="Capa da empresa" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-2xl bg-slate-800/80 border border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-2">
                    <Camera className="w-5 h-5 mb-1 opacity-50" />
                    <span>Sem imagem de capa</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={coverFileRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCoverFileChange}
              />

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={coverUploadBusy}
                    className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4 text-purple-400" />
                    {form.coverImage ? 'Alterar capa' : 'Escolher arquivo'}
                  </button>
                  {form.coverImage && (
                    <button
                      type="button"
                      onClick={() => update('coverImage', '')}
                      className="p-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 rounded-xl transition cursor-pointer"
                      title="Remover capa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isBronze && (
                  <p className="text-[10px] text-amber-400/90 leading-tight">
                    ℹ No plano Bronze, o cabeçalho no guia é clean essencial. A capa panorâmica personalizada com destaque visual é ativada nos planos Gold VIP e Diamond.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 5. GALERIA DE FOTOS CONFORME O PLANO */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Galeria de Fotos da Empresa
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fotos do ambiente, produtos e atendimento exibidas na sua página.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                gallery.length >= maxGalleryPhotos 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {gallery.length} de {maxGalleryPhotos} fotos
              </span>
            </div>
          </div>

          <input
            type="file"
            ref={galleryFileRef}
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleGalleryFileChange}
          />

          {/* Grid de Fotos Existentes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map(item => (
              <div key={item.id} className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow">
                <img
                  src={item.url}
                  alt="Foto da galeria"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteGalleryItem(item.id)}
                  title="Excluir foto"
                  className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-rose-600 text-white rounded-xl transition backdrop-blur cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Card para Adicionar Foto */}
            {gallery.length < maxGalleryPhotos ? (
              <button
                type="button"
                onClick={() => galleryFileRef.current?.click()}
                disabled={galleryUploadBusy}
                className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/30 hover:bg-slate-800/60 transition flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer group"
              >
                {galleryUploadBusy ? (
                  <>
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="text-[11px] font-bold text-slate-400">Enviando fotos…</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 flex items-center justify-center transition">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">Adicionar Fotos</span>
                    <span className="text-[10px] text-blue-400 font-medium">Selecione várias de uma vez</span>
                    <span className="text-[9px] text-slate-500">JPG, PNG ou WEBP</span>
                  </>
                )}
              </button>
            ) : (
              <div className="aspect-square rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col items-center justify-center text-center gap-1.5">
                <Lock className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Limite Atingido</span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Máximo de {maxGalleryPhotos} fotos no plano {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze'}.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Botão Flutuante de Salvar */}
        <div className="flex items-center justify-between pt-2 sticky bottom-0 bg-slate-950/90 backdrop-blur py-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-slate-800 z-10">
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-400 font-bold">● Alterações pendentes</span>}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-black rounded-xl transition shadow-lg cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
        </div>

      </form>
    </div>
  );
}
