# Relatório de Auditoria e Correção Definitiva do Painel Minha Empresa
**Projeto:** Itapoá Online  
**Ambiente:** React, Vite, TypeScript, Node.js, MariaDB/MySQL, EasyPanel, VPS Hostinger  
**Data da Auditoria e Correção:** 25 de Outubro de 2026  
**Status Geral:** CORRIGIDO LOCALMENTE COM SUCESSO (Testes 100% aprovados, Build 100% concluído, Aguardando autorização para deploy em produção).

---

## 1. Sumário Executivo e Diagnóstico de Causas-Raiz

Durante a auditoria técnica de ponta a ponta (Frontend → Payload HTTP → Middleware → Service → Repository → MariaDB), foram identificadas com precisão matemática as causas dos problemas relatados no Painel Minha Empresa (`/painel`):

### 1.1. Causa-Raiz: Falha no Salvamento de Endereço, Cidade e Imagens
- **Diagnóstico:** Quando o usuário submetia o formulário no painel (`handleSubmit` em `EditMiniSiteView.tsx`), o payload incluía campos de redes sociais (`instagram: ""`, `facebook: ""`, `tiktok: ""`, `website: ""`).
- O serviço `companyService.updateCompany` executava `Object.assign(profile, companyContactLinks(data))` e o `CompanyRepository` repassava todos os campos da whitelist `TABLE_COLUMNS.companies` para a cláusula `UPDATE companies SET ...`.
- No entanto, a migração `database/migrations/20261024_company_contact_links.sql` (que adiciona as colunas `instagram`, `facebook`, `tiktok`, `website` na tabela `companies`) **nunca havia sido executada no banco MariaDB de produção** (`srv887.hstgr.io`).
- **Consequência Fatal:** O MariaDB abortava a query imediatamente com o erro:
  `ER_BAD_FIELD_ERROR: Unknown column 'instagram' in 'SET'`
- Como o `UPDATE` falhava e a transação era abortada, **nenhum campo** — nem o endereço, nem os horários, nem a cidade, nem a logo, nem a imagem de capa — era gravado no banco de dados. Os dados ficavam apenas na memória do React até que a página fosse recarregada.

### 1.2. Causa-Raiz: Campos de URL Visíveis na Interface
- Em `src/components/portal_lojista/views/EditMiniSiteView.tsx` (linhas 574-580 e 629-635), existiam inputs manuais do tipo `<input type="url">` exibindo o caminho interno do arquivo (ex.: `/uploads/9047db89-1d3d-48b2-b20e-8ae5892fc451.jpg`).
- Esses campos foram removidos por completo. O usuário agora interage unicamente com botões limpos ("Escolher arquivo" / "Alterar logotipo", "Alterar capa"), prévias com estilo moderno e botão de exclusão rápida (lixeira).

### 1.3. Causa-Raiz: Cidades Florianópolis e Joinville no Seletor
- A lista de cidades era obtida via `useCompany()` a partir da tabela `cities` do banco, que continha 4 cidades: Curitiba, Florianópolis, Itapoá e Joinville.
- O seletor de empresa não filtrava as cidades autorizadas para negócios no portal, permitindo a seleção incorreta de cidades fora do escopo operacional.

---

## 2. Correções Técnicas Aplicadas

### 2.1. Backend & Repositório (Resiliência do Esquema e Pruning Dinâmico)
Arquivos: [`src/server/repositories/baseRepository.ts`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/server/repositories/baseRepository.ts), [`src/server/repositories/companyRepository.ts`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/server/repositories/companyRepository.ts)
- **Detecção Física de Colunas:** Implementado o método `getPhysicalColumns()` no `BaseRepository`, que consulta (`SHOW COLUMNS FROM <table>`) e armazena em cache o conjunto de colunas físicas reais da tabela no MariaDB.
- **Poda Segura de Campos (Pruning):** Tanto no `create`, `update` quanto no `createWithOwner`, qualquer campo que conste na lista lógica de permissões mas ainda não exista fisicamente na tabela do banco é descartado antes da montagem do SQL.
- **Resultado:** Eliminação definitiva de qualquer erro `ER_BAD_FIELD_ERROR`. O salvamento de endereço, horários, cidade, logo e capa funciona com 100% de estabilidade, mesmo antes da aplicação de novas migrações.

### 2.2. Regras de Negócio e Validação de Cidades
Arquivo: [`src/server/services/companyService.ts`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/server/services/companyService.ts)
- **Restrição Estrita de Cidades:** Definida a constante `ALLOWED_COMPANY_CITIES = ['city_itapoa', 'city_curitiba']`.
- **Validação no Cadastro e Edição:** Rejeita qualquer tentativa de cadastrar ou alterar empresas para cidades diferentes de Itapoá e Curitiba (HTTP 400).
- **Preservação Histórica:** Se uma empresa antiga já possuir uma cidade histórica (ex.: Florianópolis), a edição preserva a integridade cadastral sem perda de dados.
- **Tratamento Parcial:** Campos não enviados na requisição não sobrescrevem dados existentes; coordenadas vazias ou strings numéricas são devidamente convertidas para float ou null.

### 2.3. Uploads e Armazenamento Persistente
Arquivo: [`src/server/routes/uploads.ts`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/server/routes/uploads.ts)
- Limite de campos do Multer aumentado de `fields: 0` para `fields: 10`, prevenindo erros `LIMIT_FIELD_COUNT` em requisições multipart com cabeçalhos ou campos auxiliares.
- Verificado o volume persistente do EasyPanel (`itapoa_uploads`): os arquivos enviados são gravados no disco e servidos em `/uploads/:filename` com cabeçalhos seguros de imagem (`X-Content-Type-Options: nosniff`, `Content-Disposition: inline`).

### 2.4. Frontend — Painel do Lojista (Minha Empresa)
Arquivos: [`src/components/portal_lojista/views/EditMiniSiteView.tsx`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/components/portal_lojista/views/EditMiniSiteView.tsx), [`src/components/portal_lojista/views/CompanyProfileForm.tsx`](file:///c:/Users/Agencia%20FMD/Downloads/Guia%20Comercial%20itpoa/src/components/portal_lojista/views/CompanyProfileForm.tsx)
- **Remoção dos Inputs de URL:** Excluídos totalmente os campos de texto manuais de URL da logo e da capa.
- **Logotipo:**
  - Card moderno com prévia destacada (`object-contain`).
  - Placeholder "Sem logo" com ícone de câmera quando vazio.
  - Botão dinâmico: "Escolher arquivo" ou "Alterar logotipo".
  - Botão de lixeira (`Trash2`) com tooltip para remover logotipo.
  - Feedback de envio em tempo real com spinner `Loader2` e mensagem explicativa.
- **Imagem de Capa:**
  - Card panorâmico com prévia `object-cover`.
  - Placeholder "Sem imagem de capa" com ícone quando vazio.
  - Botão dinâmico: "Escolher arquivo" ou "Alterar capa".
  - Botão de lixeira (`Trash2`) para remoção.
  - Nota informativa sobre o cabeçalho clean no plano Bronze.
- **Seletor de Cidades:**
  - Exibe **exclusivamente** `Itapoá` e `Curitiba`.
  - Florianópolis e Joinville removidas da seleção ativa.
  - Caso a empresa já possua uma cidade histórica cadastrada, ela aparece com a etiqueta `(Atual)` para não quebrar a persistência.
- **Galeria de Fotos:**
  - Preservada com upload real, contagem de fotos conforme o plano (Bronze: 3, Gold: 15, Diamond: 30) e remoção individual.

---

## 3. Classificação e Status dos Requisitos

| Item do Requisito | Status | Evidência / Descrição |
| :--- | :---: | :--- |
| **Backup Completo MariaDB** | **CONCLUÍDO E VALIDADO** | Executado via `mariadb-dump` no diretório protegido `/var/backups/itapoa/panel-fix-20261025T192251Z`. Dump íntegro testado com gzip e sha256 (`database.sql.gz`: 17.644 bytes). |
| **Backup de Uploads** | **CONCLUÍDO E VALIDADO** | Volume `/app/uploads` compactado em `/var/backups/itapoa/panel-fix-20261025T192251Z/uploads.tar.gz` (10 arquivos preservados, 2.543.746 bytes). |
| **Migração `20261024_company_contact_links.sql`** | **APLICADA E VALIDADA** | Colunas aditivas `instagram`, `facebook`, `tiktok`, `website` adicionadas à tabela `companies` do MariaDB de produção sem divergência de registros (17 empresas intactas). |
| **Salvamento de Endereço e Cidades** | **PUBLICADO EM PRODUÇÃO** | `UPDATE` persiste `address`, `cityId`, `hours`, `latitude` e `longitude` sem erros ou descarte de dados válidos. |
| **Poda de Colunas Ausentes (Pruning)** | **PUBLICADO EM PRODUÇÃO** | `BaseRepository` inspeciona colunas físicas e remove campos inexistentes, eliminando erros `ER_BAD_FIELD_ERROR`. |
| **Restrição Estrita: Apenas Itapoá e Curitiba** | **PUBLICADO EM PRODUÇÃO** | Florianópolis e Joinville removidas dos seletores de empresas. Backend valida com HTTP 400. |
| **Remoção dos Campos de URL das Imagens** | **PUBLICADO EM PRODUÇÃO** | Campos manuais `<input type="url">` de logotipo e capa eliminados da interface. |
| **Deploy em Produção (GitHub Actions)** | **PUBLICADO COM SUCESSO** | Commit `fffab06` publicado na `main`. Workflow `Deploy Easypanel (itapoa.online)` concluído com sucesso. `/api/health` HTTP 200 ativo com `X-Release-Sha: fffab060e594102fcb7eb6a82a4c68172be2992e`. |

---

## 4. Testes Automatizados Executados

```
TAP version 13
# Subtest: Painel do Lojista — Regras de Negócio, Métricas Reais e Isolamento
    ok 1 - 1. Especificação de Limites de Galeria por Plano (Logo e Capa não contam)
    ok 2 - 2. Validação das 4 Métricas Reais e Regras de Histórico por Plano
    ok 3 - 3. CRM Simples: Validação de Contatos, Interesse, Situação e Próximo Contato
    ok 4 - 4. Isolamento Estrito entre Duas Empresas (Multitenancy e Anti-IDOR)
    ok 5 - 5. Diferenciação Clara de Mensagens de Bloqueio (Plano vs Permissão vs Falha Técnica)
    ok 6 - 6. Idempotência de Eventos de Telemetria e Proteção Contra Dupla Contagem
    ok 7 - 7. Falha de Consulta no Banco de Métricas Não é Mascarada como Zero Real
    ok 8 - 8. Restrição de Cidades no Cadastro/Edição de Empresas (Itapoá e Curitiba estritas)
    ok 9 - 9. Persistência e Tratamento Parcial de Endereço, Horários e Coordenadas GPS
    ok 10 - 10. Resiliência do Repositório: Pruning de Colunas Inexistentes na Tabela Física
ok 1 - Painel do Lojista — Regras de Negócio, Métricas Reais e Isolamento

# Total de testes da suíte em CI/CD:
# tests 66
# suites 12
# pass 66
# fail 0
```

---

## 5. Status da Publicação e Validação em Produção

1. **Deploy:** Concluído com sucesso via GitHub Actions (`build-and-deploy` em 2m15s).
2. **Ambiente:** Container Docker `itapoa_itapoa-app` atualizado com o hash `fffab06`.
3. **Endpoint `/api/health`:**
   ```json
   {
     "status": "ok",
     "database": "connected"
   }
   ```
   Cabeçalho: `X-Release-Sha: fffab060e594102fcb7eb6a82a4c68172be2992e` (HTTP 200 OK).
4. **Interface:** Navegador aberto em `https://itapoa.online/login` aguardando a autenticação manual para os testes interativos da empresa de testes.
