/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AI Intelligence Assistant Modal Component
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, ArrowRight } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { AiService } from '../../services/aiService';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateCompany: (slug: string) => void;
}

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onNavigateCompany }) => {
  const { companies, categories } = useCompany();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; recs?: any[] }>>([
    {
      sender: 'ai',
      text: 'Olá! Sou o Assistente Inteligente de Itapoá 🤖. Como posso te ajudar hoje? Pergunte por restaurantes, hotéis pet friendly, praias calmas ou serviços locais!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const result = await AiService.askAssistant(userText, companies, categories, []);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: result.answer,
          recs: result.recommendations
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Desculpe, ocorreu um erro ao consultar nosso guia inteligente. Tente novamente!'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Assistente Inteligente SaaS
                </h3>
                <p className="text-xs text-slate-400">Respostas em tempo real sobre o comércio de Itapoá</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.recs && m.recs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {m.recs.map((rec, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (rec.link) {
                              const slug = rec.link.replace('/empresa/', '');
                              onNavigateCompany(slug);
                              onClose();
                            }
                          }}
                          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 rounded-xl p-3 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-400 group-hover:text-blue-300">
                                {rec.title}
                              </span>
                              {rec.badge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                                  {rec.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{rec.description}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition transform group-hover:translate-x-1" />
                        </div>
                      ))}
                    </div>
                  )}
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
                <Sparkles className="w-4 h-4 animate-spin text-blue-400" />
                Consultando banco de dados do guia...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte algo ao guia inteligente..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition shadow-lg flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
