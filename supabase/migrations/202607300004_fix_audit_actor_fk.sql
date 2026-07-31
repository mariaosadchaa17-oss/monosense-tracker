-- audit_row_change() fell back to old_row.created_by as the audit actor
-- whenever auth.uid() was null (e.g. admin/service-role operations, or the
-- ON DELETE SET NULL cascade update fired when deleting a user). That
-- fallback value can reference a user that is being deleted in the very
-- same transaction, violating audit_logs.actor_id's foreign key and making
-- user deletion fail with an opaque 500 error.
--
-- Fix: only use a fallback actor id if it actually still exists in
-- auth.users; otherwise leave actor_id null.

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare row_data jsonb; old_row jsonb; home_id uuid; entity text; actor uuid;
begin
  row_data:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  old_row:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  home_id:=coalesce((row_data->>'household_id')::uuid,(old_row->>'household_id')::uuid);
  entity:=coalesce(row_data->>'id',old_row->>'id');
  actor:=coalesce((select auth.uid()),nullif(row_data->>'created_by','')::uuid,nullif(old_row->>'created_by','')::uuid);
  if actor is not null and not exists(select 1 from auth.users u where u.id=actor) then
    actor:=null;
  end if;
  insert into public.audit_logs(household_id,actor_id,entity_type,entity_id,action,old_data,new_data)
  values(home_id,actor,tg_table_name,entity,lower(tg_op),old_row,row_data);
  return coalesce(new,old);
end $$;
