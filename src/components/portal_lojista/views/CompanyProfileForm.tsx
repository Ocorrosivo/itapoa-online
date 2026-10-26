import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
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
  const [showSuccess, setShowSuccess] = useState(false);

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

  return (
    <>
      <form className="max-w-2xl p-6 space-y-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setMessage('');
        try {
          await api.put(`/api/companies/${encodeURIComponent(company.id)}`, { name, categoryId, cityId, address, description });
          await refreshData();
          onSaved();
          setMessage('Informações salvas.');
          setShowSuccess(true);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
        } finally {
          setBusy(false);
        }
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
      </form>

      {/* POPUP DE SUCESSO */}
      {showSuccess && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setShowSuccess(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">Salvo com Sucesso!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">As informações da sua empresa foram atualizadas com sucesso.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs transition shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
