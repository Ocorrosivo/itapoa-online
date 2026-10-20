# Deploy único — itapoa.online

Produção: https://itapoa.online. `itapoa.tech` é somente o painel Easypanel.

## Claude e Codex

1. Revisar alterações em branch atualizada; branches/worktrees do Claude não são publicadas sozinhas.
2. Executar `npm run lint`, `npm run build` e os testes pertinentes.
3. Quando autorizado, integrar na `main` e enviar ao GitHub.
4. Acompanhar **Deploy Easypanel (itapoa.online)** até concluir.
5. Confirmar `/api/health` HTTP 200, banco conectado e `X-Release-Sha` igual ao commit publicado.

Commit local e push em outra branch não publicam. Não juntar todas as branches antigas indiscriminadamente.

## Automação

`.github/workflows/deploy-easypanel.yml`: push main → instalação → lint/build → SSH → build Docker do SHA exato → atualização → health no container → health público/SHA → frontend público.

- Serviço: `itapoa_itapoa-app`; imagem: `easypanel/itapoa/itapoa-app:<SHA>`.
- Node 20; entrada `node dist/server.cjs`.
- Secrets GitHub: `VPS_HOST`, `VPS_USER`, `VPS_PASSWORD`, `VPS_PORT`.
- A porta 3000 do host pode ser do painel. Verificar a aplicação dentro do container correto.
- Falha após início da atualização tenta restaurar a imagem anterior. Conferir o serviço após falhas, pois a reversão também pode falhar.
- Deploys são serializados e usam o SHA do evento, não a ponta móvel da main.

Não usar scripts Hostinger/FTP, PM2/Caddy ou workflows em `workflows/disabled` para publicar.

## Dados e recuperação

O deploy troca apenas a imagem e preserva as variáveis e volumes configurados no serviço. `APP_URL=https://itapoa.online` e `API_URL=https://itapoa.online/api`. Segredos permanecem no Easypanel, nunca no Git. Uploads precisam de volume persistente e `UPLOAD_DIR` correspondente.

Não reimportar seeds nem executar migrações no deploy. Mudanças de banco exigem autorização e backup separados.

Para recuperar código, preferir `git revert <commit>` revisado e novo push, ou restaurar a imagem conhecida no Easypanel. Não resetar/force-push, recriar o serviço ou apagar volumes.
