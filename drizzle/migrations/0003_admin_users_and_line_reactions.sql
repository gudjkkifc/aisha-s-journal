-- Admin emoji reactions on individual lines of an entry
CREATE TABLE public.entry_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  line_index INTEGER NOT NULL CHECK (line_index >= 0),
  line_text TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  reactor_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, line_index, emoji, reactor_id)
);

CREATE INDEX entry_reactions_entry_id_idx ON public.entry_reactions(entry_id);

GRANT SELECT, INSERT, DELETE ON public.entry_reactions TO authenticated;
GRANT ALL ON public.entry_reactions TO service_role;

ALTER TABLE public.entry_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writer or admin can view reactions"
ON public.entry_reactions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.user_id = auth.uid())
);

CREATE POLICY "Admins add own reactions"
ON public.entry_reactions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND reactor_id = auth.uid()
);

CREATE POLICY "Admins remove own reactions"
ON public.entry_reactions FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND reactor_id = auth.uid()
);

-- Admin-only list of every account with sign-in status
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_path TEXT,
  joined_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  signed_in BOOLEAN,
  entry_count BIGINT,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can list users' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    coalesce(p.display_name, '')::TEXT,
    p.avatar_path,
    u.created_at,
    u.last_sign_in_at,
    greatest(u.last_sign_in_at, s.last_seen),
    coalesce(s.active_sessions, 0) > 0,
    (SELECT count(*) FROM public.entries e WHERE e.user_id = u.id),
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT
      max(greatest(ss.updated_at, ss.refreshed_at AT TIME ZONE 'UTC')) AS last_seen,
      count(*) FILTER (WHERE ss.not_after IS NULL OR ss.not_after > now()) AS active_sessions
    FROM auth.sessions ss
    WHERE ss.user_id = u.id
  ) s ON true
  ORDER BY greatest(u.last_sign_in_at, s.last_seen) DESC NULLS LAST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;