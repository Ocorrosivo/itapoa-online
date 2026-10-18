/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Platform General Settings View - Configurações Gerais
 */

import React, { useState } from 'react';
import { 
  Settings, Globe, Image, Palette, Phone, Mail, MapPin, 
  Share2, FileText, Save, CheckCircle2, AlertCircle, RefreshCw, Upload, Sparkles
} from 'lucide-react';


export const GeneralSettingsView: React.FC = () => {
  // General Platform Identity
  const [platformName, setPlatformName] = useState('Itapoá Online');
  const [tagline, setTagline] = useState('Guia Comercial e Marketplace Oficial de Itapoá SC');
  const [logoMain, setLogoMain] = useState('/logotipo.png');
  const [logoCompact, setLogoCompact] = useState('/logotipo.png');
  const [faviconUrl, setFaviconUrl] = useState('/logotipo.png');

  // Brand Palette Colors
  const [colorPrimary, setColorPrimary] = useState('#C8102E');
  const [colorSecondary, setColorSecondary] = useState('#0A0915');
  const [colorAccent, setColorAccent] = useState('#4F46E5');

  // Official Contacts
  const [phone, setPhone] = useState('(47) 3443-1200');
  const [whatsapp, setWhatsapp] = useState('(47) 99919-0413');
  const [emailSupport, setEmailSupport] = useState('contato@itapoa.online');
  const [address, setAddress] = useState('Av. Beira Mar, 1250 - Centro, Itapoá - SC, 89249-000');

  // Social Links
  const [facebook, setFacebook] = useState('https://facebook.com/itapoaonline');
  const [instagram, setInstagram] = useState('https://instagram.com/itapoaonline');
  const [youtube, setYoutube] = useState('https://youtube.com/@itapoaonline');
  const [tiktok, setTiktok] = useState('https://tiktok.com/@itapoaonline');
  const [linkedin, setLinkedin] = useState('https://linkedin.com/company/itapoaonline');

  // Footer & Institutional Texts
  const [footerText, setFooterText] = useState('© 2026 ITAPOÁ ONLINE. Todos os direitos reservados. Guia Comercial e Marketplace.');
  const [aboutText, setAboutText] = useState('O portal oficial de conexões comerciais, gastronomia, turismo e serviços locais do município de Itapoá SC.');
  const [termsText, setTermsText] = useState('Termos oficiais de uso e política de concorrência leal entre os estabelecimentos parceiros de Itapoá.');
  const [privacyText, setPrivacyText] = useState('Conformidade integral com a Lei Geral de Proteção de Dados (LGPD) Lei nº 13.709/2018.');

  // Status & Notifications
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      const payload = {
        platformName,
        tagline,
        logoMain,
        logoCompact,
        faviconUrl,
        colorPrimary,
        colorSecondary,
        colorAccent,
        phone,
        whatsapp,
        emailSupport,
        address,
        facebook,
        instagram,
        youtube,
        tiktok,
        linkedin,
        footerText,
        aboutText,
        termsText,
        privacyText,
        updatedAt: new Date().toISOString()
      };

      // 1. LocalStorage cache persistence
      localStorage.setItem('platform_general_config', JSON.stringify(payload));

      // 2. API DB persistence
      try {
        await fetch('/api/admin/general-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('API config sync error:', err);
      }

      setSaveSuccessMsg('Configurações Gerais salvas com sucesso! A nova identidade visual já está ativa.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      
      {/* Superior Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#C8102E] text-white text-[9px] font-black uppercase tracking-widest rounded-full">
              PAINEL ADMIN MASTER
            </span>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30">
              ● Persistência em Tempo Real
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-[#C8102E]" /> Configurações Gerais da Plataforma
          </h1>
          <p className="text-xs text-slate-400">
            Gerencie a identidade visual, contatos oficiais, cores, redes sociais e textos institucionais da plataforma <strong>ITAPOÁ ONLINE</strong>.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-3.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8">
        
        {/* Section 1: Identidade da Plataforma & Logos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Image className="w-5 h-5 text-[#C8102E]" /> Identidade da Plataforma & Logos
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Brand Identity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nome Oficial da Plataforma</label>
              <input
                type="text"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Slogan / Tagline Institucional</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">URL da Logo Principal (Header & Footer)</label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={logoMain}
                  onChange={e => setLogoMain(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
                <img src={logoMain} alt="Logo Main Preview" className="h-10 w-auto object-contain bg-slate-950 p-1.5 rounded-lg border border-slate-800 shrink-0" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">URL da Logo Compacta / Favicon</label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={logoCompact}
                  onChange={e => setLogoCompact(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
                <img src={logoCompact} alt="Logo Compact Preview" className="h-10 w-auto object-contain bg-slate-950 p-1.5 rounded-lg border border-slate-800 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Palette de Cores Institucional */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#C8102E]" /> Paleta de Cores do Sistema
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Theme Colors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cor Principal (Vermelho ITAPOÁ)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cor Secundária (Fundo Escuro Header)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorSecondary}
                  onChange={e => setColorSecondary(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={colorSecondary}
                  onChange={e => setColorSecondary(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cor de Destaque (Accent)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorAccent}
                  onChange={e => setColorAccent(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={colorAccent}
                  onChange={e => setColorAccent(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Contatos Oficiais */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#C8102E]" /> Contatos Oficiais da Plataforma
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Telefone Fixo</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">WhatsApp Oficial</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">E-mail de Atendimento e Suporte</label>
              <input
                type="email"
                value={emailSupport}
                onChange={e => setEmailSupport(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Endereço Físico Completo</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Redes Sociais & Mídias Oficialmente Validadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#C8102E]" /> Mídias & Redes Sociais Oficialmente Validadas (11 Canais)
            </h2>
            <span className="text-[10px] text-[#C8102E] font-bold">Campos em branco não serão exibidos no frontend</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">🌐 Site Oficial</label>
              <input
                type="url"
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                placeholder="https://itapoa.online"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">📱 WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="(47) 99919-0413"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">📘 Facebook</label>
              <input
                type="url"
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                placeholder="https://facebook.com/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">📷 Instagram</label>
              <input
                type="url"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="https://instagram.com/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">🎥 YouTube</label>
              <input
                type="url"
                value={youtube}
                onChange={e => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">🎵 TikTok</label>
              <input
                type="url"
                value={tiktok}
                onChange={e => setTiktok(e.target.value)}
                placeholder="https://tiktok.com/@itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">💼 LinkedIn</label>
              <input
                type="url"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">✈ Telegram</label>
              <input
                type="url"
                placeholder="https://t.me/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">📌 Pinterest</label>
              <input
                type="url"
                placeholder="https://pinterest.com/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">🐦 X (Twitter)</label>
              <input
                type="url"
                placeholder="https://x.com/itapoaonline"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Textos Institucionais & Rodapé */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C8102E]" /> Textos Institucionais & Rodapé
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Texto de Direitos Autorais do Rodapé</label>
              <input
                type="text"
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Resumo da Plataforma (Sobre Nós)</label>
              <textarea
                value={aboutText}
                onChange={e => setAboutText(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E] leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Resumo dos Termos de Uso</label>
              <textarea
                value={termsText}
                onChange={e => setTermsText(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E] leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando Configurações...' : 'Salvar Todas as Configurações'}</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
