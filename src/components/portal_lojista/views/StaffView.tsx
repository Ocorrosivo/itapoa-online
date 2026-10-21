/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Equipe de Funcionários — gerenciar membros e funções com segurança
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Plus, Edit2, Trash2, X, Save, AlertCircle, Loader2,
  RefreshCw, Shield, ShieldOff, User
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface StaffMember {
  user_id: string;
  name?: string;
  email?: string;
  access_level?: string;
}

interface StaffViewProps {
  company: Company | null;
}

const ROLES = [
  { value: 'viewer', label: 'Visualizador', desc: 'Pode ver dados, sem editar.' },
  { value: 'editor', label: 'Editor', desc: 'Pode editar produtos, blog e cupons.' },
  { value: 'manager', label: 'Gerente', desc: 'Pode editar tudo exceto membros e plano.' },
];

export const StaffView: React.FC<StaffViewProps> = ({ company }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<StaffMember[]>(`/api/companies/${encodeURIComponent(company.id)}/staff`);
      setMembers(Array.isArray(res) ? res : []);
    } catch (err: any) {
      if ((err as any)?.status === 404) {
        setMembers([]);
      } else {
        setError(err?.message ?? 'Não foi possível carregar a equipe.');
      }
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) { setInviteError('E-mail é obrigatório.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteError('E-mail inválido.'); return; }
    setInviteBusy(true);
    setInviteError('');
    try {
      await api.post(`/api/companies/${encodeURIComponent(company!.id)}/staff`, {
        email: inviteEmail.trim(),
        access_level: inviteRole,
      });
      setInviteSuccess('Convite enviado! O funcionário precisa ter uma conta no Itapoá Online para aceitar.');
      setInviteEmail('');
      load();
    } catch (err: any) {
      setInviteError(err?.message ?? 'Não foi possível convidar o funcionário.');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remover este membro da equipe?')) return;
    setRemoveBusy(userId);
    try {
      await api.del(`/api/companies/${encodeURIComponent(company!.id)}/staff/${encodeURIComponent(userId)}`);
      load();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível remover o membro.');
    } finally {
      setRemoveBusy(null);
    }
  };

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Equipe de Funcionários</h1>
          <p className="text-xs text-slate-400 mt-1">Gerencie quem tem acesso ao painel desta empresa.</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Convidar membro
        </button>
      </div>

      {/* Security notice */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300">
          Funcionários não podem alterar o próprio nível de acesso nem gerenciar outros membros (somente o responsável principal pode). Nenhum membro pode acessar dados de outras empresas.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Convidar novo membro</h3>
          {inviteSuccess ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs">
              <Shield className="w-4 h-4 shrink-0" />{inviteSuccess}
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-3">
              {inviteError && (
                <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />{inviteError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">E-mail</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="funcionario@email.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Função</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {ROLES.find(r => r.value === inviteRole)?.desc}
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviteBusy}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition"
                >
                  {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Convidar
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">Nenhum funcionário na equipe</p>
          <p className="text-xs text-slate-400">Convide membros para ajudarem a gerenciar o painel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const isCurrentUser = member.user_id === user?.id;
            const roleInfo = ROLES.find(r => r.value === member.access_level);
            return (
              <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                    {(member.name ?? member.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {member.name ?? member.email ?? member.user_id}
                      {isCurrentUser && <span className="ml-2 text-[10px] text-blue-400 font-bold">(você)</span>}
                    </span>
                    {member.email && member.name && <span className="text-[11px] text-slate-400">{member.email}</span>}
                    <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                      member.access_level === 'manager' ? 'bg-purple-500/20 text-purple-400' :
                      member.access_level === 'editor' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-600 text-slate-300'
                    }`}>
                      {roleInfo?.label ?? member.access_level ?? 'Membro'}
                    </span>
                  </div>
                </div>
                {!isCurrentUser && (
                  <button
                    onClick={() => handleRemove(member.user_id)}
                    disabled={removeBusy === member.user_id}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded-xl transition"
                    title="Remover membro"
                  >
                    {removeBusy === member.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
