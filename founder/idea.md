# Itapoá Online

- What it is: Guia comercial e marketplace premium hiperlocal — diretório curado de empresas e prestadores de Itapoá (SC) com mini-sites, CRM de leads, vagas, busca por bairro/categoria e páginas de turismo/eventos, operando em itapoa.online.
- Who it is for: Comércios e prestadores locais de Itapoá (ex.: mercados, pousadas, gastro, saúde, automotivo, construção) que hoje dependem de WhatsApp orgânico, Instagram e Google Maps sem funil. Cidade ~80 mil hab. sazonal (turismo/feriados).
- What it sells, at what price: Freemium — bronze grátis (listagem básica); gold_vip pago (destaque/busca, mini-site expandido); diamond_extremo top pago (CRM, destaque máximo, vagas); 16 empresas demo, 10 categorias, 3 planos.
- Where and how: Online em itapoa.online (canônico), www.itapoa.online, app Node/Express + MySQL/MariaDB (37 tabelas) em Easypanel/Traefik em VPS 2.24.209.225 (Ubuntu 24.04, Node 20, MariaDB 11). Clientes chegam por SEO local, busca bairro/categoria e boca a boca. Produto entregue como portal + painel lojista.
- Budget and constraints: Já em produção (backup validado, restore testado, deploy Easypanel via GitHub Dockerfile). Sem números de CAC/LTV ainda. Mercado local pequeno e sazonal; sem equipe grande; depende de tração orgânica inicial. Pagamentos via Mercado Pago (webhook ativo).
