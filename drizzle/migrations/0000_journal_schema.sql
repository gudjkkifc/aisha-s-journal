-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 60),
  avatar_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own profile or admin can view" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Journal entries
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 200),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  mood TEXT CHECK (mood IS NULL OR char_length(mood) <= 16),
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX entries_user_created_idx ON public.entries (user_id, created_at DESC);
CREATE INDEX entries_created_idx ON public.entries (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writer or admin can view entries" ON public.entries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Writers create own entries" ON public.entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Writers update own entries" ON public.entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Writer or admin can delete entries" ON public.entries
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER entries_touch BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New user: profile + role; the very first account becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1), ''), 60)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  PERFORM pg_advisory_xact_lock(hashtext('aisha_journal_first_admin'));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for private photo bucket (folder = user id)
CREATE POLICY "Users upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or admin can read media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'journal-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users update own media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'journal-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or admin can delete media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'journal-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));