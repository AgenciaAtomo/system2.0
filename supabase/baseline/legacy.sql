-- Baseline estrutural do legado, sem dados. NÃO executar no projeto já existente.
-- Usar apenas para reconstrução controlada em banco vazio antes das migrations.
create table public.alertas_saldo (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 conta_id uuid not null,
 tipo character varying(50) not null,
 saldo_no_momento numeric(15,2),
 transacao_id uuid,
 lido boolean default false,
 criado_em timestamp with time zone default now(),
 lido_em timestamp with time zone
);
create table public.categorias (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 nome character varying(100) not null,
 tipo character varying(20) not null,
 cor_hex character varying(7) default '#3B82F6'::character varying,
 icone character varying(50),
 padrao boolean default false,
 criada_em timestamp with time zone default now(),
 deletada_em timestamp with time zone
);
create table public.contas_bancarias (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 nome character varying(255) not null,
 tipo character varying(50) not null,
 numero_conta character varying(20) not null,
 banco character varying(100),
 saldo_inicial numeric(15,2) default 0.00,
 saldo_atual numeric(15,2) default 0.00,
 moeda character varying(3) default 'BRL'::character varying,
 ativa boolean default true,
 criada_em timestamp with time zone default now(),
 atualizada_em timestamp with time zone default now(),
 deletada_em timestamp with time zone
);
create table public.empresas (
 id uuid default gen_random_uuid() not null,
 nome character varying(255) not null,
 cnpj character varying(18) not null,
 email_admin character varying(255) not null,
 timezone character varying(50) default 'America/Sao_Paulo'::character varying,
 saldo_minimo_alerta numeric(15,2),
 ativa boolean default true,
 criada_em timestamp with time zone default now(),
 atualizada_em timestamp with time zone default now(),
 deletada_em timestamp with time zone
);
create table public.transacoes (
 id uuid default gen_random_uuid() not null,
 empresa_id uuid not null,
 conta_id uuid not null,
 tipo character varying(20) not null,
 descricao character varying(500) not null,
 categoria_id uuid,
 valor numeric(15,2) not null,
 usuario_criador_id uuid not null,
 criada_em timestamp with time zone default now(),
 data_lancamento date not null,
 hora_lancamento time without time zone,
 status character varying(50) default 'confirmada'::character varying not null,
 observacoes text,
 idempotency_key uuid default gen_random_uuid(),
 usuario_deleidor_id uuid,
 deletada_em timestamp with time zone,
 motivo_delecao text,
 sequence_number bigint default 0 not null,
 saldo_corrente_apos numeric(15,2),
 atualizada_em timestamp with time zone default now()
);
create table public.usuarios (
 id uuid default gen_random_uuid() not null,
 email character varying(255) not null,
 senha_hash character varying(255) not null,
 nome_completo character varying(255) not null,
 empresa_id uuid not null,
 role character varying(50) default 'operador'::character varying not null,
 ativo boolean default true,
 ultimo_login timestamp with time zone,
 criado_em timestamp with time zone default now(),
 atualizado_em timestamp with time zone default now(),
 deletado_em timestamp with time zone
);
alter table public.alertas_saldo add constraint alertas_saldo_pkey PRIMARY KEY (id);
alter table public.alertas_saldo add constraint alertas_saldo_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['saldo_negativo'::character varying, 'saldo_minimo'::character varying, 'reconciliacao_pendente'::character varying])::text[])));
alter table public.categorias add constraint categorias_empresa_id_nome_key UNIQUE (empresa_id, nome);
alter table public.categorias add constraint categorias_pkey PRIMARY KEY (id);
alter table public.categorias add constraint categorias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['receita'::character varying, 'despesa'::character varying, 'ambos'::character varying])::text[])));
alter table public.contas_bancarias add constraint contas_bancarias_empresa_id_numero_conta_key UNIQUE (empresa_id, numero_conta);
alter table public.contas_bancarias add constraint contas_bancarias_pkey PRIMARY KEY (id);
alter table public.contas_bancarias add constraint contas_bancarias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['corrente'::character varying, 'poupanca'::character varying, 'cartao_prepago'::character varying, 'caixa'::character varying])::text[])));
alter table public.empresas add constraint empresas_cnpj_key UNIQUE (cnpj);
alter table public.empresas add constraint empresas_pkey PRIMARY KEY (id);
alter table public.transacoes add constraint transacoes_idempotency_key_key UNIQUE (idempotency_key);
alter table public.transacoes add constraint transacoes_pkey PRIMARY KEY (id);
alter table public.transacoes add constraint transacoes_status_check CHECK (((status)::text = ANY ((ARRAY['pendente_aprovacao'::character varying, 'aprovada'::character varying, 'rejeitada'::character varying, 'confirmada'::character varying, 'cancelada'::character varying])::text[])));
alter table public.transacoes add constraint transacoes_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['receita'::character varying, 'despesa'::character varying])::text[])));
alter table public.transacoes add constraint transacoes_valor_check CHECK ((valor > (0)::numeric));
alter table public.usuarios add constraint usuarios_email_key UNIQUE (email);
alter table public.usuarios add constraint usuarios_pkey PRIMARY KEY (id);
alter table public.usuarios add constraint usuarios_role_check CHECK (((role)::text = ANY ((ARRAY['admin_master'::character varying, 'admin_empresa'::character varying, 'operador'::character varying, 'visualizador'::character varying])::text[])));
alter table public.alertas_saldo add constraint alertas_saldo_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE;
alter table public.alertas_saldo add constraint alertas_saldo_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.alertas_saldo add constraint alertas_saldo_transacao_id_fkey FOREIGN KEY (transacao_id) REFERENCES transacoes(id) ON DELETE SET NULL;
alter table public.categorias add constraint categorias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.contas_bancarias add constraint contas_bancarias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.transacoes add constraint transacoes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL;
alter table public.transacoes add constraint transacoes_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON DELETE CASCADE;
alter table public.transacoes add constraint transacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
alter table public.transacoes add constraint transacoes_usuario_criador_id_fkey FOREIGN KEY (usuario_criador_id) REFERENCES usuarios(id) ON DELETE RESTRICT;
alter table public.transacoes add constraint transacoes_usuario_deleidor_id_fkey FOREIGN KEY (usuario_deleidor_id) REFERENCES usuarios(id) ON DELETE SET NULL;
alter table public.usuarios add constraint usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
