# Calculadoras integradas — 10/09/2026

Disponíveis em /calculadoras: Mercado Livre e Produção 3D. A referência funcional foi a extensão Cargoos 1.0.27 fornecida pelo usuário, consultada como arquivo ZIP, sem instalar ou executar seus scripts. Implementação própria integrada ao cadastro existente.

## Fluxo
Simular não grava produtos nem movimenta estoque. Salvar cria produto e versão na mesma transação, com ficha de materiais, parâmetros, custo e preço. Produtos existentes podem ser reabertos para ajustar a simulação. A listagem de Produtos mostra custo atual, venda e lucro estimado com as taxas salvas. O lucro é uma estimativa, não lucro realizado de vendas.

## Mercado Livre
Comissão, impostos, tarifa fixa, frete, embalagem, armazenagem, coleta, terceirização e reembolso são informados pelo usuário. Clássico/Premium e modalidade logística identificam o cenário; não preenchem tabelas oficiais automaticamente. Publicidade efetiva = ACOS × participação das vendas com publicidade. Resultado unitário = preço − custo − despesas fixas por venda − percentuais sobre preço. Preço mínimo e preço com margem desejada arredondam para cima ao centavo; taxas incompatíveis retornam cenário inviável. Projeção mensal desconta despesas fixas uma vez.

## Produção 3D
Peso, tempo e trabalho ativo referem-se ao lote e são divididos pela quantidade de peças/kits. Filamento inclui peça, suporte e purga; a perda percentual aumenta apenas o filamento, preservando a regra da especificação oficial. Energia usa potência × horas × tarifa. Máquina aceita custo/hora direto ou depreciação por valor, residual e vida útil. Manutenção, trabalho ativo, extras de lote/unidade e materiais vinculados completam o custo. Capacidade considera impressoras, dias, horas e disponibilidade; projeção limita produção à capacidade estimada.

Materiais vinculados usam custo médio atual e conversões de unidade. Filamento manual permite começar sem cadastro: guarda o custo calculado e parâmetros, mas não vincula consumo ao estoque. Embalagem manual em reais não deve duplicar embalagem já incluída nos materiais. Padrões de operação opcionais ficam neste navegador e por empresa.

## Persistência e validação
Migration 20260910193635_calculator_atomic_product_save.sql aplicada no projeto existente. RPCs validam identidade, permissão, organização, versão e chave de idempotência; criação parcial é revertida. Tipos regenerados do banco remoto. Testes SQL em supabase/tests/calculators.sql passaram com rollback: atomicidade, repetição, atualização, versão obsoleta e acesso negado. Os 28 testes automatizados passaram; TypeScript e build de produção passaram. Advisors posteriores estão nos arquivos advisors-calculators-*.json: avisos existentes de GraphQL, duas funções anteriores, proteção de senhas, tabelas internas sem políticas e índices ainda não usados; nenhuma função nova apontada.

## Limites deste incremento
Não movimenta estoque nem registra faturamento realizado. Ordens de produção, estoque de acabados e importação de vendas ainda devem ser implementados para completar o fluxo operacional sem baixa duplicada de insumos. Seletor limitado aos primeiros 1001 insumos, com aviso na interface. Alterações manuais de taxas são responsabilidade da simulação; não há integração com tarifas ao vivo do Mercado Livre.

## Conferência no navegador
Servidor de produção atualizado na porta 3001. Calculadora Mercado Livre: venda 100, custo 30, comissão 12%, imposto 6%, tarifa 6 e frete 10 resultaram em lucro 36 e preço alvo 74,20. Calculadora 3D: 100g a 75/kg, uma hora a 200W e energia 1/kWh resultaram em custo 7,70 e lucro 12,30 para venda 20 sem taxas. Simulações não foram salvas como dados de negócio. Ambas executadas na aba existente com a sessão autenticada.

Atualização de 12/09/2026: produção, estoque de acabados e vendas foram implementados e conectados. Consulte MVP-OPERACIONAL.md para o fluxo vigente.
