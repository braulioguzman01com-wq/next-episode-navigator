CREATE TABLE public.mangas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mangadex_id text NOT NULL UNIQUE,
  title text NOT NULL,
  slug text NOT NULL,
  cover_url text,
  volumes text,
  chapters_total integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mangas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mangas TO authenticated;
GRANT ALL ON public.mangas TO service_role;
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.mangas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin insert" ON public.mangas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.mangas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.mangas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));