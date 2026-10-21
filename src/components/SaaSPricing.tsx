import React from 'react';
import { Check, Award, Zap, Sparkles } from 'lucide-react';
import { City, Category } from '../types';
import { savePendingPurchase } from '../lib/pendingPurchase';

interface SaaSPricingProps {
  cities: City[];
  categories: Category[];
  onListingCreated: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function SaaSPricing({ onNavigateTab = () => {} }: SaaSPricingProps) {
  const handlePlanClick = (planId: string) => {
    savePendingPurchase(planId);
    onNavigateTab('checkout');
  };
  const PLANS = [
    {
      id: 'bronze' as const,
      name: 'Bronze',
      price: 'Grátis',
      subtext: 'Ideal para ter presença básica no guia local',
      features: [
        'Até 3 fotos na galeria (logo e capa à parte)',
        'CRM de leads e mensagens integrado',
        'Métricas essenciais de visualização e cliques',
        'Listagem padrão no diretório comercial',
        'Sem novos produtos ou promoções publicáveis',
        'Sem destaque na vitrine da Home'
      ],
      icon: Award,
      color: 'border-slate-200 bg-white text-slate-700',
      badgeColor: 'bg-slate-100 text-slate-600',
      btnText: 'Começar Gratuitamente'
    },
    {
      id: 'gold_vip' as const,
      name: 'Gold VIP',
      price: 'R$ 49,90',
      period: '/mês',
      subtext: 'Apresentação completa e destaque rotativo',
      features: [
        'Até 15 fotos na galeria exclusiva',
        'Catálogo com até 5 produtos/serviços',
        '1 promoção ou cupom de desconto ativo',
        'Destaque rotativo garantido na Home',
        'Apresentação completa e selo VIP',
        'CRM de leads + Métricas de desempenho',
        'Link direto para WhatsApp e telefone'
      ],
      icon: Zap,
      color: 'border-indigo-400 bg-indigo-50/5 ring-1 ring-indigo-400/20',
      badgeColor: 'bg-indigo-600 text-white',
      btnText: 'Assinar Plano Gold'
    },
    {
      id: 'diamond_extremo' as const,
      name: 'Diamond',
      price: 'R$ 99,90',
      period: '/mês',
      subtext: 'Máxima exposição, topo de buscas e mini-site',
      features: [
        'Até 30 fotos na galeria de alta qualidade',
        'Catálogo expandido com até 30 produtos/serviços',
        'Até 3 promoções ou cupons simultâneos',
        'Todos os recursos e benefícios do plano Gold',
        'Posicionamento prioritário no topo das buscas',
        'Selo Diamante de parceiro oficial',
        'Mini-site exclusivo de alta conversão'
      ],
      icon: Sparkles,
      color: 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/20 shadow-lg',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900',
      btnText: 'Ativar Escopo Diamante'
    }
  ];

  return (
    <div id="pricing_pricing_container" className="py-16 px-4 md:px-8 bg-slate-50 min-h-screen flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col w-full">

        <section className="text-center mb-10 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block mb-1">Monetização SaaS</span>
          <h1 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Escolha o plano ideal para escalar</h1>
          <p className="text-slate-500 text-xs font-sans">
            Ative hoje o seu perfil de negócios e comece a impactar milhares de clientes locais de forma rápida e automatizada com robôs geradores de leads.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-stretch">
          {PLANS.map(plan => {
            const IconComp = plan.icon;
            return (
              <div
                key={plan.id}
                className={`p-6 md:p-8 rounded-3xl border flex flex-col justify-between transition-all ${plan.color}`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${plan.badgeColor}`}>
                      {plan.id === 'diamond_extremo' ? '👑 DIAMOND' : plan.name}
                    </span>
                    <IconComp className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>

                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl md:text-4xl font-sans font-black text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 text-xs font-semibold font-sans ml-1">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 mb-8 font-sans">{plan.subtext}</p>

                  <div className="flex flex-col gap-3 border-t border-slate-150 pt-6">
                    {plan.features.map((feat, idx) => (
                      <span key={idx} className="flex gap-2 text-xs text-slate-600 leading-normal font-sans">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  className={`py-3.5 w-full mt-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 ${plan.id === 'diamond_extremo' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-900 text-white'}`}
                >
                  {plan.btnText}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
