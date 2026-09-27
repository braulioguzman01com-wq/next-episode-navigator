
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Sources (info, news, video)
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('info','news','video')),
  name text NOT NULL,
  site_url text,
  search_url text,
  feed_url text,
  trust text NOT NULL DEFAULT 'medium' CHECK (trust IN ('high','medium','low')),
  priority int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','problems','unavailable','unsupported')),
  integration_method text NOT NULL DEFAULT 'rss' CHECK (integration_method IN ('anilist','jikan','rss','link_only')),
  last_sync_at timestamptz,
  last_error text,
  last_response_ms int,
  items_found int NOT NULL DEFAULT 0,
  consecutive_failures int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);
GRANT SELECT ON public.sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sources" ON public.sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write sources" ON public.sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Animes
CREATE TABLE public.animes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anilist_id int UNIQUE,
  mal_id int UNIQUE,
  title text NOT NULL,
  title_english text,
  title_native text,
  synonyms text[] NOT NULL DEFAULT '{}',
  match_keys text[] NOT NULL DEFAULT '{}',
  search_text text NOT NULL DEFAULT '',
  synopsis text,
  genres text[] NOT NULL DEFAULT '{}',
  year int,
  season text,
  studio text,
  status text,
  episodes int,
  duration int,
  cover_url text,
  banner_url text,
  color text,
  start_date date,
  next_episode int,
  next_airing_at timestamptz,
  latest_episode int,
  latest_episode_at timestamptz,
  primary_source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX animes_next_airing_idx ON public.animes (next_airing_at);
CREATE INDEX animes_latest_idx ON public.animes (latest_episode_at DESC);
CREATE INDEX animes_search_trgm ON public.animes USING gin (search_text gin_trgm_ops);
CREATE INDEX animes_match_keys ON public.animes USING gin (match_keys);
GRANT SELECT ON public.animes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.animes TO authenticated;
GRANT ALL ON public.animes TO service_role;
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read visible animes" ON public.animes FOR SELECT TO anon, authenticated
  USING (hidden = false OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write animes" ON public.animes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id uuid NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  number int NOT NULL,
  title text,
  aired_at timestamptz,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','scheduled','review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anime_id, number)
);
CREATE INDEX episodes_created_idx ON public.episodes (created_at DESC);
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read episodes" ON public.episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write episodes" ON public.episodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Official links: episode_id null = anime-level link
CREATE TABLE public.watch_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id uuid NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anime_id, url)
);
GRANT SELECT ON public.watch_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.watch_links TO authenticated;
GRANT ALL ON public.watch_links TO service_role;
ALTER TABLE public.watch_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read links" ON public.watch_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write links" ON public.watch_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL UNIQUE,
  published_at timestamptz,
  anime_id uuid REFERENCES public.animes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_items TO anon, authenticated;
GRANT DELETE ON public.news_items TO authenticated;
GRANT ALL ON public.news_items TO service_role;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read news" ON public.news_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin delete news" ON public.news_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sync_runs (
  id bigserial PRIMARY KEY,
  trigger text NOT NULL DEFAULT 'cron',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','partial','failed')),
  stage text NOT NULL DEFAULT 'Preparando',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  sources_total int NOT NULL DEFAULT 0,
  sources_ok int NOT NULL DEFAULT 0,
  sources_failed int NOT NULL DEFAULT 0,
  animes_found int NOT NULL DEFAULT 0,
  animes_new int NOT NULL DEFAULT 0,
  episodes_new int NOT NULL DEFAULT 0,
  changes int NOT NULL DEFAULT 0,
  merged int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'
);
GRANT SELECT ON public.sync_runs TO anon, authenticated;
GRANT ALL ON public.sync_runs TO service_role;
GRANT USAGE ON SEQUENCE public.sync_runs_id_seq TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read runs" ON public.sync_runs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.change_history (
  id bigserial PRIMARY KEY,
  anime_id uuid REFERENCES public.animes(id) ON DELETE CASCADE,
  run_id bigint REFERENCES public.sync_runs(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.sources(id) ON DELETE SET NULL,
  kind text NOT NULL,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX change_history_anime ON public.change_history (anime_id, created_at DESC);
GRANT SELECT ON public.change_history TO authenticated;
GRANT ALL ON public.change_history TO service_role;
GRANT USAGE ON SEQUENCE public.change_history_id_seq TO service_role;
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read history" ON public.change_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.source_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  code text NOT NULL,
  message text,
  occurrences int NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false,
  UNIQUE (source_id, code)
);
GRANT SELECT, UPDATE, DELETE ON public.source_errors TO authenticated;
GRANT ALL ON public.source_errors TO service_role;
ALTER TABLE public.source_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin errors" ON public.source_errors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sync_lock (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked_until timestamptz NOT NULL DEFAULT 'epoch'
);
GRANT ALL ON public.sync_lock TO service_role;
ALTER TABLE public.sync_lock ENABLE ROW LEVEL SECURITY;
INSERT INTO public.sync_lock (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.acquire_sync_lock(_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  UPDATE public.sync_lock SET locked_until = now() + make_interval(secs => _seconds)
   WHERE id = 1 AND locked_until < now() RETURNING true INTO ok;
  RETURN coalesce(ok,false);
END $$;
CREATE OR REPLACE FUNCTION public.release_sync_lock()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.sync_lock SET locked_until = 'epoch' WHERE id = 1
$$;
REVOKE EXECUTE ON FUNCTION public.acquire_sync_lock(int) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sync_lock() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_sync_lock(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lock() TO service_role;

-- Initial source configuration
INSERT INTO public.sources (kind,name,site_url,feed_url,trust,priority,integration_method) VALUES
 ('info','AniList','https://anilist.co','https://graphql.anilist.co','high',10,'anilist'),
 ('info','Jikan (MyAnimeList)','https://jikan.moe','https://api.jikan.moe/v4','medium',20,'jikan'),
 ('news','Anime News Network','https://www.animenewsnetwork.com','https://www.animenewsnetwork.com/all/rss.xml?ann-edition=w','high',10,'rss'),
 ('news','MyAnimeList News','https://myanimelist.net/news','https://myanimelist.net/rss/news.xml','high',15,'rss'),
 ('news','Crunchyroll News','https://www.crunchyroll.com/news','https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss','high',15,'rss'),
 ('news','Anime Corner','https://animecorner.me','https://animecorner.me/feed/','medium',30,'rss'),
 ('news','Anime Herald','https://www.animeherald.com','https://www.animeherald.com/feed/','medium',30,'rss'),
 ('news','Anime Trending','https://www.anime-trending.com','https://www.anime-trending.com/feed','low',40,'rss'),
 ('news','Anime UK News','https://animeuknews.net','https://animeuknews.net/feed/','medium',35,'rss'),
 ('news','Tokyo Otaku Mode','https://otakumode.com/news','https://otakumode.com/news/feed','low',40,'rss'),
 ('news','Anime Expo','https://www.anime-expo.org','https://www.anime-expo.org/feed/','low',45,'rss'),
 ('video','Crunchyroll','https://www.crunchyroll.com','https://www.crunchyroll.com/search?q=','high',10,'link_only'),
 ('video','Netflix','https://www.netflix.com','https://www.netflix.com/search?q=','high',15,'link_only'),
 ('video','Amazon Prime Video','https://www.primevideo.com',null,'high',20,'link_only'),
 ('video','Disney Plus','https://www.disneyplus.com',null,'high',20,'link_only'),
 ('video','HIDIVE','https://www.hidive.com','https://www.hidive.com/search?q=','high',25,'link_only'),
 ('video','Hulu','https://www.hulu.com',null,'high',25,'link_only'),
 ('video','YouTube','https://www.youtube.com','https://www.youtube.com/results?search_query=','medium',40,'link_only'),
 ('video','Bilibili TV','https://www.bilibili.tv',null,'medium',45,'link_only');
