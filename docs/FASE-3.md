# Fase 3 — Insumos

Bloco básico funcional, conferido pelo usuário em 10/09/2026. Disponível em /insumos, com navegação na mesma aba.

Cadastro/edição/inativação de materiais; SKU único por empresa; compras com frete, impostos e outros custos; conversão entre g/kg, ml/l e cm/metro; média ponderada; contagem de estoque com motivo; histórico paginado; sinalização de mínimo.

Compras não geram título financeiro neste recorte: a tela informa que o pagamento deve ser registrado no Financeiro. Não há consumo automático, devolução específica, gráfico de evolução ou integração com produção. Perdas podem ser registradas como ajuste com motivo. Esses itens não foram apresentados como concluídos.

Quantidade e custo têm até seis casas decimais. A média usa valor total do estoque dividido pela quantidade. Remoções usam valor médio proporcional; zerar estoque zera seu valor e preserva o último custo médio para estimativas. Datas não podem estar no futuro nem preceder o último movimento. Unidade base imutável. Cada operação atualiza estoque, compra, histórico e auditoria em uma transação com chave de idempotência e versão.

Verificação: 17 testes unitários aprovados; build e TypeScript aprovados; supabase/tests/inputs.sql aprovado com rollback, abrangendo média, conversão, ajustes, repetição, versão obsoleta, datas inválidas e acesso não autorizado. Navegação autenticada e rejeição de estoque negativo conferidas no navegador. Nenhum insumo fictício persistido. Captura visual por screenshot indisponível; testes de concorrência em sessões distintas e falha induzida intermediária continuam pendentes.

Migrations remotas 20260910124445 e 20260910130518 preservadas localmente. Tipos gerados após inclusão do schema. Advisor de segurança: tabelas legíveis pelo papel authenticated também aparecem no GraphQL, porém RLS restringe por organização e permissão; tabela privada de idempotência sem políticas é intencional, sem grants. Avisos anteriores permanecem nos relatórios da Fundação. Advisor de performance deste bloco não foi concluído antes da interrupção da sessão.

Execução local: abrir ../Iniciar Bueno Express.cmd a partir de outputs e manter a janela aberta. Endereço http://127.0.0.1:3001. Processos iniciados pela sessão do agente encerraram entre turnos; o inicializador permite execução diretamente pelo usuário.
