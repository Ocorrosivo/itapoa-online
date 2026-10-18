/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Star, Sparkles, TrendingUp, 
  Users, Award, Briefcase, ChevronRight, Utensils, 
  Hotel, Activity, ShoppingBag, Hammer 
} from 'lucide-react';
import { Company, Category, City, SolidarityCampaign } from '../types';

interface HomeSectionProps {
  categories: Category[];
  cities: City[];
  campaigns?: SolidarityCampaign[];
  featuredCompanies: Company[];
  onSearch: (term: string, catId?: string, cityId?: string) => void;
  onNavigateToCompany: (slug: string) => void;
  onNavigateToCampaign: (slug: string) => void;
  onNavigateToTab: (tab: string) => void;
  selectedCity: string;
  setSelectedCity: (cityId: string) => void;
}

// Icon mapper helper
const IconComponents: Record<string, any> = {
  Utensils, Hotel, Briefcase, Activity, ShoppingBag, Hammer
};

export default function HomeSection({
  categories,
  cities,
  campaigns = [],
  featuredCompanies,
  onSearch,
  onNavigateToCompany,
  onNavigateToCampaign,
  onNavigateToTab,
  selectedCity,
  setSelectedCity
}: HomeSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  // Sliding solidarity campaigns state
  const [activeSlide, setActiveSlide] = useState(0);
  
  // High-quality campaign seed dataset as fallback
  const fallbackCampaigns: SolidarityCampaign[] = [
    {
      id: 'camp_1',
      title: 'PÁSCOA SOLIDÁRIA AME 🍫',
      slug: 'pascoa-solidaria-ame',
      description: 'Está chegando a Páscoa! Podemos contar com a sua colaboração para fazer a Páscoa de dezenas de crianças carentes de Itapoá mais feliz? Aceitamos doações de doces, bombons e chocolates de qualquer valor.',
      meta: 'Para mais informações ou pontos de coleta, fale com a equipe pelo telefone.',
      contact: '(47) 99719-0413',
      pix: '(47) 99719-0413',
      bgColor: 'from-amber-100 via-orange-50 to-amber-100',
      textColor: 'text-amber-950',
      badgeColor: 'bg-amber-600 text-white',
      imageUrl: 'https://images.unsplash.com/photo-1522307837370-cc113a36b78d?auto=format&fit=crop&w=600&q=80',
      category: 'Ação Social Infantil',
      deadline: '15 de Abril de 2026',
      responsible: 'Sheila Miglioli (AME)',
      gallery: []
    },
    {
      id: 'camp_2',
      title: 'CAMPANHA DO AGASALHO AME 🧥',
      slug: 'agasalho-ame',
      description: 'O inverno se aproxima no litoral catarinense. Vamos aquecer quem mais precisa! Arrecadamos cobertores, mantas, blusas de frio e calçados em ótimo estado para famílias em vulnerabilidade social.',
      meta: 'Pontos de coleta distribuídos nos mercados da cidade ou colete voluntário.',
      contact: '(47) 99719-0413',
      pix: '(47) 99719-0413',
      bgColor: 'from-blue-100 via-indigo-50 to-blue-100',
      textColor: 'text-indigo-950',
      badgeColor: 'bg-indigo-600 text-white',
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      category: 'Ação Solidária Inverno',
      deadline: '30 de Junho de 2026',
      responsible: 'Equipe Voluntária AME',
      gallery: []
    },
    {
      id: 'camp_3',
      title: 'APOIO MULTIDISCIPLINAR À AMA AUTISMO 🧩',
      slug: 'ama-autismo-itapoa',
      description: 'Ajude as ações da Associação de Pais e Amigos dos Autistas de Itapoá (AMA). Juntos, provemos terapias especializadas, acolhimento psicossocial e campanhas de inclusão e neurodiversidade para as crianças.',
      meta: 'Sua contribuição apoia a manutenção de consultórios de fonoaudiologia.',
      contact: '(47) 99719-0413',
      pix: '(47) 99719-0413',
      bgColor: 'from-rose-100 via-pink-50 to-rose-100',
      textColor: 'text-rose-950',
      badgeColor: 'bg-rose-600 text-white',
      imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80',
      category: 'Apoio de Saúde Especializada',
      deadline: 'Contínua / Sem Prazo',
      responsible: 'Direção da AMA Autismo',
      gallery: []
    }
  ];

  const solidarityCampaigns = campaigns.length > 0 ? campaigns : fallbackCampaigns;

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % solidarityCampaigns.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + solidarityCampaigns.length) % solidarityCampaigns.length);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm, selectedCat || undefined, selectedCity || undefined);
  };

  // Partners featured in the screenshot
  const customPartners = [
    {
      id: "partner_1",
      name: "Hotel Infantil Love Baby's",
      slug: "hotel-infantil-love-babys",
      categoryId: "cat_saude",
      tagline: "Amor e segurança para seu bem mais precioso!",
      description: "Serviço altamente qualificado de cuidado infantil e estimulação precoce. Oferecemos períodos flexíveis adaptados à sua jornada de trabalho.",
      highlights: ["Matutino", "Vespertino", "Integral"],
      phone: "(47) 99665-1227",
      whatsapp: "5547996651227",
      instagram: "love_babys_itapoa",
      facebook: "lovebabysitapoa",
      image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Pagamento sob trabalho. Nós não apenas cuidamos do seu child, nós estimulamos com atividades artísticas, pedagógicas e recreação integrada no litoral de Itapoá! Equipe de pedagogos diplomados."
    },
    {
      id: "partner_2",
      name: "Caminho de Luz",
      slug: "caminho-de-luz-itapoa",
      categoryId: "cat_servicos",
      tagline: "Palestra Pública Semanal e Apoio Fraterno",
      description: "Um espaço de estudo, reflexão e compartilhamento espiritual. Encontros voltados ao acolhimento e desenvolvimento ético humano.",
      highlights: ["Misericordiosos", "Centro de Estudos", "Expositor Local"],
      phone: "(47) 99719-0413",
      whatsapp: "5547997190413",
      instagram: "caminhodeluz.itapoa",
      facebook: "caminhodeluzitapoa",
      image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Inspirado no ensinamento: 'Bem-aventurados os que são misericordiosos'. Encontros todas as quartas às 19:30 com palestras espirituais edificantes de palestrantes voluntários convidados."
    },
    {
      id: "partner_3",
      name: "Válore Shopping & Formatura",
      slug: "valore-shopping-itapoa",
      categoryId: "cat_comercio",
      tagline: "A infraestrutura dos seus sonhos para eventos marcantes",
      description: "Salão nobre de múltiplos propósitos para realização de casamentos, formaturas, convenções industriais e lançamentos corporativos.",
      highlights: ["Capac. 150 a 1.000", "Acústica Premium", "Ar Central"],
      phone: "(47) 3443-1200",
      whatsapp: "5547997190413",
      instagram: "valoreshopping",
      facebook: "valoreshopping.itapoa",
      image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Espaços amplos, climatização de última geração, camarins privativos e áreas gastronômicas dedicadas a buffets parceiros de Itapoá. Idealize sua formatura de alto nível!"
    },
    {
      id: "partner_4",
      name: "Centro de Desenvolvimento Humano",
      slug: "centro-desenvolvimento-humano-itapoa",
      categoryId: "cat_servicos",
      tagline: "Constelação Sistêmica & Mentoria Executiva",
      description: "Treinamentos corporativos personalizados, desenvolvimento de inteligência emocional e lideranças inovadoras sob a tutela de Sheila Miglioli.",
      highlights: ["Sheila Miglioli", "Harmonia Familiar", "Oratória"],
      phone: "(41) 98906-6501",
      whatsapp: "5541989066501",
      instagram: "sheila_miglioli",
      facebook: "sheilamigliolioficial",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Consultório de excelência em Terapia Sistêmica Familiar, constelações individuais, oratória profissional para executivos e desbloqueios emocionais com foco em resultados de alta performance."
    },
    {
      id: "partner_5",
      name: "Agropecuária AgroTudo D'Horta",
      slug: "agropecuaria-agrotudo-dhorta",
      categoryId: "cat_comercio",
      tagline: "Tudo para seu pet, sua horta e seu jardim",
      description: "Rações nacionais e importadas premium, medicamentos veterinários, sementes selecionadas e mudas saudáveis para embelezar seu quintal.",
      highlights: ["Caminho da Onça", "Pet Care", "Mudas Saudáveis"],
      phone: "(47) 99115-9797",
      whatsapp: "5547991159797",
      instagram: "agrotudo_itapoa",
      facebook: "agrotudoitapoa",
      image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Localizados na Avenida João Horácio Vieira, 3336 (itinerário tradicional do Caminho da Onça). Temos adubos orgânicos, defensivos, utilidades rurais e orientações personalizadas para cultivo local."
    },
    {
      id: "partner_6",
      name: "Casa Temporada e Eventos",
      slug: "casa-temporada-eventos-itapoa",
      categoryId: "cat_hospedagem",
      tagline: "Sua estadia aconchegante com privacidade garantida",
      description: "Acomodação de veraneio totalmente mobiliada, localizada a pouquíssimos metros do balneário e próxima aos principais serviços urbanos.",
      highlights: ["Estadia Praia", "Mobília Completa", "Perto do Porto"],
      phone: "(47) 99719-0413",
      whatsapp: "5547997190413",
      instagram: "casatemporada.itapoa",
      facebook: "casatemporadaitapoa",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Imóvel higienizado com todo capricho para acolher casais e famílias grandes. Cozinha equipada, Wi-Fi veloz, churrasqueira de tijolos e área de lazer com muito conforto."
    },
    {
      id: "partner_7",
      name: "Projeto Viva Capoeira",
      slug: "projeto-viva-capoeira",
      categoryId: "cat_saude",
      tagline: "Cultura, esporte e socialização comunitária",
      description: "Aulas regulares integradoras de capoeira com foco na disciplina, respeito cultural, condicionamento muscular estruturado.",
      highlights: ["Menores de Idade", "Resgate Histórico", "Esporte Coletivo"],
      phone: "(47) 99719-0413",
      whatsapp: "5547997190413",
      instagram: "vivacapoeira.itapoa",
      facebook: "vivacapoeiraitapoa",
      image: "https://images.unsplash.com/photo-1510531704581-5b2870972060?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Projeto comunitário engajado na cidadania de crianças e adolescentes de Itapoá através da musicalidade do berimbau, expression corporal e defesa pacífica estruturada."
    },
    {
      id: "partner_8",
      name: "AMA Itapoá SC - Associação Autista",
      slug: "ama-itapoasc-associacao-autista",
      categoryId: "cat_saude",
      tagline: "Sensibilizando o comércio e acolhendo famílias",
      description: "Grupo dedicado à defesa de direitos das pessoas no espectro autista, oferecendo rede de carinho, troca de experiências e palestras técnicas.",
      highlights: ["Espaço Azul", "Todo Mundo Ama", "Apoio Psicológico"],
      phone: "(47) 99719-0413",
      whatsapp: "5547997190413",
      instagram: "amaitapoasc",
      facebook: "amaitapoasc",
      image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&h=300&w=400&q=80",
      detailsText: "Apoiadora da famosa barraca 'Todo Mundo Ama' nas festas municipais e aniversário de Itapoá. Buscamos doações para expandir atendimento médico especializado para nossos cadastrados."
    }
  ];

  return (
    <div id="home_container" className="flex flex-col w-full min-h-screen bg-slate-50 font-sans">
      
      {/* 2. CORE DUAL SECTION LAYOUT */}
      <section className="max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SOLIDARITY ACTION POSTS CAROUSEL (65% width equivalent) */}
        <div id="solidarity_campaigns_element" className="lg:col-span-7 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-650 inline-block animate-ping" />
            <h2 className="text-sm font-black uppercase text-slate-800 font-sans tracking-wider">Rede de Solidariedade</h2>
          </div>

          <div className="relative w-full rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow overflow-hidden min-h-[380px] flex flex-col justify-between">
            {/* Slide Body wrapped with clickable button/div */}
            <div 
              onClick={() => onNavigateToCampaign(solidarityCampaigns[activeSlide].slug)}
              className="cursor-pointer group hover:bg-red-50/10 transition-all"
            >
              {/* Highlight header */}
              <div className="p-4 bg-red-650 flex items-center justify-between text-white">
                <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                  🌟 AÇÃO COMUNITÁRIA EXCLUSIVA
                </span>
                <span className="text-[10px] font-sans font-bold bg-white/20 px-2 py-0.5 rounded">
                  Campanha {activeSlide + 1} de {solidarityCampaigns.length}
                </span>
              </div>

              {/* Campaign Content Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
                
                {/* Visual Cover inside slide */}
                <div className="md:col-span-5 h-[160px] md:h-[220px] rounded-xl overflow-hidden border border-slate-200 shadow-inner shrink-0 relative bg-slate-900 group-hover:scale-[1.01] transition-all">
                  <img 
                    src={solidarityCampaigns[activeSlide].imageUrl} 
                    alt="Solidarity campaign visual" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-[9px] font-sans text-amber-300 font-extrabold tracking-wider bg-slate-900/50 px-1.5 py-0.5 rounded block mb-1">Contato Urgente</span>
                    <p className="text-[10px] leading-tight font-bold">{solidarityCampaigns[activeSlide].contact}</p>
                  </div>
                </div>

                {/* Typography of campaign */}
                <div className="md:col-span-7 flex flex-col text-left justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 mb-1 block">Ajude Famílias Locais</span>
                    <h3 className="text-lg font-sans font-black text-slate-900 leading-snug tracking-tight mb-2 group-hover:text-red-650 transition-colors">
                      {solidarityCampaigns[activeSlide].title}
                    </h3>
                    
                    <p className="text-slate-600 text-xs leading-relaxed mb-4">
                      {solidarityCampaigns[activeSlide].description}
                    </p>

                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-slate-800 text-xs mb-3">
                      <span className="font-extrabold text-[10px] text-red-600 block uppercase mb-0.5">Como Contribuir?</span>
                      <span className="text-slate-700 block text-[11px] font-sans">{solidarityCampaigns[activeSlide].meta}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToCampaign(solidarityCampaigns[activeSlide].slug);
                    }}
                    className="w-full md:w-auto py-2.5 px-5 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md shadow-red-600/15 transition cursor-pointer self-start"
                  >
                    Ver Causa Completa &amp; Ajudar ➔
                  </button>
                </div>

              </div>
            </div>

            {/* Pix & Footer controller */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[9px] font-extrabold text-teal-600 tracking-wider uppercase bg-teal-50 px-1 py-0.5 rounded-sm">Chave PIX:</span>
                <span className="font-mono text-xs font-bold text-slate-700">{solidarityCampaigns[activeSlide].pix}</span>
              </div>

              {/* Slider Dots and manual arrows */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-black transition cursor-pointer select-none"
                  title="Anterior"
                >
                  ◀
                </button>
                <div className="flex gap-1.5">
                  {solidarityCampaigns.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSlide === idx ? 'w-4 bg-red-600' : 'bg-slate-300'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-black transition cursor-pointer select-none"
                  title="Próximo"
                >
                  ▶
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: DIRECTORY ADVERTISER AD (35% width equivalent) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <h2 className="text-sm font-black uppercase text-slate-800 font-sans tracking-wider text-left">Destaque sua Empresa</h2>
          </div>

          <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-950 border border-slate-800 shadow-xl p-6 text-white text-left relative overflow-hidden min-h-[380px] flex flex-col justify-between">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />
            
            {/* Header section of card */}
            <div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider w-max mb-4">
                💎 POSIÇÃO DIAMANTE EXTRA VIP
              </div>

              {/* Whatsapp-like bubble exactly as shown with time verification */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner mb-6 relative hover:border-indigo-500/50 transition">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">MOCKUP DA REDE</span>
                  <span className="text-[9px] text-slate-500 font-mono">Status: Ativo</span>
                </div>
                <p className="text-[14px] font-sans font-black text-white text-center tracking-tight uppercase leading-none">
                  COLOQUE SUA EMPRESA AQUI!
                </p>
                <div className="flex items-center justify-end gap-1 mt-3">
                  <span className="text-[9px] text-slate-500 font-mono">13:42</span>
                  <span className="text-teal-400 text-xs">✓✓</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans mb-6">
                Aumente o alcance comercial da sua marca no litoral norte de Itapoá SC. Colete leads automáticos direto no celular, divulgue catálogos de produtos e domine os cliques de busca de serviços de horta, turismo, pet e lazer.
              </p>
            </div>

            {/* Big pulsating button to checkout plans */}
            <button 
              onClick={() => onNavigateToTab('plans')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs tracking-widest uppercase hover:brightness-110 active:scale-98 transition shadow-lg shadow-red-900/30 cursor-pointer text-center"
            >
              Clique aqui e Destaque-se ↗
            </button>

          </div>
        </div>

      </section>

      {/* 3. KEYWORD SEARCH CONTAINER FOR DIRECTORY (AS IN SCRSHOT) */}
      <section className="bg-slate-100 border-t border-b border-slate-200/80 py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <div className="text-center mb-4">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Ache tudo o que precisa</span>
            <h3 className="text-xl font-sans font-black text-slate-900 tracking-tight leading-none mt-1">
              O que você está buscando?
            </h3>
            <p className="text-[11px] text-slate-500 mt-1.5 font-sans">
              Busque pela sua palavra chave do parceiro local. <strong className="text-slate-700">Exemplo: *Mercado, *Clínica, *Hospedagem, *Sheila, *Love</strong>
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-150 transition">
            <input 
              type="text" 
              placeholder="Digite o nome da empresa, serviço ou palavra chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 py-3 px-4 bg-transparent text-slate-950 font-sans text-xs focus:outline-none placeholder:text-slate-400"
            />
            <button 
              type="submit"
              className="py-3 px-6 bg-slate-950 text-white text-xs font-sans font-black hover:bg-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer uppercase border-l border-slate-200"
            >
              Buscar &gt;&gt;
            </button>
          </form>

        </div>
      </section>

      {/* 4. NOSSOS PARCEIROS GRID SECTION (MATCHES 8 FLYERS OF IMAGE) */}
      <section className="max-w-7xl mx-auto w-full px-4 py-12">
        
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Nossos Apoiadores Oficiais</span>
          <h2 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight leading-none mt-1.5">
            Nossos Parceiros
          </h2>
          <div className="w-16 h-1 bg-red-600 mx-auto mt-3.5 rounded-full" />
        </div>

        {/* Grid following responsive design guidelines (4 columns desktop, 2 columns tablet, 1 column mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
          {customPartners.map((partner) => {
            const catObj = categories.find(c => c.id === partner.categoryId);
            const catName = catObj ? catObj.name : "Parceiro";

            return (
              <article 
                key={partner.id}
                onClick={() => onNavigateToCompany(partner.slug)}
                className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 hover:border-red-400 text-left cursor-pointer"
              >
                {/* Partner Cover image */}
                <div 
                  className="relative h-40 w-full bg-slate-100 overflow-hidden shrink-0"
                >
                  <img 
                    src={partner.image} 
                    alt={partner.name} 
                    className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Watermark Label */}
                  <div className="absolute top-2.5 left-2.5 bg-red-650/90 border border-white/20 text-white font-sans text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-wider uppercase">
                    A.M.E Certificado
                  </div>

                  {/* Badges/Highlights inside the flyer bar */}
                  <div className="absolute bottom-2.5 right-2.5 flex gap-1">
                    {partner.highlights.slice(0, 2).map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-black/60 shadow-sm backdrop-blur-xs text-[7px] text-white font-bold">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Partner Details Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category Badge */}
                    <span className="inline-block bg-red-50 text-red-650 text-[9px] font-black px-2 py-0.5 rounded border border-red-100 uppercase tracking-widest mb-2">
                      {catName}
                    </span>

                    <h4 
                      className="font-sans font-black text-sm text-slate-900 leading-snug group-hover:text-red-650 transition line-clamp-1"
                      title={partner.name}
                    >
                      {partner.name}
                    </h4>
                    <p className="text-[9px] text-rose-600 font-bold uppercase tracking-wider mt-0.5 mb-2 line-clamp-1">
                      {partner.tagline}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {partner.description}
                    </p>
                  </div>

                  {/* Social links row and prominent action CTA button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    
                    {/* Facebook, Instagram and WhatsApp matching colors icons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {partner.facebook && (
                        <a 
                          href={`https://facebook.com/${partner.facebook}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-6.5 h-6.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition border border-blue-150"
                          title="Facebook"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V1H13c-2.8 0-5 2.2-5 5v2z" />
                          </svg>
                        </a>
                      )}
                      {partner.instagram && (
                        <a 
                          href={`https://instagram.com/${partner.instagram}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-6.5 h-6.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition border border-pink-150"
                          title="Instagram"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2.1c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.5.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .5 2.2.1 1.3.1 1.6.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.5 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.5-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.5-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-.1-.2-.4-.4-1-.5-2.2-.1-1.3-.1-1.6-.1-4.9s0-3.6.1-4.9c.1-1.2.3-1.8.5-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.5 1.3-.1 1.6-.1 4.9-.1z" />
                          </svg>
                        </a>
                      )}
                      {partner.whatsapp && (
                        <a 
                          href={`https://wa.me/${partner.whatsapp}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-6.5 h-6.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition border border-emerald-150"
                          title="Chamar WhatsApp"
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.906-6.99C16.554 1.874 14.082.84 11.45.84 6.01.84 1.585 5.265 1.581 10.7a9.81 9.81 0 001.448 4.966l-.1.597-1.002 3.655 3.743-.981.577.342z" />
                          </svg>
                        </a>
                      )}
                    </div>

                    {/* Clique Aqui! action (triggers page navigation) */}
                    <button 
                      className="py-1 px-2.5 rounded-lg bg-red-650 hover:bg-red-700 text-white font-extrabold text-[9px] tracking-wider uppercase flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      Clique Aqui! ↗
                    </button>

                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Go to Directory list view */}
        <div className="text-center mt-12 mb-6">
          <button 
            onClick={() => onNavigateToTab('directory')}
            className="text-sm font-sans font-black text-rose-600 hover:text-rose-800 tracking-wider hover:underline transition uppercase inline-flex items-center gap-1"
          >
            Veja Todos os Nossos Parceiros &gt;&gt;&gt;
          </button>
        </div>

      </section>

      {/* 5. BLACK FOOTER WITH SOCIAL LINKS ("NOSSAS MÍDIAS" AS SCRSHOT) */}
      <footer id="footer_section_custom" className="bg-slate-950 text-white border-t border-slate-900 py-12 px-4 text-center select-none font-sans mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <h4 className="font-sans font-black tracking-widest text-lg uppercase mb-2">
            Nossas Mídias
          </h4>
          <div className="w-12 h-0.5 bg-red-650 mb-6" />

          {/* Centered social handles exactly as in footer of screenshot */}
          <div className="flex items-center gap-4 mb-8">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center transition hover:scale-105 hover:bg-red-500 hover:text-white border border-slate-800" title="Facebook">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h2V1H13c-2.8 0-5 2.2-5 5v2z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center transition hover:scale-105 hover:bg-red-500 hover:text-white border border-slate-800" title="Instagram">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.1c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.5.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .5 2.2.1 1.3.1 1.6.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.5 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.5-1.3.1-1.6.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.5-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-.1-.2-.4-.4-1-.5-2.2-.1-1.3-.1-1.6-.1-4.9s0-3.6.1-4.9c.1-1.2.3-1.8.5-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.5 1.3-.1 1.6-.1 4.9-.1z" />
              </svg>
            </a>
            <a href="https://wa.me/5547997190413" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center transition hover:scale-105 hover:bg-red-500 hover:text-white border border-slate-800" title="WhatsApp">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.906-6.99C16.554 1.874 14.082.84 11.45.84 6.01.84 1.585 5.265 1.581 10.7a9.81 9.81 0 001.448 4.966l-.1.597-1.002 3.655 3.743-.981.577.342z" />
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center transition hover:scale-105 hover:bg-red-500 hover:text-white border border-slate-800" title="YouTube">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>

          <p className="text-[10px] text-slate-500 tracking-wider">
            &copy; 2026 AME Itapoá SC - Todos os direitos reservados. Portal de Redes e Solidariedade Comunitária.
          </p>
        </div>
      </footer>

    </div>
  );
}
