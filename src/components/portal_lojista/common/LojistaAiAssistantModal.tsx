/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista AI Assistant Modal Component
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, Copy, Check } from 'lucide-react';
import { Company } from '../../../types';

interface LojistaAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export const LojistaAiAssistantModal: React.FC<LojistaAiAssistantModalProps> = ({
  isOpen,
  onClose,
  company
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Olá! 🪄 Sou o assistente de inteligência artificial da sua empresa ${company?.name || 'comercial'}. Posso criar descrições irresistíveis de produtos, gerar anúncios para o Instagram, elaborar artigos de blog ou responder avaliações de clientes!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: prompt }]);
    setLoading(true);

    setTimeout(() => {
      let answer = '';
      const p = prompt.toLowerCase();

      if (p.includes('produto') || p.includes('descrição')) {
        answer = `✨ **Descrição Comercial Sugerida para Produto:**\n\n"Descubra a combinação perfeita de sabor e qualidade com o nosso ${prompt.replace(/crie|gerar|descrição|produto/gi, '').trim() || 'produto especial'}. Preparado artesanalmente com ingredientes selecionados de Itapoá, este item é ideal para momentos inesquecíveis. Peça pelo WhatsApp e receba rápido!"`;
      } else if (p.includes('post') || p.includes('instagram') || p.includes('legenda')) {
        answer = `📸 **Sugestão de Legenda para Instagram / Redes:**\n\n"Quem mais concorda que um dia em Itapoá combina perfeitamente com ${company?.name}? 🌊☀️ Venha experimentar nossos pratos e novidades! Acesse nosso mini-site no link da bio para cupons exclusivos. #ItapoáSC #GuiaComercial #${company?.name?.replace(/\s+/g, '')}"`;
      } else if (p.includes('avaliação') || p.includes('review') || p.includes('resposta')) {
        answer = `⭐ **Sugestão de Tréplica Profissional:**\n\n"Olá! Agradecemos imensamente pelo seu carinho e avaliação positiva. Trabalhamos todos os dias para entregar a melhor experiência em Itapoá. Esperamos ver você novamente em breve na ${company?.name}!"`;
      } else {
        answer = `💡 **Estratégia Recomendada para ${company?.name}:**\n- Publique uma promoção relâmpago de 10% OFF esta semana no catálogo.\n- Adicione fotos em alta resolução no mini-site.\n- Ative as palavras-chave de SEO local na aba de configurações.`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: answer }]);
      setLoading(false);
    }, 700);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[min(580px,calc(100dvh-2rem))] min-h-0"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Assistente de IA do Lojista</h3>
                <p className="text-xs text-slate-400">Geração automática de conteúdos, textos de vendas e respostas</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3 min-w-0 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className={`relative max-w-[80%] rounded-2xl p-4 text-sm min-w-0 overflow-hidden break-words ${
                  m.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed break-words">{m.text}</p>
                  {m.sender === 'ai' && idx > 0 && (
                    <button
                      onClick={() => handleCopy(m.text, idx)}
                      className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIndex === idx ? 'Copiado!' : 'Copiar Conteúdo'}</span>
                    </button>
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
                Criando conteúdo inteligente...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ex: Crie a descrição de uma pizza artesanal / Legenda Instagram..."
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
