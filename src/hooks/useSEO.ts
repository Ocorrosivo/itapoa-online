/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Custom Hook for Dynamic SEO Management
 */

import { useEffect } from 'react';
import { SeoService } from '../services/seoService';

interface SeoConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  jsonLd?: object;
}

export function useSEO(config: SeoConfig) {
  useEffect(() => {
    SeoService.updateMetaTags({
      title: `${config.title} | Guia Comercial Itapoá`,
      description: config.description,
      image: config.image,
      url: config.url || window.location.href
    });

    if (config.jsonLd) {
      SeoService.injectJsonLd(config.jsonLd);
    }
  }, [config.title, config.description, config.image, config.url, config.jsonLd]);
}
