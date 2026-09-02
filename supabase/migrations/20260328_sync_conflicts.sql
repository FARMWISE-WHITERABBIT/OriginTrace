-- 20260328: Add sync_conflicts table for offline data integrity

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.collection_batches(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(user_id),
  
  -- The state that was attempted to be synced
  field_data JSONB NOT NULL,
  
  -- The state currently on the server
  server_data JSONB NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  
  resolved_by UUID REFERENCES public.profiles(user_id),
  resolution TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Ensure we don't spam conflicts for the same batch/org if one is pending
  CONSTRAINT unique_pending_conflict UNIQUE (org_id, batch_id, status)
);

-- 2. Enable RLS
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view their org conflicts" ON public.sync_conflicts
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can resolve conflicts" ON public.sync_conflicts
  FOR UPDATE USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_org_status ON public.sync_conflicts (org_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_batch_id ON public.sync_conflicts (batch_id);

-- 5. Update search path for functions
SET search_path = public, extensions;
