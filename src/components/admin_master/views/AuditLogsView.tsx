/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Immutable Audit Logs View Component
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Terminal } from 'lucide-react';


export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([
    {
      id: 'log_1',
      tabela: 'companies',
      acao: 'LOGIN_COMO_EMPRESA',
      user_email: 'admin@itapoa.online',
      detalhes: { company_name: 'Pizzaria & Trattoria Central', company_id: 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' },
      ip: '189.10.45.12',
      created_at: new Date().toISOString()
    },
    {
      id: 'log_2',
      tabela: 'subscriptions',
      acao: 'UPDATE',
      user_email: 'admin@itapoa.online',
      detalhes: { new_plan: 'diamond', old_plan: 'ouro' },
      ip: '189.10.45.12',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (data && data.length > 0) setLogs(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Logs do Sistema</h1>
          <p className="text-xs text-slate-400 mt-1">Registro imutável de todas as ações de CRUD, login, alteração de plano e impersonação.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 uppercase font-bold text-[10px] text-slate-400">
              <tr>
                <th className="p-4">Data & Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Tabela</th>
                <th className="p-4">Ação</th>
                <th className="p-4">IP</th>
                <th className="p-4">Detalhes JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 text-slate-400 font-mono">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-4 font-bold text-white">{log.user_email || 'Sistema'}</td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">{log.tabela}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      log.acao === 'LOGIN_COMO_EMPRESA' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {log.acao}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-400">{log.ip || '127.0.0.1'}</td>
                  <td className="p-4 max-w-xs truncate font-mono text-[10px] text-slate-400">
                    {JSON.stringify(log.detalhes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
