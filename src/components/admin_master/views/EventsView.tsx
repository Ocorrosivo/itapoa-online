/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Events Administrative View Component - CRUD for Events & Agenda
 */

import React, { useState } from 'react';
import { Ticket, Plus, Calendar, MapPin, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

export interface EventItem {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  banner: string;
}

export const EventsView: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: 'evt_1',
      title: 'Festival Gastronômico Frutos do Mar de Itapoá',
      category: 'Gastronomia',
      date: '2026-08-15',
      time: '19:00',
      location: 'Calçadão de Itapema do Norte',
      organizer: 'Prefeitura & Guia Comercial',
      banner: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'evt_2',
      title: 'Corrida de Verão Rota das Praias 10K',
      category: 'Esportes',
      date: '2026-09-02',
      time: '07:00',
      location: 'Pontal da Figueira',
      organizer: 'Associação Esportiva Itapoá',
      banner: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=300&q=80'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EventItem>>({ title: '', category: 'Gastronomia', date: '', time: '', location: '', organizer: '', banner: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const created: EventItem = {
      id: `evt_${Date.now()}`,
      title: newEvent.title || 'Novo Evento',
      category: newEvent.category || 'Geral',
      date: newEvent.date || '2026-08-01',
      time: newEvent.time || '19:00',
      location: newEvent.location || 'Itapoá - SC',
      organizer: newEvent.organizer || 'Organizador',
      banner: newEvent.banner || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
    };
    setEvents([created, ...events]);
    setIsModalOpen(false);
    setNewEvent({ title: '', category: 'Gastronomia', date: '', time: '', location: '', organizer: '', banner: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja cancelar/excluir este evento?')) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6 p-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Eventos & Agenda Cultural</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre shows, festivais gastronômicos, feiras de negócios e torneios esportivos de Itapoá.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Evento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-44 rounded-2xl overflow-hidden relative">
                <img src={item.banner} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-extrabold uppercase shadow">
                  {item.category}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {item.date} às {item.time}
                </span>
                <h3 className="text-lg font-bold text-white leading-tight mt-1">{item.title}</h3>
                <span className="text-xs text-slate-400 flex items-center gap-1 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> {item.location}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl my-4 max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Cadastrar Novo Evento</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Título do Evento</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Horário</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Local do Evento</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Salvar Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
