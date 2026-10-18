/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public Events Hub Page
 */

import React from 'react';
import { Ticket, Calendar, MapPin, Sparkles } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { StandardCard } from '../components/common/StandardCard';
import { Button } from '../components/common/Button';

interface EventsPageProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAuthModal?: () => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  onNavigateTab = () => {},
  onOpenAuthModal = () => {}
}) => {
  useSEO({
    title: 'Calendário de Eventos, Shows e Festivais em Itapoá SC',
    description: 'Fique por dentro de todos os shows, festivais gastronômicos, eventos esportivos e feiras culturais em Itapoá SC.'
  });

  const events = [
    {
      id: 'e1',
      title: 'Festival Gastronômico da Lagosta e Frutos do Mar',
      category: 'Festivais Gastronômicos',
      location: 'Itapema do Norte - Itapoá SC',
      date: '15 a 18 de Outubro de 2026',
      img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      desc: 'Os melhores chefs e restaurantes reunidos com pratos exclusivos de frutos do mar, música ao vivo e feira de artesanato.'
    },
    {
      id: 'e2',
      title: 'Desafio Náutico & Meia Maratona de Itapoá',
      category: 'Esportes & Lazer',
      location: 'Praia da Barra do Saí - Itapoá SC',
      date: '08 de Novembro de 2026',
      img: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80',
      desc: 'Competição com prova de corrida de rua de 21k e travessia de stand-up paddle pela Baía da Babitonga.'
    },
    {
      id: 'e3',
      title: 'Réveillon das Luzes na Orla de Itapoá',
      category: 'Festas & Shows',
      location: 'Orla de Itapema do Norte',
      date: '31 de Dezembro de 2026',
      img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      desc: 'Queima de fogos silenciosa na praia, palco principal com atrações musicais e contagem regressiva para 2027.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 bg-slate-50 text-slate-900 font-sans">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#C8102E] text-xs font-extrabold uppercase tracking-wider">
              <Ticket className="w-4 h-4" />
              <span>Agenda Cultural & Esportiva de Itapoá</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Eventos, Festivais & Agenda Cultural
            </h1>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Acompanhe a programação oficial dos principais acontecimentos, shows à beira-mar e encontros esportivos do município.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(ev => (
              <StandardCard
                key={ev.id}
                title={ev.title}
                category={ev.category}
                location={ev.location}
                description={ev.desc}
                imageUrl={ev.img}
                badgeText={ev.date}
                badgeType="vip"
                actionText="DETALHES DO EVENTO ↗"
                onAction={() => alert(`Evento: ${ev.title}\nData: ${ev.date}\nLocal: ${ev.location}`)}
              />
            ))}
          </div>

    </div>
  );
};
