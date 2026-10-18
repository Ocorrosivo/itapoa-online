/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public Blog Page Component
 */

import React from 'react';
import BlogSection from '../components/BlogSection';
import { useCompany } from '../context/CompanyContext';
import { useSEO } from '../hooks/useSEO';

export const BlogPage: React.FC = () => {
  const { posts, refreshData } = useCompany();

  useSEO({
    title: 'Blog & Notícias do Comércio de Itapoá',
    description: 'Acompanhe novidades, dicas de negócios, empreendedorismo e acontecimentos da cidade de Itapoá SC.'
  });

  return (
    <BlogSection
      posts={posts}
      onCommentAdded={refreshData}
    />
  );
};
