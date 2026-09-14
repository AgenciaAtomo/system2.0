-- Complete entity-bound upload confirmation. Explicitly reviewed SECURITY DEFINER entry.
create function public.confirm_attachment(attachment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.attachments; obj jsonb;
begin
 if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
 select * into a from public.attachments where id=attachment_id for update;
 if a.id is null or not private.has_permission(a.organization_id,'settings.manage') then raise exception 'Forbidden' using errcode='42501'; end if;
 if a.state='confirmed' then return; end if;
 if a.state<>'pending' or a.created_by<>auth.uid() then raise exception 'Invalid attachment state'; end if;
 select metadata into obj from storage.objects where bucket_id=a.bucket_id and name=a.object_path;
 if obj is null or (obj->>'size')::bigint is distinct from a.size_bytes or obj->>'mimetype' is distinct from a.mime_type then raise exception 'Upload missing or invalid'; end if;
 update public.attachments set state='confirmed',updated_at=now() where id=a.id;
end; $$;
revoke all on function public.confirm_attachment(uuid) from public,anon;
grant execute on function public.confirm_attachment(uuid) to authenticated;
do $$ declare t text; begin
 foreach t in array array['empresas','usuarios','contas_bancarias','categorias','transacoes','alertas_saldo'] loop
 execute format('alter table foundation_restore.%I add primary key(id)',t);
 end loop;
end $$;
