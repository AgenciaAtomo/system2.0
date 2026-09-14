# Bueno Express — hospedagem

Este pacote contém o código atualizado do MVP. Precisa de hospedagem com suporte a Next.js e servidor Node.js; não funciona como HTML estático ou apenas enviando arquivos para public_html.

## Configuração da hospedagem

- Pasta raiz: a própria pasta extraída, onde está package.json.
- Node.js: 22 ou superior, compatível com o gerenciador indicado em package.json.
- Gerenciador: pnpm 11.19.0.
- Instalação: pnpm install --frozen-lockfile
- Compilação: pnpm build
- Inicialização: pnpm start
- A hospedagem deve instalar também as dependências de desenvolvimento antes da compilação.
- O pacote inicia em 0.0.0.0 e usa a variável PORT fornecida pela hospedagem (padrão 3000).
- Configure domínio com HTTPS e encaminhe as requisições ao servidor Node.js.

## Conexão com os dados

Antes de compilar, configure no painel da hospedagem as duas variáveis listadas em .env.example, usando os valores do projeto Supabase atual:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Não use uma chave administrativa no lugar da chave publicável. Os valores não estão neste ZIP. O banco atual já está preparado: mantenha o mesmo projeto para preservar os cadastros e o acesso. Não execute novamente as migrações ou seed no banco existente. Os arquivos SQL acompanham o código como histórico; uma instalação em banco novo exige revisão da base anterior.

Ao definir o domínio, ajuste os endereços de autenticação no projeto Supabase para o endereço público, incluindo os redirecionamentos de login usados pela aplicação. Endereços 127.0.0.1 referem-se apenas ao computador local.

## Conteúdo e validação

O código das categorias está em src. O escopo e as limitações do MVP estão em docs/MVP-OPERACIONAL.md. Os testes acompanham o projeto. Após publicar, confira login, carregamento do painel e gravação de um cadastro antes de iniciar a operação.

O pacote não inclui senhas, dependências instaladas, compilação local ou cópia dos dados do banco. A hospedagem instala e compila o sistema. Este guia substitui as instruções locais de inicialização presentes nos documentos históricos.
