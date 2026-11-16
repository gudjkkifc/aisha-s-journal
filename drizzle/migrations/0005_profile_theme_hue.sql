ALTER TABLE public.profiles
  ADD COLUMN theme_hue INTEGER CHECK (theme_hue IS NULL OR (theme_hue >= 0 AND theme_hue < 360));
COMMENT ON COLUMN public.profiles.theme_hue IS 'Colour wheel position (0-359) of the site colour the user picked; NULL = default pink.';