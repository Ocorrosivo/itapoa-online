/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Digital Health Diagnostic Modal Component
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Company } from '../../../types';

interface DigitalHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onNavigateTab: (tab: string) => void;
}

export const DigitalHealthModal: React.FC<DigitalHealthModalProps> = ({
  isOpen,
  onClose,
  company,
  onNavigateTab
}) => {
  if (!isOpen || !company) return null;

  const checkList = [
    { label: 'Logomarca Comercial Cadastrada', ok: !!company.logo, points: 10, tab: 'profile' },
    { label: 'Imagem de Capa (Banner)', ok: !!company.coverImage, points: 10, tab: 'profile' },
    { label: 'Descrição Completa da Empresa', ok: !!company.description, points: 10, tab: 'profile' },
    { label: 'WhatsApp de Atendimento Verificado', ok: !!company.whatsapp, points: 15, tab: 'profile' },
    { label: 'Horários de Funcionamento', ok: !!company.hours, points: 10, tab: 'profile' },
    { label: 'Endereço Comercial & Mapa', ok: !!company.address, points: 10, tab: 'profile' },
    { label: 'Catálogo de Produtos Cadastrado', ok: (company.products?.length || 0) > 0, points: 15, tab: 'products' },
    { label: 'Redes Sociais Vinculadas (Instagram/Facebook)', ok: !!(company.instagram || company.facebook), points: 10, tab: 'profile' },
    { label: 'Nota Média de Avaliações Acima de 4.5', ok: (company.rating || 0) >= 4.5, points: 10, tab: 'reviews' }
  ];

  const totalScore = checkList.reduce((acc, item) => item.ok ? acc + item.points : acc, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Saúde Digital da Empresa</h3>
                <p className="text-xs text-slate-400">Diagnóstico de otimização para SEO e buscas locais</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Score Banner */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pontuação de Otimização</span>
                <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                  <span className="text-4xl font-black text-white">{totalScore}</span>
                  <span className="text-lg font-bold text-slate-400">/ 100 pts</span>
                </div>
                <p className="text-xs text-slate-300">
                  {totalScore >= 80 ? 'Sua empresa está super bem posicionada para o topo das buscas!' : 'Conclua as ações pendentes abaixo para subir no ranking de Itapoá.'}
                </p>
              </div>

              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/30 flex items-center justify-center p-2 shrink-0">
                <span className="text-xl font-black text-emerald-400">{totalScore}%</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist de Recomendações</h4>
              {checkList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (!item.ok) {
                      onNavigateTab(item.tab);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                    item.ok
                      ? 'bg-slate-800/30 border-slate-800 text-slate-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-white cursor-pointer hover:bg-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className="text-[10px] text-slate-400">+{item.points} pontos na nota final</span>
                    </div>
                  </div>

                  {!item.ok && (
                    <button className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300">
                      <span>Resolver em 1-Clique</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
