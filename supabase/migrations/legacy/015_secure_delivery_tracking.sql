ALTER TABLE public.delivery_trackings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage delivery tracking in own stores" ON public.delivery_trackings;
CREATE POLICY "Users can manage delivery tracking in own stores"
  ON public.delivery_trackings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = delivery_trackings.store_id
        AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = delivery_trackings.store_id
        AND stores.user_id = auth.uid()
    )
  );
