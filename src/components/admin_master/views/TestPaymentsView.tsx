/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Painel Executivo de Pagamentos de Teste Mercado Pago (Exclusivo Admin Master)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FlaskConical,
  Info,
  DollarSign
} from 'lucide-react';
import {
  TestPaymentClientService,
  TestPaymentConfig,
  TestPaymentItem,
  CreatedTestPix,
  CreatedTestCard
} from '../../../services/TestPaymentClientService';
import { MercadoPagoCard } from '../../common/MercadoPagoCard';
import { useAuth } from '../../../context/AuthContext';

export const TestPaymentsView: React.FC = () => {
  const { user } = useAuth();
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [config, setConfig] = useState<TestPaymentConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [history, setHistory] = useState<TestPaymentItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de confirmação para ambiente de produção
  const [showProdConfirmModal, setShowProdConfirmModal] = useState(false);

  // Estado do PIX
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<CreatedTestPix | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixChecking, setPixChecking] = useState(false);
  const [pixStatusMessage, setPixStatusMessage] = useState<string | null>(null);

  // Estado do Cartão
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardResult, setCardResult] = useState<CreatedTestCard | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  // Polling ref para PIX
  const pollingIntervalRef = useRef<any>(null);

  const fetchConfig = useCallback(async (env: 'sandbox' | 'production') => {
    setLoadingConfig(true);
    try {
      const res = await TestPaymentClientService.getConfig(env);
      setConfig(res);
    } catch (err: any) {
      console.error('[TestPayments] Erro ao carregar config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const items = await TestPaymentClientService.getHistory(50);
      setHistory(items);
    } catch (err: any) {
      console.error('[TestPayments] Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig(environment);
    fetchHistory();
  }, [environment, fetchConfig, fetchHistory]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Alternância de ambiente
  const handleEnvChange = (newEnv: 'sandbox' | 'production') => {
    if (newEnv === 'production') {
      setShowProdConfirmModal(true);
    } else {
      setEnvironment('sandbox');
      setPixData(null);
      setCardResult(null);
    }
  };

  const handleConfirmProduction = () => {
    setEnvironment('production');
    setShowProdConfirmModal(false);
    setPixData(null);
    setCardResult(null);
  };

  // 1. Gerar PIX de Teste (R$ 1,00)
  const handleGeneratePix = async () => {
    setPixLoading(true);
    setPixStatusMessage(null);
    try {
      const res = await TestPaymentClientService.createPix(
        environment,
        user?.email || 'admin@itapoa.online'
      );
      setPixData(res);
      fetchHistory();

      // Iniciar polling a cada 4 segundos para verificar se foi pago
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await TestPaymentClientService.getStatus(res.id);
          if (statusRes.status === 'approved') {
            setPixData(prev => prev ? { ...prev, status: 'approved' } : null);
            setPixStatusMessage('Pagamento PIX confirmado com sucesso pelo Mercado Pago!');
            clearInterval(pollingIntervalRef.current);
            fetchHistory();
          }
        } catch {
          // silencioso
        }
      }, 4000);
    } catch (err: any) {
      alert(`Falha ao gerar PIX de teste: ${err?.message || err}`);
    } finally {
      setPixLoading(false);
    }
  };

  // Verificar PIX manualmente
  const handleCheckPixStatus = async () => {
    if (!pixData?.id) return;
    setPixChecking(true);
    try {
      const res = await TestPaymentClientService.getStatus(pixData.id);
      setPixData(prev => prev ? { ...prev, status: res.status } : null);
      setPixStatusMessage(res.message || `Status atual: ${res.status}`);
      fetchHistory();
    } catch (err: any) {
      setPixStatusMessage(`Erro ao consultar status: ${err?.message || err}`);
    } finally {
      setPixChecking(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  // 2. Submissão do Cartão (R$ 2,50)
  const handleCardSubmit = async (cardFormData: Record<string, unknown>) => {
    setCardError(null);
    try {
      const res = await TestPaymentClientService.createCard(environment, cardFormData);
      setCardResult(res);
      fetchHistory();
    } catch (err: any) {
      setCardError(err?.message || 'Falha ao processar pagamento com cartão.');
      throw err;
    }
  };

  // Reconciliação avulsa do histórico
  const handleReconcileRow = async (id: string) => {
    try {
      const res = await TestPaymentClientService.getStatus(id);
      alert(`Resultado da consulta: ${res.message || res.status}`);
      fetchHistory();
    } catch (err: any) {
      alert(`Falha ao reconciliar: ${err?.message || err}`);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1.5">
              <FlaskConical className="w-3 h-3 text-blue-400" />
              Área Restrita — Administrador Master
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Pagamentos de Teste — Mercado Pago
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Ambiente exclusivo para testes de ponta a ponta do checkout e validação de webhooks.
            Nenhum plano comercial é alterado e nenhuma empresa recebe privilégios VIP como efeito colateral.
          </p>
        </div>

        {/* Seletor de Ambiente */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleEnvChange('sandbox')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              environment === 'sandbox'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🟡</span> Sandbox (Recomendado)
          </button>
          <button
            type="button"
            onClick={() => handleEnvChange('production')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              environment === 'production'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🟢</span> Produção (Transações Reais)
          </button>
        </div>
      </div>

      {/* Alerta de Modo de Operação */}
      {environment === 'production' ? (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-xs text-emerald-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-0.5">Modo de Transações Reais Ativo (Produção)</span>
            As cobranças emitidas nesta sessão utilizarão a conta oficial do Mercado Pago conectada ao portal com valores reduzidos de teste: <strong>R$ 1,00 para PIX</strong> e <strong>R$ 2,50 para Cartão</strong>. Valores cobrados serão liquidados no gateway.
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-0.5">Modo Sandbox Ativo por Padrão</span>
            Utilize cartões de teste e PIX de simulação fornecidos pelo Mercado Pago Developers. Nenhum valor real é cobrado.
          </div>
        </div>
      )}

      {/* Grid das 2 Opções de Preço de Teste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* OPÇÃO 1: PIX R$ 1,00 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> PIX Instantâneo
              </span>
              <span className="text-2xl font-black text-white">R$ 1,00</span>
            </div>

            <h3 className="text-lg font-black text-white">PIX de Teste</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Gera uma chave PIX Copia e Cola e QR Code emitidos diretamente pelo Mercado Pago com o valor exato de R$ 1,00 validado no servidor.
            </p>
          </div>

          {/* Resultado do PIX se gerado */}
          {pixData && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">QR Code PIX</span>
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  pixData.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}>
                  {pixData.status === 'approved' ? '✓ Aprovado / Pago' : 'Aguardando Pagamento'}
                </span>
              </div>

              {pixData.qrCodeBase64 ? (
                <div className="flex justify-center p-3 bg-white rounded-xl max-w-[200px] mx-auto shadow-inner">
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX Teste"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : null}

              {/* Copia e Cola */}
              {pixData.qrCode && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Código Copia e Cola
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixData.qrCode}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                    >
                      {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Message e Botão de Verificação */}
              {pixStatusMessage && (
                <p className="text-xs text-center text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  {pixStatusMessage}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                <span>Ref: #{pixData.gatewayReference}</span>
                <button
                  type="button"
                  onClick={handleCheckPixStatus}
                  disabled={pixChecking}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${pixChecking ? 'animate-spin' : ''}`} />
                  <span>Verificar Status</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGeneratePix}
            disabled={pixLoading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
          >
            {pixLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Cobrança PIX...</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>{pixData ? 'Gerar Novo PIX de Teste (R$ 1,00)' : 'Gerar PIX de Teste (R$ 1,00)'}</span>
              </>
            )}
          </button>
        </div>

        {/* OPÇÃO 2: CARTÃO R$ 2,50 */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Cartão de Crédito ou Débito
              </span>
              <span className="text-2xl font-black text-white">R$ 2,50</span>
            </div>

            <h3 className="text-lg font-black text-white">Cartão de Teste</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Integração oficial com o formulário seguro (Card Brick) do Mercado Pago.
              Permite escolher crédito ou débito conforme suporte do emissor. Não armazena dados de cartão.
            </p>
          </div>

          {/* Resultado de Aprovação do Cartão */}
          {cardResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Resultado do Processamento</span>
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  cardResult.status === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {cardResult.status === 'approved' ? '✓ Aprovado' : cardResult.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>Método: <strong className="text-white capitalize">{cardResult.paymentMethod.replace('_', ' ')}</strong></p>
                {cardResult.cardBrand && <p>Bandeira: <strong className="text-white uppercase">{cardResult.cardBrand}</strong></p>}
                {cardResult.cardLastFour && <p>Final do Cartão: <strong className="text-white">•••• {cardResult.cardLastFour}</strong></p>}
                <p>ID Mercado Pago: <strong className="text-white font-mono">#{cardResult.gatewayReference}</strong></p>
              </div>
            </div>
          )}

          {/* Erro de Cartão */}
          {cardError && (
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-xl text-xs text-rose-200">
              {cardError}
            </div>
          )}

          {/* Formulário do Card Brick */}
          {showCardForm && config?.publicKey ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Formulário Seguro Mercado Pago
                </span>
                <button
                  type="button"
                  onClick={() => setShowCardForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Recolher
                </button>
              </div>

              <MercadoPagoCard
                publicKey={config.publicKey}
                amount={2.50}
                email={user?.email || 'admin@itapoa.online'}
                onSubmit={handleCardSubmit}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCardForm(true);
                setCardResult(null);
                setCardError(null);
              }}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Abrir Checkout de Cartão (R$ 2,50)</span>
            </button>
          )}
        </div>

      </div>

      {/* Histórico e Auditoria de Pagamentos de Teste */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> Histórico de Transações de Teste
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro auditável de todas as tentativas criadas nesta seção.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Atualizar Tabela</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">ID Transação</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Ambiente</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ref. Mercado Pago</th>
                <th className="py-3 px-4">Data/Hora</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma transação de teste registrada até o momento.
                  </td>
                </tr>
              ) : (
                history.map(item => {
                  const isApproved = item.status === 'approved';
                  const isPending = item.status === 'pending';
                  const isRejected = ['rejected', 'cancelled', 'failed'].includes(item.status);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                        {item.id}
                      </td>
                      <td className="py-3 px-4 font-bold text-white capitalize">
                        {item.paymentMethod === 'pix' ? 'PIX' : item.paymentMethod.replace('_', ' ')}
                        {item.cardBrand && ` (${item.cardBrand.toUpperCase()})`}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        R$ {item.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.environment === 'production'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.environment}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-max ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isPending
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {item.gatewayReference ? `#${item.gatewayReference}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.createdAt}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleReconcileRow(item.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-bold rounded-lg text-[11px] transition"
                        >
                          Verificar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação Obrigatória para Ativação do Modo Produção */}
      {showProdConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">
                Confirmar Ativação de Transações Reais (Produção)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você está prestes a ativar o ambiente de produção do Mercado Pago para os pagamentos de teste.
              </p>
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 space-y-1">
                <p>• <strong>PIX:</strong> Gerará uma cobrança real de <strong>R$ 1,00</strong>.</p>
                <p>• <strong>Cartão:</strong> Processará uma cobrança real de <strong>R$ 2,50</strong>.</p>
                <p>• Os valores serão debitados do método de pagamento utilizado.</p>
                <p>• Nenhuma assinatura VIP será concedida a nenhuma empresa.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProdConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancelar (Manter Sandbox)
              </button>
              <button
                type="button"
                onClick={handleConfirmProduction}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg"
              >
                Sim, Ativar Transações Reais
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
