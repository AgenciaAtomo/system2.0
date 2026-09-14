# Fase 4 — Produtos e ficha de custo

Implementação básica de 10/09/2026 em /produtos. Esta etapa não inicia Marketplaces ou Vendas.

## Uso

1. Cadastre o produto com código e preço de referência.
2. Crie uma versão Padrão, uma cor ou um kit com SKU próprio.
3. Adicione os materiais consumidos por unidade vendida (no caso de kit, pelo kit inteiro).
4. Opcionalmente habilite a ficha 3D, informe o filamento e os dados do lote.
5. Salve para visualizar a composição de custo e margem antes de taxas, frete e tributos.

Editar o preço de referência do produto não altera preços já salvos nas versões. Desative versões/produtos que deixaram de ser vendidos. Não há exclusão física nem consumo de estoque no cadastro.

## Cálculo

Regra central em src/lib/products.ts, chamada na renderização do servidor. Decimal.js com 50 dígitos de precisão; não há cálculo paralelo nos formulários. Componentes: quantidade convertida para unidade base × (1 + desperdício/100) × custo médio do insumo. Desperdício de 0 a 100%.

Todos os pesos e tempos 3D referem-se ao lote inteiro; quantity_per_batch significa unidades vendáveis por lote, inclusive número de kits. Filamento por unidade = (peças + suportes + purga) / (1 − failed_print_rate) / quantidade do lote. A interface recebe percentual, persistido como fração entre 0 inclusive e 1 exclusive.

Energia = potência/1000 × tempo/60 × tarifa / lote. Máquina e manutenção = tempo/60 × custo por hora / lote. Mão de obra = minutos manuais/60 × custo por hora / lote. As falhas corrigem apenas filamento, conforme especificação, sem ampliação implícita a energia ou tempos. O filamento da ficha 3D não pode reaparecer na BOM; embalagem e acessórios devem estar na BOM ou em outros custos, sem dupla inclusão manual.

Outros custos diretos são por unidade vendida. Rateio opcional de indiretos (0–100%) incide sobre o subtotal direto. Custo atual desconhecido ou material inativo deixa a ficha incompleta, sem total ou margem enganoso. Um custo zero explicitamente informado é permitido. Margem = (preço − custo)/preço; preço zero não tem margem calculada. É estimativa operacional antes de taxas de canais, frete e tributos, não lucro líquido.

Componentes são mostrados com até seis decimais; total destacado em centavos. Cálculos intermediários preservam precisão. A ficha atual muda ao mudar o custo dos insumos. product_revisions registra versões dos cadastros, incluindo BOM e parâmetros 3D; não representa um snapshot de venda. Snapshots de vendas só serão implementados na fase de Vendas. A função produz uma assinatura com versão da variante e dos insumos para rastreio futuro.

## Persistência e acesso

products, product_variants, product_components e product_revisions têm RLS por organização e operational.read. Escrita direta negada; save_product exige operational.write e associação ativa, executa transação com lock e chave idempotente e rejeita versões antigas. Componentes pertencem à mesma organização por FKs compostas. Falhas após UPDATE da variante e remoção da BOM desfazem tudo, incluindo auditoria. Tipos regenerados do banco remoto.

SKUs únicos por organização em cada catálogo; produto possui código de agrupamento e versões possuem SKUs vendáveis. Máximo de 100 versões/produto, 100 componentes/versão. Catálogo paginado em 25 produtos. Seletor limitado a 1.001 insumos, com aviso quando atinge esse limite.

## Validação e limites

22 testes unitários aprovados, incluindo conversão, desperdício, custo de lote/unidade, falhas, custo desconhecido, preço zero e imutabilidade do resultado anterior. TypeScript e build de produção aprovados. supabase/tests/products.sql aprovado com rollback: cadastro/edição, retry, versão obsoleta, isolamento sem associação, DML direto, filamento duplicado, taxa de 100%, lote vazio, histórico de versões e falha intermediária sem escrita parcial. Nenhum produto fictício persistido.

Advisors de segurança e performance executados antes e depois. Índice composto de variante/organização adicionado após aviso de FK sem cobertura. Tabelas privadas de idempotência sem política são intencionais e sem grants; índices não usados são esperados no módulo novo. Descoberta de tabelas pelo GraphQL para authenticated continua sujeita à RLS; os testes verificam a restrição por organização. Avisos antigos de autenticação e funções da Fundação permanecem documentados.

Referências: [Funções no Supabase](https://supabase.com/docs/guides/database/functions), [Advisor GraphQL](https://supabase.com/docs/guides/database/database-linter), [Políticas de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Foto do produto, gráfico de evolução, seletor para mais de 1.001 insumos, interface de comparação de revisões, testes concorrentes com sessões independentes e matriz completa de papéis ainda pendentes. O recorte básico não equivale à conclusão integral de todos os requisitos avançados da especificação. Marketplaces, anúncios e taxas ficam para a fase seguinte.

## Ativação local

O processo já aberto na porta 3001 ainda carregava a versão anterior e retornou 404 para a nova rota. Foi solicitado ao usuário fechar a janela Bueno Express e reabrir Iniciar Bueno Express.cmd. Build novo pronto; conferência da interface autenticada de Produtos pendente dessa reinicialização. Não substituir o processo estável do usuário por um processo temporário do agente, pois os anteriores encerraram entre turnos.
