-- Enable Realtime for module_data table
-- This allows Supabase to send complete row data in change events

-- Set replica identity to FULL so that DELETE and UPDATE events include all column values
ALTER TABLE public.module_data REPLICA IDENTITY FULL;

-- Enable Realtime publication for the module_data table
-- This is required for Supabase Realtime to broadcast changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_data;
