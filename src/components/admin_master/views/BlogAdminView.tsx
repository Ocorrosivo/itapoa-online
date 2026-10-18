/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Blog Administrative & Smart SEO Publication Assistant View Component
 */

import React, { useState } from 'react';
import { 
  FileText, Search, Plus, Sparkles, CheckCircle2, AlertCircle, 
  Eye, Edit2, Trash2, Globe, Share2, Layers, Check, X, Code2, 
  HelpCircle, ArrowRight, BookOpen, Link, Tag as TagIcon, Layout, ShieldCheck
} from 'lucide-react';
import { BlogPost } from '../../../types';
import { BlogSeoAssistantService, SeoAnalysisReport } from '../../../services/blogSeoAssistantService';

export const BlogAdminView: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([
    {
      id: 'post_1',
      title: 'Os 10 Melhores Restaurentes de Itapoá SC para Visitar em 2026',
      slug: '10-melhores-restaurantes-de-itapoa-sc-2026',
      excerpt: 'Descubra a gastronomia local de Itapoá com peixes frescos, sushis artesanais e moquecas à beira-mar.',
      content: BlogSeoAssistantService.getRecommendedArticleTemplate('Os 10 Melhores Restaurentes de Itapoá SC para Visitar em 2026'),
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      category: 'Gastronomia',
      authorName: 'Redação Itapoá Online',
      views: 1420,
      tags: ['Itapoá', 'Gastronomia', 'Restaurantes', 'Turismo'],
      comments: [],
      createdAt: '2026-07-20',
      metaTitle: 'Os 10 Melhores Restaurentes de Itapoá SC | Guia Oficial 2026',
      metaDescription: 'Descubra a gastronomia local de Itapoá com peixes frescos, sushis artesanais e moquecas à beira-mar. Confira o guia no Itapoá Online.',
      ogTitle: 'Os 10 Melhores Restaurentes de Itapoá SC para Visitar em 2026',
      ogDescription: 'Guia completo de restaurantes gourmet e quiosques à beira-mar em Itapoá SC.',
      twitterTitle: 'Top 10 Restaurantes em Itapoá SC',
      twitterDescription: 'Confira os restaurantes mais bem avaliados em Itapoá SC.',
      imageAlt: 'Restaurante gourmet em Itapoá SC à beira-mar',
      imageFilename: '10-melhores-restaurantes-itapoa-sc.jpg',
      canonicalUrl: 'https://itapoa.online/blog/10-melhores-restaurantes-de-itapoa-sc-2026',
      suggestedKeywords: ['Itapoá SC', 'Restaurantes', 'Gastronomia Local'],
      readingTimeMinutes: 4
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'google' | 'facebook' | 'twitter' | 'schema'>('google');
  const [saveFeedbackMsg, setSaveFeedbackMsg] = useState('');

  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase()));

  // Live SEO Analysis of current editing post
  const seoReport: SeoAnalysisReport = BlogSeoAssistantService.analyzeSeo(editingPost || {});

  const handleOpenCreate = () => {
    const initialTitle = 'Novo Artigo sobre Itapoá SC';
    const suggestions = BlogSeoAssistantService.generateAutoSuggestions(initialTitle, '');

    setEditingPost({
      id: `post_${Date.now()}`,
      title: initialTitle,
      slug: suggestions.slug,
      excerpt: 'Resumo inicial do novo artigo...',
      content: BlogSeoAssistantService.getRecommendedArticleTemplate(initialTitle),
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      category: 'Notícias',
      authorName: 'Redação Itapoá Online',
      views: 0,
      tags: suggestions.suggestedTags,
      comments: [],
      createdAt: new Date().toISOString().split('T')[0],
      metaTitle: suggestions.metaTitle,
      metaDescription: suggestions.metaDescription,
      ogTitle: suggestions.ogTitle,
      ogDescription: suggestions.ogDescription,
      twitterTitle: suggestions.twitterTitle,
      twitterDescription: suggestions.twitterDescription,
      imageAlt: suggestions.imageAlt,
      imageFilename: suggestions.imageFilename,
      canonicalUrl: suggestions.canonicalUrl,
      suggestedKeywords: suggestions.suggestedKeywords,
      internalLinks: suggestions.internalLinks,
      externalLinks: suggestions.externalLinks,
      readingTimeMinutes: suggestions.readingTimeMinutes,
      schemaJson: suggestions.schemaJson
    });
  };

  const handleAutoGenerateSeo = () => {
    if (!editingPost) return;

    const suggestions = BlogSeoAssistantService.generateAutoSuggestions(
      editingPost.title || '',
      editingPost.content || '',
      editingPost.category,
      editingPost.imageUrl
    );

    setEditingPost(prev => ({
      ...prev,
      slug: suggestions.slug,
      metaTitle: suggestions.metaTitle,
      metaDescription: suggestions.metaDescription,
      ogTitle: suggestions.ogTitle,
      ogDescription: suggestions.ogDescription,
      twitterTitle: suggestions.twitterTitle,
      twitterDescription: suggestions.twitterDescription,
      imageAlt: suggestions.imageAlt,
      imageFilename: suggestions.imageFilename,
      canonicalUrl: suggestions.canonicalUrl,
      suggestedKeywords: suggestions.suggestedKeywords,
      tags: Array.from(new Set([...(prev?.tags || []), ...suggestions.suggestedTags])),
      readingTimeMinutes: suggestions.readingTimeMinutes,
      internalLinks: suggestions.internalLinks,
      externalLinks: suggestions.externalLinks,
      schemaJson: suggestions.schemaJson
    }));

    setSaveFeedbackMsg('✨ Sugestões de SEO geradas automaticamente! Você pode revisar ou alterar qualquer informação.');
    setTimeout(() => setSaveFeedbackMsg(''), 4000);
  };

  const handleInsertStructureTemplate = () => {
    if (!editingPost) return;

    const template = BlogSeoAssistantService.getRecommendedArticleTemplate(editingPost.title || '');
    setEditingPost(prev => ({ ...prev, content: template }));
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const completePost: BlogPost = {
      id: editingPost.id || `post_${Date.now()}`,
      title: editingPost.title || 'Artigo sem título',
      slug: editingPost.slug || BlogSeoAssistantService.generateSlug(editingPost.title || 'artigo'),
      excerpt: editingPost.excerpt || '',
      content: editingPost.content || '',
      imageUrl: editingPost.imageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      category: editingPost.category || 'Geral',
      authorName: editingPost.authorName || 'Redação Itapoá Online',
      views: editingPost.views || 0,
      tags: editingPost.tags || ['Itapoá'],
      comments: editingPost.comments || [],
      createdAt: editingPost.createdAt || new Date().toISOString().split('T')[0],
      metaTitle: editingPost.metaTitle,
      metaDescription: editingPost.metaDescription,
      ogTitle: editingPost.ogTitle,
      ogDescription: editingPost.ogDescription,
      twitterTitle: editingPost.twitterTitle,
      twitterDescription: editingPost.twitterDescription,
      imageAlt: editingPost.imageAlt,
      imageFilename: editingPost.imageFilename,
      canonicalUrl: editingPost.canonicalUrl,
      suggestedKeywords: editingPost.suggestedKeywords,
      readingTimeMinutes: editingPost.readingTimeMinutes,
      schemaJson: editingPost.schemaJson
    };

    setPosts(prev => {
      const exists = prev.some(p => p.id === completePost.id);
      return exists ? prev.map(p => p.id === completePost.id ? completePost : p) : [completePost, ...prev];
    });

    setEditingPost(null);
    setSaveFeedbackMsg('Artigo publicado e dados de SEO salvos com sucesso!');
    setTimeout(() => setSaveFeedbackMsg(''), 4000);
  };

  const handleDeletePost = (id: string, title: string) => {
    if (confirm(`Deseja excluir o artigo "${title}"?`)) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#C8102E]" /> Gestão de Blog, SEO & Publicação Inteligente
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assistente com geração automática de metadados, validação de SEO em tempo real e controle manual irrestrito.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Artigo</span>
        </button>
      </div>

      {saveFeedbackMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveFeedbackMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {!editingPost ? (
        <div className="space-y-6">
          
          {/* Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar artigos por título ou categoria..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 uppercase font-bold text-[10px] text-slate-400">
                  <tr>
                    <th className="p-4">Artigo</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Visualizações</th>
                    <th className="p-4">SEO Health</th>
                    <th className="p-4">Data</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPosts.map(post => {
                    const postSeo = BlogSeoAssistantService.analyzeSeo(post);
                    return (
                      <tr key={post.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={post.imageUrl} alt={post.title} className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0" />
                            <div>
                              <span className="font-bold text-white block line-clamp-1">{post.title}</span>
                              <span className="text-[10px] font-mono text-blue-400">/blog/{post.slug}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold">
                            {post.category}
                          </span>
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-300">
                          {post.views}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${postSeo.color}`}>
                            Score: {postSeo.score}% • {postSeo.grade}
                          </span>
                        </td>

                        <td className="p-4 text-slate-400 text-[11px]">
                          {post.createdAt}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingPost({ ...post })}
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar SEO
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id, post.title)}
                              className="p-1.5 bg-red-950/60 text-red-400 hover:bg-red-900 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Split Screen Editor & Live SEO Assistant */
        <form onSubmit={handleSavePost} className="space-y-6">
          
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold"
              >
                ← Voltar
              </button>
              <h2 className="text-sm font-bold text-white truncate max-w-md">
                Editando: {editingPost.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAutoGenerateSeo}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Sugestões de SEO (1-Clique)</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-xl transition uppercase cursor-pointer"
              >
                Publicar Artigo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Article Content Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Conteúdo Principal do Artigo</h3>
                  <button
                    type="button"
                    onClick={handleInsertStructureTemplate}
                    className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Layout className="w-3.5 h-3.5" /> Inserir Estrutura Recomendada SEO
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Título do Artigo (Será o H1 Único)
                    </label>
                    <input
                      type="text"
                      value={editingPost.title || ''}
                      onChange={e => {
                        const newTitle = e.target.value;
                        setEditingPost({
                          ...editingPost,
                          title: newTitle,
                          slug: BlogSeoAssistantService.generateSlug(newTitle)
                        });
                      }}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
                      <select
                        value={editingPost.category || 'Gastronomia'}
                        onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                      >
                        <option value="Gastronomia">Gastronomia</option>
                        <option value="Turismo">Turismo & Praias</option>
                        <option value="Eventos">Eventos & Cultura</option>
                        <option value="Notícias">Notícias do Comércio</option>
                        <option value="Negócios">Imóveis & Negócios</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">URL da Imagem de Capa</label>
                      <input
                        type="text"
                        value={editingPost.imageUrl || ''}
                        onChange={e => setEditingPost({ ...editingPost, imageUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Resumo / Excerpt (Chamada da Listagem)</label>
                    <textarea
                      rows={2}
                      value={editingPost.excerpt || ''}
                      onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Corpo do Artigo (Markdown / HTML)</label>
                    <textarea
                      rows={14}
                      value={editingPost.content || ''}
                      onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#C8102E] leading-relaxed"
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live SEO Assistant & Metadata Forms (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Live SEO Score Widget */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Validador SEO em Tempo Real</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${seoReport.color}`}>
                    {seoReport.score}% • {seoReport.grade}
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      seoReport.score >= 85 ? 'bg-emerald-500' : seoReport.score >= 65 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${seoReport.score}%` }}
                  />
                </div>

                {/* Article Statistics Counter */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Palavras</span>
                    <span className="text-xs font-bold text-white">{seoReport.wordCount}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Leitura</span>
                    <span className="text-xs font-bold text-white">{seoReport.readingTimeMinutes} min</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Headings</span>
                    <span className="text-xs font-bold text-white">H1:{seoReport.h1Count} H2:{seoReport.h2Count}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Links</span>
                    <span className="text-xs font-bold text-white">{seoReport.internalLinksCount + seoReport.externalLinksCount}</span>
                  </div>
                </div>

                {/* SEO Checklist Accordion */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  {seoReport.checks.map(check => (
                    <div key={check.id} className="flex items-start gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      {check.passed ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-white block">{check.label}</span>
                        <span className="text-[10px] text-slate-400">{check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Metadata Accordion Form (Full Manual Freedom) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" /> Metadados de SEO & Social (Editável)
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Slug da URL</label>
                    <input
                      type="text"
                      value={editingPost.slug || ''}
                      onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Meta Title</label>
                    <input
                      type="text"
                      value={editingPost.metaTitle || ''}
                      onChange={e => setEditingPost({ ...editingPost, metaTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Meta Description</label>
                    <textarea
                      rows={2}
                      value={editingPost.metaDescription || ''}
                      onChange={e => setEditingPost({ ...editingPost, metaDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Open Graph Title</label>
                      <input
                        type="text"
                        value={editingPost.ogTitle || ''}
                        onChange={e => setEditingPost({ ...editingPost, ogTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Texto ALT Imagem</label>
                      <input
                        type="text"
                        value={editingPost.imageAlt || ''}
                        onChange={e => setEditingPost({ ...editingPost, imageAlt: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Previews Interativos (Google, Facebook, Twitter, Schema) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-400" /> Previews de Compartilhamento
                  </h3>
                </div>

                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  {(['google', 'facebook', 'twitter', 'schema'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivePreviewTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                        activePreviewTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Google Search Card Preview */}
                {activePreviewTab === 'google' && (
                  <div className="bg-white p-4 rounded-2xl space-y-1 font-sans text-left border border-slate-200">
                    <div className="text-xs text-slate-600 truncate">https://itapoa.online › blog › {editingPost.slug}</div>
                    <div className="text-base font-medium text-blue-800 hover:underline cursor-pointer leading-tight">
                      {editingPost.metaTitle || editingPost.title}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {editingPost.metaDescription || editingPost.excerpt}
                    </div>
                  </div>
                )}

                {/* Facebook / WhatsApp Card Preview */}
                {activePreviewTab === 'facebook' && (
                  <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 space-y-3 p-3">
                    <img src={editingPost.imageUrl} alt="Preview OG" className="w-full h-32 object-cover rounded-xl" />
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">ITAPOA.ONLINE</span>
                      <h4 className="text-xs font-bold text-white leading-tight">{editingPost.ogTitle || editingPost.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{editingPost.ogDescription || editingPost.metaDescription}</p>
                    </div>
                  </div>
                )}

                {/* Twitter Card Preview */}
                {activePreviewTab === 'twitter' && (
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 space-y-2">
                    <img src={editingPost.imageUrl} alt="Preview Twitter" className="w-full h-28 object-cover rounded-xl" />
                    <h4 className="text-xs font-bold text-white">{editingPost.twitterTitle || editingPost.title}</h4>
                    <p className="text-[10px] text-slate-400">{editingPost.twitterDescription || editingPost.metaDescription}</p>
                  </div>
                )}

                {/* Schema JSON-LD Preview */}
                {activePreviewTab === 'schema' && (
                  <pre className="p-3 bg-slate-950 rounded-2xl text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                    {editingPost.schemaJson || BlogSeoAssistantService.generateAutoSuggestions(editingPost.title || '', '').schemaJson}
                  </pre>
                )}
              </div>

            </div>

          </div>
        </form>
      )}

    </div>
  );
};
