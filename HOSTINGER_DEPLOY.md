# 🚀 Guia de Implantação Validado (Hostinger)

Este documento foi revisado estruturalmente para garantir a execução 100% livre de conflitos na Hostinger.

## REQUISITOS DO PROJETO
- **Node.js:** `>= 20.0.0` (Devido à compilação e CommonJS compatibilities).
- **Banco de Dados:** MySQL ou MariaDB. O script não possui resquícios de PostgreSQL, UUID nativo, nem Row-Level Security. É puro MySQL.
- **Armazenamento:** Acesso local à pasta de projeto onde o Node.js rodará, com capacidade para ler/escrever arquivos no diretório `uploads`.

---

## CONFIGURAÇÕES QUE PRECISAM SER CONFIRMADAS NA HOSTINGER

### 1. Criar o Banco e Usuário
*Precisa ser feito no hPanel (Bancos de Dados > Gerenciamento).*
1. Crie o banco `itapoa_online` e um usuário com todos os privilégios.
2. Acesse o **phpMyAdmin** fornecido pela Hostinger e importe **NA ORDEM**:
   1. `database/schema/MYSQL_SCHEMA.sql` (estrutura das tabelas)
   2. `database/schema/SEED.sql` (dados obrigatórios: papéis, admin master e planos)
   3. `database/schema/SEED_DEMO.sql` (catálogo demo: cidades, bairros, categorias e 16 empresas — sem ele a busca retorna vazio)

> ⚠️ **O SEED.sql é obrigatório, não opcional.** A tabela `users` tem uma
> foreign key para `roles`, então sem os papéis semeados **todo cadastro falha**.
> Ele também cria a conta admin master (`admin@itapoa.online`) com uma senha
> inicial aleatória entregue separadamente — **troque-a após o primeiro login**.

### 2. Configurar a Aplicação Node.js
*No hPanel > Avançado > Node.js:*
1. **Nova Aplicação**: Configure apontando para a raiz dos arquivos subidos.
2. **Modo:** Production.
3. **Startup File:** `dist/server.cjs`
4. **Porta:** Confirme se a Hostinger irá gerenciar a porta através de `process.env.PORT`. (O app está programado para escutar nela de forma invisível).

### 3. Inserir Variáveis de Ambiente
*Insira diretamente no painel de controle do app Node.js:*
```text
NODE_ENV=production
PORT=3000
APP_URL=https://itapoa.online
DB_HOST=127.0.0.1 (Confirme no painel)
DB_PORT=3306
DB_NAME=<seu-banco>
DB_USER=<seu-user>
DB_PASSWORD=<sua-senha>
JWT_SECRET=<hash-longo-e-seguro-min-32-caracteres>

# Pagamentos (Mercado Pago) — necessários para cobranças reais
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
MERCADOPAGO_WEBHOOK_SECRET=<segredo-do-webhook-do-painel-mp>

# Opcional: caminho absoluto persistente para uploads (recomendado na Hostinger,
# para que os arquivos não sejam apagados a cada deploy)
# UPLOAD_DIR=/home/uXXXX/uploads
```

> 💳 **Pagamentos:** sem `MERCADOPAGO_ACCESS_TOKEN`, os endpoints de cobrança
> retornam 503 (o resto do site funciona). Configure a URL de webhook
> `https://itapoa.online/api/webhooks/mercadopago` no painel do Mercado Pago e
> copie o *webhook secret* para `MERCADOPAGO_WEBHOOK_SECRET`. A ativação da
> assinatura acontece **apenas** via webhook verificado — nunca pelo frontend.

### 4. Upload dos Arquivos
1. Acesse o Gerenciador de Arquivos.
2. Envie o conteúdo do projeto **EXCETO** `.env` e `node_modules`.
3. Verifique se o pacote subiu com a pasta `dist/` gerada pelo `npm run build`.

### 5. Start
1. No painel do app, clique em **Executar npm install**.
2. Clique em **Iniciar**.
3. O servidor estará rodando.

### 6. SSL e Domínio
Configure o Let's Encrypt padrão da Hostinger para `itapoa.online` e deixe-o fazer proxy para a aplicação Node.js transparente.
