/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Application Routes & SPA Router Navigation Handler
 * Self-contained navigation state manager — 7 tabs em ordem exata, SPA sem reload
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HomePage } from '../pages/HomePage';
import { DirectoryPage } from '../pages/DirectoryPage';
import { CompanyMiniSitePage } from '../pages/CompanyMiniSitePage';
import { TourismPage } from '../pages/TourismPage';
import { EventsPage } from '../pages/EventsPage';
import { BlogPage } from '../pages/BlogPage';
import { JobsPage } from '../pages/JobsPage';
import { PlansPage } from '../pages/PlansPage';
import { BairroDetailPage } from '../pages/BairroDetailPage';
import { PraiaDetailPage } from '../pages/PraiaDetailPage';
import { InstitutionalPage } from '../pages/institutional/InstitutionalPage';
import CampaignDetailSection from '../components/CampaignDetailSection';
import { AIModal } from '../components/common/AIModal';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { AdminLoginPage } from '../pages/auth/AdminLoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const EmpresarioDashboardPage = lazy(() => import('../pages/EmpresarioDashboardPage').then(m => ({ default: m.EmpresarioDashboardPage})));

/**
 * Mapa canônico SPA — 7 itens do menu + aliases legados para compatibilidade.
 * Rotas SPA: /, /projetos-sociais, /categorias, /bairros, /empresas, /turismo, /empregos
 * /turismo agrega Turismo / Eventos / Informativo em seções internas.
 * Legados (eventos, blog, rh-empregos, praias, etc) normalizam para o canônico.
 */
const pathToTabMap: Record<string, string> = {
  'empresas': 'empresas',
  'directory': 'empresas',
  'projetos-sociais': 'projetos-sociais',
  'categorias': 'categorias',
  'bairros': 'bairros',
  'turismo': 'turismo',
  'tourism': 'turismo',
  'eventos': 'turismo',
  'events': 'turismo',
  'blog': 'turismo',
  'informativo': 'turismo',
  'praias': 'turismo',
  'empregos': 'empregos',
  'rh-empregos': 'empregos',
  'jobs': 'empregos',
  'ofertas': 'empresas',
  'planos': 'planos',
  'plans': 'planos',
  'contato': 'contato',
  'contact': 'contato',
  'sobre': 'sobre',
  'about': 'sobre',
  'politica-de-privacidade': 'privacy',
  'termos-de-uso': 'terms',
  'login': 'login',
  'login/admin': 'login/admin',
  'cadastro': 'cadastro',
  'esqueci-senha': 'esqueci-senha',
  'painel': 'painel',
  'admin': 'admin'
};

const AUTH_TABS = ['login', 'login/admin', 'cadastro', 'esqueci-senha'];

interface ParsedRoute {
  tab: string;
  companySlug: string | null;
  bairroSlug: string | null;
  praiaSlug: string | null;
}

const getInitialRoute = (): ParsedRoute => {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

  const companyMatch = path.match(/^empresa\/([^/]+)$/);
  if (companyMatch) {
    return {
      tab: 'empresas',
      companySlug: decodeURIComponent(companyMatch[1]),
      bairroSlug: null,
      praiaSlug: null
    };
  }

  const bairroMatch = path.match(/^bairro\/([^/]+)$/);
  if (bairroMatch) {
    return {
      tab: 'home',
      companySlug: null,
      bairroSlug: decodeURIComponent(bairroMatch[1]),
      praiaSlug: null
    };
  }

  const praiaMatch = path.match(/^praia\/([^/]+)$/);
  if (praiaMatch) {
    return {
      tab: 'home',
      companySlug: null,
      bairroSlug: null,
      praiaSlug: decodeURIComponent(praiaMatch[1])
    };
  }

  return {
    tab: pathToTabMap[path] || 'home',
    companySlug: null,
    bairroSlug: null,
    praiaSlug: null
  };
};

// Rotas sem Header/Footer do site público (painel e autenticação).
const PANEL_TABS = ['admin', 'painel', 'login', 'login/admin', 'cadastro', 'esqueci-senha'];
const isPanelTab = (tab: string) => PANEL_TABS.includes(tab);
const isAuthTab = (tab: string) => AUTH_TABS.includes(tab);

export const AppRoutes: React.FC = () => {
  const { campaigns } = useCompany();
  const { isAdminMaster } = useAuth();
  const initialRoute = getInitialRoute();

  const [currentTab, setCurrentTab] = useState<string>(initialRoute.tab);
  const [activeCompanySlug, setActiveCompanySlug] = useState<string | null>(initialRoute.companySlug);
  const [activeBairroSlug, setActiveBairroSlug] = useState<string | null>(initialRoute.bairroSlug);
  const [activePraiaSlug, setActivePraiaSlug] = useState<string | null>(initialRoute.praiaSlug);
  const [activeCampaignSlug, setActiveCampaignSlug] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [activeInstitutional, setActiveInstitutional] = useState<
    'about' | 'contact' | 'advertise' | 'how-it-works' | 'faq' | 'privacy' | 'terms' | 'help' | null
  >(null);

  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setCurrentTab(route.tab);
      setActiveCompanySlug(route.companySlug);
      setActiveBairroSlug(route.bairroSlug);
      setActivePraiaSlug(route.praiaSlug);
      setActiveCampaignSlug(null);
      setActiveInstitutional(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigateTab = (tab: string) => {
    setActiveCompanySlug(null);
    setActiveCampaignSlug(null);
    setActiveBairroSlug(null);
    setActivePraiaSlug(null);
    setActiveInstitutional(null);

    const normalizedTab = pathToTabMap[tab] || tab;
    setCurrentTab(normalizedTab);

    const targetPath = normalizedTab === 'home' ? '/' : `/${normalizedTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateCompany = (slug: string | null) => {
    setActiveCompanySlug(slug);
    if (slug) {
      setActiveBairroSlug(null);
      setActivePraiaSlug(null);
      setActiveInstitutional(null);
      setActiveCampaignSlug(null);
    }
    const targetPath = slug ? `/empresa/${encodeURIComponent(slug)}` : '/empresas';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectBairro = (slug: string) => {
    setActiveBairroSlug(slug);
    setActiveCompanySlug(null);
    setActivePraiaSlug(null);
    setActiveInstitutional(null);
    setActiveCampaignSlug(null);
    const targetPath = `/bairro/${encodeURIComponent(slug)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPraia = (slug: string) => {
    setActivePraiaSlug(slug);
    setActiveCompanySlug(null);
    setActiveBairroSlug(null);
    setActiveInstitutional(null);
    setActiveCampaignSlug(null);
    const targetPath = `/praia/${encodeURIComponent(slug)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuthModal = () => handleNavigateTab('login');

  const renderContent = () => {
    if (activeCompanySlug) {
      return (
        <ErrorBoundary fallback={<div className="min-h-[calc(100vh-13rem)] bg-slate-950 text-white p-6 text-center flex flex-col items-center justify-center gap-4"><p className="text-sm text-slate-300">Erro ao carregar empresa.</p><button onClick={() => handleNavigateCompany(null)} className="px-4 py-2 bg-blue-600 rounded-xl text-white text-sm font-semibold">Voltar ao Guia</button></div>}>
          <CompanyMiniSitePage
            slug={activeCompanySlug}
            onBack={() => handleNavigateCompany(null)}
            onNavigateCompany={handleNavigateCompany}
          />
        </ErrorBoundary>
      );
    }

    if (activeBairroSlug) {
      return (
        <BairroDetailPage
          slug={activeBairroSlug}
          onNavigateBack={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              setActiveBairroSlug(null);
              handleNavigateTab('home');
            }
          }}
          onNavigateCompany={handleNavigateCompany}
        />
      );
    }

    if (activePraiaSlug) {
      return (
        <PraiaDetailPage
          slug={activePraiaSlug}
          onNavigateBack={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              setActivePraiaSlug(null);
              handleNavigateTab('home');
            }
          }}
          onNavigateCompany={handleNavigateCompany}
        />
      );
    }

    if (activeInstitutional) {
      return (
        <InstitutionalPage
          type={activeInstitutional}
          onNavigateBack={() => setActiveInstitutional(null)}
          onOpenAuthModal={handleOpenAuthModal}
        />
      );
    }

    if (activeCampaignSlug) {
      const campaign = campaigns.find(c => c.slug === activeCampaignSlug) || campaigns[0];
      return (
        <CampaignDetailSection
          campaign={campaign}
          onBack={() => setActiveCampaignSlug(null)}
        />
      );
    }

    return renderTab();
  };

  const renderTab = () => {
    switch (currentTab) {
      case 'login':
        return <LoginPage onNavigateTab={handleNavigateTab} />;

      case 'login/admin':
        return <AdminLoginPage onNavigateTab={handleNavigateTab} />;

      case 'cadastro':
        return <RegisterPage onNavigateTab={handleNavigateTab} />;

      case 'esqueci-senha':
        return <ForgotPasswordPage onNavigateTab={handleNavigateTab} />;

      case 'empresas':
      case 'categorias':
      case 'bairros':
        return <DirectoryPage onNavigateCompany={handleNavigateCompany} />;

      case 'turismo':
        return (
          <div className="space-y-0">
            <TourismPage
              onNavigateCompany={handleNavigateCompany}
              onNavigateTab={handleNavigateTab}
              onOpenAuthModal={handleOpenAuthModal}
            />
            <div id="eventos" className="border-t border-slate-200">
              <EventsPage
                onNavigateTab={handleNavigateTab}
                onOpenAuthModal={handleOpenAuthModal}
              />
            </div>
            <div id="informativo" className="border-t border-slate-200">
              <BlogPage />
            </div>
          </div>
        );

      case 'planos':
        return (
          <PlansPage
            onSelectPlan={() => handleNavigateTab('admin')}
            onNavigateTab={handleNavigateTab}
            onOpenAuthModal={handleOpenAuthModal}
          />
        );

      case 'projetos-sociais':
        return (
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest bg-amber-400 text-slate-900 px-3 py-1 rounded-full mb-4">Em breve</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Projetos Sociais</h1>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Estamos preparando novidades para esta seção. Volte em breve para conhecer os projetos sociais de Itapoá.
            </p>
            <button
              onClick={() => handleNavigateTab('home')}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md"
            >
              Voltar ao início
            </button>
          </div>
        );

      case 'empregos':
        return <JobsPage />;

      case 'ofertas':
        return <DirectoryPage onNavigateCompany={handleNavigateCompany} />;

      case 'contato':
        return (
          <InstitutionalPage
            type="contact"
            onNavigateBack={() => handleNavigateTab('home')}
            onOpenAuthModal={handleOpenAuthModal}
          />
        );

      case 'sobre':
        return (
          <InstitutionalPage
            type="about"
            onNavigateBack={() => handleNavigateTab('home')}
            onOpenAuthModal={handleOpenAuthModal}
          />
        );

      case 'privacy':
      case 'terms':
      case 'help':
        return (
          <InstitutionalPage
            type={currentTab as unknown as 'privacy' | 'terms' | 'help'}
            onNavigateBack={() => handleNavigateTab('home')}
            onOpenAuthModal={handleOpenAuthModal}
          />
        );

      case 'admin':
        if (isAdminMaster) {
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <AdminDashboardPage
                onOpenAuthModal={handleOpenAuthModal}
                onNavigateCompany={handleNavigateCompany}
                onNavigateTab={handleNavigateTab}
              />
            </Suspense>
          );
        }
        return <AdminLoginPage onNavigateTab={handleNavigateTab} />;

      case 'painel':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <EmpresarioDashboardPage onOpenAuthModal={handleOpenAuthModal} />
          </Suspense>
        );

      case 'home':
      default:
        return (
          <HomePage
            onNavigateCompany={(slug) => handleNavigateCompany(slug)}
            onNavigateTab={handleNavigateTab}
            onOpenAuthModal={handleOpenAuthModal}
            onSelectBairro={handleSelectBairro}
            onSelectPraia={handleSelectPraia}
          />
        );
    }
  };

  if (!activeCompanySlug && !activeBairroSlug && !activePraiaSlug &&
    !activeInstitutional && !activeCampaignSlug && isAuthTab(currentTab)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        {renderContent()}
        <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
      </div>
    );
  }

  const isPanelRoute = !activeCompanySlug && !activeBairroSlug && !activePraiaSlug &&
    !activeInstitutional && !activeCampaignSlug && isPanelTab(currentTab);

  if (isPanelRoute) {
    return (
      <>
        {renderContent()}
        <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      <Header
        currentTab={currentTab}
        onNavigateTab={handleNavigateTab}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenAIModal={() => setIsAIModalOpen(true)}
      />
      <main className="flex-grow">
        {renderContent()}
      </main>
      <Footer onNavigateTab={handleNavigateTab} />
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </div>
  );
};
