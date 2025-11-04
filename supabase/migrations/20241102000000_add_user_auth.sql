-- Add user_id column to module_data table
ALTER TABLE public.module_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_module_data_user_id ON public.module_data(user_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow anon read module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon insert module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon update module_data" ON public.module_data;
DROP POLICY IF EXISTS "Allow anon delete module_data" ON public.module_data;

-- Create new user-based RLS policies
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

-- Create a profiles table for additional user metadata
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are publicly readable (optional - adjust based on your needs)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-update profiles updated_at
CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profile_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_updated_at();
