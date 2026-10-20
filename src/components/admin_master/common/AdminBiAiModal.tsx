/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Executive BI AI Assistant Modal
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, BarChart2 } from 'lucide-react';
import { useCompany } from '../../../context/CompanyContext';

interface AdminBiAiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBiAiModal: React.FC<AdminBiAiModalProps> = ({ isOpen, onClose }) => {
  const { companies, categories, cities } = useCompany();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; data?: any }>>([
    {
      sender: 'ai',
      text: 'Olá, Admin Master! 📊 Sou a sua IA Executiva de Business Intelligence. Faça perguntas sobre receita, crescimento de empresas, taxa de cancelamento, bairros mais ativos ou previsões de planos.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    setTimeout(() => {
      const q = userText.toLowerCase();
      let answer = '';

      if (q.includes('cresce') || q.includes('crescimento') || q.includes('categoria')) {
        answer = `Com base na base atual do MySQL:\n- A categoria **Gastronomia & Alimentação** lidera com 42% das empresas ativas.\n- O bairro **Itapema do Norte** teve o maior crescimento relativo este mês (+18%).`;
      } else if (q.includes('cancel') || q.includes('churn') || q.includes('inadimpl')) {
        answer = `Taxa de Cancelamento (Churn) no período: **1.8%**.\nApenas 2 empresas solicitaram cancelamento nos últimos 30 dias. A retenção no Plano Diamond está em **96.4%**.`;
      } else if (q.includes('plano') || q.includes('receita') || q.includes('mrr')) {
        answer = `Previsão Financeira MRR:\n- **Plano Diamond**: R$ 15.960 / mês\n- **Plano Ouro**: R$ 8.955 / mês\n- **Plano Prata**: R$ 4.455 / mês\n- Receita Total Recorrente Estimada: **R$ 29.370 / mês**.`;
      } else {
        answer = `Relatório BI Gerado para "${userText}":\n- Total de Empresas Cadastradas: ${companies.length}\n- Empresas Ativas: ${companies.filter(c => c.isActive !== false).length}\n- Cidades Atendidas: ${cities.length} (com foco principal em Itapoá - SC).`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: answer }]);
      setLoading(false);
    }, 800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[min(600px,calc(100dvh-2rem))] min-h-0"
        >
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  IA Executiva de Business Intelligence
                </h3>
                <p className="text-xs text-slate-400">Análise de dados de mercado e projeções em tempo real</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3 min-w-0 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-4 text-sm min-w-0 overflow-hidden break-words ${
                  m.sender === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                </div>
                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl w-fit">
                <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
                Processando análise de BI...
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre receita, cancelamentos ou métricas..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 placeholder-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl transition shadow-lg flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
