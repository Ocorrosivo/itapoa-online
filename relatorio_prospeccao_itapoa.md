# Relatório de Prospecção Comercial — Itapoá / SC & Região

**Data da Auditoria e Coleta:** 25 de Outubro de 2026  
**Responsável Técnico / Comercial:** Antigravity (Powered by DeepMind)  
**Projeto:** Guia de Itapoá ([itapoa.online](https://itapoa.online))  
**Ferramenta de Suporte:** Harvey 0.3.0  

---

## 1. Sumário Executivo

Este relatório consolida a primeira etapa da missão de prospecção e estruturação da base comercial de empresas reais de **Itapoá / SC** (e Curitiba / PR como base turística secundária), preparando-as para ingresso no portal **Guia de Itapoá** através da campanha promocional de **7 dias gratuitos**.

Foram investigadas fontes públicas, institucionais (Portal Municipal de Turismo de Itapoá, registros do CNPJ/Junta Comercial de SC e diretórios setoriais locais) para garantir que apenas empresas ativas, com endereços e canais de contato reais (telefones e WhatsApp) sejam catalogadas.

---

## 2. Métricas de Coleta e Qualificação

| Categoria de Registro | Quantidade | Descrição / Destino |
| :--- | :---: | :--- |
| **Empresas Itapoá Verificadas** | **46** | Empresas reais ativas com dados de contato e localização em Itapoá |
| **Leads Comerciais Prontos** | **46** | Contatos diretos (WhatsApp/Telefone) para apresentação da campanha |
| **Empresas Curitiba (Parceiras Litoral)** | **3** | Operadoras de turismo e transfers com interesse de tráfego para Itapoá |
| **Empresas para Revisão** | **2** | Registros com logradouro ou telefone pendente de confirmação ativa |
| **Possíveis Duplicatas Identificadas** | **2** | Filiais ou cadastros secundários detectados para unificação |

---

## 3. Cobertura por Bairros de Itapoá

A coleta já abrange bairros centrais e balneários estratégicos de Itapoá:
1. **Itapema do Norte** (maior pólo de comércio, hotelaria e gastronomia)
2. **Paese** (supermercados, restaurantes e serviços de saúde)
3. **Centro** (clínicas, materiais de construção, farmácias e pousadas)
4. **Balneário Rainha** (gastronomia e imobiliárias)
5. **Barra do Saí** (pousadas, imobiliárias, farmácias e mecânicas)
6. **Balneário Princesa do Mar** (materiais de construção e comércio)
7. **Pontal do Norte** (marinas, auto centers e serviços náuticos)
8. **Balneário Continental** (pousadas e hotelaria)
9. **Balneário Praia do Imperador** (construção civil e residenciais)
10. **São José I** (oficinas e imobiliárias)
11. **Saí Mirim** (materiais e serviços de infraestrutura)

---

## 4. Distribuição por Categorias Canônicas

Todas as empresas foram mapeadas de acordo com as categorias oficiais do portal:
- **Gastronomia (`cat_gastronomia`):** Restaurante Pérola, Donna Z Gastronomia, Casa da Anchova, Quintal do Mar, Churrascaria A Gaúcha.
- **Hospedagem (`cat_hospedagem`):** Hotel Pérola, Pousada Vila Águamar, Pousada Pássaros Park, Zakaluk Pousada, Pousada Delville, Belli Hotel, Boulevard de Itapoá.
- **Comércio Local (`cat_comercio`):** Supermercado Sol e Mar, Supermercado Brasão, Supermercado Mini Preço, D'Vestir Ateliê, Casa do Piscineiro, Hibiscus Itapoá.
- **Saúde (`cat_saude`):** Farmácia Preço Popular, Farmácia São João, Farmácia Hiperpopular, Farmácia Super Popular Saí, OdontoCompany, Clínica Veterinária Dr. Pet, Clínica Veterinária Itapoá.
- **Serviços (`cat_servicos`):** Exata Imóveis, PL Imóveis, Grupo Watanabe, Sonhar Imóveis, Fácil Imóveis, Juliano Oliva Imóveis, F&J Serviços Contábeis, Anguli Pet Hotel.
- **Construção e Reforma (`cat_construcao`):** Realeza Materiais (Lojas 1 e 2), MB Materiais, Maxxlar, Mendonça Materiais, Besen Materiais.
- **Automotivo (`cat_automotivo`):** WBM Soluções Automotivas (Bosch Service), Mecânica Brasil Sul, Oficina Jacqueline Oliveira, Pontal Auto Center, Auto Mecânica Salim.
- **Turismo e Lazer (`cat_turismo`):** Marina Itapoá Babitonga, Clube Náutico Itapoá.

---

## 5. Arquivos Gerados (UTF-8)

Os seguintes arquivos foram gerados na raiz do repositório:
- `empresas_itapoa_verificadas.csv`
- `empresas_curitiba_verificadas.csv`
- `empresas_para_revisao.csv`
- `empresas_duplicadas.csv`
- `leads_comerciais.csv`
- `relatorio_prospeccao_itapoa.md`

---

## 6. Próximos Passos na Integração do Portal

1. **Importador Administrativo no Guia de Itapoá:** Permitir upload via painel Master com preview, mapeamento e inserção sem duplicatas.
2. **Campanha de 7 Dias Grátis (`GUIA_ITAPOA_7_DIAS`):** Validação de elegibilidade e início de trial ativado no primeiro aceite.
3. **Fluxo de Reivindicação ("Reivindicar Perfil"):** Permitir ao proprietário assumir seu perfil no portal via WhatsApp / confirmação administrativa.
