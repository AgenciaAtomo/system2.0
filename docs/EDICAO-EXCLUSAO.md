# Editar, excluir e consultar pendências

Atualização de 09/09/2026, solicitada pelo usuário. A listagem agora oferece Editar e Excluir para quem tem permissão financeira de escrita. Perfis somente leitura veem Consultar.

## Comportamento

- Pendências manuais sem baixa mantêm o formulário de edição completo, com as regras de valores de parcelas já existentes.
- Lançamentos pagos, parcialmente pagos, cancelados e legados permitem editar descrição e observações. Valores e pagamentos já registrados permanecem preservados; esta atualização não implementa correção monetária de pagamentos.
- Excluir pede confirmação e marca deletada_em, deleted_by e motivo_delecao, incrementando a versão. O lançamento sai da listagem principal, dos valores em aberto e dos cálculos de saldo/caixa mensal. As linhas originais e suas baixas continuam no banco e na auditoria. Não executa devolução de dinheiro nem operação bancária.
- Exclusão de uma parcela afeta apenas a parcela escolhida; o plano original e seu total histórico permanecem preservados. Não há restauração automática nesta interface.
- As operações usam financial.write, bloqueio da linha, versão esperada e idempotência. Valores anteriores/novos ficam auditados na mesma transação. API direta não permite exclusão física.

O próximo passo básico também foi entregue: atalhos Contas a pagar e Contas a receber. São visões dos lançamentos em aberto, incluindo pendências totais e parciais, vencidas ou futuras. Não geram novos registros nem duplicam valores.

## Evidências

Migration remota 20260909234027_entry_edit_delete_and_open_views. Tipos TypeScript atualizados; fluxo remoto conforme exceção do CLI registrada anteriormente.

Teste SQL entry_edit_delete.sql aprovado antes e depois da migration, sempre com rollback: edição sem mudar valor pago, preservação de linha/pagamentos/auditoria, exclusão removida de totais e lista, retry sem duplicação, versão antiga rejeitada, visões a pagar/receber e bloqueios de acesso. Nenhum lançamento real foi excluído durante os testes.

Build de produção e TypeScript aprovados. Teste de rotas com login real, via HTTP, passou na porta 3001, incluindo atalhos de contas a pagar/receber e validações de API. O servidor foi reiniciado no mesmo endereço com conexão ao Supabase. Advisors sem ERROR; avisos conhecidos registrados nos arquivos JSON deste bloco, com URLs de orientação. Testes visuais/interativos e a matriz completa multiusuário continuam pendentes.

Esta atualização não conclui toda a Fase 2. A prioridade permanece o fluxo básico autorizado pelo usuário.
