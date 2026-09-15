# Arquitetura e regras
Next.js App Router + React + TypeScript, Supabase Auth/PostgreSQL/Storage.
Nenhum banco operacional alternativo, projeto Supabase substituto ou Prisma.
Server Actions recebem entradas validadas; serviços revalidam identidade e autorização por operação.
Auth não equivale a autorização: associação ativa e permissão no banco são obrigatórias.
Clientes autenticados criados por requisição, sem cache compartilhado.
As migrations de Fundação foram aplicadas. A aplicação consulta organização, perfil, documentos e auditoria sob a sessão do usuário. Tabelas financeiras legadas têm leitura restrita e aguardam a Fase 2.

## Matriz
Administrador: todos os domínios dentro da organização.
Financeiro: financeiro e vendas leitura/escrita/auditoria, operacional somente leitura.
Operacional: operacional leitura/escrita/auditoria, sem financeiro ou vendas.
Visualização: leitura dos domínios, sem escrita e sem auditoria.
Anexos herdam a permissão da entidade vinculada. Papéis e associações não são editáveis diretamente pelo cliente.

## Precisão para fases seguintes
Valores monetários transportados como texto decimal; NUMERIC no banco e decimal.js nos serviços.
Liquidação com duas casas e arredondamento HALF_UP; custos unitários com ao menos quatro casas.
Rateios devem distribuir resíduos deterministicamente por ID estável.
Competência/vencimento como date; instantes timestamptz, apresentação America/Sao_Paulo.
Receber venda já reconhecida não cria nova receita. Compras não são simultaneamente despesa operacional e CPV.
Snapshots confirmados imutáveis, ajustes versionados e auditados.
Compras, vendas, transferências, baixas e estoque exigem RPC transacional com idempotência e bloqueio.
Storage não participa da transação PostgreSQL: pending/confirmed/failed com recuperação idempotente.
Estas regras estão documentadas; os motores financeiros pertencem às fases seguintes e não foram implementados.

## Referências verificadas
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/changelog
- https://nextjs.org/docs/app/getting-started/installation
Changelog revisado em 09/09/2026: Node >=22; mudanças de exposição Data API exigem grants explícitos; não alterar schemas gerenciados.

