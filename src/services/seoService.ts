/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SEO Engine - Dynamic Meta Tags, Open Graph & Schema.org JSON-LD Generator
 */

import { Company, BlogPost, EventItem, TouristSpot, RouteGuide } from '../types';

export class SeoService {
  /**
   * Update Document Title and Meta Tags dynamically
   */
  static updateMetaTags(options: {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: string;
  }) {
    document.title = options.title;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', options.description);

    // Update Open Graph Tags
    this.setMetaProperty('og:title', options.title);
    this.setMetaProperty('og:description', options.description);
    if (options.image) this.setMetaProperty('og:image', options.image);
    if (options.url) this.setMetaProperty('og:url', options.url);
    this.setMetaProperty('og:type', options.type || 'website');

    // Update Twitter Cards
    this.setMetaProperty('twitter:card', 'summary_large_image');
    this.setMetaProperty('twitter:title', options.title);
    this.setMetaProperty('twitter:description', options.description);
    if (options.image) this.setMetaProperty('twitter:image', options.image);
  }

  private static setMetaProperty(property: string, content: string) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  /**
   * Inject JSON-LD Schema into DOM
   */
  static injectJsonLd(schemaData: object) {
    const existing = document.getElementById('json-ld-schema');
    if (existing) {
      existing.remove();
    }
    const script = document.createElement('script');
    script.id = 'json-ld-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
  }

  /**
   * Generate Schema.org for LocalBusiness (Company)
   */
  static generateCompanySchema(company: Company) {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': company.name,
      'image': company.logo || company.coverImage,
      'description': company.description,
      'telephone': company.phone || company.whatsapp,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': company.address,
        'addressLocality': 'Itapoá',
        'addressRegion': 'SC',
        'addressCountry': 'BR'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': company.latitude,
        'longitude': company.longitude
      },
      'url': window.location.href,
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': company.rating || 5,
        'reviewCount': company.reviewCount || 1
      }
    };
  }

  /**
   * Generate Schema.org for Blog Article
   */
  static generateArticleSchema(post: BlogPost) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': post.title,
      'image': [post.imageUrl],
      'datePublished': post.createdAt,
      'author': {
        '@type': 'Person',
        'name': post.authorName || 'Redação Guia Comercial'
      },
      'description': post.excerpt
    };
  }
}
