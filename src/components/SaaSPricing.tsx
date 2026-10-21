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
  const [plansData, setPlansData] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/plans')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPlansData(data);
        }
      })
      .catch(() => {});
  }, []);

  const handlePlanClick = (planId: string) => {
    savePendingPurchase(planId);
    onNavigateTab('checkout');
  };

  const DEFAULT_PLANS = [
    {
      id: 'bronze' as const,
      name: 'Bronze',
      price: 'Grátis',
      subtext: 'Presença essencial no guia.',
      features: [
        'Perfil com informações essenciais no guia local',
        'Até 3 fotos na galeria (logo e capa à parte)',
        'Canal direto para WhatsApp e telefone',
        'CRM de mensagens e contatos recebidos',
        'Métricas essenciais de visualizações'
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
      subtext: 'Mais exposição e vitrine ampliada.',
      features: [
        'Mais exposição com destaque rotativo na Home',
        'Vitrine ampliada com apresentação completa e capa',
        'Até 15 fotos na galeria exclusiva',
        'Catálogo com até 5 produtos ou serviços',
        '1 promoção ou cupom de desconto ativo',
        'Selo VIP de estabelecimento verificado',
        'Perfil exclusivo sem anúncios de concorrentes'
      ],
      icon: Zap,
      color: 'border-indigo-400 bg-indigo-50/5 ring-1 ring-indigo-400/20',
      badgeColor: 'bg-indigo-600 text-white',
      btnText: 'Assinar Gold VIP'
    },
    {
      id: 'diamond_extremo' as const,
      name: 'Diamond',
      price: 'R$ 99,90',
      period: '/mês',
      subtext: 'Recursos Gold com maior capacidade de catálogo, fotos e promoções.',
      features: [
        'Todos os benefícios e recursos do plano Gold VIP',
        'Maior capacidade de catálogo: até 30 produtos ou serviços',
        'Galeria expandida: até 30 fotos em alta qualidade',
        'Até 3 promoções ou cupons simultâneos',
        'Posicionamento prioritário nas buscas por categoria',
        'Selo Diamante de parceiro oficial',
        'Mini-site exclusivo de alta conversão sem concorrentes'
      ],
      icon: Sparkles,
      color: 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/20 shadow-lg',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900',
      btnText: 'Assinar Diamond'
    }
  ];

  // Mescla dados dinâmicos do banco com as cores e ícones visuais
  const PLANS = React.useMemo(() => {
    if (!plansData.length) return DEFAULT_PLANS;
    return DEFAULT_PLANS.map(def => {
      const live = plansData.find((p: any) => p.name === def.id || p.id === `plan_${def.id}`);
      if (!live) return def;
      return {
        ...def,
        name: live.displayName || def.name,
        price: live.price === 0 ? 'Grátis' : `R$ ${Number(live.price).toFixed(2).replace('.', ',')}`,
        subtext: live.description || def.subtext,
        features: Array.isArray(live.features) && live.features.length > 0 ? live.features : def.features,
        btnText: live.buttonText || def.btnText,
        badgeText: live.badge || (def.id === 'diamond_extremo' ? '👑 DIAMOND' : def.id === 'gold_vip' ? '⭐ GOLD VIP' : 'BRONZE'),
        allowNew: live.allowNewSubscriptions !== false
      };
    });
  }, [plansData]);

  return (
    <div id="pricing_pricing_container" className="py-16 px-4 md:px-8 bg-slate-50 min-h-screen flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col w-full">

        <section className="text-center mb-10 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block mb-1">Planos Oficiais</span>
          <h1 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Escolha o plano ideal para a sua empresa</h1>
          <p className="text-slate-500 text-xs font-sans">
            Ative a presença da sua empresa no guia comercial de Itapoá com informações claras, catálogo de produtos e contato direto com seus clientes.
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
                      {(plan as any).badgeText || (plan.id === 'diamond_extremo' ? '👑 DIAMOND' : plan.name)}
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
                  disabled={(plan as any).allowNew === false}
                  onClick={() => handlePlanClick(plan.id)}
                  className={`py-3.5 w-full mt-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 ${
                    (plan as any).allowNew === false
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : plan.id === 'diamond_extremo'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {(plan as any).allowNew === false ? 'Adesões Encerradas' : plan.btnText}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
