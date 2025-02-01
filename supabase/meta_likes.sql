create or replace function toggle_meta_like(user_id uuid, meta_url text)
returns void as $$
begin
  if exists (select 1 from meta_likes where user_id = $1 and meta_url = $2) then
    delete from meta_likes where user_id = $1 and meta_url = $2;
  else
    insert into meta_likes (user_id, meta_url) values ($1, $2);
  end if;
end;
$$ language plpgsql security invoker;

-- Add execute permission
grant execute on function toggle_meta_like to authenticated;

-- Verify with:
\df+ toggle_meta_like 