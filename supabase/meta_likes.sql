create or replace function toggle_meta_like(p_meta_url text, p_user_id uuid)
returns boolean as $$
declare 
  new_state boolean;
begin
  if exists (select 1 from meta_likes where user_id = p_user_id and meta_url = p_meta_url) then
    delete from meta_likes where user_id = p_user_id and meta_url = p_meta_url;
    new_state := false;
  else
    insert into meta_likes (user_id, meta_url) values (p_user_id, p_meta_url);
    new_state := true;
  end if;
  return new_state;
end;
$$ language plpgsql security invoker;

-- Add execute permission
grant execute on function toggle_meta_like to authenticated;

-- Verify with:
\df+ toggle_meta_like 

-- Add this to verify function creation
comment on function toggle_meta_like is 'Handles meta like toggling'; 