CREATE TABLE public.ext_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  name text,
  format text,
  status text NOT NULL DEFAULT 'pending',
  last_sync_at timestamptz,
  last_error text,
  ext_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ext_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.ext_repos(id) ON DELETE CASCADE,
  pkg text NOT NULL,
  name text NOT NULL,
  version text,
  lang text,
  kind text,
  icon_url text,
  base_url text,
  compatible boolean NOT NULL DEFAULT false,
  site_id uuid REFERENCES public.scan_sites(id) ON DELETE SET NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repo_id, pkg, base_url)
);
GRANT SELECT ON public.ext_repos, public.ext_extensions TO authenticated;
GRANT ALL ON public.ext_repos, public.ext_extensions TO service_role;
ALTER TABLE public.ext_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.ext_repos FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin read" ON public.ext_extensions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));