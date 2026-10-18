/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AI Assistant Service - Intelligent RAG Assistant for Local Commerce & Tourism
 */

import { Company, Category, TouristSpot } from '../types';

export interface AiResponse {
  answer: string;
  recommendations: Array<{
    title: string;
    description: string;
    link?: string;
    badge?: string;
  }>;
}

export class AiService {
  /**
   * Process user query using registered platform dataset
   */
  static async askAssistant(
    query: string,
    companies: Company[],
    categories: Category[],
    touristSpots: TouristSpot[]
  ): Promise<AiResponse> {
    const q = query.toLowerCase();

    // Try calling backend AI endpoint if active
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          answer: data.text,
          recommendations: data.recommendations || []
        };
      }
    } catch (err) {
      console.warn('Backend AI endpoint unavailable, executing client-side RAG inference.');
    }

    // Client-side rule-based RAG inference using actual stored platform entities
    const matchedCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.features.some(f => f.toLowerCase().includes(q))
    ).slice(0, 3);

    const matchedSpots = touristSpots.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    ).slice(0, 2);

    if (matchedCompanies.length > 0) {
      return {
        answer: `Encontrei as melhores opções no comércio de Itapoá relacionadas ao seu pedido:`,
        recommendations: matchedCompanies.map(c => ({
          title: c.name,
          description: c.description,
          link: `/empresa/${c.slug}`,
          badge: c.planLevel === 'diamond' ? 'Destaque VIP' : 'Verificado'
        }))
      };
    }

    if (matchedSpots.length > 0) {
      return {
        answer: `Confira estes pontos turísticos e passeios incríveis recomendados em Itapoá:`,
        recommendations: matchedSpots.map(s => ({
          title: s.name,
          description: s.description,
          link: `/turismo`,
          badge: 'Turismo'
        }))
      };
    }

    // Default intelligent fallback
    return {
      answer: `Com base nas empresas e serviços cadastrados no portal de Itapoá, aqui estão algumas recomendações populares para você explorar:`,
      recommendations: companies.slice(0, 3).map(c => ({
        title: c.name,
        description: c.description,
        link: `/empresa/${c.slug}`,
        badge: c.planLevel
      }))
    };
  }
}
