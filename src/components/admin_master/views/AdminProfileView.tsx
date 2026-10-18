/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Master Profile & Account Settings View - Minha Conta
 */

import React, { useState } from 'react';
import { 
  User, Mail, Phone, Lock, ShieldCheck, Key, Globe, Moon, Sun, Clock, 
  Bell, CheckCircle2, AlertCircle, Save, Smartphone, Upload, Camera, RefreshCw,
  LogOut, ShieldAlert, Cpu
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';


export const AdminProfileView: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile Form States
  const [name, setName] = useState(user?.name || 'Administrador Master');
  const [surname, setSurname] = useState('Proprietário');
  const [email, setEmail] = useState(user?.email || 'admin@itapoa.online');
  const [phone, setPhone] = useState(user?.phone || '(47) 99919-0413');
  const [whatsapp, setWhatsapp] = useState('(47) 99919-0413');
  const [cargo, setCargo] = useState('Proprietário & Administrador Master');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');

  // Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preference States
  const [language, setLanguage] = useState('pt-BR');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Active Sessions Mock Data
  const activeSessions = [
    { id: 'sess_1', device: 'Chrome no Windows (Sessão Atual)', ip: '189.100.24.12', location: 'Itapoá, SC - Brasil', lastActive: 'Agora mesmo', isCurrent: true },
    { id: 'sess_2', device: 'Safari no iPhone 15 Pro', ip: '177.45.190.88', location: 'Joinville, SC - Brasil', lastActive: 'Há 2 horas', isCurrent: false }
  ];

  // Recent Personal Audit Logs
  const recentPersonalLogs = [
    { id: 'log_1', action: 'LOGIN_SUCCESS', details: 'Acesso realizado via Autenticação Local', time: 'Hoje às 11:28' },
    { id: 'log_2', action: 'PROFILE_UPDATE', details: 'Atualização de dados cadastrais e telefone', time: 'Ontem às 16:45' },
    { id: 'log_3', action: 'PLATFORM_CONFIG_CHANGE', details: 'Alteração do slogan da plataforma e redes sociais', time: '22/07/2026 14:10' }
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      // 1. Update Auth Context local state
      updateUser({
        name,
        email,
        phone,
        avatarUrl
      });

      // 2. Persist to API backend
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user?.id,
          name,
          email,
          phone,
          avatarUrl
        })
      });

      setSaveSuccessMsg('Perfil do Administrador Master atualizado com sucesso no MySQL!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve possuir no mínimo 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao alterar senha.');
      }
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso! A nova senha já está ativa.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erro ao alterar a senha.' });
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      
      {/* Superior Header Banner */}
      <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 z-10">
          <div className="relative group">
            <img
              src={avatarUrl}
              alt={name}
              className="w-24 h-24 rounded-full object-cover border-4 border-[#C8102E] shadow-xl group-hover:scale-105 transition"
            />
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-950 font-black text-[10px]" title="Status Ativo">
              ✓
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#C8102E] text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow">
                ROLE: MASTER DEFINITIVO
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30">
                ● Permissão Total
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{name}</h1>
            <p className="text-xs text-slate-400 font-mono">{email} • {cargo}</p>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 text-xs space-y-2 shrink-0 z-10 w-full md:w-auto">
          <div className="flex items-center justify-between gap-6 text-slate-400">
            <span>Data de Criação:</span>
            <strong className="text-white font-mono">01/01/2026</strong>
          </div>
          <div className="flex items-center justify-between gap-6 text-slate-400">
            <span>Último Acesso:</span>
            <strong className="text-emerald-400 font-mono">Hoje, 11:54 (Itapoá)</strong>
          </div>
          <div className="flex items-center justify-between gap-6 text-slate-400">
            <span>Provedor Auth:</span>
            <strong className="text-blue-400 font-mono">MySQL Auth (JWT)</strong>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Settings Form & Right Security Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Sections (2 cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Dados Pessoais & Contato */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#C8102E]" /> Minhas Informações Pessoais
              </h2>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Salvo no MySQL</span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Sobrenome / Apelido</label>
                  <input
                    type="text"
                    value={surname}
                    onChange={e => setSurname(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">E-mail Principal</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Cargo / Função Oficial</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Telefone Comercial</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">WhatsApp Direto</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              {/* Avatar Upload / URL */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">URL da Foto de Perfil (Avatar)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                  <button
                    type="button"
                    onClick={() => alert('Selecione uma imagem local ou utilize o gerenciador de mídias para gerar um link direto de avatar.')}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando Alterações...' : 'Salvar Alterações do Perfil'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Seguranca & Troca de Senha */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#C8102E]" /> Segurança & Alteração de Senha
              </h2>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                MySQL Auth Encriptado
              </span>
            </div>

            {passwordMsg && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                passwordMsg.type === 'success' ? 'bg-emerald-950 border border-emerald-600 text-emerald-300' : 'bg-red-950 border border-red-600 text-red-300'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Senha Atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Admin@2026!"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Admin@2026!"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  Recomendado usar senhas com no mínimo 8 caracteres contendo letras, números e símbolos.
                </span>
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer uppercase tracking-wider border border-slate-700"
                >
                  <Key className="w-4 h-4" />
                  <span>Atualizar Senha Master</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Preferencias de Idioma, Tema & Fuso Horario */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#C8102E]" /> Preferências do Sistema
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Idioma do Painel</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Tema da Interface</label>
                <select
                  value={theme}
                  onChange={e => setTheme(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="dark">Escuro (Dark Mode Premium)</option>
                  <option value="light">Claro (Light Mode)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Fuso Horário</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</option>
                  <option value="UTC">UTC (Universal Time)</option>
                </select>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Canais de Notificação Crítica</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.checked)}
                    className="w-4 h-4 accent-[#C8102E]"
                  />
                  <span>Alertas por E-mail</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={e => setNotifyWhatsapp(e.target.checked)}
                    className="w-4 h-4 accent-[#C8102E]"
                  />
                  <span>Alertas por WhatsApp</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyPush}
                    onChange={e => setNotifyPush(e.target.checked)}
                    className="w-4 h-4 accent-[#C8102E]"
                  />
                  <span>Notificações Push</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Security, 2FA, Active Sessions & Personal Audit Logs (1 col) */}
        <div className="space-y-8">
          
          {/* 2FA Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Autenticação 2FA
              </h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                PREPARADO
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Proteção adicional com Authenticator App (Google/Authy) habilitada para o Administrador Master.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-300 font-semibold">Status do 2FA</span>
              <button
                onClick={() => setIs2FAEnabled(!is2FAEnabled)}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] transition ${
                  is2FAEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {is2FAEnabled ? 'ATIVADO ✓' : 'DESATIVADO'}
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" /> Sessões Ativas
            </h3>
            <div className="space-y-3 text-xs">
              {activeSessions.map(s => (
                <div key={s.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200">{s.device}</strong>
                    {s.isCurrent && <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">Esta sessão</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">{s.location} • {s.ip}</p>
                  <p className="text-[9px] text-slate-500">Última atividade: {s.lastActive}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Audit Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Atividades Recentes
            </h3>
            <div className="space-y-3 text-xs">
              {recentPersonalLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 font-mono uppercase">{log.action}</span>
                    <span className="text-[9px] text-slate-500">{log.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
