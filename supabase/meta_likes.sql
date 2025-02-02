create or replace function toggle_meta_like(meta_url text, user_id uuid)
returns boolean as $$
declare 
  new_state boolean;
begin
  if exists (select 1 from meta_likes where user_id = $2 and meta_url = $1) then
    delete from meta_likes where user_id = $2 and meta_url = $1;
    new_state := false;
  else
    insert into meta_likes (user_id, meta_url) values ($2, $1);
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