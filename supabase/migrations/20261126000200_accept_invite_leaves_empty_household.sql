-- Applied to project apktevzfdgritpmqhrir via Supabase MCP (migration: accept_invite_leaves_empty_household).
-- If both people generated a code, the one who joins leaves their own (still empty) household first.
create or replace function public.accept_household_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.household_invites%rowtype;
  v_current uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from public.household_invites i
    where i.code = upper(btrim(p_code))
    for update;

  if not found or v_invite.used_at is not null then
    raise exception 'invalid_code';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'expired_code';
  end if;

  select m.household_id into v_current from public.household_members m where m.user_id = v_uid;
  if v_current = v_invite.household_id then
    raise exception 'invalid_code';
  end if;
  if v_current is not null then
    if (select count(*) from public.household_members m where m.household_id = v_current) > 1 then
      raise exception 'already_in_household';
    end if;
    perform public.leave_household();
  end if;

  if (select count(*) from public.household_members m where m.household_id = v_invite.household_id) >= 2 then
    raise exception 'household_full';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (v_invite.household_id, v_uid, 'member');

  update public.household_invites
    set used_by = v_uid, used_at = now()
    where code = v_invite.code;

  return v_invite.household_id;
end;
$$;
