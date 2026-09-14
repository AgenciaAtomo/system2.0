# Baixas e parcelamento básico

Atualização de 09/09/2026. Por orientação do usuário, priorizar o básico funcional. Parcelamento permanece uma opção recolhida no formulário; não expandir recorrências ou gestão avançada sem uma necessidade concreta.

## Uso

- Em Dar baixa, informe o valor pago/recebido agora e a data. O valor sugerido é o saldo restante; pode ser reduzido para registrar uma baixa parcial.
- A lista mostra total, baixado e em aberto. Detalhes mostra o histórico individual das baixas.
- Para uma compra ou receita parcelada, abra Parcelar (opcional), informe o total e a quantidade. Os vencimentos são mensais, a partir do primeiro vencimento, sem juros. O padrão é um lançamento único.

## Regras implementadas

O valor original é preservado. Cada baixa gera um registro imutável em financial_payments, na conta do lançamento. A soma das baixas corresponde a paid_amount e não pode superar o total. A operação atualiza o mesmo lançamento, sem criar outra receita ou despesa. Baixas existentes de lançamentos modernos já pagos foram incorporadas ao histórico com origem migration; os dois registros legados permanecem sem datas de caixa inventadas.

Estados: pending, partially_paid, paid e cancelled. O atraso é calculado para pendências totais ou parciais em America/Sao_Paulo. Ao quitar, paid_date corresponde à maior data das baixas. Um filtro por pagamento procura as datas individuais, inclusive baixas parciais; a linha continua mostrando o valor total do lançamento, não uma soma do caixa no período.

Parcelamento: 2–120 parcelas, mínimo R$ 0,01 por parcela. Divisão em centavos exatos; o resto vai para as primeiras parcelas. Datas são calculadas a partir do vencimento original: 31/01 → 28/02 → 31/03. Todas as parcelas começam pendentes e usam a competência informada. O plano contém apenas metadados; somente as parcelas são fatos financeiros. Os valores das parcelas ficam fixos, preservando o total. Pendências sem baixas podem ser canceladas individualmente, com motivo; lançamentos já baixados exigirão estorno, ainda não implementado.

Escritas, pagamentos, plano, parcelas, auditoria e idempotência são atômicos. Bloqueio da linha e versão esperada evitam sobrescrita. Constraints diferidas verificam a soma dos pagamentos e o total/quantidade das parcelas ao concluir a transação. RLS e grants de leitura exigem financial.read; alterações passam pela RPC autorizada por financial.write. Nenhum perfil escreve diretamente nos novos registros.

Migration remota: 20260909183606_partial_payments_and_installments. Tipos TypeScript atualizados. Fluxo remoto segue a exceção de CLI já registrada em LANCAMENTOS.md.

## Verificação

- 14 testes locais passaram, incluindo arredondamento exato, valores máximos, datas de fim de mês e limites.
- Ensaio DDL e testes SQL com rollback passaram antes e depois da migration: parcial seguida de quitação, idempotência, versão obsoleta, excesso de pagamento, parcelamento, invariantes diferidas, falha na terceira parcela e falha de auditoria de pagamento sem persistência parcial.
- Acesso direto negado; Visualização sem escrita, organização não autorizada e membro revogado verificados em SQL com Auth/roles temporários e rollback.
- Build de produção e TypeScript passaram após a simplificação da interface.
- Advisors sem ERROR; performance somente índices ainda sem uso. Avisos de segurança anteriores permanecem, incluindo descoberta autenticada sujeita a RLS, RPCs privilegiadas anteriores e proteção de senha vazada. Relatórios JSON anexos contêm as URLs de orientação.

Não foi executado novo teste visual/interativo ou de sessão Auth via navegador neste bloco. Teste concorrente por conexões independentes e matriz com múltiplas identidades continuam pendentes; locks foram exercitados por testes sequenciais e rejeição de versão obsoleta. Não declarar a Fase 2 inteira pronta.

Recorrência, transferências, estornos, comprovantes e painel/saldos consolidados continuam fora deste bloco. A prioridade agora é usar e ajustar o fluxo básico entregue.
