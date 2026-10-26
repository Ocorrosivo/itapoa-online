/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Blog da Empresa — CRUD completo com rascunho/publicar/despublicar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Edit2, Trash2, X, Save, AlertCircle,
  Loader2, RefreshCw, Eye, EyeOff, BookOpen
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company } from '../../../types';
import { SuccessPopup } from '../../common/SuccessPopup';

interface Post {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  status?: 'draft' | 'published';
  views?: number;
  authorId?: string;
  categoryId?: string;
  createdAt?: string;
  created_at?: string;
}

interface BlogViewProps {
  company: Company | null;
}

function BlogPostModal({
  post,
  companyId,
  onClose,
  onSaved,
}: {
  post: Post | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const genSlug = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const validate = () => {
    if (!title.trim()) return 'Título é obrigatório.';
    if (title.trim().length > 255) return 'Título muito longo.';
    if (content && content.trim().length > 100000) return 'Conteúdo excede o limite.';
    // Sanity: block obvious script injection
    if (/<script[\s>]/i.test(content)) return 'Scripts não são permitidos no conteúdo.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setBusy(true);
    setError('');
    try {
      const payload = {
        authorId: companyId,
        title: title.trim(),
        slug: genSlug(title.trim()),
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImage: coverImage.trim() || null,
        status,
      };
      if (isEdit) {
        await api.put(`/api/blog/${post!.id}`, payload);
      } else {
        await api.post('/api/blog', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar o post.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Editar Post' : 'Novo Post'}</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true); }}
              placeholder="Título do post"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resumo / Excerpt</label>
            <textarea
              rows={2}
              maxLength={500}
              value={excerpt}
              onChange={e => { setExcerpt(e.target.value); setDirty(true); }}
              placeholder="Breve resumo do post (aparece nas listas)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Conteúdo</label>
            <textarea
              rows={8}
              value={content}
              onChange={e => { setContent(e.target.value); setDirty(true); }}
              placeholder="Escreva o conteúdo do post aqui…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-y font-mono"
            />
            <p className="text-[10px] text-slate-500">Suporte a texto simples. Scripts e HTML não são executados.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">URL da imagem de capa</label>
            <input
              type="url"
              maxLength={1000}
              value={coverImage}
              onChange={e => { setCoverImage(e.target.value); setDirty(true); }}
              placeholder="https://…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <div className="flex gap-2">
              {(['draft', 'published'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(s); setDirty(true); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    status === s
                      ? s === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s === 'draft' ? 'Rascunho' : 'Publicado'}
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition shadow-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar' : 'Criar post'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const BlogView: React.FC<BlogViewProps> = ({ company }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Post | null | false>(false);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Post[]>(`/api/blog?authorId=${encodeURIComponent(company.id)}&limit=100`);
      setPosts(Array.isArray(res) ? res : []);
    } catch {
      setError('Não foi possível carregar os posts.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const filtered = posts.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.excerpt ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (post: Post) => {
    setToggleBusy(post.id);
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      await api.put(`/api/blog/${post.id}`, { status: newStatus });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    } catch {
      setError('Não foi possível alterar o status do post.');
    } finally {
      setToggleBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.del(`/api/blog/${deleteTarget.id}`);
      load();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível excluir.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Blog da Empresa</h1>
          <p className="text-xs text-slate-400 mt-1">Crie conteúdo que atrai clientes e melhora sua presença online.</p>
        </div>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo post
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar posts…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <button onClick={load} className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">{search ? 'Nenhum post encontrado' : 'Nenhum post criado ainda'}</p>
          <p className="text-xs text-slate-400">Comece a escrever sobre seu negócio para atrair mais clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-slate-700 transition">
              {post.coverImage && (
                <img src={post.coverImage} alt={post.title} className="w-20 h-16 object-cover rounded-xl shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate">{post.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    post.status === 'published'
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {post.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
                {post.excerpt && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{post.excerpt}</p>}
                <p className="text-[11px] text-slate-500 mt-1">
                  {post.views ?? 0} visualizações · {post.createdAt ? new Date(post.createdAt).toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleStatus(post)}
                  disabled={toggleBusy === post.id}
                  title={post.status === 'published' ? 'Despublicar' : 'Publicar'}
                  className={`p-2 rounded-xl transition ${
                    post.status === 'published'
                      ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                      : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {toggleBusy === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : post.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => setModal(post)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(post)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== false && (
        <BlogPostModal
          post={modal}
          companyId={company.id}
          onClose={() => setModal(false)}
          onSaved={() => {
            load();
            setSuccessMessage('Post salvo com sucesso!');
          }}
        />
      )}

      {successMessage && (
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-900/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">Excluir post "{deleteTarget.title}"?</h3>
            <p className="text-sm text-slate-300">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
              >
                {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
