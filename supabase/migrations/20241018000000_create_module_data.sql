-- Universal Module Data Schema for Nesting Modules Architecture
-- This replaces the relational schema with a context-based modular approach

-- Create the universal module_data table
CREATE TABLE IF NOT EXISTS public.module_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  sub_modules JSONB NOT NULL DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '{"rules": [{"type": "allow", "subject": "*", "actions": ["read"]}]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_data_type ON public.module_data(module_type);
CREATE INDEX IF NOT EXISTS idx_module_data_created_at ON public.module_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_data_context ON public.module_data USING GIN ((data->'context'));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_module_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER module_data_set_updated_at
BEFORE UPDATE ON public.module_data
FOR EACH ROW EXECUTE FUNCTION public.set_module_updated_at();

-- Enable RLS
ALTER TABLE public.module_data ENABLE ROW LEVEL SECURITY;

-- Allow anon access (matching existing pattern)
CREATE POLICY "Allow anon read module_data" ON public.module_data
  FOR SELECT USING (true);
CREATE POLICY "Allow anon insert module_data" ON public.module_data
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update module_data" ON public.module_data
  FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete module_data" ON public.module_data
  FOR DELETE USING (true);

-- Helper functions for querying modules

-- Get module by id and type
CREATE OR REPLACE FUNCTION public.get_module(module_id UUID, module_type_filter VARCHAR(50) DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT data
    FROM public.module_data
    WHERE id = module_id
    AND (module_type_filter IS NULL OR module_type = module_type_filter)
  );
END;
$$;

-- Get modules by type
CREATE OR REPLACE FUNCTION public.get_modules_by_type(module_type_filter VARCHAR(50))
RETURNS JSONB[]
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ARRAY(
    SELECT data || jsonb_build_object('id', id, 'created_at', created_at, 'updated_at', updated_at)
    FROM public.module_data
    WHERE module_type = module_type_filter
    ORDER BY created_at DESC
  );
END;
$$;

-- Get modules by context (for associations)
CREATE OR REPLACE FUNCTION public.get_modules_by_context(context_type VARCHAR(50), context_id UUID)
RETURNS JSONB[]
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ARRAY(
    SELECT data || jsonb_build_object('id', id, 'created_at', created_at, 'updated_at', updated_at)
    FROM public.module_data
    WHERE data->'context'->>'type' = context_type
    AND data->'context'->>'id' = context_id::text
    ORDER BY created_at DESC
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_module(UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.get_modules_by_type(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.get_modules_by_context(VARCHAR, UUID) TO anon;
