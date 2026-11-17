-- Gender and black (dark) site option on profiles
ALTER TABLE public.profiles
  ADD COLUMN gender TEXT CHECK (gender IS NULL OR gender IN ('female', 'male')),
  ADD COLUMN theme_dark BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.gender IS 'female or male, chosen at sign-up; NULL = not chosen yet.';
COMMENT ON COLUMN public.profiles.theme_dark IS 'true = black (dark) site background.';

-- New sign-ups: store gender; male users start on the black site
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g TEXT := NEW.raw_user_meta_data->>'gender';
BEGIN
  IF g IS NULL OR g NOT IN ('female', 'male') THEN g := NULL; END IF;

  INSERT INTO public.profiles (id, display_name, gender, theme_dark, theme_hue)
  VALUES (
    NEW.id,
    left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1), ''), 60),
    g,
    coalesce(g = 'male', false),
    CASE WHEN g = 'male' THEN 230 ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Plan reminders: when to ring, and whether it already rang
ALTER TABLE public.calendar_events
  ADD COLUMN remind_at TIMESTAMPTZ,
  ADD COLUMN reminded_at TIMESTAMPTZ;
COMMENT ON COLUMN public.calendar_events.remind_at IS 'Moment the reminder notification is sent (plan time, or 9:00 local on the day when no time).';

-- Existing upcoming plans: assume East Africa time
UPDATE public.calendar_events
SET remind_at = ((event_date + coalesce(event_time, time '09:00'))::timestamp AT TIME ZONE 'Africa/Nairobi')
WHERE remind_at IS NULL AND event_date >= current_date;

CREATE INDEX calendar_events_due_idx ON public.calendar_events (remind_at) WHERE reminded_at IS NULL;

-- Announcements and new-feature news from the admin
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'announcement' CHECK (kind IN ('announcement', 'feature')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 1000),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin posts announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admin deletes announcements" ON public.announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));