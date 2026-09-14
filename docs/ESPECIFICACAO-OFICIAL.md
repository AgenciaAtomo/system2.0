# BUENO EXPRESS — ESCOPO MESTRE V2 DO SISTEMA FINANCEIRO, CUSTOS E E-COMMERCE

Versão documental: **V2 — infraestrutura oficial Supabase**. Data: 09/09/2026.

Este documento substitui a especificação anterior como fonte única para implementação. Preserva seus módulos, campos funcionais, exemplos, fórmulas, telas, testes e roadmap, atualizando a arquitetura e detalhando os controles exigidos para Supabase. V2 é a versão deste documento; o MVP continua sendo a V1 do roadmap do produto.

Projeto Supabase existente: **Bueno Express**. Este documento não contém URL, identificador técnico ou credenciais do projeto. A estrutura atual não foi inspecionada durante esta revisão documental; a inspeção é uma etapa obrigatória da implementação.

Infraestrutura obrigatória: **Next.js + TypeScript + Supabase PostgreSQL + Supabase Auth + Supabase Storage + @supabase/supabase-js + migrations SQL**. Não criar um banco separado nem outro projeto para substituir o existente. Prisma não é requisito inicial e não deve ser introduzido no MVP.

## 1. Visão geral do projeto

O sistema será o núcleo operacional e financeiro da Bueno Express, começando por controle financeiro, custos, insumos, produtos, vendas e análise inteligente. A arquitetura deve nascer simples o suficiente para ser implementada rapidamente, mas estruturada para permitir crescimento posterior para estoque avançado, integrações com marketplaces, conciliação automática, produção, compras, fornecedores e inteligência financeira.

A primeira versão NÃO deve tentar ser um ERP completo. O foco é construir um sistema próprio, enxuto e confiável para responder com precisão:

- Quanto a empresa faturou.
- Quanto efetivamente recebeu.
- Quanto gastou.
- Quanto cada produto custa de verdade.
- Quanto cada venda gerou de lucro.
- Qual marketplace é mais lucrativo.
- Qual produto possui melhor margem.
- Quais custos estão aumentando.
- Quanto cobrar para obter uma determinada margem.
- Quantas unidades ainda podem ser produzidas com o estoque atual.
- Quais despesas estão fora do padrão.
- Quais recebimentos ainda não foram conciliados.
- Quais produtos ou operações estão prejudicando o resultado.

O sistema deve ser preparado desde o início para trabalhar em conjunto com uma skill/agente de análise financeira, permitindo consultas em linguagem natural e geração de diagnósticos.

---

# 2. Objetivos principais

## 2.1 Objetivos da V1

A V1 precisa entregar:

1. Dashboard financeiro.
2. Cadastro de contas financeiras.
3. Plano de categorias.
4. Centros de custo.
5. Lançamentos financeiros.
6. Contas a pagar.
7. Contas a receber.
8. Cadastro de insumos.
9. Compras de insumos.
10. Histórico de preço de insumos.
11. Controle básico de estoque de insumos.
12. Cadastro de produtos e SKUs.
13. Variações de produtos.
14. Ficha de custo/BOM.
15. Ficha de produção 3D.
16. Cálculo automático do custo unitário.
17. Cadastro de marketplaces.
18. Regras de taxas por marketplace.
19. Registro/importação de vendas.
20. Snapshot dos custos no momento da venda.
21. Lucro por pedido e por item.
22. Recebíveis.
23. Conciliação.
24. Simulador de preço.
25. Metas e alertas.
26. Relatórios essenciais.
27. Camada de análise inteligente.
28. Importação CSV/Excel.
29. Auditoria e histórico.

---

# 3. Princípios obrigatórios de arquitetura

## 3.1 Separar fatos históricos de valores atuais

Nunca recalcular o passado usando preços atuais.

Exemplo:

- Em janeiro, PETG = R$ 70/kg.
- Em março, PETG = R$ 85/kg.

Uma venda realizada em janeiro deve preservar o custo daquele momento.

Portanto, pedidos e itens vendidos devem possuir snapshots.

Campos típicos:

- unit_cost_snapshot
- material_cost_snapshot
- packaging_cost_snapshot
- production_cost_snapshot
- marketplace_fee_snapshot
- tax_snapshot
- shipping_cost_snapshot

---

## 3.2 Produto interno independente do marketplace

Um produto interno deve possuir SKU próprio.

Exemplo:

Produto:
Suporte de Capacete de Parede

SKU:
SUP-CAP-PRETO-01

Mercado Livre:
MLBxxxxxxxx

Shopee:
ID diferente

Amazon:
ASIN/SKU diferente

TikTok Shop:
ID diferente

O marketplace NÃO deve ser a identidade primária do produto.

---

## 3.3 Toda movimentação financeira precisa de origem

Um lançamento pode ter origem:

- manual
- venda
- compra
- taxa
- imposto
- marketplace
- ajuste
- estorno
- transferência
- conciliação
- importação

Salvar source_type e source_id.

---

## 3.4 Nunca excluir histórico financeiro definitivamente

Usar:

- soft delete
- cancelamento
- estorno
- status

Manter auditoria.

---

# 4. Perfis de acesso

Mesmo que inicialmente exista apenas um usuário, preparar:

## Administrador
Acesso total.

## Financeiro
Pode visualizar e editar financeiro.

## Operacional
Pode cadastrar produtos, insumos, produção e estoque.

## Visualização
Somente leitura.

Campos:

- profiles (perfil da aplicação vinculado a auth.users)
- roles
- permissions
- user_roles
- role_permissions
- organizations e organization_members (escopo de acesso da Bueno Express)

Na V1, RBAC pode ser simples, mas deve ser aplicado no servidor e no banco, conforme a seção 43. Supabase Auth é a única fonte de identidade; não criar cadastro paralelo de senhas. Administrador significa acesso total dentro da organização, sem conceder credenciais administrativas do Supabase ao navegador.

---

# 5. Módulo Dashboard

## 5.1 Cards principais

Exibir:

- Faturamento bruto.
- Receita líquida.
- Lucro bruto.
- Lucro líquido.
- Margem líquida.
- Total de despesas.
- Contas a receber.
- Contas a pagar.
- Valor previsto a receber de marketplaces.
- Quantidade de pedidos.
- Ticket médio.
- Produtos vendidos.
- Custo de mercadoria/produto vendido.
- Taxas de marketplaces.

Filtros:

- hoje
- ontem
- últimos 7 dias
- últimos 30 dias
- mês atual
- mês anterior
- intervalo personalizado

Filtros adicionais:

- marketplace
- produto
- SKU
- categoria
- centro de custo

---

## 5.2 Gráficos

Criar:

### Faturamento x lucro
Linha ou barras por dia.

### Receita x despesas
Comparação mensal.

### Lucro por marketplace
Barra.

### Lucro por produto
Ranking.

### Despesas por categoria
Gráfico de distribuição.

### Evolução de margem
Linha.

### Evolução do custo médio por produto
Linha.

---

## 5.3 Alertas do dashboard

Exemplos:

- PETG preto abaixo do estoque mínimo.
- Conta de R$ 450 vence amanhã.
- Mercado Livre possui R$ 2.380 ainda não conciliados.
- Produto X caiu abaixo da margem mínima.
- Custo do filamento aumentou 14% em 30 dias.
- Despesas com embalagem estão 22% acima da média.
- Existem vendas importadas sem SKU associado.

---

# 6. Módulo Financeiro

## 6.1 Contas financeiras

Tipos:

- conta bancária
- carteira
- caixa
- marketplace
- conta digital

Campos:

- id
- nome
- tipo
- saldo_inicial
- moeda
- ativo
- data_criacao

Exemplo:

- Nubank PJ
- Mercado Pago
- Saldo Mercado Livre
- Caixa
- Shopee Recebíveis

---

## 6.2 Categorias financeiras

Categorias hierárquicas.

Exemplo:

Receitas
- Vendas Mercado Livre
- Vendas Shopee
- Vendas Amazon
- Vendas TikTok

Custos
- Filamento
- Embalagem
- Fita
- Parafusos

Operacional
- Energia
- Manutenção
- Ferramentas
- Software

Marketing
- Meta Ads
- Google Ads
- TikTok Ads

Tributos
- DAS
- Impostos

Logística
- Frete
- Etiquetas
- Embalagens

---

## 6.3 Centros de custo

Exemplos:

- Produção 3D
- Marketplace
- Marketing
- Administrativo
- Logística

Uma movimentação pode possuir:

category_id
cost_center_id

---

## 6.4 Lançamentos financeiros

Campos:

- id
- type: income | expense | transfer
- description
- amount
- due_date
- paid_date
- competence_date
- account_id
- category_id
- cost_center_id
- status
- source_type
- source_id
- notes
- attachment_id (referência a attachments; acesso privado pelo Supabase Storage)
- created_by
- created_at
- updated_at

Status:

- pending
- paid
- overdue
- cancelled
- partially_paid

---

## 6.5 Contas a pagar

Funções:

- cadastrar conta
- parcelar
- recorrência
- vencimento
- marcar como paga
- pagamento parcial
- anexar comprovante
- filtrar vencidas
- alerta de vencimento

---

## 6.6 Contas a receber

Mesma lógica, podendo estar vinculada a:

- venda
- marketplace
- cliente
- outro

---

# 7. Módulo de Insumos

## 7.1 Cadastro

Campos:

- id
- nome
- SKU interno
- categoria
- unidade_base
- estoque_atual
- estoque_minimo
- custo_medio
- ultimo_custo
- fornecedor_padrao
- ativo

Unidades:

- g
- kg
- ml
- l
- unidade
- metro
- cm

Exemplo:

PETG Preto
unidade base: grama

Compra:
1 kg = 1000 g
R$ 75

Custo:
75 / 1000 = R$ 0,075/g

---

## 7.2 Compras de insumos

Campos:

- supplier
- purchase_date
- quantity
- purchase_unit
- converted_quantity
- total_price
- unit_cost
- freight
- taxes
- other_costs
- final_cost

Custo efetivo:

(total_price + freight + taxes + other_costs) / quantidade convertida

---

## 7.3 Histórico de custo

Tabela input_cost_history:

- input_id
- date
- quantity
- total_value
- unit_cost
- purchase_id

Permitir gráfico de evolução.

---

## 7.4 Estoque

Movimentos:

- purchase
- production_consumption
- manual_adjustment
- loss
- return

Tabela inventory_movements.

Campos:

- input_id
- type
- quantity
- source_type
- source_id
- date

---

# 8. Produtos

## 8.1 Cadastro principal

Campos:

- id
- name
- internal_sku
- category
- description
- status
- default_sale_price
- minimum_margin
- image_attachment_id (referência a attachments; acesso pelo Supabase Storage)
- created_at

---

## 8.2 Variações

Exemplos:

Produto:
Gancho de parede

Variações:
- Branco
- Preto
- Kit 3
- Kit 6

Campos:

- product_id
- sku
- attributes JSON
- price
- status

---

## 8.3 Mapeamento marketplace

Tabela marketplace_listings:

- marketplace_id
- product_variant_id
- external_listing_id
- external_sku
- listing_title
- listing_url
- active

---

# 9. Ficha de custo / BOM

Cada produto deve possuir componentes.

Exemplo:

Produto: Saboneteira

- PETG Preto: 75 g
- Fita 3M: 0,20 m
- Embalagem: 1 unidade

Tabela product_components:

- product_variant_id
- input_id
- quantity
- unit
- waste_percentage

Cálculo:

component_cost =
quantity × current_input_cost

Aplicar desperdício:

adjusted_quantity =
quantity × (1 + waste_percentage / 100)

---

# 10. Ficha de Produção 3D

Especialmente importante.

Campos:

- product_variant_id
- piece_weight_g
- support_weight_g
- purge_weight_g
- failed_print_rate
- print_time_minutes
- quantity_per_batch
- printer_power_watts
- electricity_price_kwh
- machine_hour_cost
- maintenance_cost_per_hour
- labor_minutes
- labor_hour_cost

---

## 10.1 Filamento efetivo

filament_total =
piece_weight +
support_weight +
purge_weight

Com falhas:

filament_adjusted =
filament_total / (1 - failed_print_rate)

---

## 10.2 Energia

energy_kwh =
(printer_power_watts / 1000)
×
(print_time_minutes / 60)

energy_cost =
energy_kwh × electricity_price_kwh

---

## 10.3 Hora máquina

machine_cost =
(print_time_minutes / 60)
× machine_hour_cost

---

## 10.4 Manutenção

maintenance_cost =
(print_time_minutes / 60)
× maintenance_cost_per_hour

---

## 10.5 Mão de obra

labor_cost =
(labor_minutes / 60)
× labor_hour_cost

---

## 10.6 Custo de produção

production_cost =
filament_cost
+ energy_cost
+ machine_cost
+ maintenance_cost
+ labor_cost
+ packaging
+ accessories
+ other_direct_costs

---

# 11. Custos diretos e indiretos

## Diretos
- material
- embalagem
- parafuso
- fita
- energia específica
- produção
- comissão específica

## Indiretos
- software
- aluguel
- internet
- DAS
- ferramentas
- manutenção geral
- publicidade institucional

Não obrigar rateio de indiretos na V1.

Mas permitir campo opcional:

overhead_percentage

ou

monthly_overhead_allocation

---

# 12. Marketplaces

Tabela marketplaces:

- id
- name
- active

Exemplos:

- Mercado Livre
- Shopee
- Amazon
- TikTok Shop
- Site próprio

---

# 13. Regras de taxas

Tabela marketplace_fee_rules.

Campos:

- marketplace_id
- name
- type
- percentage
- fixed_value
- minimum_price
- maximum_price
- effective_from
- effective_to
- priority

Permitir taxas combinadas.

Exemplo:

commission = 12.5%
fixed fee = R$ 6

O sistema deve calcular usando as regras vigentes na data da venda.

E salvar snapshot.

---

# 14. Vendas

## 14.1 Pedido

Campos:

- id
- marketplace_id
- external_order_id
- order_date
- status
- gross_amount
- discount_amount
- shipping_paid_by_customer
- shipping_cost_company
- marketplace_fees
- taxes
- net_revenue
- total_product_cost
- profit
- margin
- payment_status

---

## 14.2 Item do pedido

Campos:

- order_id
- product_variant_id
- external_sku
- quantity
- unit_sale_price
- gross_total
- unit_cost_snapshot
- total_cost_snapshot
- fee_snapshot
- profit
- margin

---

## 14.3 Fórmula de resultado

gross_revenue =
soma dos itens

net_revenue =
gross_revenue
- discounts
- marketplace_fees
- shipping_company
- taxes
- other_sale_expenses

profit =
net_revenue
- product_cost

margin =
profit / gross_revenue × 100

Também exibir:

ROI sobre custo =
profit / product_cost × 100

---

# 15. Snapshot obrigatório

Ao registrar venda, copiar:

- custo de cada insumo
- custo da ficha
- custo do produto
- taxa aplicada
- imposto
- frete
- preço vendido

Nunca depender apenas da ficha atual.

---

# 16. Recebíveis

Marketplaces podem pagar depois.

Tabela receivables:

- order_id
- marketplace_id
- expected_date
- expected_amount
- received_date
- received_amount
- status

Status:

- pending
- partially_received
- received
- divergent

---

# 17. Conciliação

Tela deve comparar:

VALOR ESPERADO
vs
VALOR RECEBIDO

Diferença:

difference =
received_amount - expected_amount

Sinalizar divergências.

Possíveis motivos:

- tarifa adicional
- ajuste de frete
- estorno
- chargeback
- antecipação
- imposto
- erro de importação

---

# 18. Importação CSV / Excel

A V1 deve possuir importador genérico.

Fluxo:

1. upload
2. leitura de colunas
3. preview
4. usuário mapeia colunas
5. validação
6. identificação de duplicatas
7. importação
8. relatório final

Tipos:

- vendas
- extrato
- recebíveis
- compras
- insumos

Não importar silenciosamente dados inválidos.

Exibir:

- importados
- ignorados
- duplicados
- com erro

---

# 19. Simulador de preço

Tela fundamental.

Inputs:

- produto
- variante
- marketplace
- preço de venda
- frete
- imposto
- desconto
- outros custos

Outputs:

- custo do produto
- taxa marketplace
- receita líquida
- lucro
- margem
- ROI

---

## 19.1 Preço por margem desejada

Usuário informa:

"Quero margem de 35%."

Sistema calcula preço mínimo estimado.

Para taxa percentual p:

Preço aproximado:

price =
(fixed_costs + product_cost)
/
(1 - marketplace_rate - tax_rate - desired_margin)

Considerar taxa fixa separadamente.

---

## 19.2 Indicadores visuais

Exemplo:

Margem < 15%
CRÍTICA

15% a 25%
BAIXA

25% a 35%
SAUDÁVEL

>35%
ÓTIMA

Os limites devem ser configuráveis.

---

# 20. Estoque e capacidade produtiva

Além do estoque atual, calcular:

possible_units =
floor(stock / consumption_per_product)

Quando múltiplos insumos:

possible_units =
mínimo possível entre todos os componentes

Exemplo:

PETG permite 20 peças.
Fita permite 50.
Embalagem permite 35.

Capacidade atual = 20.

---

# 21. Metas

Tabela goals:

- metric
- target
- period
- start_date
- end_date

Exemplos:

- faturamento mensal
- lucro mensal
- margem mínima
- pedidos
- ticket médio

Dashboard:

Meta R$ 20.000
Realizado R$ 13.400
67%

---

# 22. Alertas

Tabela alerts.

Tipos:

- low_stock
- low_margin
- overdue_payable
- overdue_receivable
- reconciliation_difference
- cost_increase
- abnormal_expense
- missing_product_mapping

Permitir marcar como resolvido.

---

# 23. Análise inteligente

O sistema deve disponibilizar dados de forma estruturada para uma skill/agente de análise.

A IA nunca deve inventar números.

Ela deve utilizar dados do banco.

Consultas esperadas:

- Analise meu financeiro deste mês.
- Quanto lucrei esta semana?
- Qual produto mais lucrativo?
- Qual marketplace está com pior margem?
- Onde meus custos aumentaram?
- Tenho contas vencendo?
- Estou gastando mais que o normal?
- Qual produto devo reajustar?
- Quanto devo cobrar pelo produto X?
- Meu lucro caiu por quê?
- Quanto tenho previsto para receber?

---

## 23.1 Resposta inteligente

Formato sugerido:

### Resumo
Faturamento
Receita líquida
Lucro
Margem

### Principais fatores

### Pontos de atenção

### Recomendações

### Dados utilizados

---

# 24. Detecção de anomalias simples

Não precisa ML inicialmente.

Usar comparações estatísticas.

Exemplo:

Despesa média embalagem últimos 3 meses:
R$ 800

Mês atual:
R$ 1.120

Aumento:
40%

Gerar alerta.

---

# 25. Relatórios

## Relatório financeiro
- receitas
- despesas
- resultado

## Relatório por marketplace
- faturamento
- taxas
- lucro
- margem

## Relatório por produto
- unidades
- faturamento
- custo
- lucro
- margem

## Relatório de custos
- custo atual
- histórico
- variação

## Relatório de estoque
- saldo
- consumo
- estoque mínimo
- capacidade

## DRE gerencial simplificada

Receita Bruta
(-) Descontos
(-) Taxas
(-) Fretes
(-) Impostos
= Receita Líquida
(-) CPV
= Margem de Contribuição
(-) Despesas Operacionais
= Resultado

---

# 26. Auditoria

Criar audit_logs:

- user_id
- action
- entity
- entity_id
- old_value JSON
- new_value JSON
- timestamp
- ip opcional

Registrar:

- alteração de custo
- exclusão
- alteração de venda
- conciliação
- alteração financeira

---

# 27. Interface

Direção:

- clean
- moderna
- profissional
- preto/branco/cinza
- poucos elementos
- foco em números
- responsiva
- desktop-first

Sidebar:

Dashboard
Financeiro
Vendas
Produtos
Custos
Estoque
Simulador
Relatórios
Análise
Configurações

---

# 28. Padrões de UX

Valores monetários:
R$ 1.250,90

Percentuais:
32,5%

Datas:
09/09/2026

Sempre confirmar ações destrutivas.

Usar modal ou drawer para cadastros rápidos.

Listagens devem permitir:

- busca
- filtros
- ordenação
- paginação
- exportação

---

# 29. Stack técnica oficial e obrigatória

## 29.1 Aplicação e infraestrutura

- Next.js com React e TypeScript, usando App Router.
- Tailwind e shadcn/ui para interface; Recharts para gráficos; Zod para validação.
- Server Actions e Route Handlers do Next.js para orquestração e serviços de domínio. Não introduzir NestJS ou backend independente como requisito inicial.
- Supabase PostgreSQL do projeto existente **Bueno Express** para dados estruturados.
- Supabase Auth para login, recuperação de acesso e sessões.
- Supabase Storage para comprovantes, notas, planilhas importadas, imagens e anexos.
- `@supabase/supabase-js` para acesso ao Supabase, com `@supabase/ssr` para integração de sessão com Next.js.
- Migrations SQL versionadas como fonte de verdade do schema, incluindo tabelas, constraints, índices, funções, triggers, grants e policies.
- Parser CSV/XLSX com preview e validação antes de persistir.
- Sem Prisma no MVP; não criar ORM, autenticação própria ou banco alternativo.

O banco oficial é exclusivamente o Supabase existente. Ambientes locais de teste podem reproduzir suas migrations usando Supabase local, sem se tornarem banco operacional separado ou substituírem o projeto. Não provisionar outro projeto remoto automaticamente.

Dados financeiros ficam em tabelas relacionais. Storage guarda os arquivos, e a tabela attachments guarda os metadados e vínculos. JSON é adequado para atributos, snapshots detalhados e auditoria; não substitui o modelo financeiro relacional.

## 29.2 Clientes e sessão

Separar os módulos:

- `src/lib/supabase/client.ts`: cliente do navegador, com publishable key e sessão do usuário.
- `src/lib/supabase/server.ts`: cliente por requisição no servidor, com cookies da sessão; operações comuns continuam sujeitas à RLS do usuário.
- `src/lib/supabase/admin.ts`: opcional, marcado como server-only, criado apenas se houver operação administrativa justificada. Não usar para contornar RLS em operações normais.
- `src/types/database.types.ts`: tipos gerados do schema Supabase.
- `src/services/`: serviços de domínio das seções 38 e 39.
- `supabase/migrations/`: migrations SQL; seed de demonstração separado e restrito a desenvolvimento/testes.

Validar identidade no servidor com os métodos recomendados pela versão instalada (`getClaims` para validar o token ou `getUser` para registro atualizado). Não autorizar usando apenas o objeto retornado por `getSession`. Integrar renovação de cookies conforme documentação SSR vigente. Não compartilhar cliente autenticado ou cache de dados privados entre usuários. Cada Server Action e Route Handler valida novamente identidade, organização, permissão e entrada; proteger apenas a página não basta.

Referência: [Clientes Supabase para SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## 29.3 Variáveis e segredos

O `.env.example` contém somente nomes e valores vazios:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Opcional: apenas se uma operação administrativa exigir
SUPABASE_SECRET_KEY=
```

A publishable key pode estar no navegador; não concede autorização por si só. RLS, grants e sessão determinam acesso. Secret keys e a chave legada service_role são exclusivamente server-side e podem ultrapassar RLS: nunca usar prefixo NEXT_PUBLIC_, enviar ao navegador, inserir em bundle, log, documento, chat ou repositório. Tokens de marketplace e provedores de IA também são segredos server-side. Credenciais reais ficam no ambiente seguro de execução; `.env.local` fica fora do versionamento. Uma service_role legada só pode ser usada por compatibilidade documentada, com o mesmo isolamento.

Referência: [Chaves de API Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## 29.4 Edge Functions e integrações

Usar Edge Functions somente quando houver necessidade concreta, como webhook ou processamento externo que justifique execução no Supabase. O CRUD e a orquestração do MVP usam Next.js e supabase-js; a atomicidade pertence ao PostgreSQL. Não criar Edge Functions para todas as tabelas.

Integrações futuras exigem autenticação/assinatura de origem, idempotência, rastreabilidade e segredos server-side. Não antecipar APIs automáticas do roadmap V2 ao MVP. Realtime é opcional e não substitui persistência nem transações.

---
# 30. Estrutura de banco sugerida

Tabelas principais (nomes lógicos a reconciliar com a estrutura existente):

auth.users (gerenciada pelo Supabase Auth)
profiles (id referencia auth.users.id)
organizations
organization_members
roles
permissions
role_permissions
user_roles
financial_accounts
financial_categories
cost_centers
financial_transactions
suppliers
inputs
input_purchases
input_cost_history
inventory_movements
products
product_variants
product_components
production_profiles
marketplaces
marketplace_listings
marketplace_fee_rules
orders
order_items
receivables
reconciliations
imports
import_rows
goals
alerts
attachments
audit_logs

---

## 30.1 Identidade, relacionamentos e isolamento

Não recriar auth.users nem modificar internamente os schemas gerenciados auth, storage ou realtime. Perfis da aplicação referenciam a identidade gerenciada pelo Supabase. O primeiro administrador é provisionado por procedimento controlado; cadastro público não pode atribuir privilégios.

As tabelas de negócio devem possuir organization_id obrigatório, timestamps apropriados, chaves estrangeiras e constraints. Criar inicialmente apenas a organização Bueno Express; isso é uma fronteira de segurança, sem acrescentar gestão multiempresa à interface do MVP. created_by identifica autoria, não substitui acesso compartilhado autorizado por organização.

Garantir também no banco que referências entre pedido, item, produto, recebível, conta e anexo pertençam à mesma organização, por constraints compostas ou validações equivalentes. Impedir troca de organization_id para escapar do controle de acesso.

Unicidade de SKU deve considerar organização. Unicidade de pedidos importados deve considerar organização, marketplace e external_order_id, além da conta do canal se múltiplas contas forem suportadas. Deduplicação sem ID externo deve usar chave determinística documentada e permitir revisão de colisões.

Complementar o modelo com entidades de baixas parciais e alocações de conciliação, para suportar múltiplos pagamentos por título e um repasse para vários recebíveis. Não sobrecarregar received_amount com o histórico completo. Snapshots detalhados devem armazenar componentes, quantidades, versões de regra e parâmetros utilizados.

## 30.2 Inspeção prévia e migrations SQL

Antes de qualquer migration:

1. Localizar o projeto existente pelo nome Bueno Express e verificar a conexão no ambiente autorizado. Não assumir banco vazio a partir do nome ou do histórico da conversa.
2. Inventariar schemas, tabelas, colunas, dados relevantes, constraints, índices, views, funções, triggers, extensões, grants, RLS/policies, histórico de migrations, Auth, buckets e Edge Functions existentes. O inventário não deve expor credenciais ou dados pessoais desnecessários.
3. Comparar o inventário com esta especificação e mapear entidades reutilizáveis. Registrar divergências e estratégia de preservação/backfill.
4. Conciliar a linha de base e o histórico local/remoto antes de gerar mudanças. Não reexecutar a criação de objetos já existentes, resetar o remoto ou apagar dados para fazer o schema caber.
5. Preparar migrations incrementais revisáveis e plano de recuperação. Mudanças destrutivas não estão implicitamente autorizadas por este documento.

Migrations SQL são a única fonte versionada do schema. Criar arquivos com a ferramenta de migrations da CLI, verificando `--help` da versão instalada. Experimentação de DDL deve ocorrer em ambiente local isolado, ser consolidada em migration e testada antes de aplicar ao projeto oficial. Não deixar DDL remoto fora do histórico versionado. Incluir policies/grants junto com as tabelas, sem janela de exposição irrestrita.

Após cada migration com DDL, executar os advisors de **segurança e performance** via ferramenta Supabase disponível ou CLI compatível, tanto na validação prévia quanto após aplicação ao ambiente alvo. Corrigir falhas críticas, documentar achados e justificativas de itens remanescentes; se a ferramenta estiver indisponível, registrar a verificação como pendente, nunca como aprovada. Advisors complementam testes, não comprovam autorização correta sozinhos.

Referência: [Advisors do Supabase](https://supabase.com/docs/guides/observability/advisors).

## 30.3 Tipos TypeScript

Gerar tipos TypeScript a partir do schema efetivamente migrado pelo Supabase CLI ou ferramenta oficial disponível. Versionar o resultado, tipar os clientes supabase-js e regenerar após cada alteração de schema. Incluir validação em CI para divergência entre schema e tipos; não manter um schema paralelo escrito à mão. Tipos gerados não substituem validação runtime nem autorização.

Referência: [Geração de tipos TypeScript](https://supabase.com/docs/guides/api/rest/generating-types).

---

# 31. Regras de precisão

Dinheiro nunca deve usar float.

Usar:

DECIMAL/NUMERIC

Exemplo:

NUMERIC(14,4)

Percentuais:

NUMERIC(8,4)

Quantidades:

NUMERIC(14,4)

---

# 32. Estados vazios

Nenhuma tela deve parecer quebrada.

Exemplo:

"Você ainda não cadastrou nenhum insumo."

Botão:
Cadastrar primeiro insumo

---

# 33. Seed inicial

Criar dados de demonstração apenas em desenvolvimento/testes, sem misturá-los aos dados reais. Seeds devem ser idempotentes. Cadastros básicos no projeto oficial só podem ser inseridos sem sobrescrever os existentes; não gerar vendas, saldos ou usuários fictícios em produção.

Marketplaces:

- Mercado Livre
- Shopee
- Amazon
- TikTok Shop

Categorias financeiras básicas.

Centros de custo.

Um produto demo.

Um insumo demo.

---

# 34. Critérios de aceite críticos

O sistema NÃO está pronto se:

- mudar custo atual altera lucro de venda antiga
- venda não guarda snapshot
- dinheiro usa float
- importação duplica pedidos
- produto depende de ID do marketplace
- movimentação financeira pode desaparecer sem log
- custo do produto não mostra composição
- conciliação não mostra diferenças
- estoque permite inconsistência sem ajuste registrado

---

# 35. Testes mínimos

Criar testes para:

- custo de insumo
- conversão kg → g
- custo do produto
- desperdício
- energia
- taxa percentual
- taxa fixa
- lucro
- margem
- preço mínimo
- snapshot
- importação duplicada
- conciliação

---

# 36. Roadmap

## V1
Financeiro + custos + vendas + estoque de insumos + simulador + análise.

## V2
APIs automáticas:
- Mercado Livre
- Shopee
- Amazon
- TikTok

Sincronização automática.

## V3
Produção:
- ordens de produção
- fila de impressoras
- consumo automático
- capacidade produtiva
- previsão

## V4
Compras inteligentes:
- fornecedores
- lead time
- sugestão de compra
- previsão de ruptura

## V5
Inteligência avançada:
- previsão de caixa
- previsão de demanda
- análise de rentabilidade
- recomendações

---

# 37. Plano detalhado de implementação para o Work

Você é responsável por construir um sistema web financeiro e operacional para a empresa Bueno Express.

Leia integralmente esta especificação antes de escrever código.

Seu objetivo é entregar um MVP funcional, robusto, escalável e visualmente profissional, com foco em controle financeiro, custos de produção, insumos, produtos, vendas de marketplaces, estoque, lucratividade e análise inteligente.

NÃO transforme o projeto em um ERP genérico.

Priorize simplicidade operacional, precisão financeira, histórico e rastreabilidade.

## Regras absolutas

1. Valores monetários nunca podem usar float.
2. Nenhuma venda histórica pode ter lucro alterado quando um custo atual mudar.
3. Toda venda deve possuir snapshot de custos e taxas.
4. Produto interno deve possuir SKU independente do marketplace.
5. Marketplace deve ser apenas um canal.
6. Toda movimentação de estoque precisa gerar histórico.
7. Toda alteração financeira relevante deve gerar auditoria.
8. Imports precisam ser idempotentes e detectar duplicatas.
9. Nenhuma exclusão financeira deve apagar histórico definitivamente.
10. Todas as fórmulas precisam ser centralizadas em serviços reutilizáveis.
11. Não duplicar regra de cálculo no frontend.
12. Toda tabela importante deve possuir timestamps.
13. Sempre validar inputs.
14. Criar migrations SQL Supabase após inspecionar a estrutura existente.
15. Criar seed.
16. Criar testes para regras financeiras.

## Ordem de desenvolvimento

### Fase 1 — Fundação

Criar:

- estrutura do projeto
- inspeção e mapeamento do projeto Supabase Bueno Express existente
- integração ao Supabase PostgreSQL, sem criar banco separado
- clientes supabase-js e SSR separados entre navegador e servidor
- Supabase Auth, organização, perfis, RBAC e policies RLS
- Supabase Storage com buckets privados e policies
- tipos TypeScript gerados do schema
- layout
- sidebar
- design system
- migrations
- seed
- auditoria base

Não avançar antes do banco estar consistente, das migrations estarem verificadas, dos advisors de segurança/performance estarem executados e dos testes de RLS e isolamento passarem.

### Fase 2 — Financeiro

Implementar:

- contas
- categorias
- centros de custo
- entradas
- saídas
- transferências
- contas pagar
- contas receber

Criar dashboard inicial.

### Fase 3 — Insumos

Implementar:

- cadastro
- compras
- conversão de unidades
- custo unitário
- histórico
- estoque
- movimentações

### Fase 4 — Produtos

Implementar:

- produtos
- variantes
- SKU
- componentes
- ficha de custo
- ficha de produção 3D

Exibir composição completa do custo.

### Fase 5 — Marketplaces

Implementar:

- marketplaces
- anúncios/listings
- regras de taxas
- vigência temporal

### Fase 6 — Vendas

Implementar:

- pedidos
- itens
- snapshots
- cálculo de lucro
- margem
- recebíveis

### Fase 7 — Conciliação

Implementar:

- esperado
- recebido
- diferença
- status
- justificativas

### Fase 8 — Simulador

Implementar:

- preço
- taxas
- custo
- lucro
- margem
- preço necessário para margem alvo

### Fase 9 — Importação

Implementar:

- CSV
- XLSX
- preview
- mapping
- validação
- duplicatas
- relatório de erros

### Fase 10 — Dashboard completo

Cards:
- faturamento
- líquido
- lucro
- margem
- despesas
- receber
- pagar
- pedidos

Gráficos e rankings.

### Fase 11 — Análise inteligente

Criar uma camada de consulta estruturada.

A skill deve poder solicitar métricas por período.

Preferir funções/serviços como:

getFinancialSummary
getProfitByProduct
getProfitByMarketplace
getCostEvolution
getExpenseAnomalies
getAccountsPayableSummary
getAccountsReceivableSummary
getLowStockInputs
simulateProductPrice

As respostas devem ser estruturadas e conter números calculados pelo backend.

Nunca permitir que a IA calcule dados críticos usando valores incompletos quando o backend puder calcular.

---

# 38. Endpoints/serviços conceituais

GET /dashboard/summary

GET /products

POST /products

GET /products/:id/cost

POST /products/:id/components

GET /inputs

POST /inputs

POST /inputs/:id/purchases

GET /inputs/:id/cost-history

GET /inventory

POST /inventory/adjustments

GET /orders

POST /orders

GET /orders/:id/profitability

GET /receivables

POST /reconciliations

POST /pricing/simulate

POST /imports

GET /reports/profitability

GET /analysis/financial-summary

Pode substituir REST por server actions, mantendo separação de responsabilidades.

---

# 39. Serviços de domínio sugeridos

CostService
PricingService
InventoryService
OrderProfitabilityService
MarketplaceFeeService
FinancialService
ReconciliationService
ImportService
AnalyticsService

---

# 40. Tela de produto

Abas:

Resumo
Custos
Produção
Marketplaces
Vendas
Histórico

Resumo:

- SKU
- custo atual
- preço
- margem estimada
- estoque possível
- unidades vendidas
- faturamento
- lucro

Custos:

mostrar tabela:

Insumo | Quantidade | Custo unit. | Total

Produção:

peso
suporte
purga
tempo
energia
hora máquina
falhas

---

# 41. Tela do simulador

Layout sugerido:

Lado esquerdo:
Parâmetros.

Lado direito:
Resultado.

Mostrar:

Preço de venda
R$ 69,90

Taxas
-R$ 10,25

Impostos
-R$ 2,80

Custo
-R$ 18,40

Lucro
R$ 38,45

Margem
55,0%

Adicionar campo:

Margem desejada

Botão:

Calcular preço ideal

---

# 42. Página análise

Criar interface estilo chat.

Sugestões rápidas:

- Como foi este mês?
- Qual produto mais lucrou?
- Onde estou perdendo dinheiro?
- O que aumentou de custo?
- Quais produtos precisam de reajuste?

A IA deve receber contexto estruturado.

---

# 43. Segurança, RLS e armazenamento privado

Preservar autenticação, autorização, proteção CSRF conforme stack, sanitização, validação backend, rate limit para endpoints sensíveis e logs sem segredos. Nunca armazenar senha em texto: credenciais e sessões pertencem ao Supabase Auth.

## 43.1 Matriz de acesso obrigatória

Todas as permissões abaixo são limitadas à organização e à associação ativa do usuário. Acesso ausente significa negar. O administrador da aplicação também está sujeito à RLS.

| Domínio | Administrador | Financeiro | Operacional | Visualização |
|---|---|---|---|---|
| Contas, títulos, lançamentos, recebíveis e conciliação | Ler e operar | Ler e operar | Sem acesso | Ler |
| Produtos, variantes, BOM, produção, insumos, custos e estoque | Ler e operar | Ler | Ler e operar | Ler |
| Vendas, taxas, marketplaces e importações financeiras | Ler e operar | Ler e operar | Sem acesso por padrão | Ler |
| Metas, alertas, relatórios e análise | Conforme todos os domínios | Conforme domínio financeiro | Apenas domínio operacional | Ler dados autorizados |
| Usuários, papéis e permissões | Gerenciar | Sem gestão | Sem gestão | Sem gestão |
| Auditoria | Ler | Ler eventos financeiros autorizados | Ler eventos operacionais autorizados | Sem acesso por padrão |
| Anexos | Conforme entidade vinculada | Conforme entidade vinculada | Conforme entidade vinculada | Ler conforme entidade vinculada |

Operar não significa apagar histórico: estornos, cancelamentos e ajustes seguem as regras do domínio. A análise e a exportação não ampliam o acesso do usuário. Importações de insumos/compras operacionais seguem a permissão do módulo; criação de obrigação financeira integrada ocorre por operação controlada, sem conceder acesso geral às contas ao perfil operacional.

## 43.2 Policies e grants

Habilitar RLS em todas as tabelas de negócio desde sua criação e obrigatoriamente em todas as tabelas dos schemas expostos pela Data API. Negar acesso público anônimo aos dados do sistema. Usar organização, associação ativa e permissão específica por ação; não basta verificar se alguém está autenticado. A propriedade individual via created_by não deve impedir o trabalho dos demais membros autorizados.

Separar SELECT, INSERT, UPDATE e DELETE. INSERT valida o novo registro; UPDATE verifica linha antiga e nova com USING/WITH CHECK e precisa de permissão SELECT correspondente. Revogar DELETE direto de fatos históricos e mutações diretas que permitam contornar operações críticas. Verificar grants e exposição na Data API, além de RLS; conceder somente o necessário. Não aplicar policies permissivas globais para fazer uma tela funcionar.

Papéis são controlados em tabelas protegidas; nunca confiar em user_metadata editável pelo usuário. Se claims forem usados, considerar sua defasagem após mudança de permissão. Não permitir autoatribuição de papel. Testar revogação de acesso e revalidar a associação em operações sensíveis.

Referência: [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Views de relatórios devem respeitar permissões do chamador, usando security_invoker quando suportado, ou ficar em schema não exposto com acesso controlado. Preferir funções SECURITY INVOKER. Quando uma RPC precisar de SECURITY DEFINER para realizar uma operação atômica com escrita direta revogada, justificar a elevação, fixar search_path seguro, qualificar objetos, validar auth.uid(), organização e permissão no corpo e revogar EXECUTE de PUBLIC/anon, concedendo somente o necessário. Manter helpers privilegiados em schema privado; qualquer entrada RPC exposta exige revisão explícita. Nunca usar privilégio elevado como correção genérica de erro de RLS.

Auditoria é inserida por mecanismo controlado no banco e não pode ser alterada ou apagada pelos usuários da aplicação. Snapshots confirmados também são imutáveis; correções geram ajuste/versionamento com autor e motivo.

## 43.3 Buckets e anexos

Reutilizar buckets compatíveis existentes após inspeção. Se necessário, criar buckets lógicos privados para documentos financeiros, importações e imagens de produtos. Todos privados por padrão, incluindo comprovantes e notas. Não tornar um bucket existente público para simplificar downloads.

attachments deve conter id, organization_id, bucket_id, object_path, nome original, MIME type, tamanho, autor, data e vínculo à entidade. Persistir caminho e metadados, nunca uma URL assinada duradoura. Emitir URL assinada de curta duração somente após autorização, ou baixar com sessão autorizada.

Aplicar policies de Storage em storage.objects que verifiquem bucket, organização e entidade vinculada. O prefixo do caminho sozinho não comprova autorização. Upload deve validar o destino antes de aceitar o arquivo. SELECT, INSERT, UPDATE e DELETE seguem permissões próprias; upsert precisa das permissões correspondentes. Restringir formatos e tamanho, usar nomes não previsíveis e impedir acesso cruzado a arquivos de outra organização.

Comprovantes vinculados a histórico preservado não podem ser eliminados por exclusão comum. Downloads e exportações seguem as mesmas restrições dos dados. Não copiar segredos para metadados ou logs.

Referência: [Controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control).

---

# 44. Backup, transações e confiabilidade

Manter migrations versionadas, backup PostgreSQL, logs de erro, recuperação de importações e transações para operações críticas. Verificar a cobertura real de backup/restauração do projeto e documentar retenção e recuperação; não presumir disponibilidade de PITR. Backup do banco não deve ser tratado como cópia dos arquivos do Storage: definir recuperação dos objetos separadamente e testar restauração em ambiente isolado.

## 44.1 Atomicidade no PostgreSQL

Uma sequência de chamadas supabase-js não constitui uma única transação. Implementar operações críticas em funções PostgreSQL chamadas por RPC, com validação e escrita atômica. Uma falha deve desfazer integralmente seus efeitos no banco.

Operações obrigatórias:

- Compra + itens + histórico de custo + entrada de estoque + obrigação financeira, quando aplicável + auditoria.
- Venda + itens + snapshots + totais + recebíveis + auditoria.
- Baixa parcial ou integral + alocações de conciliação + movimentação financeira + atualização de status + auditoria.
- Ajuste/consumo de estoque + saldo consistente + histórico + auditoria.
- Transferência entre contas com ambas as pontas atômicas, sem registrar receita ou despesa artificial.
- Estorno/cancelamento com reversões vinculadas, sem apagar os fatos originais.

Garantir idempotência por chave única, controle de concorrência com bloqueio de linhas ou estratégia equivalente e validação de saldo/quantidade. Impedir duplicação em retries e condições de corrida. Constraints e RPCs devem proteger as invariantes também contra chamadas diretas à API.

## 44.2 Arquivos e serviços externos

Storage e APIs externas não participam da transação PostgreSQL. Usar estados pending/confirmed/failed, compensação e retentativas idempotentes para uploads e integrações; limpar arquivos órfãos conforme retenção, sem apagar anexos válidos. Registrar intenção/evento no banco na mesma transação quando for necessário executar um efeito externo após commit.

Importações grandes podem usar lotes; cada lote/unidade de negócio é atômico e retomável. O relatório deve distinguir registros persistidos, falhos, ignorados e duplicados. Nunca informar sucesso total quando houve falha parcial.

---
# 45. Performance

Adicionar índices para:

- sku
- external_order_id
- order_date
- marketplace_id
- product_id
- status
- due_date

Paginar listas.

Não carregar histórico completo sem necessidade. Incluir índices em organization_id e nas colunas usadas por RLS, associações, FKs e filtros combinados; validar planos de consulta representativos. Evitar agregações financeiras no navegador. Executar advisors de performance após DDL e registrar os resultados.

---

# 46. Entregáveis esperados do Work

O Work deve entregar:

1. Projeto executável.
2. README completo.
3. .env.example.
4. migrations SQL Supabase versionadas, incluindo RLS, grants, índices, funções e triggers.
5. schema derivado das migrations e tipos TypeScript gerados do Supabase.
6. seed.
7. testes.
8. documentação das regras financeiras.
9. instruções de instalação.
10. instruções de deploy.
11. credenciais somente via env.
12. lista de features concluídas.
13. lista de limitações.
14. backlog V2.
15. dados de demonstração isolados de produção.
16. inventário prévio e mapa de reaproveitamento da estrutura existente.
17. matriz de acesso, testes RLS/Storage e resultados dos advisors de segurança/performance.
18. documentação das RPCs transacionais, idempotência, backup e recuperação.

---

# 47. Definição de pronto

Uma funcionalidade só é considerada pronta quando:

- UI existe
- backend existe
- persistência existe
- validação existe
- estados de erro existem
- loading existe
- empty state existe
- regra possui teste quando crítica
- auditoria existe quando necessária
- documentação foi atualizada
- RLS, grants e Storage foram verificados com usuários reais de teste e acesso direto à API
- operações críticas preservam atomicidade e idempotência
- tipos TypeScript refletem o schema e advisors foram executados quando houve DDL

---

# 48. Instrução final para o Work

Não tente implementar tudo superficialmente de uma vez.

Construa por módulos completos.

Comece pela fundação do sistema e pelo modelo de dados.

Antes de implementar telas, garanta que as entidades e relações suportem histórico, snapshots e auditoria.

Sempre que houver ambiguidade, priorize:

1. precisão financeira
2. preservação histórica
3. rastreabilidade
4. simplicidade
5. escalabilidade

O MVP final deve permitir que a Bueno Express consiga cadastrar insumos, registrar compras, calcular custo real de produtos 3D, registrar vendas, calcular lucro e margem, controlar financeiro, acompanhar recebíveis, conciliar valores, simular preços e obter análises inteligentes sobre a operação.

Esse é o núcleo do produto.

Não adicionar módulos fora do escopo antes de esse fluxo funcionar de ponta a ponta.

---

# 49. Complementos de precisão e validação da V2

Estas definições tornam os cálculos e critérios originais implementáveis sem retirar funcionalidades.

- Usar NUMERIC para dinheiro, custos, quantidades e percentuais. Valores de liquidação podem usar escala 2; custos unitários exigem ao menos escala 4. Não executar aritmética monetária com ponto flutuante binário em TypeScript. Usar decimal exato e contratos de transporte que preservem decimais como texto quando necessário; tipos gerados não garantem precisão financeira por si só. Definir arredondamento explícito e alocar resíduos de centavos deterministicamente.
- Diferenciar competência, vencimento e caixa. Guardar instantes como timestamptz e apresentar no fuso America/Sao_Paulo; datas de vencimento/competência sem horário usam date. Recebimento de venda já reconhecida não é uma segunda receita. Compra de insumo não deve virar simultaneamente despesa operacional e CPV no mesmo relatório de resultado.
- As fórmulas originais de venda são preservadas. Frete pago pelo cliente deve ter tratamento documentado: somá-lo à receita quando apropriado à operação ou tratá-lo como repasse, sem contabilização duplicada. Exibir a composição e manter a base da margem explícita. Não apresentar lucro de um pedido antes de despesas indiretas como lucro líquido total da empresa.
- failed_print_rate usa fração no intervalo 0 <= taxa < 1; a interface pode receber percentual e converter. waste_percentage usa percentual de 0 a 100 ou intervalo de negócio documentado. Impedir divisão por zero, quantidades negativas inválidas e lotes vazios.
- Identificar explicitamente se pesos e tempos da ficha 3D se referem ao lote ou à unidade. Normalizar antes dos cálculos e dividir custos de lote por quantity_per_batch para obter custo unitário. Não cobrar filamento, embalagem ou acessórios duas vezes entre BOM e ficha 3D. Preservar a fórmula de falhas sobre filamento; qualquer extensão a tempo/energia exige parâmetro e regra documentados.
- Explicitar a política de custo atual (por exemplo, média ponderada para insumos) e salvar as entradas/versões nos snapshots. Alteração do custo atual pode atualizar estimativas atuais, nunca reescrever vendas históricas. Vendas retroativas sem custo histórico suficiente ficam pendentes ou marcadas como estimativa, sem inventar precisão.
- O preço por margem alvo usa taxas em fração e exige denominador positivo. Regras por faixa, prioridade e vigência precisam ser reavaliadas no preço encontrado; a fórmula aproximada não dispensa validar o resultado com o mesmo motor do simulador. Margem/ROI com denominador zero devem retornar situação explicada, não infinito.
- O cálculo de capacidade considera todos os componentes normalizados e evita divisão por consumo zero. Ordens de produção, fila de impressoras e consumo automático continuam no roadmap V3; não adicionar baixa automática na venda sem regra explícita que evite consumo duplicado.
- Análises devem informar período, filtros, data de atualização, base de cálculo e lacunas de dados. A skill/agente consulta serviços autorizados de leitura e recebe números calculados no backend; não recebe chave administrativa, SQL arbitrário irrestrito ou autoridade para modificar o financeiro.

## 49.1 Testes adicionais obrigatórios

Manter todos os testes da seção 35 e adicionar:

1. Usuário anônimo, membro de outra organização, perfil sem permissão e membro revogado não acessam registros ou arquivos, inclusive por ID direto.
2. Perfil Visualização não consegue escrever; Operacional não altera contas/recebíveis; usuários não promovem o próprio papel.
3. Policies de INSERT/UPDATE impedem mudança de organização; relatórios, views, RPCs, anexos e exportação não ampliam acesso.
4. Nenhum segredo administrativo aparece no bundle cliente, respostas ou logs; client/server respeitam o isolamento da sessão.
5. Falha intermediária em compra, venda, conciliação, transferência e estoque faz rollback integral; retries concorrentes não duplicam fatos.
6. Duas baixas concorrentes não liquidam o mesmo valor duas vezes; pagamentos parciais e repasses para múltiplos pedidos preservam saldo e diferenças.
7. Alterações de BOM, insumos e taxas não modificam snapshots antigos; ajustes preservam versão anterior e auditoria.
8. Precisão decimal, arredondamento, divisão por zero, taxa de falha inválida, custo de lote/unidade e taxas por faixa têm casos de fronteira.
9. Migrations funcionam em ambiente isolado com dados representativos, preservam estruturas existentes e geram tipos compatíveis. Testar recuperação de importação e restauração.
10. Advisors de segurança/performance são executados após DDL; resultados e pendências ficam registrados. Ausência de achado não substitui testes de acesso.

## 49.2 Referências técnicas de manutenção

Antes da implementação, verificar versões compatíveis de Next.js, Node.js, TypeScript e bibliotecas Supabase, fixar dependências e versionar lockfile. Consultar o [changelog oficial do Supabase](https://supabase.com/changelog) para mudanças relevantes. Não presumir exposição automática de tabelas pela Data API; validar as configurações reais. Não modificar schemas gerenciados para adaptar a aplicação.

---

# 50. PROMPT MESTRE FINAL — IMPLEMENTAÇÃO NO WORK

Você é responsável por implementar o sistema financeiro, de custos e operação de e-commerce da Bueno Express. Leia integralmente este Markdown V2 e use-o como especificação oficial e única. Preserve todo o escopo funcional e critérios aqui descritos; a V2 deste documento não antecipa as fases futuras do roadmap do produto.

Entregue um MVP funcional de ponta a ponta: financeiro, contas, categorias, centros de custo, títulos, insumos, compras, custos históricos, produtos/SKUs/variantes, BOM, ficha de produção 3D, marketplaces e taxas vigentes, vendas com snapshots, recebíveis, conciliação, estoque básico e capacidade, simulador, metas, alertas, relatórios, importação CSV/Excel, análise inteligente, auditoria e testes. Preserve também a evolução prevista para integrações automáticas, produção, compras inteligentes e inteligência avançada.

Use obrigatoriamente Next.js + React + TypeScript + Supabase PostgreSQL + Supabase Auth + Supabase Storage + @supabase/supabase-js, com @supabase/ssr para sessão e migrations SQL versionadas como fonte de verdade. Use o projeto Supabase existente chamado **Bueno Express**. Não crie banco separado, projeto substituto, ORM Prisma ou autenticação própria. Não coloque credenciais no código ou na documentação.

Comece com inspeção real e somente leitura do projeto existente: schema, tabelas/dados, migrations, constraints, índices, views, funções, triggers, grants, RLS, Auth, Storage e Edge Functions. Registre o inventário, identifique o que reutilizar e prepare mudanças incrementais sem sobrescrever dados. Se o acesso não estiver disponível, avance no que puder ser validado localmente e registre o bloqueio; não declare inspeção feita nem crie banco alternativo para contorná-lo.

Na fundação, configure clientes Supabase separados para browser e servidor, validação de identidade e sessão por requisição, RBAC aplicado no backend/banco e RLS desde a criação das tabelas. Use publishable key no cliente. Segredos e qualquer secret/service_role ficam exclusivamente server-side; operações normais usam contexto do usuário e suas permissões. Não use user_metadata como fonte de autorização.

Aplique a matriz da seção 43 a financeiro, vendas, produtos, custos, estoque, auditoria, relatórios e anexos. Negue acesso anônimo, isole organização, valide relações e impeça elevação de privilégio. Buckets são privados por padrão, com policies em storage.objects e URLs assinadas temporárias emitidas após autorização. Não salve URLs assinadas como identidade permanente de anexos.

Implemente operações críticas em transações PostgreSQL/RPC: compra com estoque e custo, venda com itens/snapshots/recebíveis, conciliação/baixa, transferências, ajustes de estoque e estornos. Não trate chamadas supabase-js sequenciais como transação. Proteja contra retries e concorrência com idempotência, constraints e controle de bloqueio. Arquivos e integrações externas exigem estado e compensação próprios. Edge Functions somente quando uma necessidade concreta justificar.

Preserve precisão decimal, rastreabilidade, snapshots imutáveis e auditoria; centralize as regras de cálculo. Não recalcule o passado com custos atuais, não duplique receita ao receber uma venda e não apague histórico financeiro. Mostre composições, diferenças, estados vazios, erros e limitações dos dados. IA recebe métricas autorizadas calculadas pelo backend e nunca inventa números.

Siga as 11 fases da seção 37, concluindo módulos completos. Inclua metas, alertas, relatórios, anexos e auditoria nas fases correspondentes, mesmo quando não repetidos na lista resumida de uma fase. Antes de avançar, valide persistência, regras críticas, permissões e experiência do fluxo concluído.

Depois de DDL, execute advisors de segurança e performance, corrija falhas críticas e registre achados remanescentes. Gere novamente tipos TypeScript a partir do schema e verifique compatibilidade. Execute os testes das seções 35 e 49, incluindo RLS com usuários de teste, acesso direto à API/Storage, rollback, concorrência, idempotência e preservação histórica.

Entregue projeto executável, README, .env.example sem valores secretos, migrations SQL, tipos gerados, seed isolado, testes e evidências, documentação de regras financeiras/permissões/RPCs, instruções de instalação/deploy/backup, inventário da estrutura existente, resultados dos advisors, funcionalidades concluídas, limitações reais e backlog do roadmap. Não apresente dados fictícios como dados reais nem funcionalidades simuladas como concluídas.

Priorize precisão financeira, preservação histórica, rastreabilidade, simplicidade e escalabilidade. Comece pela fundação e conclua o fluxo principal antes de adicionar módulos fora do escopo.