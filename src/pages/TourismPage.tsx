/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tourism & Route Guides Hub Page
 */

import React, { useState } from 'react';
import { Compass, MapPin, Sun, Anchor, Heart, Sparkles, Navigation, Clock } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { StandardCard } from '../components/common/StandardCard';
import { Button } from '../components/common/Button';

interface TourismPageProps {
  onNavigateCompany?: (slug: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenAuthModal?: () => void;
}

export const TourismPage: React.FC<TourismPageProps> = ({
  onNavigateCompany = () => {},
  onNavigateTab = () => {},
  onOpenAuthModal = () => {}
}) => {
  const [spotFilter, setSpotFilter] = useState<string>('todos');

  useSEO({
    title: 'Guia de Turismo, Praias e Roteiros em Itapoá SC',
    description: 'Descubra as melhores praias, trilhas, pontos turísticos e roteiros para família e casais em Itapoá.'
  });

  const spots = [
    {
      id: '1',
      name: 'Praia de Itapema do Norte',
      category: 'Praias',
      desc: 'Formada por três belíssimas pedras com vista panorâmica para o mar. Águas limpas e infraestrutura excelente.',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      tag: 'Mais Visitada',
      location: 'Itapoá SC'
    },
    {
      id: '2',
      name: 'Reserva Volta Velha',
      category: 'Trilhas & Natureza',
      desc: 'Área preservada de Mata Atlântica com trilhas ecológicas, observação de pássaros e turismo científico.',
      img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
      tag: 'Ecoturismo',
      location: 'Itapoá SC'
    },
    {
      id: '3',
      name: 'Baía da Babitonga & Barra do Saí',
      category: 'Mirantes',
      desc: 'Encontro encantador do rio Saí Mirim com o mar na divisa entre Santa Catarina e Paraná.',
      img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
      tag: 'Pôr do Sol',
      location: 'Itapoá SC'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 bg-slate-50 text-slate-900 font-sans">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#C8102E] text-xs font-extrabold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Guia Turístico & Praias de Itapoá SC</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Descubra os Melhores Destinos de Itapoá
            </h1>
            <p className="text-slate-600 text-sm max-w-xl mx-auto">
              Conheça praias paradisíacas, trilhas de Mata Atlântica e passeios inesquecíveis no litoral norte catarinense.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {spots.map(s => (
              <StandardCard
                key={s.id}
                title={s.name}
                category={s.category}
                location={s.location}
                description={s.desc}
                imageUrl={s.img}
                badgeText={s.tag}
                badgeType="vip"
                actionText="EXPLORAR DESTINO ↗"
                onAction={() => alert(`Destino: ${s.name}\n${s.desc}`)}
              />
            ))}
          </div>

    </div>
  );
};
