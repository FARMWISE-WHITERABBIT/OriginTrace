BEGIN;

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS local_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farms_org_local_id
  ON public.farms (org_id, local_id)
  WHERE local_id IS NOT NULL;

COMMIT;
