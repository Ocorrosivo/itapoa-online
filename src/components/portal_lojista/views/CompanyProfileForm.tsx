import React, { useEffect, useState } from 'react';
import { Company } from '../../../types';
import { useCompany } from '../../../context/CompanyContext';
import { api } from '../../../lib/apiClient';

export function CompanyProfileForm({ company, onSaved }: { company: Company; onSaved: () => void }) {
  const { cities, categories, refreshData } = useCompany();
  const [name, setName] = useState(company.name);
  const [categoryId, setCategoryId] = useState(company.categoryId || '');
  const [cityId, setCityId] = useState(company.cityId || '');
  const [address, setAddress] = useState(company.address || '');
  const [description, setDescription] = useState(company.description || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setName(company.name);
    setCategoryId(company.categoryId || '');
    setCityId(company.cityId || '');
    setAddress(company.address || '');
    setDescription(company.description || '');
  }, [company.id]);

  const ALLOWED_CITIES = ['city_itapoa', 'city_curitiba'];
  const activeCity = cityId || company.cityId;
  const availableCities = cities.filter(c => ALLOWED_CITIES.includes(c.id) || c.id === activeCity);

  return <form className="max-w-2xl p-6 space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await api.put(`/api/companies/${encodeURIComponent(company.id)}`, { name, categoryId, cityId, address, description });
      await refreshData(); onSaved(); setMessage('Informações salvas.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }}>
    <h1 className="text-2xl font-bold">Complete os dados da empresa</h1>
    <p className="text-sm text-slate-400">Seu cadastro só aparece no catálogo público depois de informar categoria e cidade.</p>
    {message && <p role="status">{message}</p>}
    <label className="block">Nome da empresa<input required maxLength={255} value={name} onChange={e => setName(e.target.value)} className="block w-full bg-slate-800 rounded-xl p-3 mt-2" /></label>
    <label className="block">Categoria<select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="block w-full bg-slate-800 rounded-xl p-3 mt-2"><option value="">Selecione</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="block">Cidade<select required value={cityId} onChange={e => setCityId(e.target.value)} className="block w-full bg-slate-800 rounded-xl p-3 mt-2"><option value="">Selecione a cidade…</option>{availableCities.map(c => <option key={c.id} value={c.id}>{c.name}{!ALLOWED_CITIES.includes(c.id) ? ' (Atual)' : ''}</option>)}</select></label>
    <label className="block">Endereço<input value={address} maxLength={255} onChange={e => setAddress(e.target.value)} className="block w-full bg-slate-800 rounded-xl p-3 mt-2" /></label>
    <label className="block">Descrição<textarea value={description} maxLength={5000} onChange={e => setDescription(e.target.value)} className="block w-full bg-slate-800 rounded-xl p-3 mt-2" /></label>
    <button disabled={busy} className="bg-[#C8102E] text-white px-6 py-3 rounded-xl disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar informações'}</button>
  </form>;
}
