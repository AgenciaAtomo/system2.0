# MVP operacional conectado — 12/09/2026

## Escopo entregue
Todas as categorias do menu têm interface e dados persistidos: Dashboard, Financeiro, Vendas, Recebíveis, Produtos, Insumos, Custos, Produção, Estoque, Calculadoras, Canais e taxas, Importação, Relatórios, Análise e Configurações. O recorte é um MVP de operação manual/importada, sem integrar APIs de marketplaces ou hospedar publicamente.

## Cadeia dos produtos
1. Insumos: cadastro, compra, custo médio ponderado e estoque. A compra pode gerar uma obrigação financeira pendente ou uma despesa já paga na mesma transação. Somente estoque continua disponível para compras cujo financeiro já foi registrado.
2. Calculadora/ficha: materiais e custo médio atuais alimentam o custo estimado do produto/kit. Mudanças de insumos, ficha, preço e parâmetros atualizam as consultas de Produtos, Custos, Estoque e Calculadoras. Preço cadastrado é sugerido na nova venda e pode ser substituído pelo preço efetivamente vendido.
3. Produção: quantidade inteira de peças/kits consome a ficha de materiais e entra em produtos acabados. Peso e tempo da ficha 3D são normalizados por lote. Quantidade consumida arredonda para cima a seis casas; valores e médias são reconciliados com o histórico de estoque. Entrada pronta aceita quantidade e custo informado; perda baixa o estoque de acabados.
4. Venda: usa produtos acabados, produz e vende na mesma operação ou registra uma venda histórica com custo informado e sem movimentar estoque. A venda de acabados nunca consome insumos novamente. Não permite estoque negativo.
5. Recebimento: gera caixa no Financeiro e atualiza o repasse do pedido. Isso não é um novo faturamento. Recebimento parcial, encerramento divergente e reabertura de cobrança preservam a diferença.
6. Cancelamento: exige devolver os recebimentos antes de cancelar; retorna acabados ao estoque. A produção permanece feita. Estorno de produção é separado, baixa os acabados e devolve os materiais originais; exige saldo e datas consistentes. Nenhum fato é apagado.

## Custos e resultado
Estoque de acabados usa média ponderada do valor das entradas. A venda preserva o custo do estoque, enquanto a ficha mostra o custo atual de fabricar novamente. Esses valores podem ser diferentes. Produções guardam a ficha, materiais, versões e custos; itens vendidos guardam o custo usado e a origem do estoque. Mudanças posteriores não reescrevem vendas ou produções.

Receita líquida do pedido = itens + frete do cliente − descontos − taxas − impostos − frete da empresa − outras despesas. Lucro do pedido = receita líquida − custo dos produtos. Margem usa faturamento dos itens como denominador. Recebível padrão = itens + frete do cliente − desconto − taxas − frete da empresa; pode ser informado explicitamente para o contrato real de repasse.

Resultado operacional exibido = lucro dos pedidos − despesas manuais do período de competência. Compra vinculada de insumos, recebimento e devolução de venda não entram novamente como despesa/receita operacional. Gastos incluídos na ficha não devem ser também lançados como despesa operacional manual no mesmo resultado. O sistema não presume que taxas do pedido e impostos estejam automaticamente pagos: registro de caixa separado se houver pagamento externo ao repasse.

## Regras de canal e importação
Regras ativas com vigência e faixa de total do pedido são somadas. Cada regra cobra percentual sobre itens e valor fixo por pedido. Valor explícito em Taxas substitui as regras. Não há atualização automática das tarifas oficiais.

CSV e XLSX: até 5 MB, 5.000 linhas, primeira aba, máximo 200 colunas. Valores de células, sem executar fórmulas/macros; fórmulas exigem valor calculado salvo. Arquivos antigos XLS não são suportados. Prévia, associação de colunas, validação e relatório por referência. Vendas agrupam linhas pelo pedido, até 100 itens; taxas/frete/valores do pedido devem ser idênticos em todas as suas linhas. Importação exige SKU interno previamente cadastrado; SKU inexistente vira erro visível. Valores brasileiros e datas brasileiras/ISO ou seriais Excel são normalizados.

Compras, recebimentos e extrato exigem referência única por registro. Repetir a referência não duplica os fatos. Cada pedido/registro é atômico; lotes anteriores permanecem caso uma importação seja interrompida. Relatório distingue importado, duplicado e erro. Extrato é destinado a movimentos ainda não registrados; não importa automaticamente repasses e compras já reconhecidos por outros módulos.

## Visões e limites
Dashboard/relatórios filtram data e canal. Estoque/custos buscam nome ou SKU. Vendas buscam pedido, data e canal; recebíveis abrangem todos os vencimentos. Listas de pedidos, produtos e movimentos são paginadas a 50. Seletor de vendas até 1.000 SKUs; relatório por produto até 100, explícito na tela. Metas usam o período próprio e total da empresa. Alertas abrangem estoque mínimo, vencimentos, divergências e prejuízo. Análise é um diagnóstico por regras sobre números reais, sem LLM, previsões ou escrita automática.

O MVP não inclui integração automática com marketplaces, importação de layouts proprietários sem associação de colunas, mapeamento persistente de anúncios externos, transferência entre contas (adiada pelo usuário), recorrência automática de despesas, devolução parcial de mercadoria, filas de impressoras ou gestão multiusuário na interface. Anexos privados e auditoria da Fundação permanecem em Configurações; associação de comprovantes a cada pedido/título fica para evolução. Não representa aprovação de todos os critérios avançados da especificação original.

## Verificação essencial
30 testes locais passaram. TypeScript e build de produção passaram. Teste transacional supabase/tests/operations.sql passou com dados revertidos e constraints diferidas conferidas: consumo, venda, não duplicação, saldo insuficiente, rollback, recebimento, devolução, cancelamento, estorno de produção, compra vinculada, baixa do título, repetição de importação e acesso negado. Não foram cadastrados pedidos ou saldos fictícios permanentes. Advisors executados; três índices de relações apontados foram adicionados. Avisos existentes de GraphQL/RLS interna, duas funções financeiras antigas e proteção de senhas permanecem documentados, sem ampliar credenciais de acesso.

Migrations remotas versionadas e tipos gerados em src/types/database.types.ts. Rotas e RPCs verificam associação e permissões. Escritas críticas usam funções privadas autorizadas, wrappers públicos invoker, bloqueios por empresa/registro e chaves de idempotência; consultas financeiras calculam no banco e transportam números como texto.

## Conferência da versão local
As 16 rotas autenticadas passaram em tests/live-mvp.mjs, incluindo os módulos anteriores e os novos; exportação CSV respondeu corretamente. Login real e dashboard conferidos no navegador. A prévia XLSX foi validada com arquivo sintético local sem confirmar a importação; texto, SKU e decimal foram preservados. A versão está em http://127.0.0.1:3002/dashboard. A porta 3001 estava ocupada pelo Dolphin Anty e esse programa não foi interrompido. Servidor iniciado em segundo plano, sem janela de comandos visível. Advisors finais de performance indicaram apenas índices ainda não utilizados, sem FKs sem índice.

Auditoria das novas tabelas financeiras isolada no domínio financial, evitando visibilidade pelo papel operacional. Conferência transacional do domínio passou com rollback.
