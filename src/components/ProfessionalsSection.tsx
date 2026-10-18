/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Star, Search, MapPin, Sparkles, 
  Phone, User, CheckCircle, Calendar 
} from 'lucide-react';
import { Professional, City, Category } from '../types';

interface ProfessionalsSectionProps {
  professionals: Professional[];
  cities: City[];
  categories: Category[];
}

export default function ProfessionalsSection({
  professionals,
  cities,
  categories
}: ProfessionalsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [activeProfessional, setActiveProfessional] = useState<Professional | null>(null);
  const [hireDate, setHireDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter criteria
  const filteredPro = professionals.filter(p => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.bio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCat || p.categoryId === selectedCat;
    const matchesCity = !selectedCity || p.cityId === selectedCity;
    return matchesSearch && matchesCategory && matchesCity;
  });

  const handleHireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hireDate || !selectedHour || !activeProfessional) return;

    // Simulate scheduling a consultation on WhatsApp
    const message = `Olá ${activeProfessional.name}! Encontrei seu perfil no Guia Local Premium e gostaria de reservar uma consulta técnica para o dia ${hireDate} às ${selectedHour}.`;
    const whatsappUrl = `https://wa.me/${activeProfessional.whatsapp}?text=${encodeURIComponent(message)}`;
    
    setShowSuccess(true);
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
      setShowSuccess(false);
      setActiveProfessional(null);
    }, 1800);
  };

  return (
    <div id="professionals_container" className="py-12 px-4 md:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col">
        
        {/* Superior title summary block */}
        <section className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-1">Especialistas locais</span>
            <h1 className="text-3xl font-sans font-black text-slate-900 tracking-tight">Profissionais Autônomos</h1>
            <p className="text-sm text-slate-500 mt-2 font-sans">Contrate diretamente advogados, arquitetos, engenheiros, especialistas em saúde e consultores de alto padrão.</p>
          </div>
        </section>

        {/* 1. FILTER CONTROLLER GRID */}
        <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Digite palavra-chave</label>
            <div className="relative flex items-center bg-slate-100 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input 
                type="text"
                placeholder="Ex: Engenharia, Estética..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Segmento do profissional</label>
            <select 
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full text-xs text-slate-700 bg-slate-100 p-3 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-2 block">Região de atuação</label>
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
        </section>

        {/* 2. DYNAMIC WORKFORCE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPro.map((p, idx) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
            >
              <div className="flex flex-col md:flex-row gap-5">
                <img 
                  src={p.photoUrl} 
                  alt={p.name} 
                  className="w-16 h-16 rounded-full object-cover border border-slate-100 shrink-0 self-start"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-sans font-extrabold text-slate-900 leading-tight">{p.name}</h3>
                    {p.isVip && (
                      <span className="flex items-center gap-1 font-sans text-[8px] font-bold bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> RECOMENDADO
                      </span>
                    )}
                  </div>
                  
                  <span className="text-xs font-semibold text-blue-600 font-sans leading-none">{p.title}</span>
                  
                  <p className="text-xs text-slate-500 font-sans line-clamp-3 mt-1 leading-relaxed">{p.bio}</p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.skills.map(sk => (
                      <span key={sk} className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-md font-medium">#{sk}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                <span className="text-xs font-bold font-sans text-slate-800">{p.pricing || 'Sob consulta'}</span>
                <button 
                  onClick={() => setActiveProfessional(p)}
                  className="px-4 py-2 bg-slate-950 text-white rounded-lg hover:bg-slate-850 text-xs font-semibold transition cursor-pointer"
                >
                  Agendar Consulta
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 3. CONTRATAR / SCHEDULER POPUP MODAL */}
        <AnimatePresence>
          {activeProfessional && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl relative"
              >
                <button 
                  onClick={() => setActiveProfessional(null)}
                  className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer font-bold text-sm"
                >
                  ✕
                </button>

                {showSuccess ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-slate-950 font-sans">Reserva Pronta!</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-xs">Redirecionando diretamente ao WhatsApp do profissional para consolidação do serviço...</p>
                  </div>
                ) : (
                  <form onSubmit={handleHireSubmit} className="flex flex-col gap-6">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block">Consolidação</span>
                      <h3 className="text-xl font-sans font-black text-slate-950 mt-1">Contratar Especialista</h3>
                      <p className="text-xs text-slate-400 mt-1">Preencha o horário de sua preferência para realizar sua consultoria técnica premium com {activeProfessional.name}.</p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <img src={activeProfessional.photoUrl} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-950">{activeProfessional.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{activeProfessional.title}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Data da Consulta</label>
                        <input 
                          type="date"
                          required
                          value={hireDate}
                          onChange={(e) => setHireDate(e.target.value)}
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Horário Estimado</label>
                        <select 
                          required
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(e.target.value)}
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none"
                        >
                          <option value="">Selecione um horário disponível</option>
                          {activeProfessional.availableHours.map(hour => (
                            <option key={hour} value={hour}>{hour} - Consultoria de Confiança</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="py-3.5 px-6 rounded-xl bg-slate-950 font-extrabold text-white text-xs hover:bg-slate-900 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" /> Solicitar e Enviar no WhatsApp
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
