-- CRITICAL SECURITY FIX: Re-enable user-based RLS policies
-- The remote schema sync incorrectly removed user-based policies and added wide-open policies

-- Drop the insecure anon policies
DROP POLICY IF EXISTS "Allow anon read module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon insert module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon update module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon delete module_data" ON public.module_data;

-- Ensure RLS is enabled
ALTER TABLE public.module_data ENABLE ROW LEVEL SECURITY;

-- Re-create secure user-based RLS policies
-- Users can only read their own data
CREATE POLICY "Users can read own module_data" ON public.module_data
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert data for themselves
CREATE POLICY "Users can insert own module_data" ON public.module_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update own module_data" ON public.module_data
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete own module_data" ON public.module_data
  FOR DELETE USING (auth.uid() = user_id);
