drop policy if exists "members delete own messages" on public.family_messages;
create policy "members delete own messages" on public.family_messages
  for delete to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists "owners and admins delete document objects" on storage.objects;
create policy "owners and admins delete document objects" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'family-documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = name
        and (d.owner_id = (select auth.uid()) or public.has_family_role(d.family_id, array['owner', 'admin']::public.family_role[]))
    )
  );
