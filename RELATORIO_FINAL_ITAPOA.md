# Itapoá Online — resultado da etapa de auditoria (23/10/2026)

**Não é uma homologação integral nem uma publicação concluída.** Correções de
código estão em `codex/auditoria-geral`; produção não foi alterada nesta etapa.
Há bloqueios de armazenamento/backups e configuração financeira em produção.

## 1. Ambiente e evidências

- Projeto: `Ocorrosivo/itapoa-online`; produção exclusiva `https://itapoa.online`.
- Base revisada: `1382af00d26c8a2cd1056c3025c3d5cc19aa0e97`.
- Actions `39892535134` concluído com sucesso; saúde HTTPS HTTP 200 com
  `{"status":"ok","database":"connected"}` e mesmo `X-Release-Sha`.
- Inspeções reais somente de leitura: Actions `39905453643`, `39906490025`.
- `e8f4a21` não encontrado localmente nem pelo endpoint de commits do GitHub
  (HTTP 422). Nenhuma alteração foi atribuída a esse commit.
- Pasta principal estava em `refactor/limpeza-e-otimizacao`, com exclusões
  preparadas e alterações de outro trabalho. Foi preservada; auditoria feita
  em worktree dedicado e branch própria, sem juntar branches antigas.

## 2. Problemas, causas e correções

1. **Risco de cobrança duplicada:** regressão cancelava localmente tentativas
   após cinco minutos, sem confirmar o gateway. Removido cancelamento por idade
   e mutação em GET; tentativa desconhecida é retomada/reconciliada.
2. **Pix com prazo incorreto:** API apresentava cinco minutos para cobrança de
   30 minutos. Validade agora vem do gateway; contador não declara falha financeira.
3. **Upload sem autenticação válida:** editor lia `auth_token`, enquanto login
   usa `saas_token`. Editor usa `apiFetch`; boundary multipart é preservado.
4. **Upload falsificado:** antes só confiava em MIME declarado. Nova rota
   valida assinatura inicial do conteúdo, mantém limite de 10 MB e tipos
   permitidos, bloqueia SVG, exige escopo e limpa arquivo se o banco falhar.
   Isso não substitui antivírus nem validação completa de um decodificador.
5. **Galeria duplicada e limites concorrentes:** biblioteca agora é separada de
   fotos públicas; inclusão é idempotente e conta limite sob lock SQL.
6. **Escalada administrativa:** removida promoção por endereço de e-mail em
   cadastro/login/middlewares. Papel vem exclusivamente do banco.
7. **Alteração de plano por perfil:** lista explícita de campos editáveis impede
   manipular trial, concessão, métricas e identidade financeira.
8. **Movimentação entre empresas:** atualização genérica não troca chave de tenant.
9. **Empresa órfã:** criação e vínculo do proprietário agora são transacionais.
10. **Suporte falhava:** removido import de nanoid não declarado nas dependências
    de produção e corrigida data ISO rejeitada pelo MySQL (agora usa NOW()).
11. **Recuperação fora da main:** reaplicado commit revisado `14f3ce0`: transporte
    SMTP compartilhado, erros sanitizados, controle concorrente, sessões
    revogadas e reset/troca de senha transacionais com testes SQL reais.
12. **Confirmação de e-mail:** não executa CREATE TABLE em runtime; erro de banco
    não significa identidade verificada; erros conhecidos preservam status HTTP.
13. **Perfil administrativo:** chamadas autenticadas; sucesso somente após HTTP
    válido; troca de senha exige novo login; e-mail somente leitura como na API.
14. **Deploy inseguro para uploads:** incluída barreira somente de leitura que
    recusa publicação se diretório de upload não estiver em montagem persistente.
    Não cria volume nem migra arquivos automaticamente.

## 3. Arquivos principais alterados

- `server.ts`, `src/server/routes/{api,uploads}.ts`.
- `src/server/services/{paymentService,galleryService,companyService,crudService,authService,emailVerificationService,sessionVersion,passwordRecoveryService,recoveryMailService,mailService}.ts`.
- `src/server/middleware/auth.ts`, `src/server/repositories/companyRepository.ts`.
- `src/pages/CheckoutPage.tsx`, editor de mini-site e perfil admin.
- `.github/workflows/{deploy-easypanel,payment-db-maintenance}.yml`.
- Testes unitários/integração, documentação de recuperação e `.env.example`
  (somente documentação de nomes, sem valores de segredos).

## 4. Resultados dos testes

- `npm run lint`: exit 0; `npm run build`: exit 0.
- `node --import tsx --test tests/unit/*.test.ts tests/integration/*.test.ts`:
  **122 testes aprovados, 12 suítes, zero falhas e zero ignorados**.
- Integração usa MariaDB local isolado e rotas HTTP reais, incluindo concorrência,
  rollback, isolamento, upload físico, leitura do arquivo e recuperação/login.
- SDK/API Mercado Pago e entrega SMTP são simulados nesses testes. Quatro casos
  de checkout usam Chromium real: cartão, recusa/processamento, Pix mobile,
  retomada após reload e abas concorrentes.
- Playwright recuperação: mais **4 testes aprovados**, com API simulada.
- Smoke do servidor com MySQL offline: aprovado; servidor permanece ativo,
  catálogo/saúde retornam 503, rotas SPA, autenticação e 404 JSON conferidos.
- `npm audit`: zero vulnerabilidades reportadas; Vite 6.4.5.
- Varredura limitada dos diretórios de código/script por formatos de tokens:
  nenhum padrão pesquisado encontrado. Não equivale a análise completa do
  histórico Git; credenciais expostas no chat devem ser renovadas.

## 5. Estado por funcionalidade

| Funcionalidade | Classificação | Evidência/limite |
|---|---|---|
| Cartão em produção | BLOQUEADA POR DEPENDÊNCIA EXTERNA | Serviço e banco sem credenciais; não houve cobrança ou homologação externa |
| Pix em produção | BLOQUEADA POR DEPENDÊNCIA EXTERNA | Configuração pública desabilitada; regressões locais corrigidas/testadas |
| Idempotência/webhook | CORRIGIDA E TESTADA | SQL real e gateway simulado; entrega real externa pendente |
| Upload/galeria no código | CORRIGIDA E TESTADA | Bytes, MIME falso, tamanho, escopo, rollback e limite concorrente testados |
| Persistência de uploads | BLOQUEADA POR DEPENDÊNCIA EXTERNA | Serviço sem mounts; volume itapoa_uploads ausente; backup externo não comprovado |
| MySQL/conexão atual | FUNCIONANDO SEM ALTERAÇÕES | Saúde conectada e SELECTs reais; auditoria integral de índices/FKs ainda pendente |
| Login/reset backend | CORRIGIDA E TESTADA | Testes locais de hash, prazo, uso único, concorrência e revogação |
| Login/reset em produção | CORRIGIDA, MAS AGUARDANDO VALIDAÇÃO | Correções ainda não publicadas; nova senha real do usuário não foi verificada |
| SMTP real | PENDENTE | Host/senha presentes; entrega anterior confirmada pelo usuário, não repetida nesta etapa |
| Perfil administrativo | CORRIGIDA, MAS AGUARDANDO VALIDAÇÃO | Correção compila; fluxo visual autenticado após publicação ainda não homologado |
| EasyPanel/aplicação | FUNCIONANDO SEM ALTERAÇÕES | Imagem/SHA/saúde identificados; configuração persistente de uploads ausente |
| Backup externo | BLOQUEADA POR DEPENDÊNCIA EXTERNA | Não informado local/provedor nem prova de restauração atual |
| Deploy desta auditoria | PENDENTE | Sem merge/push main, sem mudança de configuração ou recriação |

## 6. Infraestrutura, banco e arquivos

MariaDB 11.8.9, banco `itapoa_db`, 44 tabelas InnoDB; usuários 7, empresas 20,
vínculos 20, assinaturas 32, logs financeiros 4, media_items 0. Consultas de
órfãos em vínculos e assinaturas retornaram zero; não alteramos esses dados.

Docker informou `mounts=null`; `itapoa_uploads` inexistente; `/app/uploads`
vazio no container atual. Os caminhos legados inspecionados não localizaram os
142 arquivos citados. O ZIP local antigo existe, mas contém zero uploads.
Não concluímos perda definitiva sem localizar a origem/backup dos arquivos.

Manifesto de backup de banco foi localizado em
`/var/backups/itapoa/password-recovery.9NlDNQRt/database.sha256`. Não foi restaurado
nesta etapa; uma cópia no mesmo servidor não atende ao requisito de backup externo.

Consulta de identidade com a credencial fornecida durante a auditoria retornou
HTTP 200. Isso prova apenas aceitação desse token na consulta, não que Public Key,
webhook e conta recebam pagamentos corretamente nem que a VPS esteja configurada.
Nenhum valor de credencial foi colocado no repositório ou relatório.

## 7. Commits e publicação

Branch: `codex/auditoria-geral`.

- `34f2f33`: evidências e inspeção somente de leitura.
- `099ff32`: preservação das tentativas pendentes e prazo real do Pix.
- `9c2cc35`: recuperação revisada de SMTP/auth (`14f3ce0` original).
- `7889ec9`: localização não destrutiva de arquivos legados.
- `ad0c148`: regressões de pagamentos antigos/desconhecidos.
- `5e27ab6`: uploads, galeria, privilégios, isolamento e suporte.
- `51e60ca`: CI de PR e bloqueio de deploy sem persistência.
- Commit posterior de documentação registra este relatório, sem novo código.

Push realizado somente na branch de auditoria. Produção permanece `1382af0`.
Não declaramos Actions de deploy desta auditoria bem-sucedido, pois não ocorreu.

## 8. Pendências e retomada segura

1. Localizar/validar cópia externa íntegra do banco e dos arquivos e restaurar em
   ambiente isolado; responsável foi consultado. Não enviar senhas no chat.
2. Planejar volume persistente com caminho/UID corretos; não sobrepor diretório
   com volume vazio. Migrar arquivos somente após backup validado, depois testar
   manifestos antes/depois de recriação controlada do container.
3. Inserir chaves atuais diretamente no Easypanel, separadamente do deploy.
   Isso pode recriar a tarefa e deve aguardar o passo de preservação de arquivos.
4. Confirmar ao menos um administrador com papel real no banco antes de publicar
   a retirada da promoção por e-mail. Não promovemos contas automaticamente.
5. Homologar com credenciais/usuários/cartões de teste corretos: pagamento,
   assinatura do webhook, banco e liberação. Nenhuma cobrança real autorizada.
6. Revisar PR/CI e diferenças contra a main atualizada; integrar somente os
   commits revisados após os bloqueios. Validar Actions, saúde e SHA exato.
7. Ainda pendentes: revisão integral dos papéis viewer/editor/manager, topologia
   de proxy/rate limiting, todas as rotas privadas/mobile, logs operacionais reais,
   índices/planos SQL completos, limites de disco e análise completa do histórico
   de segredos. Painel ainda contém indicadores de sessões/2FA demonstrativos;
   não são evidência de segurança implementada.

Rollback de código: imagem anterior conhecida, preservando env/mounts; confirmar
saúde/SHA após reversão. Não restaurar banco antigo sobre vendas novas e não
remover volumes. Migrações destrutivas, limpeza de arquivos e alterações de contas
nunca fazem parte automática da publicação.
