CREATE TABLE public.scan_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  last_scan_at timestamptz,
  last_error text,
  last_contents int NOT NULL DEFAULT 0,
  last_chapters int NOT NULL DEFAULT 0,
  scanning_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.site_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.scan_sites(id) ON DELETE CASCADE,
  stable_key text NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  page_url text,
  missing_since timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, stable_key)
);
CREATE TABLE public.site_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.site_contents(id) ON DELETE CASCADE,
  number numeric NOT NULL,
  lang text NOT NULL DEFAULT 'und',
  title text,
  page_url text,
  play_url text,
  video_type text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, number, lang)
);
CREATE TABLE public.scan_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_id uuid REFERENCES public.scan_sites(id) ON DELETE CASCADE,
  code text, message text, url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scan_sites, public.site_contents, public.site_chapters, public.scan_errors TO authenticated;
GRANT ALL ON public.scan_sites, public.site_contents, public.site_chapters, public.scan_errors TO service_role;
ALTER TABLE public.scan_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.scan_sites FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.site_contents FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.site_chapters FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.scan_errors FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));