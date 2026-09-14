# Lançamentos financeiros — bloco da Fase 2

Registro do primeiro bloco, entregue em 09/09/2026. As regras de baixa e parcelamento foram atualizadas em BAIXAS-E-PARCELAS.md; esse documento posterior prevalece nesses pontos. A Fase 2 continua em andamento.

## Uso

Abra Financeiro → Lançamentos. O menu lateral e a aba do navegador permanecem os mesmos.

1. Escolha Entrada/receita ou Saída/despesa, descrição e valor em reais.
2. Selecione conta ativa em BRL e categoria compatível com o tipo. Centro de custo é opcional.
3. Informe competência e vencimento. Se o valor já foi pago/recebido, selecione essa situação e informe a data de caixa.
4. Use Detalhes para editar um lançamento pendente ou cancelar com motivo. Use Dar baixa para registrar pagamento/recebimento integral.

A busca é literal por descrição. Filtros: entrada/saída, situação, conta e período de vencimento, competência ou pagamento. Listas têm 25 registros por página e ordenação por data de lançamento decrescente. Os seletores carregam no máximo 201 cadastros, com aviso quando esse limite é atingido.

## Extrato bancário

Abra Financeiro → Extrato bancário para enviar arquivos CSV, TXT ou OFX exportados pelo banco. O envio exige escolher a conta financeira do extrato.

O leitor identifica data, descrição, valor, entrada/saída e referência quando essas colunas estão presentes. Em CSV/TXT, aceita cabeçalhos comuns como Data, Descrição, Valor, Débito, Crédito, Tipo e Referência. Valores negativos entram como saída; valores positivos entram como entrada, salvo quando houver coluna explícita de tipo.

Quando uma descrição já tem regra aprendida para a conta e o tipo, o sistema cria automaticamente um lançamento pago/recebido com origem `bank_statement`, data de competência/vencimento/caixa igual à data bancária e observação do arquivo importado. Quando a descrição ainda é nova, a linha fica em “Novas transações para categorizar”. Ao escolher a categoria, o lançamento é registrado e a regra é aprendida para os próximos extratos.

Duplicatas são bloqueadas por conta e impressão digital da linha. O uso principal é evitar reimportar a mesma movimentação ao reenviar o extrato. Se o banco não fornecer referência única e houver duas transações idênticas no mesmo dia, com mesma descrição e valor, revise o extrato antes de confirmar.

## Regras

- Dinheiro permanece NUMERIC(15,2) no banco, texto nos contratos JSON e Decimal na validação do servidor. Valores maiores que zero e até 9.999.999.999.999,99; rejeitar frações menores que centavo.
- Competência, vencimento e pagamento são datas civis separadas. Competência e vencimento aceitam 1900–2199; pagamento vai de 1900 até hoje em America/Sao_Paulo. Não inferir que competência é vencimento ou caixa.
- Novos registros manuais têm origem `manual`, `source_id` igual ao próprio ID e criador de Supabase Auth. Lançamentos materializados por extrato têm origem `bank_statement` vinculada à linha importada. O campo antigo `usuario_criador_id` permanece para o histórico anterior, sem criar usuários/senhas legados.
- Estado persistido: pending, paid ou cancelled. `overdue` é calculado na leitura quando a pendência venceu antes de hoje em São Paulo; não depende de tarefa agendada.
- Baixa integral atualiza o mesmo fato e sua data de caixa. Não cria uma segunda receita/despesa. Pagos e cancelados ficam imutáveis por este bloco. Estorno será uma operação vinculada futura; não há exclusão física pelo aplicativo.
- Edição e baixa usam versão esperada e bloqueio da linha. Uma tela antiga não sobrescreve uma alteração já salva.
- Idempotência usa organização + request_id + payload. Repetir o mesmo comando retorna o mesmo ID sem nova auditoria. Reutilizar a chave com outro conteúdo é rejeitado.
- Registro, chave de idempotência e auditoria são escritos na mesma transação. Falha de auditoria provoca rollback integral.
- Contas/categorias/centros precisam pertencer à mesma organização, com FKs compostas e validação de atividade na RPC. Bloqueios compartilhados impedem arquivamento concorrente durante o vínculo. Cancelamento de pendência preserva relações históricas.
- O saldo antigo `saldo_atual` não é atualizado nem apresentado como saldo calculado novo. Cálculo consolidado de saldos e painel continuam pendentes.

## Preservação e segurança

`public.transacoes` foi estendida incrementalmente; os dois registros anteriores permanecem com seus valores, IDs, autores e datas originais. Recebem apenas metadados novos com origem `legacy`. A tela mostra Histórico anterior e Data original; competência, vencimento e pagamento não foram inventados. Filtros por essas datas não incluem registros sem a data correspondente.

As permissões de leitura existentes continuam aplicadas por RLS. A API pública `get_financial_entries` usa SECURITY INVOKER. `save_financial_entry` chama `private.write_financial_entry`, que valida Auth e financial.write, fixa search_path vazio e só concede execução a authenticated. Nenhum perfil tem INSERT/UPDATE/DELETE direto em transacoes. O diário privado de comandos tem RLS fechado e sem grants de aplicação. Audit logs preservam valores anteriores e novos.

Migrations remotas versionadas: `20260909181029_financial_entries` e `20260909181130_financial_entry_relation_indexes`. O CLI instalado falhou ao tentar criar sua pasta de configuração fora do workspace; o histórico foi registrado pelo MCP remoto e copiado com as versões realmente retornadas pelo banco, sem inventar timestamps. DDL foi antes executado e revertido numa transação de ensaio.

## Verificação realizada

- 10 testes locais aprovados, incluindo dinheiro, datas reais, ano bissexto, datas distintas, regras de pagamento, período inválido e virada de UTC para São Paulo.
- `supabase/tests/financial_entries.sql` passou antes e depois da migration: criação, edição, baixa, cancelamento, origem Auth, precisão, transporte decimal textual, busca literal, filtros, paginação, retries, payload divergente, versão obsoleta, imutabilidade e falha injetada de auditoria com rollback.
- Testes SQL com identidade Auth existente e roles authenticated/anon: leitura e escrita autorizadas, Visualização sem escrita, Operacional sem leitura financeira, organização sem acesso, membro revogado e DML direto bloqueados. As mudanças de teste foram revertidas.
- `tests/live-entries.mjs` passou com login real: páginas e formulários renderizados, menu compartilhado, leitura RPC real, escrita inválida rejeitada, decimal como texto, organização não autorizada, acesso anônimo e DML direto negados. Não gravou dados de negócio.
- Build de produção e verificação TypeScript aprovados. Tipos gerados novamente do Supabase.
- Advisors: nenhum ERROR; os dois índices de FKs apontados inicialmente foram adicionados. Resultado final de performance contém somente índices ainda sem uso. Segurança mantém avisos já conhecidos: RLS propositalmente fechado, descoberta de objetos por authenticated sujeita a RLS, duas RPCs anteriores privilegiadas e proteção contra senhas vazadas desativada. Relatórios JSON salvos junto desta documentação.
- Documentação técnica consultada: [funções PostgreSQL no Supabase](https://supabase.com/docs/guides/database/functions) e [changelog](https://supabase.com/changelog). Mudanças recentes de logs, extensões, self-hosting e Realtime não afetam este bloco; grants explícitos de Data API foram mantidos.

## Limites e sequência

Ainda não implementados: baixas parciais, parcelas, recorrências, transferências, estornos, comprovante vinculado ao lançamento, exportação, ordenação interativa, painel/saldos consolidados e alertas de vencimento. Os anexos atuais continuam restritos a documentos da empresa, sem ampliação de acesso neste bloco.

Leitura de PDF bancário ainda não faz parte do fluxo: a importação atual usa CSV/TXT/OFX para preservar precisão e reduzir erro de interpretação.

Ainda pendentes de validação: retries/baixas concorrentes por conexões independentes, ensaio completo de migrations em ambiente isolado, teste visual/interativo de ponta a ponta e matriz completa com múltiplos usuários Auth reais. Os testes SQL usam a identidade real sob papéis/permissões temporários e rollback; não são equivalentes à matriz completa multiusuário. As pendências de recuperação da Fundação continuam em FASE-1/FASE-2.

Não apresentar este bloco como conclusão de toda a Fase 2.
