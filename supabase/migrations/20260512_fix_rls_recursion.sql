-- ============================================================
-- Migration: 20260512_fix_rls_recursion
-- Purpose: Fix infinite recursion in RLS policies by ensuring
-- get_user_org_id() and get_user_role() use SET search_path = ''
-- and fully qualified table names to bypass RLS.
-- ============================================================

-- 1. Correct get_user_org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- 2. Correct get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- 3. Fix profiles SELECT policy (explicitly allow viewing own profile to avoid recursion if search_path were public)
-- Even with search_path='', it's good practice to ensure self-viewing is always permitted.
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT USING (org_id = public.get_user_org_id() OR user_id = auth.uid() OR public.is_system_admin());
