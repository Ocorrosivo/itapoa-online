# Board Brief — Itapoá Online

Cópia de `founder/idea.md` + contexto para os avaliadores.

## Ideia
Ver `../idea.md`.

## Detalhes úteis
- Domínio canônico: `https://itapoa.online` (prod). `https://www.itapoa.online` também serve; `https://itapoa.tech` é o painel Easypanel (infra), não o produto. `sitemap.xml` com 22 URLs, `og:url` canônico itapoa.online.
- Stack em produção: React 19 + Vite 6 + Tailwind 4, Express 4/MariaDB 11, Traefik + Let's Encrypt (certs 2027-01-18), build `dist/server.cjs`.
- Planos reais: bronze 0, gold_vip 49.90/mês, diamond_extremo 99.90/mês (billing mensal). Peso de ranking: diamond_extremo 3 > gold 2 > bronze 1.
- Catálogo: 16 empresas demo cobrindo "Mercado, Pousada, Hambúrguer, Lava Rápido, Itapema, Clínica", 10 categorias (gastro, hospedagem, saúde, comércio, serviços, beleza, construção, automotivo, turismo, educação), 22 bairros, sitemap e busca com QuickSearch.
- Concorrência implícita: Google Maps/Perfil da Empresa, Instagram/WhatsApp Business, OLX local, portais da prefeitura/turismo, outros diretórios genéricos.
- Monetização: destaque/busca/mini-site/CRM/vagas — webhook Mercado Pago único caminho que marca `paid`.
- Riscos sabidos: cidade pequena e sazonal; sem prova social paga ainda; sem CAC/LTV medido; 3 URLs Unsplash quebradas foram corrigidas mas experiência depende de fotos externas; dependência de SEO local sem time de conteúdo.
- O que já foi pedido: validar se há um gap real antes de investir em mídia; evitar competir só em preço.
