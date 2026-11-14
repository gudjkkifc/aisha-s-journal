-- New users get a profile and the 'user' role only (no more "first account is admin")
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

  RETURN NEW;
END;
$$;

-- The site owner's email becomes admin, but only once that email is confirmed
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'shakesian64@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_owner_admin_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

CREATE TRIGGER on_auth_user_owner_admin_confirm
  AFTER UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

-- Any admin role on an account that isn't the owner's email is removed
DELETE FROM public.user_roles r
USING auth.users u
WHERE r.user_id = u.id AND r.role = 'admin' AND lower(u.email) <> 'shakesian64@gmail.com';

-- If the owner already has a confirmed account, make them admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'shakesian64@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;