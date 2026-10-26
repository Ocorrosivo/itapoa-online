/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Produtos & Serviços — CRUD completo do painel lojista
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, X, Save, Image, Eye, EyeOff,
  AlertCircle, CheckCircle2, Loader2, Filter, RefreshCw, Tag
} from 'lucide-react';
import { api, apiFetch } from '../../../lib/apiClient';
import { Company } from '../../../types';

interface Product {
  id: string;
  company_id?: string;
  companyId?: string;
  name: string;
  description: string;
  price?: number | null;
  image?: string | null;
  isActive?: boolean | number;
  created_at?: string;
  createdAt?: string;
}

interface ProductsViewProps {
  company: Company | null;
}

const ITEMS_PER_PAGE = 12;

function ProductModal({
  product,
  companyId,
  onClose,
  onSaved,
}: {
  product: Product | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [imageUrl, setImageUrl] = useState(product?.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome é obrigatório.';
    if (name.trim().length > 255) errs.name = 'Nome muito longo (máx 255).';
    if (price && isNaN(Number(price))) errs.price = 'Preço deve ser um número.';
    if (price && Number(price) < 0) errs.price = 'Preço não pode ser negativo.';
    return errs;
  };

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await apiFetch(`/api/upload?companyId=${encodeURIComponent(companyId)}`, {
        method: 'POST',
        headers: { 'x-company-id': companyId } as any,
        body: form
      });
      if (!res.ok) throw new Error('Falha no upload.');
      const data = await res.json();
      setImageUrl(data.url ?? data.path ?? '');
      setDirty(true);
    } catch {
      setError('Falha ao fazer upload da imagem.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        companyId,
        company_id: companyId,
        name: name.trim(),
        description: description.trim(),
        price: price ? Number(price) : null,
        image: imageUrl || null,
      };

      if (isEdit) {
        await api.put(`/api/products/${product!.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar o produto.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (dirty) {
      if (!confirm('Há alterações não salvas. Deseja sair mesmo assim?')) return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h2 id="product-modal-title" className="text-base font-bold text-white">
              {isEdit ? 'Editar Produto / Serviço' : 'Novo Produto / Serviço'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Image */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Imagem do produto
            </label>
            <div
              className="relative w-full h-36 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center cursor-pointer hover:border-blue-500 transition overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Prévia" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-xs text-white font-bold">Trocar imagem</span>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1">
                  <Image className="w-8 h-8 text-slate-500 mx-auto" />
                  <span className="text-xs text-slate-400">Clique para enviar imagem</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setDirty(true); handleUpload(file); }
              }}
            />
            {imageUrl && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => { setImageUrl(e.target.value); setDirty(true); }}
                  placeholder="Ou cole a URL da imagem"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setDirty(true); }}
                  className="text-slate-400 hover:text-red-400 p-2"
                  aria-label="Remover imagem"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="product-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Nome do produto / serviço <span className="text-red-400">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={e => { setName(e.target.value); setDirty(true); }}
              placeholder="Ex: Corte de cabelo masculino"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
            {fieldErrors.name && <p className="text-xs text-red-400">{fieldErrors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="product-desc" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Descrição
            </label>
            <textarea
              id="product-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={e => { setDescription(e.target.value); setDirty(true); }}
              placeholder="Descreva o produto ou serviço brevemente…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label htmlFor="product-price" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Preço (R$) — opcional
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => { setPrice(e.target.value); setDirty(true); }}
                placeholder="0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            {fieldErrors.price && <p className="text-xs text-red-400">{fieldErrors.price}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit as any}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition shadow-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await api.del(`/api/products/${product.id}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível excluir o produto.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-red-900/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Excluir produto</h3>
        </div>
        <p className="text-sm text-slate-300">
          Tem certeza que deseja excluir <strong className="text-white">"{product.name}"</strong>? Esta ação não pode ser desfeita.
        </p>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export const ProductsView: React.FC<ProductsViewProps> = ({ company }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalProduct, setModalProduct] = useState<Product | null | false>(false); // false = closed, null = new
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadProducts = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const companyId = company.id;
      const res = await api.get<Product[]>(`/api/products?company_id=${encodeURIComponent(companyId)}&limit=200`);
      setProducts(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleToggleActive = async (product: Product) => {
    setToggleBusy(product.id);
    try {
      const newActive = !product.isActive;
      await api.put(`/api/products/${product.id}`, {
        companyId: company?.id,
        company_id: company?.id,
        isActive: newActive ? 1 : 0,
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newActive } : p));
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível alterar o status.');
    } finally {
      setToggleBusy(null);
    }
  };

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Produtos &amp; Serviços</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie o catálogo que aparece no seu mini-site.
            {products.length > 0 && <span className="ml-1 text-emerald-400 font-bold">{products.length} item(s) cadastrado(s)</span>}
          </p>
        </div>
        <button
          onClick={() => setModalProduct(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo produto / serviço
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome ou descrição…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={loadProducts}
          className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition"
          title="Recarregar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={loadProducts} className="ml-auto underline">Tentar novamente</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-sm text-slate-400">Carregando produtos…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Package className="w-8 h-8 text-slate-500" />
          </div>
          <div>
            <p className="text-base font-bold text-white">
              {search ? 'Nenhum resultado para a busca' : 'Nenhum produto cadastrado'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Tente outros termos ou limpe o filtro.' : 'Cadastre seu primeiro produto ou serviço para aparecer no mini-site.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setModalProduct(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Cadastrar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(product => {
              const isActive = product.isActive === true || product.isActive === 1;
              return (
                <div
                  key={product.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden shadow flex flex-col transition ${isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}
                >
                  {/* Image */}
                  <div className="w-full h-36 bg-slate-800 relative overflow-hidden shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-600" />
                      </div>
                    )}
                    {!isActive && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 rounded-full text-[10px] font-bold text-slate-400">
                        Inativo
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 space-y-2">
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{product.description}</p>
                    )}
                    {product.price != null && (
                      <div className="flex items-center gap-1 text-emerald-400 text-sm font-black">
                        <Tag className="w-3 h-3" />
                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={toggleBusy === product.id}
                      title={isActive ? 'Desativar' : 'Ativar'}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition ${
                        isActive
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                      }`}
                    >
                      {toggleBusy === product.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <><EyeOff className="w-3.5 h-3.5" />Desativar</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" />Ativar</>
                      )}
                    </button>
                    <button
                      onClick={() => setModalProduct(product)}
                      className="p-2 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      className="p-2 bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-xl transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl disabled:opacity-40 transition"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-400">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl disabled:opacity-40 transition"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {modalProduct !== false && (
        <ProductModal
          product={modalProduct}
          companyId={company.id}
          onClose={() => setModalProduct(false)}
          onSaved={() => {
            loadProducts();
            setSuccessMessage('As informações do produto ou serviço foram salvas com sucesso!');
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadProducts}
        />
      )}

      {/* POPUP DE SUCESSO */}
      {successMessage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setSuccessMessage('')}
        >
          <div 
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">Salvo com Sucesso!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs transition shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
