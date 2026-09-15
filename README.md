# Bueno Express — Financeiro, Insumos e Produtos
Financeiro em /financeiro; materiais, compras e estoque em /insumos; produtos, versões e ficha de custo 3D em /produtos. Consulte docs/FASE-2.md, docs/FASE-3.md e docs/FASE-4.md. Pendências das fases anteriores continuam documentadas; transferências foram adiadas pelo usuário.
O usuário autorizou continuar sem Docker, validando migrations incrementais no projeto existente, e manter login somente para sua conta.

## Funcional agora
Login Supabase Auth; conta administradora vinculada à empresa; autorização por associação ativa e papel; RLS e grants; auditoria base; envio e download privado de PDF/PNG/JPEG; confirmação idempotente de arquivos.
Tela de configurações mostra o acesso real, os documentos e os dez últimos eventos de auditoria.
A identidade legada com senha_hash não é utilizada e não está acessível pela API da aplicação.
Cadastros de contas/categorias/centros e lançamentos manuais estão disponíveis, incluindo edição de pendências, baixa integral, cancelamento com motivo, filtros e histórico preservado. Baixas parciais e parcelamento simples também estão disponíveis; a opção Parcelar fica recolhida por padrão. Consulte docs/BAIXAS-E-PARCELAS.md. O resumo básico está na entrada do Financeiro: saldos por conta, recebido/pago no mês e valores em aberto. Consulte docs/RESUMO-FINANCEIRO.md. A rota /financeiro/extrato importa extratos CSV/TXT/OFX, registra automaticamente lançamentos já reconhecidos e mantém novidades numa fila de categorização. Transferências, comprovantes, PDF bancário e indicadores avançados seguem pendentes.

## Executar
Node.js 22+ e pnpm 11.19.0.
```sh
pnpm install --frozen-lockfile
pnpm dev
```
Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local conforme .env.example. Nesta máquina já estão configurados.
Não versionar .env.local nem usar secret/service_role no cliente.

## Verificar
```sh
pnpm test
pnpm typecheck
pnpm build
```
Testes reais SQL: supabase/tests/access.sql (faz rollback de todas as alterações de teste).
Testes de API: tests/live-api.mjs, usando BE_TEST_EMAIL/BE_TEST_PASSWORD apenas no ambiente. Esse teste guarda uma imagem técnica claramente identificada como evidência, não insere transações fictícias.
Teste de lançamentos: tests/live-entries.mjs (login real, rotas, RPCs e bloqueios de acesso; sem gravação de dados de negócio). Regras transacionais em supabase/tests/financial_entries.sql e supabase/tests/bank_statement_imports.sql, com rollback.
Teste de sessão/rotas: tests/live-session.mjs; exige servidor local ativo e um arquivo confirmado.
Não gravar credenciais de teste em arquivos ou logs.

## Migrations
As migrations em supabase/migrations refletem o histórico remoto oficial.
Foram aplicadas pelo conector oficial Supabase; a CLI local estava bloqueada. O número do arquivo foi obtido do histórico remoto, sem inventar identificador.
supabase/baseline/legacy.sql reproduz a estrutura do legado antes da Fundação, sem dados. Não executar no projeto existente.
O seed contém apenas catálogos de papéis/permissões e é idempotente. Não contém pessoas ou saldos fictícios.
Tipos TypeScript gerados do schema remoto após as migrations de lançamentos.

## Deploy
Build Next.js: pnpm build; execução: pnpm start. Hospedagem deve suportar Node.js e as variáveis acima.
Configurar origem HTTPS e redirecionamentos do Supabase Auth antes de hospedar. A aplicação segue local; publicação não foi realizada.
Cadastro público e interface de gestão de usuários não fazem parte do recorte simplificado autorizado.

## Evidências e pendências
Consulte docs/FASE-1.md e docs/ARQUITETURA.md.
Ainda falta validar recuperação independente do banco/Storage, retentativas completas de upload e testes com identidades separadas para todos os papéis. Não foi declarada aprovação integral de todos os critérios da especificação.



Edição/exclusão lógica e atalhos Contas a pagar/receber: docs/EDICAO-EXCLUSAO.md. Instância local atualmente disponível em http://127.0.0.1:3001.

Calculadoras Mercado Livre e Produção 3D integradas a Produtos: consulte docs/CALCULADORAS.md. Tipos atualizados após a migration de calculadoras.

## MVP operacional conectado
Produção, estoque de acabados, vendas, recebíveis, conciliação, canais/taxas, importação CSV/XLSX, metas, alertas, dashboard, relatórios e diagnóstico por regras estão em docs/MVP-OPERACIONAL.md. Inicie pela rota /dashboard. Banco e histórico compartilhados; não há dados demonstrativos permanentes. A porta 3001 foi ocupada por outro programa nesta máquina; a instância atual usa http://127.0.0.1:3002/dashboard.

