# GUIA DE ITAPOÁ + HARVEY — PROGRESSO & CHECKPOINTS

**Data de Atualização:** 25 de Outubro de 2026  
**Responsável:** Antigravity (Advanced Agentic Coding)  
**Status Geral:** ✅ Fase 1, Fase 2, Fase 3 e Fase 4 Concluídas em Desenvolvimento com Testes 100% Verificados.

---

## 1. Estado Atual dos Dois Projetos

### A. HARVEY — Prospecção
- **Local:** `C:\Users\Agencia FMD\Downloads\HARNEY\harvey`
- **Versão:** Harvey 0.3.0 (Python 3.13 venv em `.venv`)
- **Configuração FMD Preservada:** Backup seguro em `harvey.fmd.yaml`
- **Configuração Itapoá Online Ativa:** Criado `harvey.itapoa.yaml` (Campanha Promocional Guia de Itapoá, `contato@itapoa.online`, envio frio desativado por segurança compliance).
- **Mecanismo de Alternância:** Utilitário `switch_profile.py` operacional em `scripts/switch_harvey_profile.py` e na raiz do Harvey, permitindo alternar instantaneamente entre Agência FMD e Guia de Itapoá sem perdas.
- **Auditoria de Descoberta:** Investigada a mecânica do Harvey (`harvey discover`). O provedor gratuito OSM Overpass do Harvey nativamente restringe a 9 categorias em inglês e as instâncias públicas de Overpass apresentaram instabilidade de rede e throttling. A busca foi complementada com varredura autorizada em fontes oficiais municipais (Portal Municipal de Turismo, cadastros de CNPJ e diretórios regionais).

### B. ITAPOÁ ONLINE — Portal
- **Local:** `c:\Users\Agencia FMD\Downloads\Guia Comercial itpoa`
- **Repositório:** `https://github.com/Ocorrosivo/itapoa-online` (branch `main`)
- **Produção:** `https://itapoa.online` (VPS Hostinger, MariaDB, EasyPanel)
- **Status do Build:** `npm run lint` e `npm run build` passando com sucesso total (0 erros TypeScript).

---

## 2. Resultados da Varredura Comercial de Empresas

### Cobertura e Arquivos Gerados (UTF-8)
1. **`empresas_itapoa_verificadas.csv`**: **46 empresas reais e ativas** de Itapoá com endereço, bairro canônico, telefone, WhatsApp comercial, categoria e links oficiais.
2. **`empresas_curitiba_verificadas.csv`**: **3 empresas parceiras** de Curitiba/PR do segmento de turismo receptivo e transfers.
3. **`empresas_para_revisao.csv`**: **2 empresas** com endereços ou telefones pendentes de confirmação ativa.
4. **`empresas_duplicadas.csv`**: **2 registros** identificados como unidades secundárias/filiais para unificação.
5. **`leads_comerciais.csv`**: **46 contatos comerciais qualificados** com WhatsApp para ativação da degustação.
6. **`relatorio_prospeccao_itapoa.md`**: Relatório executivo completo da prospecção.

### Bairros Cobertos
- Itapema do Norte, Centro, Paese, Balneário Rainha, Barra do Saí, Balneário Princesa do Mar, Pontal do Norte, Balneário Continental, Balneário Praia do Imperador, São José I e Saí Mirim.

### Categorias Cobertas
- Gastronomia (`cat_gastronomia`), Hospedagem (`cat_hospedagem`), Comércio Local (`cat_comercio`), Saúde (`cat_saude`), Serviços (`cat_servicos`), Construção Civil (`cat_construcao`), Automotivo (`cat_automotivo`), Turismo Náutico (`cat_turismo`).

---

## 3. Integração com o Guia de Itapoá Implementada

### A. Importador Administrativo em Lote (CSV)
- **Backend:** `src/server/services/companyImportService.ts`
  - Upload via CSV, pré-visualização, mapeamento automático de categorias e cidades permitidas (`city_itapoa` e `city_curitiba`), detecção de duplicatas (no lote e no MariaDB), importação em transação segura e registro em `audit_logs`.
- **Rotas de API (Restritas ao `admin_master`):**
  - `POST /api/admin/companies/import/preview`: Retorna contagens de válidos, duplicados, erros e detalhes linha por linha.
  - `POST /api/admin/companies/import/execute`: Executa a inserção real em lote sem duplicar registros.
- **Frontend (Painel Master):**
  - Implementado em `src/components/admin_master/views/CompaniesView.tsx` com botão "Importar Empresas (CSV)", leitura em tempo real no browser, tabela de pré-visualização, filtro anti-duplicata e feedback visual.

### B. Campanha Promocional de 7 Dias Grátis (`GUIA_ITAPOA_7_DIAS`)
- O teste gratuito pertence 100% ao Itapoá Online (sem cartão, sem cobrança antecipada, duração de 7 dias corridos).
- Integrado ao `EntitlementService`:
  - `access_grant_type: 'trial'`
  - `trial_ends_at` calculado para 7 dias após o aceite.
  - Bloqueio contra trial duplicado (`has_used_trial = 1`).
  - Ao expirar, retorna automaticamente para o plano Bronze sem gerar débitos nem excluir dados.

### C. Reivindicação Segura de Perfis ("Reivindicar Perfil")
- **Backend:** `POST /api/companies/:id/claim`
  - Exige autenticação do usuário.
  - Bloqueia reivindicação caso a empresa já possua outro proprietário legítimo.
  - Coleta nome do responsável, telefone e documento (opcional).
  - Exige aceite explícito dos termos da campanha de 7 dias.
  - Vincula a empresa ao usuário em `companies_users` e inicia imediatamente os 7 dias gratuitos.
- **Frontend (Minissites de Empresas):**
  - Adicionado botão destacado "Reivindicar Perfil (7 Dias Grátis)" em `src/components/CompanyDetailSection.tsx` para empresas não reivindicadas.
  - Modal com formulário seguro, resumo das regras e confirmação instantânea.

---

## 4. Testes e Validações Executados

1. **Testes Unitários:**
   - `tests/unit/mercadopago_and_trial.test.ts`: **5/5 testes passando** (elegibilidade, expiração sem débito, idempotência).
   - `tests/unit/company_import.test.ts`: **5/5 testes passando** (slugify, mapeamento de categorias, detecção de duplicatas, rejeição de cidades não permitidas).
2. **Typecheck & Linter:**
   - `npm run lint`: **0 erros TypeScript**.
3. **Build de Produção:**
   - `npm run build`: **Vite + esbuild gerados com sucesso**.

---

## 5. Próximas Ações
- Aguardar aprovação do usuário para qualquer importação em massa no banco de produção.
- Conforme regra de segurança, nenhuma alteração em produção será enviada sem autorização expressa.
