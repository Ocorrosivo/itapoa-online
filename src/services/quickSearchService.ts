/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Quick search — agrupado por tipo, acento-insensível (normalizeSearch).
 * Consome: /api/companies, /api/events, /api/tourism, /api/blog, /api/jobs.
 */

import { normalizeSearch } from '../utils/catalogSearch';
import { apiFetch } from '../lib/apiClient';
import { arrayFromPayload } from '../utils/catalogSearch';

export type QuickSearchGroup = 'empresas' | 'eventos' | 'turismo' | 'blog' | 'empregos';

export interface QuickSearchItem {
  id: string;
  group: QuickSearchGroup;
  title: string;
  subtitle: string;
  slug: string;
  image?: string;
}

const GROUP_LABEL: Record<QuickSearchGroup, string> = {
  empresas: 'Empresas',
  eventos: 'Eventos',
  turismo: 'Turismo',
  blog: 'Informativo',
  empregos: 'Empregos',
};

export function groupLabel(group: QuickSearchGroup): string {
  return GROUP_LABEL[group];
}

const fetchJsonArray = async (url: string): Promise<any[]> => {
  try {
    const res = await apiFetch(url);
    if (!res.ok) return [];
    const raw = await res.json();
    return arrayFromPayload<any>(raw);
  } catch {
    return [];
  }
};

const matches = (haystack: unknown, term: string): boolean =>
  normalizeSearch(haystack).includes(term);

export async function quickSearch(query: string): Promise<QuickSearchItem[]> {
  const term = normalizeSearch(query);
  if (term.length < 2) return [];

  const [companies, events, tourism, blog, jobs] = await Promise.all([
    fetchJsonArray('/api/companies?limit=200'),
    fetchJsonArray('/api/events?limit=100'),
    fetchJsonArray('/api/tourism?limit=100'),
    fetchJsonArray('/api/blog?limit=100'),
    fetchJsonArray('/api/jobs?limit=100'),
  ]);

  const out: QuickSearchItem[] = [];

  for (const c of companies) {
    const hay = [c.name, c.description, c.detailedDescription, c.address]
      .filter(Boolean)
      .join(' ');
    const catName = c.categoryName ?? c.category?.name ?? '';
    const address = c.address ?? '';
    if (matches(hay, term) || matches(catName, term) || matches(address, term)) {
      out.push({
        id: String(c.id),
        group: 'empresas',
        title: String(c.name ?? c.title ?? ''),
        subtitle: String(c.description ?? c.categoryName ?? catName ?? address ?? '').slice(0, 80),
        slug: String(c.slug ?? c.id),
        image: c.logo ?? c.coverImage,
      });
    }
    if (out.length >= 20) break;
  }

  // Eventos — busca por titulo/descrição/local/categoria
  for (const e of events) {
    const hay = [e.title, e.description, e.location, e.category].filter(Boolean).join(' ');
    if (matches(hay, term)) {
      out.push({
        id: String(e.id),
        group: 'eventos',
        title: String(e.title ?? ''),
        subtitle: String(e.location ?? e.category ?? e.description ?? '').slice(0, 80),
        slug: String(e.slug ?? e.id),
        image: e.bannerUrl ?? e.coverImage ?? e.imageUrl,
      });
    }
    if (out.length >= 40) break;
  }

  // Turismo
  for (const t of tourism) {
    const hay = [t.title, t.name, t.description, t.location, t.category].filter(Boolean).join(' ');
    if (matches(hay, term)) {
      out.push({
        id: String(t.id),
        group: 'turismo',
        title: String(t.title ?? t.name ?? ''),
        subtitle: String(t.location ?? t.category ?? t.description ?? '').slice(0, 80),
        slug: String(t.slug ?? t.id),
        image: t.coverImage ?? t.imageUrl ?? t.bannerUrl,
      });
    }
    if (out.length >= 55) break;
  }

  // Blog
  for (const p of blog) {
    const hay = [p.title, p.excerpt, p.content, p.category].filter(Boolean).join(' ');
    if (matches(hay, term)) {
      out.push({
        id: String(p.id),
        group: 'blog',
        title: String(p.title ?? ''),
        subtitle: String(p.category ?? p.excerpt ?? '').slice(0, 80),
        slug: String(p.slug ?? p.id),
        image: p.imageUrl ?? p.coverImage,
      });
    }
    if (out.length >= 65) break;
  }

  // Empregos
  for (const j of jobs) {
    const hay = [j.title, j.description, j.companyName, j.type].filter(Boolean).join(' ');
    if (matches(hay, term)) {
      out.push({
        id: String(j.id),
        group: 'empregos',
        title: String(j.title ?? ''),
        subtitle: String(j.companyName ?? j.type ?? j.description ?? '').slice(0, 80),
        slug: String(j.id),
        image: j.companyLogo,
      });
    }
    if (out.length >= 75) break;
  }

  // Ordena agrupado por tipo na ordem: empresas > eventos > turismo > blog > empregos
  const order: Record<QuickSearchGroup, number> = {
    empresas: 0,
    eventos: 1,
    turismo: 2,
    blog: 3,
    empregos: 4,
  };
  out.sort((a, b) => order[a.group] - order[b.group]);

  return out.slice(0, 24);
}
