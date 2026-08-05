-- 20260423: Fix unique constraint on agent_sync_status for upsert

-- 1. Drop the old constraint that included device_id
ALTER TABLE public.agent_sync_status DROP CONSTRAINT IF EXISTS agent_sync_status_agent_id_device_id_key;

-- 2. Delete duplicates if any exist before adding the new constraint
DELETE FROM public.agent_sync_status a
USING public.agent_sync_status b
WHERE a.agent_id = b.agent_id AND a.id > b.id;

-- 3. Add the new constraint on just agent_id
ALTER TABLE public.agent_sync_status ADD CONSTRAINT agent_sync_status_agent_id_key UNIQUE (agent_id);
