# Fase 1 — situação atual
Data: 09/09/2026. Fundação em validação final; Fase 2 não iniciada.

## Alterações autorizadas pelo usuário
- Agência Átomo Ltda corresponde à Bueno Express: preservar e reaproveitar registros.
- Login simplificado para uma conta, sem gestão de usuários/cadastro público na interface.
- Dispensar Docker/Supabase local e realizar mudanças incrementais no projeto existente.
Isso substitui o pré-requisito de teste local do documento. Não dispensa RLS, verificação ou preservação histórica.

## Aplicado
Projeto gkajafyqquvlugrkjygu; migrations:
- 20260909140214_foundation_access_and_preservation
- 20260909140405_foundation_attachment_confirmation

Organizações mantêm IDs e nomes jurídicos de empresas; profiles referenciam auth.users; associações ativas e RBAC em tabelas protegidas.
Conta indicada pelo usuário provisionada como administradora após confirmação de e-mail.
RLS habilitada nas seis tabelas legadas e nas novas tabelas públicas. Grants anônimos revogados.
usuarios preservada para autoria histórica, com acesso negado pela API; nenhuma senha foi copiada.
Writes diretos de históricos e papéis negados. Operações financeiras ficam para a Fase 2.
Auditoria gerada por trigger e sem escrita/exclusão pelo usuário.
Bucket be-organization-documents privado, limite 10 MB, PDF/PNG/JPEG.
Metadata deve existir e corresponder à organização/entidade antes do upload.
RPC confirm_attachment verifica identidade, permissão, existência do objeto, tamanho e MIME; bloqueia a linha e é idempotente.
Download usa a sessão autorizada; resposta privada, sem cache, como anexo.
Arquivos confirmados não podem ser sobrescritos/excluídos pelo cliente.
A aplicação valida assinatura inicial do arquivo, mas isso não equivale a antivírus.

## Verificações executadas
- Build Next.js e TypeScript: aprovados.
- Quatro testes locais: aprovados.
- SQL com rollback: administrador; Financeiro; Operacional; Visualização; revogação; não membro; anônimo; bloqueio de autoatribuição; imutabilidade de auditoria; preservação de dados: aprovado.
- Os papéis Financeiro/Operacional/Visualização foram exercitados com o UUID real em transação revertida, não com três novas contas Auth.
- API real com sessão Auth: login, leitura autorizada, acesso anônimo negado, tabela legada de senhas negada, promoção de papel negada: aprovado.
- Storage real: negação anônima e por prefixo sem metadados; upload autorizado; confirmação antes de upload negada; confirmação repetida; download autorizado; download anônimo negado; sobrescrita/exclusão negadas: aprovado.
- Imagem técnica de um pixel preservada como evidência, claramente identificada; nenhuma venda/saldo fictício criado.
- Comparação EXCEPT de todas as linhas originais versus cópia restrita: sem diferenças.
- Duas transações, uma conta e dez categorias preservadas.

## Advisors após DDL
Segurança: zero erros. Permanecem avisos documentados:
- Esquema GraphQL visível a authenticated: necessário SELECT; linhas protegidas por RLS.
- confirm_attachment é SECURITY DEFINER exposta somente a authenticated: elevação intencional para confirmação atômica, com search_path vazio e checks no corpo.
- Proteção de senhas vazadas desativada na configuração Auth: pendente.
- usuarios e cópias restritas sem policies: negação total intencional.
Performance: apenas índices ainda sem uso; mantidos por atender FKs/filtros de acesso.
Relatórios completos em advisors-security-final.json e advisors-performance-final.json.
Referências de remediação:
https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Recuperação
Antes das alterações, cópias integrais das seis tabelas foram criadas em foundation_restore, com RLS, sem grants da aplicação e com PKs.
Essa cópia protege contra erros desta alteração, mas NÃO é backup independente contra perda do projeto.
Não exportamos senhas legadas ou dados pessoais para o pacote local.
A baseline estrutural e inventários estão versionados; não existe comprovação de PITR/retencão do plano.
Restauração externa completa do banco e recuperação separada de objetos seguem pendentes.
Não recomendar remover RLS para recuperar uma tela; corrigir policies incrementalmente.

## Pendências para aceite integral
- Recuperação independente e cobertura do backup do provedor.
- Retentativa de uploads falhos: confirmações pendentes são retomáveis; um upload interrompido antes de existir objeto exige novo envio. Não há limpeza automática de metadados órfãos.
- Testes com identidades Auth separadas, organização de teste separada e concorrência de revogação.
- Auditoria de alteração do catálogo de papéis por administrador de banco (a aplicação não pode alterá-lo).
- Verificação visual em navegador e cenários de implantação HTTPS/SMTP.
- Gestão de contas/recuperação de senha na interface dispensada do recorte imediato pelo usuário.

Nenhuma fase posterior foi iniciada. Não apresentar as pendências como aprovadas.


## Verificação final da aplicação
Teste real de sessão/rotas aprovado: página autenticada, administrador ativo, download privado sem cache e redirecionamento anônimo para login. Seed de catálogos executado duas vezes em transação revertida: idempotência aprovada. Build final aprovado após ajuste do redirecionamento no proxy.


## Adendo posterior
Após a conferência do usuário, foi iniciado o primeiro bloco da Fase 2. Consulte FASE-2.md e ADENDOS.md. As pendências acima permanecem transparentes; não há declaração de aprovação integral.

