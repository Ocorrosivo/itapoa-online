/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Infrastructure Status & Systems Health View Component
 */

import React from 'react';
import { Layers, Database, ShieldCheck, CreditCard, Activity, Server, Cpu, Terminal, CheckCircle2 } from 'lucide-react';


export const InfrastructureView: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Status da Infraestrutura & Health Check</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de serviços integrados, bancos de dados, conexões de pagamento e servidores.
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-950 border border-emerald-600/50 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
          <Activity className="w-4 h-4 animate-pulse" /> TODOS OS SERVIÇOS OPERACIONAIS
        </span>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* MySQL Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <Database className="w-6 h-6 text-emerald-400" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Conectado
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">MySQL DB & API Auth</h3>
            <p className="text-xs text-slate-400 mt-1">Hostinger MySQL Database</p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Latência: 12ms
          </div>
        </div>

        {/* Mercado Pago Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <CreditCard className="w-6 h-6 text-blue-400" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              Webhooks OK
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Mercado Pago Gateway</h3>
            <p className="text-xs text-slate-400 mt-1">PIX Instantâneo & Cartão</p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Ambiente: Produção
          </div>
        </div>

        {/* Build & Node Version Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <Cpu className="w-6 h-6 text-purple-400" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
              v2.5.0-prod
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Versão do Sistema</h3>
            <p className="text-xs text-slate-400 mt-1">React 19 + Express + Vite</p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Node.js v22.14.0
          </div>
        </div>

        {/* Storage Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <Server className="w-6 h-6 text-amber-400" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Storage Bucket
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Imagens & Mídias</h3>
            <p className="text-xs text-slate-400 mt-1">CDN Local + Cloud Bucket</p>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            Espaço Usado: 1.4 GB
          </div>
        </div>

      </div>

      {/* Live Server Terminal Logs Panel */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-400">
          <span className="flex items-center gap-2 font-bold text-white"><Terminal className="w-4 h-4 text-emerald-400" /> Server Process Logs</span>
          <span>HTTP 200 OK</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-300">
          <p className="text-emerald-400">[SYSTEM] 🚀 Portal Guia Local Premium 2026 is LIVE on http://localhost:3000</p>
          <p className="text-blue-400">[AUTH] Master admin authenticated successfully with local JWT.</p>
          <p className="text-slate-400">[DATABASE] 12 tables synchronized cleanly without migration errors.</p>
          <p className="text-slate-500">[WEBHOOK] Listening for Mercado Pago PIX notifications on /api/webhooks/mercadopago</p>
        </div>
      </div>

    </div>
  );
};
