/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tourism Administrative View Component - CRUD for Beaches, Spots & Attractions
 */

import React, { useState } from 'react';
import { Compass, Plus, MapPin, Search, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

export interface TourismSpot {
  id: string;
  name: string;
  category: 'Praia' | 'Passeio' | 'Camping' | 'Pesca' | 'História';
  location: string;
  description: string;
  image: string;
}

export const TourismView: React.FC = () => {
  const [spots, setSpots] = useState<TourismSpot[]>([
    {
      id: 'tour_1',
      name: 'Praia de Itapema do Norte',
      category: 'Praia',
      location: 'Itapema do Norte, Itapoá - SC',
      description: 'Principal praia urbana com calçadão, feira gastronômica e águas balneáveis.',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'tour_2',
      name: 'Farol do Pontal da Figueira',
      category: 'História',
      location: 'Pontal, Itapoá - SC',
      description: 'Marco histórico de navegação com vista espetacular para a baía de Babitonga.',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'tour_3',
      name: 'Reserva Ecológica Volta Velha',
      category: 'Passeio',
      location: 'Zona Rural, Itapoá - SC',
      description: 'Santuário de Mata Atlântica preservada com trilhas guiadas e observação de pássaros.',
      image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=300&q=80'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSpot, setNewSpot] = useState<Partial<TourismSpot>>({ name: '', category: 'Praia', location: '', description: '', image: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const created: TourismSpot = {
      id: `tour_${Date.now()}`,
      name: newSpot.name || 'Nova Atração',
      category: (newSpot.category as any) || 'Praia',
      location: newSpot.location || 'Itapoá - SC',
      description: newSpot.description || '',
      image: newSpot.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80'
    };
    setSpots([created, ...spots]);
    setIsModalOpen(false);
    setNewSpot({ name: '', category: 'Praia', location: '', description: '', image: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta atração turística?')) {
      setSpots(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6 p-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Turismo, Praias & Roteiros</h1>
          <p className="text-xs text-slate-400 mt-1">
            CRUD de atrações ecológicas, praias balneáveis, campings e pontos turísticos oficiais de Itapoá.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Atração</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {spots.map(spot => (
          <div key={spot.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-40 rounded-2xl overflow-hidden relative">
                <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase shadow">
                  {spot.category}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white leading-tight">{spot.name}</h3>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> {spot.location}
                </span>
                <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-3">{spot.description}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => handleDelete(spot.id)} className="p-2 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl my-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Cadastrar Atração Turística</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome da Atração / Praia</label>
                <input
                  type="text"
                  value={newSpot.name}
                  onChange={e => setNewSpot({ ...newSpot, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
                <select
                  value={newSpot.category}
                  onChange={e => setNewSpot({ ...newSpot, category: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Praia">Praia</option>
                  <option value="Passeio">Passeio</option>
                  <option value="Camping">Camping</option>
                  <option value="Pesca">Pesca</option>
                  <option value="História">História</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Endereço / Localização</label>
                <input
                  type="text"
                  value={newSpot.location}
                  onChange={e => setNewSpot({ ...newSpot, location: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={newSpot.description}
                  onChange={e => setNewSpot({ ...newSpot, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
