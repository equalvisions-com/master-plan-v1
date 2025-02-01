alter table meta_likes enable row level security;

drop policy if exists "Users can view their own likes" on meta_likes;
drop policy if exists "Users can create their own likes" on meta_likes;
drop policy if exists "Users can delete their own likes" on meta_likes;

create policy "Users can manage their own likes" 
on meta_likes for all using (
  auth.uid() = user_id
) with check (
  auth.uid() = user_id
); 