/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Official Itapoá (SC) Platform Base Data & Content Repository
 */

export interface BairroItapoa {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
}

export interface CategoriaItapoa {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  segment: string;
  description: string;
}

export interface PraiaItapoa {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  howToGet: string;
  highlights: string[];
}

export const ITAPOA_CITY_CONFIG = {
  cityName: 'Itapoá',
  stateName: 'Santa Catarina',
  stateSigla: 'SC',
  country: 'Brasil',
  cepGeral: '89249-000',
  latitude: -26.1189,
  longitude: -48.6148,
  phoneDdd: '47',
  portalName: 'Portal Oficial de Itapoá SC',
  ameBrand: 'A.M.E. ITAPOÁ - Assoc. Mulheres Empreendedoras'
};

export const BAIRROS_ITAPOA: BairroItapoa[] = [
  { id: 'b_1', name: 'Barra do Saí', slug: 'barra-do-sai', description: 'Bairro no extremo norte de Itapoá, famoso pelo encontro do Rio Saí Mirim com o mar e excelentes praias.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', metaTitle: 'Barra do Saí - Itapoá SC', metaDescription: 'Guia de empresas, restaurantes e pousadas no bairro Barra do Saí em Itapoá SC.' },
  { id: 'b_2', name: 'Rainha', slug: 'rainha', description: 'Bairro residencial e turístico com belas praias e ambiente calmo.', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', metaTitle: 'Rainha - Itapoá SC', metaDescription: 'Empresas e serviços no bairro Rainha em Itapoá SC.' },
  { id: 'b_3', name: 'Cambiju', slug: 'cambiju', description: 'Bairro nobre com grande extensão de orla e excelente infraestrutura.', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', metaTitle: 'Cambiju - Itapoá SC', metaDescription: 'Guia comercial do bairro Cambiju em Itapoá SC.' },
  { id: 'b_4', name: 'Itapema do Norte', slug: 'itapema-do-norte', description: 'O coração comercial e turístico de Itapoá, famoso pelas pedras (1ª, 2ª e 3ª Pedra) e vasta opção de restaurantes.', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', metaTitle: 'Itapema do Norte - Itapoá SC', metaDescription: 'Comércio, gastronomia e pousadas em Itapema do Norte, Itapoá SC.' },
  { id: 'b_5', name: 'Samambaial', slug: 'samambaial', description: 'Bairro tradicional próximo às vias principais de acesso.', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', metaTitle: 'Samambaial - Itapoá SC', metaDescription: 'Serviços e comércio no bairro Samambaial em Itapoá SC.' },
  { id: 'b_6', name: 'São José', slug: 'sao-jose', description: 'Bairro residencial com forte comércio local e prestadores de serviços.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', metaTitle: 'São José - Itapoá SC', metaDescription: 'Guia comercial do bairro São José em Itapoá SC.' },
  { id: 'b_7', name: 'Maresia', slug: 'maresia', description: 'Bairro em crescimento constante com pousadas e residências.', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', metaTitle: 'Maresia - Itapoá SC', metaDescription: 'Serviços no bairro Maresia em Itapoá SC.' },
  { id: 'b_8', name: 'Centro', slug: 'centro', description: 'Centro administrativo de Itapoá, próximo à prefeitura, bancos e serviços públicos.', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', metaTitle: 'Centro - Itapoá SC', metaDescription: 'Comércio e serviços do Centro de Itapoá SC.' },
  { id: 'b_9', name: 'Continental', slug: 'continental', description: 'Bairro calmo próximo às áreas verdes e praias.', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', metaTitle: 'Continental - Itapoá SC', metaDescription: 'Bairro Continental em Itapoá SC.' },
  { id: 'b_10', name: 'Bamerindus', slug: 'bamerindus', description: 'Região residencial com comércio de bairro.', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', metaTitle: 'Bamerindus - Itapoá SC', metaDescription: 'Comércio no bairro Bamerindus em Itapoá SC.' },
  { id: 'b_11', name: 'Pontal do Norte', slug: 'pontal-do-norte', description: 'Famoso pelo Porto Itapoá, baía de águas calmas e travessia da Baía de Babitonga.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', metaTitle: 'Pontal do Norte - Itapoá SC', metaDescription: 'Porto Itapoá, passeios e comércio no Pontal do Norte.' },
  { id: 'b_12', name: 'Figueira do Pontal', slug: 'figueira-do-pontal', description: 'Bairro calmo banhado pela Baía de Babitonga.', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', metaTitle: 'Figueira do Pontal - Itapoá SC', metaDescription: 'Figueira do Pontal em Itapoá SC.' },
  { id: 'b_13', name: 'Jaguaruna', slug: 'jaguaruna', description: 'Bairro litorâneo com grande apelo de veraneio.', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', metaTitle: 'Jaguaruna - Itapoá SC', metaDescription: 'Bairro Jaguaruna em Itapoá SC.' },
  { id: 'b_14', name: 'Entre-Rios', slug: 'entre-rios', description: 'Região tranquila próxima à natureza.', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', metaTitle: 'Entre-Rios - Itapoá SC', metaDescription: 'Entre-Rios em Itapoá SC.' },
  { id: 'b_15', name: 'Saí Guaçu', slug: 'sai-guacu', description: 'Fronteira natural e preservada do município.', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', metaTitle: 'Saí Guaçu - Itapoá SC', metaDescription: 'Saí Guaçu em Itapoá SC.' },
  { id: 'b_16', name: 'Volta Velha', slug: 'volta-velha', description: 'Região da Reserva Natural Volta Velha, santuário da Mata Atlântica.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', metaTitle: 'Volta Velha - Itapoá SC', metaDescription: 'Reserva e ecoturismo em Volta Velha, Itapoá SC.' },
  { id: 'b_17', name: 'Gleba I', slug: 'gleba-i', description: 'Área de expansão e comunidades tradicionais.', image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', metaTitle: 'Gleba I - Itapoá SC', metaDescription: 'Gleba I em Itapoá SC.' },
  { id: 'b_18', name: 'Gleba II', slug: 'gleba-ii', description: 'Região de chácaras e ecoturismo.', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', metaTitle: 'Gleba II - Itapoá SC', metaDescription: 'Gleba II em Itapoá SC.' },
  { id: 'b_19', name: 'Palmeiras', slug: 'palmeiras', description: 'Bairro residencial arborizado e tranquilo.', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', metaTitle: 'Palmeiras - Itapoá SC', metaDescription: 'Palmeiras em Itapoá SC.' },
  { id: 'b_20', name: 'Bom Retiro', slug: 'bom-retiro', description: 'Bairro com comércio local de conveniência.', image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', metaTitle: 'Bom Retiro - Itapoá SC', metaDescription: 'Bom Retiro em Itapoá SC.' },
  { id: 'b_21', name: 'Princesa do Mar', slug: 'princesa-do-mar', description: 'Balneário com belíssimas residências de praia.', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', metaTitle: 'Princesa do Mar - Itapoá SC', metaDescription: 'Princesa do Mar em Itapoá SC.' }
];

export const PRAIAS_ITAPOA: PraiaItapoa[] = [
  {
    id: 'pr_1',
    name: 'Praia de Itapema do Norte',
    slug: 'praia-itapema-do-norte',
    description: 'A praia mais famosa de Itapoá, famosa pelos recifes das Três Pedras (1ª, 2ª e 3ª Pedra) e piscinas naturais formadas na maré baixa. Ideal para a família, banho e caminhadas.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    howToGet: 'Localizada no centro comercial de Itapema do Norte. Acesso fácil pela Av. Ana Maria Rodrigues de Freitas.',
    highlights: ['Pedra da Freira', 'Três Pedras', 'Piscinas Naturais', 'Gastronomia à Beira-Mar']
  },
  {
    id: 'pr_2',
    name: 'Praia da Barra do Saí',
    slug: 'praia-barra-do-sai',
    description: 'Localizada no extremo norte do município, onde o Rio Saí Mirim deságua no mar. Ponto clássico de surf, pesca e pôr do sol espetacular.',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
    howToGet: 'Acesso pela Rodovia SC-415 sentido norte até a foz do Rio Saí Mirim.',
    highlights: ['Encontro do Rio com o Mar', 'Ponto de Surf', 'Pesca de Arremesso', 'Quiosques']
  },
  {
    id: 'pr_3',
    name: 'Praia do Pontal',
    slug: 'praia-do-pontal',
    description: 'Banhada pela Baía de Babitonga, possui águas extremamente calmas como uma lagoa. Perfeita para stand-up paddle, caiaque e passeios em família com crianças.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    howToGet: 'Siga até o final da Av. Beira Mar 5 sentido sul em direção ao Porto de Itapoá.',
    highlights: ['Águas Calmas', 'Passeios de Barco', 'Baía de Babitonga', 'Vista de Joinville e São Francisco']
  },
  {
    id: 'pr_4',
    name: 'Praia da Figueira',
    slug: 'praia-da-figueira',
    description: 'Praia tranquila com vegetação preservada e clima bucólico de vila de pescadores.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    howToGet: 'Acesso pela estrada do Pontal próximo ao porto.',
    highlights: ['Vila de Pescadores', 'Tranquilidade', 'Frutos do Mar Frescos']
  }
];
