-- Users can upload only into their own folder: lecture-audio/{user_id}/...
create policy "audio_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'lecture-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_select_own_folder" on storage.objects
  for select using (
    bucket_id = 'lecture-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'lecture-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );