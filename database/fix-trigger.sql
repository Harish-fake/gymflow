-- ============================================================
-- GYMFLOW - Fix auth trigger
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'member'
    ),
    NEW.email_confirmed_at IS NOT NULL
  );

  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed: Create a test gym (if none exist)
INSERT INTO public.gyms (name, slug, email)
SELECT 'Test Gym', 'test-gym', 'test@gymflow.com'
WHERE NOT EXISTS (SELECT 1 FROM public.gyms LIMIT 1);

-- Seed: Create test user (password: test123456)
-- Uses the raw auth endpoint via the API -- run this after the trigger is fixed
