CREATE POLICY "mawkib_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mawkib-media');
CREATE POLICY "mawkib_media_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mawkib-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));
CREATE POLICY "mawkib_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mawkib-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')))
  WITH CHECK (bucket_id = 'mawkib-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));
CREATE POLICY "mawkib_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mawkib-media' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));