# Resumo financeiro básico

Disponível na entrada de Financeiro (/financeiro), em 09/09/2026. Contas, categorias e centros continuam acessíveis pelas abas; a navegação permanece na mesma área de trabalho.

## Valores apresentados

- Saldo registrado nas contas e saldo individual: saldo inicial + baixas de entrada − baixas de saída + valor líquido dos lançamentos legados confirmados e não excluídos. Nunca somar o campo legado saldo_atual, pois ele já contém movimentações antigas. Não é uma consulta ao saldo bancário externo.
- Recebido e pago no mês: soma dos pagamentos individuais com data no mês atual, até hoje em America/Sao_Paulo. Inclui baixas parciais e não repete o valor original do título.
- Falta receber e falta pagar: valor original menos baixas, para lançamentos manuais pendentes ou parcialmente pagos, incluindo vencimentos futuros. Cancelados ficam fora.
- Parcelas são somadas individualmente; o registro do plano não é contado como uma segunda obrigação.

Escopo BRL. Contas arquivadas continuam no saldo e nas obrigações. Contas sem saldo inicial ficam identificadas e não entram no saldo total conhecido; não são tratadas como saldo inicial zero. Contas são paginadas em 25 registros; os totais abrangem todas as contas da organização, sem depender da página.

O histórico legado confirmado participa do saldo acumulado, mas não dos totais mensais: a interface informa que sua data de pagamento é desconhecida. Todos os cálculos usam NUMERIC no PostgreSQL e valores monetários como texto no transporte JSON. Formatação não faz contas com ponto flutuante.

## Implementação e verificação

RPC get_financial_summary com SECURITY INVOKER, autorização financial.read e RLS das tabelas existentes. Nenhuma nova escrita ou integração bancária. Migration 20260909221219_financial_summary e tipos TypeScript gerados do schema remoto; uso de MCP remoto conforme exceção do CLI já documentada.

Teste supabase/tests/financial_summary.sql aprovado antes e depois da migration, com rollback: saldo inicial, baixas integrais/parciais, fronteira do mês anterior, pendências futuras, cancelamentos, planos sem duplicação, histórico legado, contas arquivadas, paginação, decimal textual e acesso de Visualização, outra organização, membro revogado e anônimo.

Build de produção e TypeScript aprovados. Advisors sem ERROR: performance aponta apenas índices ainda sem uso; segurança mantém os avisos conhecidos documentados nos relatórios anteriores. Relatórios atuais em advisors-summary-security.json e advisors-summary-performance.json, com URLs de orientação. Nenhum registro financeiro de teste persistiu.

Não foi feito novo ensaio visual/interativo nem teste de login via navegador neste bloco. As pendências gerais de implantação, múltiplas identidades e recuperação continuam registradas. Esse resumo simples não conclui a Fase 2 inteira nem o dashboard amplo previsto nas fases seguintes.
