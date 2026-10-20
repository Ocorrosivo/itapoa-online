# Publicação — Itapoá Online

- Produção exclusiva: https://itapoa.online, na VPS, serviço Docker/Easypanel `itapoa_itapoa-app`.
- `itapoa.tech` é o painel de infraestrutura, não a aplicação. Não publicar em domínios antigos.
- Claude e Codex usam Ocorrosivo/itapoa-online. Branches/worktrees só chegam à produção depois de revisadas e integradas na `main`.
- Antes de integrar: executar `npm run lint`, `npm run build` e os testes pertinentes. Preservar alterações alheias; não juntar branches antigas indiscriminadamente.
- Push na `main` dispara `.github/workflows/deploy-easypanel.yml`. Publicar somente quando autorizado pelo usuário; commit local não publica.
- Não usar FTP, scripts legados Hostinger, PM2 ou Caddy para publicar. Não ativar workflows em `workflows/disabled`.
- Não anunciar publicação concluída sem Actions bem-sucedido, `/api/health` HTTP 200 com banco conectado e `X-Release-Sha` igual ao commit publicado.
- Nunca versionar segredos nem alterar banco/configuração como efeito colateral do deploy. Preservar volumes e variáveis do Easypanel.
- Procedimento: `deployment/DEPLOY_VPS.md`. Essa documentação substitui as instruções legadas contraditórias de hospedagem.
