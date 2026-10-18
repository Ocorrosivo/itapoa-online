/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, MapPin, DollarSign, Calendar, Search, 
  Send, CheckCircle, FileText, Sparkles 
} from 'lucide-react';
import { Job, City } from '../types';

interface JobsSectionProps {
  jobs: Job[];
  cities: City[];
  onApplySuccess: () => void;
}

export default function JobsSection({
  jobs,
  cities,
  onApplySuccess
}: JobsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  
  // Apply Form inputs
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateLetter, setCandidateLetter] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [success, setSuccess] = useState(false);

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = !searchTerm || j.title.toLowerCase().includes(searchTerm.toLowerCase()) || j.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !selectedCity || j.cityId === selectedCity;
    const matchesType = !selectedType || j.type === selectedType;
    return matchesSearch && matchesCity && matchesType;
  });

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    setIsApplying(true);
    try {
      const resp = await fetch(`/api/jobs/${activeJob.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone,
          coverLetter: candidateLetter
        })
      });

      if (resp.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setActiveJob(null);
          // Refresh callback to reset lists triggers
          onApplySuccess();
          
          // Reset form fields
          setCandidateName('');
          setCandidateEmail('');
          setCandidatePhone('');
          setCandidateLetter('');
        }, 1800);
      }
    } catch (err) {
      console.error('Job application submission crash', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div id="jobs_container" className="py-12 px-4 md:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto flex flex-col">
        
        {/* Jobs header */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block mb-1">Carreiras Locais</span>
            <h1 className="text-2xl font-sans font-black text-slate-900 tracking-tight">Vagas de Emprego & Estágio</h1>
            <p className="text-xs text-slate-500 mt-2 font-sans">
              Busque oportunidades de carreira premium fornecidas por grandes empresas parceiras do litoral.
            </p>
          </div>
        </div>

        {/* Filters Toolbelt */}
        <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Digite palavra-chave</label>
            <div className="relative flex items-center bg-slate-100 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input 
                type="text"
                placeholder="Ex: Recepcionista, Cozinha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Cidade da vaga</label>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs text-slate-700 bg-slate-100 p-3 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">Todas as Cidades</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Tipo de Contrato</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs text-slate-700 bg-slate-100 p-3 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">Todos os formatos</option>
              <option value="full_time">Período Integral (CLT)</option>
              <option value="part_time">Meio Período (Clínico)</option>
              <option value="remote">Remoto Nacional</option>
              <option value="freelance">Freelance / Fornecedor</option>
            </select>
          </div>
        </section>

        {/* Active vacancy feeds list */}
        <div className="flex flex-col gap-6">
          {filteredJobs.map((j, index) => (
            <motion.article 
              key={j.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/85 hover:border-slate-300 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex gap-4 items-start flex-1">
                <img 
                  src={j.companyLogo} 
                  alt={j.companyName} 
                  className="w-12 h-12 rounded-2xl object-cover border shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 flex flex-col gap-1">
                  <h3 className="text-base font-sans font-extrabold text-slate-900">{j.title}</h3>
                  <span className="text-xs font-semibold text-slate-600 font-sans tracking-tight block">{j.companyName}</span>
                  
                  {/* Stats bars */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-3 font-sans">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cities.find(c => c.id === j.cityId)?.name}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {j.salary || 'A Combinar'}</span>
                    <span className="flex items-center gap-1 font-bold text-teal-600 text-[10px] bg-teal-50 px-2 py-0.5 rounded uppercase">
                      {j.type.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans mt-4 max-w-2xl">{j.description}</p>
                </div>
              </div>

              <div className="flex flex-col md:items-end justify-between self-stretch shrink-0">
                <span className="text-[10px] text-slate-400 font-semibold mb-4">Candidaturas: <strong className="text-slate-800">{j.applicationsCount}</strong></span>
                <button 
                  onClick={() => setActiveJob(j)}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold transition cursor-pointer"
                >
                  Candidatar-se Online
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        {/* APPLICATION FORM OVERLAY POPUP */}
        <AnimatePresence>
          {activeJob && (
            <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <button 
                  onClick={() => setActiveJob(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 font-bold transition cursor-pointer text-sm"
                >
                  ✕
                </button>

                {success ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Candidatura Enviada!</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs">Nossa equipe de recursos humanos revisará seus dados cadastrados. Boa sorte!</p>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="flex flex-col gap-6">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block">Recrutamento</span>
                      <h3 className="text-xl font-sans font-black text-slate-950 mt-1">Inscreva-se na Vaga</h3>
                      <p className="text-xs text-slate-400 mt-1">Preencha o formulário abaixo para enviar seu currículo diretamente ao RH de {activeJob.companyName}.</p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <img src={activeJob.companyLogo} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-930">{activeJob.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{activeJob.companyName} • {activeJob.salary}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Seu Nome Completo</label>
                        <input 
                          type="text" 
                          required
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="Digite seu nome..."
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Seu E-mail</label>
                          <input 
                            type="email" 
                            required
                            value={candidateEmail}
                            onChange={(e) => setCandidateEmail(e.target.value)}
                            placeholder="exemplo@gmail.com"
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Telefone de Contato</label>
                          <input 
                            type="tel" 
                            required
                            value={candidatePhone}
                            onChange={(e) => setCandidatePhone(e.target.value)}
                            placeholder="(47) 99999-0000"
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Apresentação / Minibiografia</label>
                        <textarea 
                          rows={4}
                          value={candidateLetter}
                          onChange={(e) => setCandidateLetter(e.target.value)}
                          placeholder="Fale brevemente por que você é o perfil ideal para esta vaga..."
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Mock upload field */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Anexar Currículo (PDF/DOCX)</label>
                        <div className="border border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-55/40 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <span className="text-xs text-slate-900 font-semibold font-sans">Arraste seu arquivo ou clique para selecionar</span>
                          <span className="text-[10px] text-slate-400 font-sans">limite máximo de 10 megabytes.</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isApplying}
                      className="py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" /> {isApplying ? 'Processando envio...' : 'Submeter Candidatura Oficial'}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
