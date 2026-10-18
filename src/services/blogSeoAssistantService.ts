/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Intelligent SEO Assistant & Real-Time Analysis Service for Blog Articles
 */

import { BlogPost } from '../types';

export interface SeoCheckResult {
  id: string;
  label: string;
  passed: boolean;
  score: number; // Max weight for this check
  message: string;
  suggestion?: string;
}

export interface SeoAnalysisReport {
  score: number; // 0 to 100
  grade: 'Excelente' | 'Bom' | 'Precisa de Melhorias' | 'Crítico';
  color: string; // Tailwind color class
  wordCount: number;
  readingTimeMinutes: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  internalLinksCount: number;
  externalLinksCount: number;
  keywordDensity: number; // Percentage
  readabilityScore: number; // 0 to 100 Flesch adaptation
  checks: SeoCheckResult[];
}

export interface AutoSeoSuggestions {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  imageAlt: string;
  imageFilename: string;
  canonicalUrl: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  suggestedCategory: string;
  readingTimeMinutes: number;
  internalLinks: string[];
  externalLinks: string[];
  schemaJson: string;
}

export class BlogSeoAssistantService {
  
  /**
   * Generates a clean URL slug from title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics/accents
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Auto-suggests all SEO metadata based on title, content, category, and image URL
   */
  static generateAutoSuggestions(
    title: string,
    content: string,
    category?: string,
    imageUrl?: string
  ): AutoSeoSuggestions {
    const slug = this.generateSlug(title || 'novo-artigo-itapoa');
    const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/[#*`_]/g, ' ');
    const words = cleanContent.split(/\s+/).filter(w => w.length > 2);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Extract potential keywords (most frequent words > 4 chars)
    const freqMap: Record<string, number> = {};
    const stopWords = new Set([
      'para', 'como', 'mais', 'sobre', 'com', 'por', 'uma', 'seu', 'sua', 'dos', 'das',
      'que', 'está', 'este', 'esta', 'ser', 'são', 'entre', 'também', 'itapoá', 'online'
    ]);

    words.forEach(w => {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.length > 3 && !stopWords.has(lower)) {
        freqMap[lower] = (freqMap[lower] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw.charAt(0).toUpperCase() + kw.slice(1));

    const suggestedKeywords = ['Itapoá SC', 'Guia Comercial', ...topKeywords];
    const suggestedTags = ['Itapoá', 'Comércio Local', 'Dicas', ...topKeywords.slice(0, 3)];
    const suggestedCategory = category || (title.toLowerCase().includes('gastronomia') ? 'Gastronomia' : title.toLowerCase().includes('turismo') ? 'Turismo' : 'Notícias');

    // Clean excerpt/description
    const snippet = cleanContent.slice(0, 150).trim();
    const metaTitle = `${title.slice(0, 50)} | Itapoá Online`.trim();
    const metaDescription = snippet ? `${snippet}... Confira no Guia Comercial de Itapoá SC.` : `Saiba tudo sobre ${title} em Itapoá SC no portal oficial.`;

    const ogTitle = title;
    const ogDescription = metaDescription;
    const twitterTitle = title.slice(0, 70);
    const twitterDescription = snippet.slice(0, 140);

    const imageAlt = `${title} - Guia Comercial de Itapoá SC`;
    const imageFilename = `${slug}-itapoa-sc.jpg`;
    const canonicalUrl = `https://itapoa.online/blog/${slug}`;

    const internalLinks = [
      'https://itapoa.online/empresas (Guia de Empresas)',
      'https://itapoa.online/turismo (Atrações Turísticas)',
      'https://itapoa.online/eventos (Agenda de Eventos)',
      'https://itapoa.online/planos (Anuncie sua Empresa)'
    ];

    const externalLinks = [
      'https://www.itapoa.sc.gov.br (Prefeitura Municipal de Itapoá)',
      'https://turismo.sc.gov.br (SANTUR - Turismo Santa Catarina)'
    ];

    // Build Schema.org JSON-LD
    const schemaObj = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          '@id': `${canonicalUrl}#article`,
          'isPartOf': { '@id': canonicalUrl },
          'headline': title,
          'description': metaDescription,
          'inLanguage': 'pt-BR',
          'mainEntityOfPage': canonicalUrl,
          'image': imageUrl || 'https://itapoa.online/logotipo.png',
          'author': {
            '@type': 'Organization',
            'name': 'Redação Itapoá Online',
            'url': 'https://itapoa.online'
          },
          'publisher': {
            '@type': 'Organization',
            'name': 'ITAPOÁ ONLINE',
            'logo': {
              '@type': 'ImageObject',
              'url': 'https://itapoa.online/logotipo.png'
            }
          }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonicalUrl}#breadcrumb`,
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': 'Início', 'item': 'https://itapoa.online' },
            { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://itapoa.online/blog' },
            { '@type': 'ListItem', 'position': 3, 'name': title }
          ]
        }
      ]
    };

    return {
      slug,
      metaTitle,
      metaDescription,
      ogTitle,
      ogDescription,
      twitterTitle,
      twitterDescription,
      imageAlt,
      imageFilename,
      canonicalUrl,
      suggestedKeywords,
      suggestedTags,
      suggestedCategory,
      readingTimeMinutes,
      internalLinks,
      externalLinks,
      schemaJson: JSON.stringify(schemaObj, null, 2)
    };
  }

  /**
   * Analyzes the article in real-time and computes an SEO score (0 - 100%) and checklist
   */
  static analyzeSeo(post: Partial<BlogPost>): SeoAnalysisReport {
    const title = post.title || '';
    const content = post.content || '';
    const metaTitle = post.metaTitle || post.title || '';
    const metaDescription = post.metaDescription || post.excerpt || '';
    const slug = post.slug || '';
    const imageUrl = post.imageUrl || '';
    const imageAlt = post.imageAlt || '';

    const cleanContent = content.replace(/<[^>]*>/g, ' ');
    const words = cleanContent.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // Headings Analysis
    const h1Count = (content.match(/<h1[^>]*>|^#\s+/gm) || []).length;
    const h2Count = (content.match(/<h2[^>]*>|^##\s+/gm) || []).length;
    const h3Count = (content.match(/<h3[^>]*>|^###\s+/gm) || []).length;

    // Links Analysis
    const internalLinksCount = (content.match(/href=["'](\/|https?:\/\/itapoaonline\.com\.br)/g) || []).length + (post.internalLinks?.length || 0);
    const externalLinksCount = (content.match(/href=["']https?:\/\/(?!itapoaonline\.com\.br)/g) || []).length + (post.externalLinks?.length || 0);

    // Keyword density check
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let mainKeywordHits = 0;
    if (titleWords.length > 0) {
      const primaryKw = titleWords[0];
      const kwMatches = cleanContent.toLowerCase().match(new RegExp(primaryKw, 'g')) || [];
      mainKeywordHits = kwMatches.length;
    }
    const keywordDensity = wordCount > 0 ? parseFloat(((mainKeywordHits / wordCount) * 100).toFixed(1)) : 0;

    // Readability Index (Flesch adaptation for Portuguese)
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    const readabilityScore = Math.max(0, Math.min(100, Math.round(100 - (avgSentenceLength * 1.5))));

    const checks: SeoCheckResult[] = [];

    // Check 1: Meta Title Length (50-60 chars)
    const metaTitleLen = metaTitle.length;
    const metaTitlePassed = metaTitleLen >= 40 && metaTitleLen <= 65;
    checks.push({
      id: 'meta_title',
      label: 'Tamanho do Meta Title',
      passed: metaTitlePassed,
      score: 15,
      message: metaTitlePassed ? `Excelente! Meta title com ${metaTitleLen} caracteres.` : `Atual: ${metaTitleLen} caracteres. Recomendado: 50 a 60 caracteres.`
    });

    // Check 2: Meta Description Length (120-160 chars)
    const metaDescLen = metaDescription.length;
    const metaDescPassed = metaDescLen >= 110 && metaDescLen <= 170;
    checks.push({
      id: 'meta_desc',
      label: 'Tamanho da Meta Description',
      passed: metaDescPassed,
      score: 15,
      message: metaDescPassed ? `Excelente! Description com ${metaDescLen} caracteres.` : `Atual: ${metaDescLen} caracteres. Recomendado: 120 a 160 caracteres.`
    });

    // Check 3: Word Count (300+ words)
    const wordCountPassed = wordCount >= 300;
    checks.push({
      id: 'word_count',
      label: 'Tamanho do Conteúdo',
      passed: wordCountPassed,
      score: 15,
      message: wordCountPassed ? `Artigo robusto com ${wordCount} palavras.` : `Atual: ${wordCount} palavras. Mínimo recomendado: 300 palavras.`
    });

    // Check 4: Headings Hierarchy (1 H1, at least 2 H2s)
    const headingsPassed = h1Count <= 1 && h2Count >= 2;
    checks.push({
      id: 'headings',
      label: 'Estrutura de Cabeçalhos (H1/H2)',
      passed: headingsPassed,
      score: 15,
      message: headingsPassed 
        ? `Estrutura perfeita! 1x H1 e ${h2Count}x H2.` 
        : `Atenção: Deve conter exatamente 1x H1 (atual: ${h1Count}) e pelo menos 2x H2 (atual: ${h2Count}).`
    });

    // Check 5: Cover Image & ALT Text
    const imagePassed = imageUrl.length > 0 && imageAlt.length > 0;
    checks.push({
      id: 'image_alt',
      label: 'Imagem de Capa & Texto ALT',
      passed: imagePassed,
      score: 10,
      message: imagePassed ? 'Imagem de capa e texto ALT configurados.' : 'Adicione uma imagem de capa e preencha o texto ALT descritivo.'
    });

    // Check 6: Friendly Slug Format
    const slugPassed = slug.length > 3 && /^[a-z0-9-]+$/.test(slug);
    checks.push({
      id: 'friendly_slug',
      label: 'Slug Amigável da URL',
      passed: slugPassed,
      score: 10,
      message: slugPassed ? `Slug otimizado: /blog/${slug}` : 'O slug deve conter apenas letras minúsculas, números e hífens.'
    });

    // Check 7: Internal Links
    const internalPassed = internalLinksCount > 0;
    checks.push({
      id: 'internal_links',
      label: 'Links Internos',
      passed: internalPassed,
      score: 10,
      message: internalPassed ? `Contém ${internalLinksCount} link(s) para o portal.` : 'Inclua links internos para guias ou atrações do portal.'
    });

    // Calculate total score sum
    const totalScore = checks.reduce((acc, c) => acc + (c.passed ? c.score : 0), 0);

    let grade: SeoAnalysisReport['grade'] = 'Crítico';
    let color = 'text-red-400 bg-red-950 border-red-800';

    if (totalScore >= 85) {
      grade = 'Excelente';
      color = 'text-emerald-400 bg-emerald-950 border-emerald-800';
    } else if (totalScore >= 65) {
      grade = 'Bom';
      color = 'text-blue-400 bg-blue-950 border-blue-800';
    } else if (totalScore >= 45) {
      grade = 'Precisa de Melhorias';
      color = 'text-amber-400 bg-amber-950 border-amber-800';
    }

    return {
      score: totalScore,
      grade,
      color,
      wordCount,
      readingTimeMinutes,
      h1Count,
      h2Count,
      h3Count,
      internalLinksCount,
      externalLinksCount,
      keywordDensity,
      readabilityScore,
      checks
    };
  }

  /**
   * Returns a pre-formatted Markdown template following the exact recommended SEO article structure
   */
  static getRecommendedArticleTemplate(title: string): string {
    const articleTitle = title || 'Os 10 Melhores Lugares para Visitar em Itapoá SC';
    return `# ${articleTitle}

Descubra o guia completo com dicas imperdíveis de gastronomia, praias paradisíacas e investimentos no município de Itapoá SC.

---

## 1. Introdução a Itapoá: O Refúgio da Costa Norte Catarinense

Itapoá destaca-se por ter uma das maiores extensões de praias com águas calmas e límpidas de Santa Catarina. Além da beleza natural, a cidade vem vivenciando um rápido crescimento no comércio e no mercado imobiliário.

> 💡 **Dica do Guia:** Ao visitar Itapoá, não deixe de conhecer o Pontal da Figueira e experimentar a gastronomia de frutos do mar local.

---

## 2. Principais Atrações e Roteiros Recomendados

Abaixo listamos as principais atrações para incluir no seu roteiro de viagem ou fim de semana:

### 2.1. Praia de Itapema do Norte
A praia urbana mais concorrida, perfeita para famílias e praticantes de esportes aquáticos. Conta com infraestrutura completa de restaurantes e comércio ao redor.

### 2.2. Farol do Pontal da Figueira
Localizado na entrada da Baía de Babitonga, oferece um pôr do sol inesquecível e visão privilegiada das embarcações.

---

## 3. Tabela Comparativa de Opções & Serviços

| Atração / Serviço | Categoria | Recomendado Para | Acesso |
| :--- | :--- | :--- | :--- |
| **Itapema do Norte** | Praia Urbana | Famílias & Lazer | Fácil / Asfaltado |
| **Pontal da Figueira** | Ponto Histórico | Fotografia & Pôr do Sol | Gratuito |
| **Volta Velha** | Reserva Ecológica | Ecoturismo & Trilhas | Guiado |

---

## 4. Onde Comer & Onde Se Hospedar em Itapoá

O comércio gastronômico de Itapoá oferece desde bistrôs sofisticados até frutos do mar servidos à beira-mar.

- **Gastronomia:** Restaurantes de moquecas, sushis e pizzarias artesanais.
- **Hospedagem:** Hotéis pé na areia e pousadas de charme com atendimento VIP.

---

## 5. Conclusão & Próximos Passos

Itapoá reúne o melhor da natureza preservada com um comércio local forte e acolhedor. Seja para morar, investir ou passear, a cidade reserva experiências inesquecíveis.

### 📢 Chamada para Ação
Quer divulgar sua empresa no portal de maior relevância de Itapoá? [Clique aqui e conheça os planos de parceria no Itapoá Online](https://itapoa.online/planos).
`;
  }
}
