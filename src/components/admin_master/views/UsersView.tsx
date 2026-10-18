/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Users Management View Component - Full CRUD
 */

import React, { useState } from 'react';
import { Users, Search, Plus, ShieldCheck, Lock, Unlock, Key, Trash2, Edit2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin_master' | 'advertiser' | 'user';
  status: 'active' | 'blocked' | 'inactive';
  lastAccess: string;
  createdAt: string;
}

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([
    {
      id: 'u_1',
      name: 'Administrador Master',
      email: 'admin@itapoa.online',
      phone: '(47) 99919-0413',
      role: 'admin_master',
      status: 'active',
      lastAccess: 'Hoje às 12:05',
      createdAt: '2026-01-01'
    },
    {
      id: 'u_2',
      name: 'Carlos Alberto (Maré Alta)',
      email: 'carlos@marealta.com',
      phone: '(47) 99888-1122',
      role: 'advertiser',
      status: 'active',
      lastAccess: 'Hoje às 10:42',
      createdAt: '2026-02-15'
    },
    {
      id: 'u_3',
      name: 'Juliana Costa (Néctar Sushi)',
      email: 'juliana@prime.com',
      phone: '(47) 99777-3344',
      role: 'advertiser',
      status: 'active',
      lastAccess: 'Ontem às 18:30',
      createdAt: '2026-03-10'
    },
    {
      id: 'u_4',
      name: 'Roberto Santos',
      email: 'roberto@email.com',
      phone: '(47) 99666-5544',
      role: 'user',
      status: 'blocked',
      lastAccess: 'Há 5 dias',
      createdAt: '2026-04-05'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'advertiser' as 'admin_master' | 'advertiser' | 'user'
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const created: UserAccount = {
      id: `u_${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      status: 'active',
      lastAccess: 'Nunca acessou',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([created, ...users]);
    setIsCreateOpen(false);
    setNewUser({ name: '', email: '', phone: '', role: 'advertiser' });
    showFeedback(`Usuário "${created.name}" cadastrado com sucesso!`);
  };

  const handleToggleBlock = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'blocked' ? 'active' : 'blocked';
        showFeedback(`Status do usuário "${u.name}" alterado para: ${nextStatus === 'blocked' ? 'BLOQUEADO' : 'ATIVO'}`);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showFeedback(`Usuário "${name}" excluído.`);
    }
  };

  const handleResetPassword = (email: string) => {
    showFeedback(`E-mail de redefinição de senha enviado para ${email}.`);
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão Global de Usuários & Permissões RBAC</h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle de perfis, alterações de senhas, permissões administrativas e logs de último acesso.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Usuário</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, e-mail ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">Todas as Roles</option>
            <option value="admin_master">Master Admin</option>
            <option value="advertiser">Anunciantes / Empresários</option>
            <option value="user">Usuários Comuns</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 uppercase font-bold text-[10px] text-slate-400">
              <tr>
                <th className="p-4">Usuário</th>
                <th className="p-4">E-mail / Telefone</th>
                <th className="p-4">Role / Permissão</th>
                <th className="p-4">Status</th>
                <th className="p-4">Último Acesso</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{user.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Cadastrado em {user.createdAt}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="block font-medium text-slate-200">{user.email}</span>
                    <span className="text-[10px] text-slate-400">{user.phone}</span>
                  </td>

                  <td className="p-4">
                    {user.role === 'admin_master' ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-950/80 text-red-300 border border-red-800 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#C8102E]" /> MASTER ADMIN
                      </span>
                    ) : user.role === 'advertiser' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                        EMPRESÁRIO / ANUNCIANTE
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                        USUÁRIO COMUM
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Bloqueado
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" /> {user.lastAccess}</span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        title="Resetar Senha"
                        className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleToggleBlock(user.id)}
                        title={user.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                        className={`p-2 rounded-lg transition ${
                          user.status === 'blocked' ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900' : 'bg-amber-950/60 text-amber-400 hover:bg-amber-900'
                        }`}
                      >
                        {user.status === 'blocked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>

                      {user.role !== 'admin_master' && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          title="Excluir Usuário"
                          className="p-2 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Usuário */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Cadastrar Novo Usuário</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={newUser.phone}
                  onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Role / Perfil de Acesso</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="advertiser">Empresário / Anunciante</option>
                  <option value="user">Usuário Comum</option>
                  <option value="admin_master">Master Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#C8102E] hover:bg-red-700 text-white font-bold rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
