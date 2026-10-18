/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Eye, CornerDownRight, MessageCircle, 
  Search, ArrowLeft, Send, Sparkles, User, Tag, Share2, Clock
} from 'lucide-react';
import { BlogPost } from '../types';
import { useSEO } from '../hooks/useSEO';

interface BlogSectionProps {
  posts: BlogPost[];
  onCommentAdded: () => void;
}

export default function BlogSection({
  posts,
  onCommentAdded
}: BlogSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  useSEO({
    title: selectedPost ? (selectedPost.metaTitle || selectedPost.title) : 'Blog & Notícias de Itapoá SC | Guia Comercial',
    description: selectedPost ? (selectedPost.metaDescription || selectedPost.excerpt) : 'Notícias, novidades comerciais, turismo e negócios em Itapoá SC.'
  });

  useEffect(() => {
    if (selectedPost && selectedPost.schemaJson) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = selectedPost.schemaJson;
      script.id = 'blog-schema-jsonld';
      document.head.appendChild(script);

      return () => {
        const existing = document.getElementById('blog-schema-jsonld');
        if (existing) existing.remove();
      };
    }
  }, [selectedPost]);

  const filteredPosts = posts.filter(p => {
    const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentAuthor.trim() || !commentText.trim()) return;

    try {
      const resp = await fetch(`/api/blog/${selectedPost.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: commentAuthor,
          comment: commentText
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        setSelectedPost(data.post);
        setCommentAuthor('');
        setCommentText('');
        onCommentAdded();
      }
    } catch (err) {
      console.error('Error adding comment to blog post', err);
    }
  };

  const handleOpenPost = (p: BlogPost) => {
    // Notify analytic view
    fetch(`/api/blog/${p.slug}`)
      .then(res => res.json())
      .then(data => setSelectedPost(data))
      .catch(() => setSelectedPost(p));
  };

  return (
    <div id="blog_container" className="py-12 px-4 md:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto flex flex-col">
        
        <AnimatePresence mode="wait">
          {!selectedPost ? (
            <motion.div 
              key="post_list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest block mb-1">Informativo</span>
                  <h1 className="text-3xl font-sans font-black text-slate-900 tracking-tight">Notícias & Tendências Locais</h1>
                  <p className="text-sm text-slate-500 mt-2 font-sans">
                    Acompanhe artigos exclusivos sobre economia catarinense, tendências gourmet e investimento imobiliário.
                  </p>
                </div>
              </div>

              {/* Blog quick search */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 flex items-center bg-slate-50">
                <Search className="w-5 h-5 text-slate-400 mr-3 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Pesquise artigos ou notícias locais..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-slate-800 text-sm focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Posts list feed */}
              <div className="grid grid-cols-1 gap-8">
                {filteredPosts.map((p, index) => (
                  <motion.article 
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    onClick={() => handleOpenPost(p)}
                    className="group bg-white rounded-3xl overflow-hidden border border-slate-200/85 hover:border-slate-300 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row"
                  >
                    <div className="h-48 md:h-auto w-full md:w-72 bg-slate-100 overflow-hidden shrink-0">
                      <img 
                        src={p.imageUrl} 
                        alt={p.title} 
                        className="w-full h-full object-cover group-hover:scale-103 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase self-start">{p.category}</span>
                        <h2 className="text-lg font-sans font-extrabold text-slate-900 group-hover:text-blue-600 transition leading-snug mt-1">{p.title}</h2>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-2">{p.excerpt}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-6 pt-4 border-t border-slate-50">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 15 de Maio de 2026</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {p.views} views</span>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.article 
              key="post_detail"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden p-6 md:p-10 shadow-sm"
            >
              {/* Back navigation */}
              <button 
                onClick={() => setSelectedPost(null)}
                className="mb-8 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-full hover:bg-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5" /> Voltar ao feed de notícias
              </button>

              <header className="flex flex-col gap-3 mb-8">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedPost.category}</span>
                <h1 className="text-2xl md:text-4xl font-sans font-black tracking-tight text-slate-900 leading-tight">{selectedPost.title}</h1>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>Por Redação Guia Local</span>
                  <span>•</span>
                  <span>15 de Maio de 2026</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {selectedPost.views} views</span>
                </div>
              </header>

              {/* Big banner image */}
              <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-100 mb-8">
                <img 
                  src={selectedPost.imageUrl} 
                  alt={selectedPost.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Main article Content parser */}
              <div className="prose max-w-none text-slate-700 leading-relaxed text-sm font-sans whitespace-pre-wrap flex flex-col gap-4">
                {selectedPost.content}
              </div>

              {/* Testimonials comment thread */}
              <section className="mt-12 pt-12 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-slate-400" /> Discussões ({selectedPost.comments.length})
                </h3>

                {/* Submitting blog comment */}
                <form onSubmit={handleCommentSubmit} className="flex flex-col gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                  <h4 className="font-bold text-xs text-slate-900">Deixe seu comentário</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      required
                      placeholder="Seu nome..."
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <textarea 
                    rows={3}
                    required
                    placeholder="Digite sua crítica ou opinião sobre o artigo..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                  <button 
                    type="submit"
                    className="py-2.5 px-5 bg-slate-950 text-white hover:bg-slate-850 font-semibold text-xs rounded-xl self-end flex items-center gap-2 cursor-pointer transition"
                  >
                    Publicar Comentário <Send className="w-3 h-3" />
                  </button>
                </form>

                {/* Displaying comments list */}
                <div className="flex flex-col gap-4">
                  {selectedPost.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Este post ainda não recebeu comentários. Compartilhe sua opinião!</p>
                  ) : (
                    selectedPost.comments.map(c => (
                      <div key={c.id} className="flex gap-3 items-start p-4 rounded-2xl bg-slate-50 border border-slate-100/70">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-900 font-sans">{c.userName}</span>
                          <p className="text-xs text-slate-600 font-sans mt-1">{c.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

            </motion.article>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
