# Fase 2 — Financeiro
Status: em andamento, primeiro bloco entregue. Não avançar à Fase 3.
Início após a mensagem do usuário “conferido, proximo!”, com o recorte de acesso individual e operação sem Docker já autorizado.

## Cadastros entregues
/financeiro: contas financeiras, categorias hierárquicas e centros de custo.
Criar, editar nome (e tipo/hierarquia para categorias), arquivar preservando histórico, buscar por nome, ordenação alfabética e paginação de 25 linhas.
Ações de arquivamento pedem confirmação. Estados vazios, mensagens de validação, confirmação e submissão pendente.
A conta e dez categorias anteriores foram reaproveitadas. Nenhuma transação real foi criada ou alterada nos testes.
Somente administradores e Financeiro podem gravar; Visualização lê; Operacional não acessa.

## Migrations e tipos
20260909171029_finance_catalogs
20260909171112_finance_catalog_read
20260909171512_finance_catalog_validate_kind
Tipos gerados após criação das assinaturas RPC. A última migration altera somente validação interna, sem mudar o contrato.

## Regras
Saldo inicial em NUMERIC(15,2), recebido e devolvido como texto decimal.
Frontend aceita 1.250,90 ou 1250.90, rejeita precisão além de centavos e notação exponencial.
Novas contas em BRL; a conta legada também foi verificada como BRL.
A edição não altera saldo inicial nem saldo atual. Ajustes financeiros serão operações próprias do próximo bloco.
Categorias superiores pertencem à mesma organização, não podem estar arquivadas e devem ter tipo compatível.
Mudanças de hierarquia serializam por organização e impedem ciclos.
Arquivar categoria com filhas ativas é negado.
Gravações usam save_financial_catalog: validação de identidade/organização/permissão, escrita e auditoria na mesma transação.
request_id único por organização, payload preservado e bloqueio transacional impedem repetição lógica. Mesmo ID com payload diferente é rejeitado.
Tabelas não permitem mutações diretas por authenticated/anon. RPC SECURITY DEFINER revisada, search_path vazio, EXECUTE anônimo revogado.

## Testes e evidências
Seis testes locais passaram; TypeScript e build final passaram.
SQL com rollback passou: criar conta/categoria/centro, editar hierarquia, detectar ciclo, arquivar, preservar decimal, repetir operação sem duplicar, rejeitar payload divergente e centavos fracionários, escapar busca, auditar e negar escrita de Visualização.
Teste adicional: kind ausente é rejeitado no banco.
Teste com sessão Auth real: três telas renderizam formulário, acesso sem sessão redireciona ao login, API devolve saldo como texto.
As mutações de teste SQL foram revertidas; nenhuma empresa ou conta de teste persistiu.
Advisors após DDL: zero ERROR, apenas avisos documentados de RLS fechado, introspecção para authenticated, RPC privilegiada deliberada e proteção de senhas vazadas; índices novos ainda sem uso.
Relatórios completos: advisors-finance-security.json e advisors-finance-performance.json.

## Ainda falta nesta fase
- Lançamentos manuais, competência/vencimento, situações e baixa integral entregues no segundo bloco; ver LANCAMENTOS.md.
- Visões dedicadas de contas a pagar/receber, baixas parciais, parcelamento e recorrência.
- Transferências atômicas, estornos, saldos calculados e painel financeiro inicial.
- Vínculo de centros/categorias e comprovantes às operações financeiras.
- Exportação e ordenação interativa das listagens; seletor de categoria superior limitado às primeiras 200 ativas.
- Reativação de cadastros arquivados.
- Teste concorrente com conexões independentes (o bloqueio existe; o teste executado foi sequencial).
Não apresentar a Fase 2 inteira como concluída.

## Continuidade da Fundação
O usuário conferiu a interface e pediu o próximo bloco; isso não converte testes pendentes em testes aprovados.
A restauração de transações em tabela temporária e o isolamento por outra organização passaram.
Plano Supabase verificado: Free.
Snapshot de quinze tabelas públicas foi cifrado com AES-256 via pgcrypto e salvo fora do Supabase em work/recovery-private; chave separada, fora do código, da documentação e dos pacotes.
Esse snapshot é de dados da aplicação antes do Financeiro, não é pg_dump completo nem backup do Auth/Storage.
Recuperação independente completa, cobertura do provedor e cenários de implantação continuam como pendências conhecidas.


## Navegação integrada
Financeiro e Configurações compartilham o menu lateral e o cabeçalho. A navegação acontece na mesma aba, com o conteúdo à direita e indicação da seção ativa. Em telas pequenas, as duas seções ficam acessíveis por uma faixa de navegação. Build de produção e verificação TypeScript do build aprovados após a alteração.


## Segundo bloco — lançamentos
Disponível em /financeiro/lancamentos com criação, edição de pendências, baixa integral, cancelamento com motivo, busca/filtros e paginação. Os dois registros originais foram preservados, sem inferir datas ausentes.
10 testes locais, teste SQL transacional antes/depois da migration, teste de rotas/API com login real e build aprovados. Advisors revisados; índices compostos faltantes adicionados. Regras, evidências e limites completos em LANCAMENTOS.md. A Fase 2 permanece em andamento.

## Baixas parciais e parcelas simples
Disponíveis, com histórico individual e valor em aberto. A opção Parcelar fica fechada por padrão conforme pedido do usuário. Regras, testes e limitações em BAIXAS-E-PARCELAS.md. Priorizar ajustes do básico; não expandir o módulo automaticamente.

## Resumo básico
Entregue em /financeiro: saldo registrado total e por conta, recebido/pago no mês e valores ainda em aberto. Regras e testes em RESUMO-FINANCEIRO.md. Não confundir saldo registrado com integração bancária. A fase permanece em andamento.

## Edição, exclusão e pendências
Listagem com Editar/Excluir, exclusão lógica refletida nos totais e atalhos Contas a pagar/receber. Regras e testes em EDICAO-EXCLUSAO.md. A fase permanece em andamento.
