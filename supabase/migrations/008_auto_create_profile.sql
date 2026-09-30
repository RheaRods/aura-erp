-- 008_auto_create_profile.sql
--
-- Problem: insert_user_profiles_admin requires current_user_role() = 'admin'
-- to insert a row into user_profiles. A brand-new signup has no row yet, so
-- there is no way for anyone to ever become the first admin through the app.
--
-- Fix: a trigger on auth.users that inserts the user_profiles row
-- automatically, running as SECURITY DEFINER so it bypasses RLS entirely.
-- Everyone lands as 'buyer' by default; promote to manager/admin manually
-- via the SQL editor (or an admin-only screen you build later).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'buyer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bootstrap your own account as admin after signing up once through the app:
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = auth.uid();
-- (run this in the Supabase SQL editor while logged in as yourself, or
--  look up your uid in auth.users by email and use that directly)
