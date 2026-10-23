# Backup verificado — 23/10/2026

Autorização: usuário solicitou criar os backups e prosseguir; autorizou
separadamente a transferência SSH temporária, limitada à leitura do pacote.

## Cópias preservadas

- VPS: `/var/backups/itapoa/site-20261023T055338Z-39908273388/`.
- Fora da VPS, no computador do responsável:
  `Downloads/Backups Itapoa Online/2026-10-23/site-20261023T055338Z-39908273388.tar.gz`.
- SHA-256 do pacote nas duas cópias:
  `96e264a8fb460fd7c39373302f31f0a24467b803cdd8e19447495206ddebf340`.
- Tamanho: 19.713 bytes comprimidos. Pacote contém dados sensíveis: não enviar
  ao GitHub, artifacts, logs públicos ou repositório. Pasta local tem ACL privada;
  cópia da VPS está restrita ao usuário administrador.

## O que foi validado

Actions `39908273388`: dump consistente, fingerprints antes/depois, restauração
em MariaDB descartável da mesma imagem, sem rede externa/portas/volumes de
produção. `mariadb-check` e fingerprints da cópia restaurada corresponderam.
Manifestos de uploads antes/depois/cópia corresponderam. SHA-256 e tamanho do
pacote transferido conferiram com a VPS; estrutura do tar foi conferida.

Uploads atuais: **zero arquivos**. Containers anteriores disponíveis e caminhos
legados consultados: **zero arquivos recuperáveis**. Este backup preserva o
estado encontrado, mas não comprova recuperação dos 142 arquivos históricos.
Não houve exclusão de arquivos, dados de clientes ou volumes de produção.

O pacote inclui o dump, snapshots privados dos serviços app/banco, manifestos e
resultado da verificação. Não substitui cópia de toda a configuração do Easypanel
ou snapshots completos do provedor.

## Transferência encerrada

Chave autorizada por uma hora, com `restrict` e comando fixo para ler apenas esse
pacote. Remoção verificada em Actions `39908756465`; chave pública temporária
removida do GitHub e chave privada temporária apagada do computador. As cópias
do backup foram preservadas. Nenhuma chave SSH preexistente foi removida.

## Restaurar sem perder dados posteriores

1. Validar SHA-256 do pacote e preservar uma nova cópia do estado atual.
2. Extrair apenas em diretório isolado/protegido; confirmar os caminhos do tar.
3. Restaurar o SQL primeiro em banco isolado da mesma versão e validar tabelas,
   vínculos, contagens e aplicação. Nunca importar diretamente sobre produção.
4. Reavaliar vendas, cadastros e uploads ocorridos desde 23/10/2026 05:53 UTC.
   Um restore completo descartaria essas alterações; exige decisão e autorização.
5. Para código, preferir rollback da imagem, preservando env e mounts. Não
   restaurar automaticamente snapshots de configuração ou segredos sobre o serviço.
6. Para arquivos, copiar para o armazenamento persistente preparado e comparar
   manifestos; nunca montar volume vazio sobre dados não preservados.

Publicação não executa restore, migração de schema, seeds ou configuração de
pagamentos como efeito colateral. Armazenamento deve ser configurado explicitamente
no Easypanel e testado por recriação controlada com comparação de arquivos.
