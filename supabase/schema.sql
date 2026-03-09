-- OriginTrace Multi-Tenant Database Schema
-- Run this in Supabase SQL Editor to set up your database
-- NOTE: In the actual database, organizations.id is INTEGER (serial),
-- profiles.user_id is TEXT, and farms.id is INTEGER.
-- The UUID references to organizations(id) and auth.users(id) in this file
-- represent the ideal Supabase schema. The live database uses adapted types.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- System Admins (superadmin access)
CREATE TABLE IF NOT EXISTS system_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  commodities TEXT[] DEFAULT ARRAY['cocoa'],
  subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'basic', 'pro', 'enterprise')),
  feature_flags JSONB DEFAULT '{"financing": false, "api_access": false, "advanced_mapping": false, "satellite_overlays": false}',
  agent_seat_limit INTEGER DEFAULT 5,
  monthly_collection_limit INTEGER DEFAULT 1000,
  data_region TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (user profiles linked to organizations)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor', 'buyer', 'farmer')),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  assigned_state TEXT,
  assigned_lga TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Nigerian States
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

-- Local Government Areas
CREATE TABLE IF NOT EXISTS lgas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(state_id, name)
);

-- Villages/Communities
CREATE TABLE IF NOT EXISTS villages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lga_id UUID NOT NULL REFERENCES lgas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(lga_id, name)
);

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  farmer_id TEXT,
  phone TEXT,
  state_id UUID REFERENCES states(id),
  lga_id UUID REFERENCES lgas(id),
  village_id UUID REFERENCES villages(id),
  community TEXT NOT NULL,
  boundary JSONB,
  boundary_geo geography(POLYGON, 4326),
  area_hectares DECIMAL(10,2),
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'rejected')),
  compliance_notes TEXT,
  legality_doc_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bags (with hybrid batch link)
CREATE TABLE IF NOT EXISTS bags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  serial TEXT NOT NULL,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'collected', 'processed')),
  collection_batch_id UUID, -- FK added after collection_batches table exists
  weight_kg NUMERIC(12,2) DEFAULT 0,
  grade TEXT CHECK (grade IN ('A', 'B', 'C')),
  is_compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, serial)
);

-- Collection Batches (parent container for bags collected in one session)
CREATE TABLE IF NOT EXISTS collection_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id),
  agent_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'collecting' CHECK (status IN ('collecting', 'completed', 'aggregated', 'shipped')),
  total_weight DECIMAL(10,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  notes TEXT,
  local_id TEXT, -- For offline sync: unique ID generated on device
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections (legacy - keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bag_id UUID NOT NULL REFERENCES bags(id),
  farm_id UUID NOT NULL REFERENCES farms(id),
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  batch_id UUID REFERENCES collection_batches(id), -- Link to parent batch
  weight DECIMAL(10,2) NOT NULL,
  grade TEXT DEFAULT 'A' CHECK (grade IN ('A', 'B', 'C')),
  notes TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Sync Status (tracks device connectivity for admin dashboard)
CREATE TABLE IF NOT EXISTS agent_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  device_id TEXT, -- Unique device identifier
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  pending_batches INTEGER DEFAULT 0,
  pending_bags INTEGER DEFAULT 0,
  app_version TEXT,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, device_id)
);

-- Compliance Files (for document storage)
CREATE TABLE IF NOT EXISTS compliance_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id),
  file_type TEXT NOT NULL CHECK (file_type IN ('land_title', 'id_card', 'photo', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DDS Exports
CREATE TABLE IF NOT EXISTS dds_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geojson JSONB NOT NULL,
  export_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_org_id ON farms(org_id);
CREATE INDEX IF NOT EXISTS idx_bags_org_id ON bags(org_id);
CREATE INDEX IF NOT EXISTS idx_bags_serial ON bags(serial);
CREATE INDEX IF NOT EXISTS idx_bags_batch_id ON bags(collection_batch_id);
CREATE INDEX IF NOT EXISTS idx_collections_org_id ON collections(org_id);
CREATE INDEX IF NOT EXISTS idx_collections_bag_id ON collections(bag_id);
CREATE INDEX IF NOT EXISTS idx_collections_farm_id ON collections(farm_id);
CREATE INDEX IF NOT EXISTS idx_collections_batch_id ON collections(batch_id);
CREATE INDEX IF NOT EXISTS idx_collection_batches_org_id ON collection_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_collection_batches_farm_id ON collection_batches(farm_id);
CREATE INDEX IF NOT EXISTS idx_collection_batches_agent_id ON collection_batches(agent_id);
CREATE INDEX IF NOT EXISTS idx_collection_batches_status ON collection_batches(status);
CREATE INDEX IF NOT EXISTS idx_agent_sync_status_org_id ON agent_sync_status(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_sync_status_agent_id ON agent_sync_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_lgas_state_id ON lgas(state_id);
CREATE INDEX IF NOT EXISTS idx_villages_lga_id ON villages(lga_id);

-- Spatial index for PostGIS farm boundaries
CREATE INDEX IF NOT EXISTS idx_farms_boundary_geo ON farms USING GIST (boundary_geo);

-- Function to sync JSONB boundary to PostGIS geography column
CREATE OR REPLACE FUNCTION sync_farm_boundary_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.boundary IS NOT NULL AND NEW.boundary->>'type' = 'Polygon' THEN
    BEGIN
      NEW.boundary_geo = ST_GeogFromGeoJSON(NEW.boundary::text);
      NEW.area_hectares = ROUND((ST_Area(NEW.boundary_geo) / 10000)::numeric, 2);
    EXCEPTION WHEN OTHERS THEN
      NEW.boundary_geo = NULL;
      NEW.area_hectares = NULL;
    END;
  ELSE
    NEW.boundary_geo = NULL;
    NEW.area_hectares = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_farm_boundary BEFORE INSERT OR UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION sync_farm_boundary_geo();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE dds_exports ENABLE ROW LEVEL SECURITY;

-- System admins policy helper function
-- SET search_path = '' prevents RLS from applying to queries in this function
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Get user's org_id helper function
-- SET search_path = '' prevents RLS from applying to queries in this function
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id = get_user_org_id() OR is_system_admin());

CREATE POLICY "System admins can manage organizations" ON organizations
  FOR ALL USING (is_system_admin());

-- Profiles policies
CREATE POLICY "Users can view profiles in their org" ON profiles
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

-- Users can only update safe fields (full_name, avatar_url, assigned_state, assigned_lga)
-- They CANNOT change org_id, role, or user_id to prevent org hopping and privilege escalation
CREATE POLICY "Users can update their own profile safely" ON profiles
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() 
    AND org_id = get_user_org_id()
    AND role = (SELECT role FROM profiles WHERE user_id = auth.uid())
  );

-- Admins can manage profiles in their org (including role changes within their org)
CREATE POLICY "Admins can manage profiles in their org" ON profiles
  FOR ALL USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles p2 WHERE p2.user_id = auth.uid() AND p2.role = 'admin')
  )
  WITH CHECK (
    org_id = get_user_org_id()
  );

CREATE POLICY "System admins can manage all profiles" ON profiles
  FOR ALL USING (is_system_admin());

-- System admins policies
CREATE POLICY "System admins can view system_admins" ON system_admins
  FOR SELECT USING (is_system_admin());

-- Farms policies
CREATE POLICY "Users can view farms in their org" ON farms
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can create farms in their org" ON farms
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Admins can manage farms in their org" ON farms
  FOR ALL USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all farms" ON farms
  FOR ALL USING (is_system_admin());

-- Bags policies
CREATE POLICY "Users can view bags in their org" ON bags
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage bags in their org" ON bags
  FOR ALL USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all bags" ON bags
  FOR ALL USING (is_system_admin());

-- Collections policies
CREATE POLICY "Users can view collections in their org" ON collections
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Agents can create collections" ON collections
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND agent_id = auth.uid());

CREATE POLICY "System admins can manage all collections" ON collections
  FOR ALL USING (is_system_admin());

-- Collection Batches policies
CREATE POLICY "Users can view batches in their org" ON collection_batches
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Agents can create batches" ON collection_batches
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Agents can update their own batches" ON collection_batches
  FOR UPDATE USING (
    org_id = get_user_org_id() 
    AND agent_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage batches in their org" ON collection_batches
  FOR ALL USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all batches" ON collection_batches
  FOR ALL USING (is_system_admin());

-- Agent Sync Status policies
CREATE POLICY "Agents can view their own sync status" ON agent_sync_status
  FOR SELECT USING (
    agent_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR org_id = get_user_org_id()
    OR is_system_admin()
  );

CREATE POLICY "Agents can update their own sync status" ON agent_sync_status
  FOR ALL USING (agent_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view sync status in their org" ON agent_sync_status
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "System admins can manage all sync status" ON agent_sync_status
  FOR ALL USING (is_system_admin());

-- Compliance files policies
CREATE POLICY "Users can view compliance files in their org" ON compliance_files
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can upload compliance files in their org" ON compliance_files
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "System admins can manage all compliance files" ON compliance_files
  FOR ALL USING (is_system_admin());

-- DDS exports policies
CREATE POLICY "Users can view dds exports in their org" ON dds_exports
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can create dds exports" ON dds_exports
  FOR INSERT WITH CHECK (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all dds exports" ON dds_exports
  FOR ALL USING (is_system_admin());

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_batches_updated_at BEFORE UPDATE ON collection_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_sync_status_updated_at BEFORE UPDATE ON agent_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraint for bags.collection_batch_id after collection_batches table exists
ALTER TABLE bags 
  ADD CONSTRAINT fk_bags_collection_batch 
  FOREIGN KEY (collection_batch_id) 
  REFERENCES collection_batches(id) ON DELETE SET NULL;

-- ============================================
-- SAAS MULTI-TENANCY & COMPLIANCE ENGINE
-- ============================================

-- Add SaaS columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{
  "satellite_overlays": false,
  "advanced_mapping": false,
  "financing": false,
  "api_access": false
}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS agent_seat_limit INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monthly_collection_limit INTEGER DEFAULT 1000;

-- Add consent and commodity fields to farms
ALTER TABLE farms ADD COLUMN IF NOT EXISTS commodity TEXT DEFAULT 'cocoa';
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_photo_url TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_signature TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS conflict_status VARCHAR(20) DEFAULT 'none';

-- Add yield flag field to collection_batches
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS yield_flag_reason TEXT;

-- Crop Standards table for yield validation
CREATE TABLE IF NOT EXISTS crop_standards (
  id SERIAL PRIMARY KEY,
  commodity TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'nigeria',
  avg_yield_per_hectare DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'kg',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity, region)
);

-- Seed crop standards data
INSERT INTO crop_standards (commodity, region, avg_yield_per_hectare, unit)
VALUES 
  ('cocoa', 'nigeria', 400.00, 'kg'),
  ('cashew', 'nigeria', 800.00, 'kg'),
  ('ginger', 'nigeria', 2500.00, 'kg'),
  ('palm_kernel', 'nigeria', 1200.00, 'kg'),
  ('rubber', 'nigeria', 1500.00, 'kg')
ON CONFLICT (commodity, region) DO NOTHING;

-- Farm Conflicts table for spatial conflict detection
CREATE TABLE IF NOT EXISTS farm_conflicts (
  id SERIAL PRIMARY KEY,
  farm_a_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farm_b_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  overlap_ratio DECIMAL(5,4),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(farm_a_id, farm_b_id)
);

-- Yield validation trigger function
CREATE OR REPLACE FUNCTION validate_batch_yield()
RETURNS TRIGGER AS $$
DECLARE
  farm_area DECIMAL;
  farm_commodity TEXT;
  expected_yield DECIMAL;
  threshold DECIMAL;
BEGIN
  -- Get farm details
  SELECT area_hectares, commodity INTO farm_area, farm_commodity
  FROM farms WHERE id = NEW.farm_id;
  
  -- Skip if no farm area or commodity
  IF farm_area IS NULL OR farm_commodity IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get average yield for commodity
  SELECT avg_yield_per_hectare INTO expected_yield
  FROM crop_standards 
  WHERE commodity = LOWER(farm_commodity) 
  LIMIT 1;
  
  IF expected_yield IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate threshold (120% of expected yield)
  threshold := farm_area * expected_yield * 1.2;
  
  -- Flag if weight exceeds threshold
  IF NEW.total_weight > threshold THEN
    NEW.status := 'flagged_for_review';
    NEW.yield_flag_reason := format(
      'Weight %.0fkg exceeds 120%% of expected yield (%.0fkg) for %.2f ha of %s',
      NEW.total_weight, threshold, farm_area, farm_commodity
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create yield validation trigger
DROP TRIGGER IF EXISTS trigger_validate_batch_yield ON collection_batches;
CREATE TRIGGER trigger_validate_batch_yield
  BEFORE INSERT OR UPDATE OF total_weight ON collection_batches
  FOR EACH ROW EXECUTE FUNCTION validate_batch_yield();

-- Farm boundary overlap detection trigger
CREATE OR REPLACE FUNCTION check_farm_overlap()
RETURNS TRIGGER AS $$
DECLARE
  conflict_farm RECORD;
  overlap_pct DECIMAL;
BEGIN
  IF NEW.boundary_geo IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find farms with overlapping boundaries in same org
  FOR conflict_farm IN
    SELECT id, boundary_geo
    FROM farms
    WHERE id != NEW.id
      AND org_id = NEW.org_id
      AND boundary_geo IS NOT NULL
      AND ST_Intersects(NEW.boundary_geo::geometry, boundary_geo::geometry)
  LOOP
    -- Calculate overlap ratio
    overlap_pct := ST_Area(ST_Intersection(NEW.boundary_geo::geometry, conflict_farm.boundary_geo::geometry)) /
                   NULLIF(ST_Area(ST_Union(NEW.boundary_geo::geometry, conflict_farm.boundary_geo::geometry)), 0);
    
    -- Record conflict if overlap > 10%
    IF overlap_pct > 0.10 THEN
      INSERT INTO farm_conflicts (farm_a_id, farm_b_id, overlap_ratio, status)
      VALUES (LEAST(NEW.id, conflict_farm.id), GREATEST(NEW.id, conflict_farm.id), overlap_pct, 'pending')
      ON CONFLICT (farm_a_id, farm_b_id) DO UPDATE SET overlap_ratio = EXCLUDED.overlap_ratio;
      
      -- Mark farm with conflict status
      NEW.conflict_status := 'detected';
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create farm overlap trigger
DROP TRIGGER IF EXISTS trigger_check_farm_overlap ON farms;
CREATE TRIGGER trigger_check_farm_overlap
  AFTER INSERT OR UPDATE OF boundary_geo ON farms
  FOR EACH ROW EXECUTE FUNCTION check_farm_overlap();

-- Farmer Performance Ledger view for performance analytics
CREATE OR REPLACE VIEW farmer_performance_ledger AS
SELECT 
  f.id AS farm_id,
  f.farmer_name,
  f.org_id,
  f.community,
  f.area_hectares,
  f.commodity,
  COALESCE(SUM(b.weight), 0) AS total_delivery_kg,
  COUNT(DISTINCT cb.id) AS total_batches,
  COUNT(b.id) AS total_bags,
  ROUND(AVG(CASE 
    WHEN b.grade = 'A' THEN 4 
    WHEN b.grade = 'B' THEN 3 
    WHEN b.grade = 'C' THEN 2 
    WHEN b.grade = 'D' THEN 1 
    ELSE 2.5 
  END), 2) AS avg_grade_score,
  MAX(cb.created_at) AS last_delivery_date,
  CASE 
    WHEN COUNT(DISTINCT DATE_TRUNC('month', cb.created_at)) >= 6 THEN 'high'
    WHEN COUNT(DISTINCT DATE_TRUNC('month', cb.created_at)) >= 3 THEN 'medium'
    ELSE 'low'
  END AS delivery_frequency,
  f.consent_timestamp IS NOT NULL AS has_consent
FROM farms f
LEFT JOIN collection_batches cb ON cb.farm_id = f.id
LEFT JOIN bags b ON b.collection_batch_id = cb.id
GROUP BY f.id, f.farmer_name, f.org_id, f.community, f.area_hectares, f.commodity, f.consent_timestamp;

-- Enable RLS on new tables
ALTER TABLE crop_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_conflicts ENABLE ROW LEVEL SECURITY;

-- Crop standards policies (read-only for all authenticated)
CREATE POLICY "Anyone can view crop standards" ON crop_standards
  FOR SELECT USING (true);

-- Farm conflicts policies
CREATE POLICY "Users can view conflicts in their org" ON farm_conflicts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM farms WHERE id = farm_a_id AND org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Admins can manage conflicts in their org" ON farm_conflicts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM farms WHERE id = farm_a_id AND org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all conflicts" ON farm_conflicts
  FOR ALL USING (is_system_admin());

-- ============================================
-- FINISHED GOODS PEDIGREE SYSTEM
-- For EU TRACES compliance and market verification
-- ============================================

-- Processing Runs (factory processing sessions)
CREATE TABLE IF NOT EXISTS processing_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_code TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  facility_location TEXT,
  commodity TEXT NOT NULL,
  input_weight_kg DECIMAL(12,2) NOT NULL,
  output_weight_kg DECIMAL(12,2),
  recovery_rate DECIMAL(5,2),
  standard_recovery_rate DECIMAL(5,2) DEFAULT 41.6,
  mass_balance_valid BOOLEAN DEFAULT true,
  mass_balance_variance DECIMAL(5,2),
  processed_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, run_code)
);

-- Processing Run Source Batches (links processing run to source collection batches)
CREATE TABLE IF NOT EXISTS processing_run_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_run_id UUID NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
  collection_batch_id INTEGER NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  weight_contribution_kg DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(processing_run_id, collection_batch_id)
);

-- Finished Goods (export-ready products with pedigree)
CREATE TABLE IF NOT EXISTS finished_goods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pedigree_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  processing_run_id UUID NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
  weight_kg DECIMAL(12,2) NOT NULL,
  batch_number TEXT,
  lot_number TEXT,
  production_date DATE NOT NULL,
  expiry_date DATE,
  destination_country TEXT DEFAULT 'EU',
  buyer_name TEXT,
  buyer_company TEXT,
  dds_submitted BOOLEAN DEFAULT false,
  dds_submitted_at TIMESTAMPTZ,
  dds_reference TEXT,
  qr_code_url TEXT,
  certificate_url TEXT,
  pedigree_verified BOOLEAN DEFAULT true,
  verification_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, pedigree_code)
);

-- Standard Recovery Rates by Product Type
CREATE TABLE IF NOT EXISTS recovery_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity TEXT NOT NULL,
  product_type TEXT NOT NULL,
  standard_recovery_rate DECIMAL(5,2) NOT NULL,
  tolerance_percent DECIMAL(5,2) DEFAULT 5.0,
  unit TEXT DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity, product_type)
);

-- Seed recovery standards for cocoa processing
INSERT INTO recovery_standards (commodity, product_type, standard_recovery_rate, tolerance_percent, notes) VALUES
  ('cocoa', 'cocoa_butter', 41.6, 5.0, 'Standard butter extraction from dried beans'),
  ('cocoa', 'cocoa_powder', 22.0, 5.0, 'Standard powder yield after butter extraction'),
  ('cocoa', 'cocoa_liquor', 82.0, 5.0, 'Liquor from roasted nibs'),
  ('cocoa', 'cocoa_nibs', 87.0, 5.0, 'Nibs from shelled beans'),
  ('cashew', 'cashew_kernel', 25.0, 5.0, 'Raw kernel extraction rate'),
  ('cashew', 'cashew_butter', 20.0, 5.0, 'Butter from kernels'),
  ('palm_kernel', 'palm_kernel_oil', 45.0, 5.0, 'Oil extraction from palm kernels'),
  ('ginger', 'ginger_powder', 15.0, 5.0, 'Dried powder from fresh ginger'),
  ('rubber', 'dry_rubber_content', 30.0, 5.0, 'DRC from latex')
ON CONFLICT (commodity, product_type) DO NOTHING;

-- Function to validate mass balance on processing run
CREATE OR REPLACE FUNCTION validate_mass_balance()
RETURNS TRIGGER AS $$
DECLARE
  std_rate DECIMAL;
  tolerance DECIMAL;
  actual_rate DECIMAL;
  variance DECIMAL;
BEGIN
  -- Skip if no output weight yet
  IF NEW.output_weight_kg IS NULL OR NEW.output_weight_kg = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calculate actual recovery rate
  actual_rate := (NEW.output_weight_kg / NULLIF(NEW.input_weight_kg, 0)) * 100;
  NEW.recovery_rate := actual_rate;
  
  -- Get standard rate for this commodity (default to cocoa butter if not specified)
  SELECT standard_recovery_rate, tolerance_percent INTO std_rate, tolerance
  FROM recovery_standards 
  WHERE commodity = LOWER(NEW.commodity)
  LIMIT 1;
  
  -- Use defaults if no standard found
  std_rate := COALESCE(std_rate, 41.6);
  tolerance := COALESCE(tolerance, 5.0);
  NEW.standard_recovery_rate := std_rate;
  
  -- Calculate variance from standard
  variance := ABS(actual_rate - std_rate);
  NEW.mass_balance_variance := variance;
  
  -- Flag if variance exceeds tolerance
  NEW.mass_balance_valid := variance <= tolerance;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create mass balance validation trigger
DROP TRIGGER IF EXISTS trigger_validate_mass_balance ON processing_runs;
CREATE TRIGGER trigger_validate_mass_balance
  BEFORE INSERT OR UPDATE OF output_weight_kg ON processing_runs
  FOR EACH ROW EXECUTE FUNCTION validate_mass_balance();

-- Enable RLS on pedigree tables
ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_run_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_standards ENABLE ROW LEVEL SECURITY;

-- Processing runs policies
CREATE POLICY "Users can view processing runs in their org" ON processing_runs
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage processing runs" ON processing_runs
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all processing runs" ON processing_runs
  FOR ALL USING (is_system_admin());

-- Processing run batches policies
CREATE POLICY "Users can view processing run batches in their org" ON processing_run_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM processing_runs pr WHERE pr.id = processing_run_id AND pr.org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Admins can manage processing run batches" ON processing_run_batches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM processing_runs pr WHERE pr.id = processing_run_id AND pr.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Finished goods policies
CREATE POLICY "Users can view finished goods in their org" ON finished_goods
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage finished goods" ON finished_goods
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all finished goods" ON finished_goods
  FOR ALL USING (is_system_admin());

-- Recovery standards policies (read-only for all)
CREATE POLICY "Anyone can view recovery standards" ON recovery_standards
  FOR SELECT USING (true);

-- Pedigree view for public verification (aggregates all data for a finished good)
CREATE OR REPLACE VIEW pedigree_verification AS
SELECT 
  fg.id AS finished_good_id,
  fg.pedigree_code,
  fg.product_name,
  fg.product_type,
  fg.weight_kg AS finished_weight_kg,
  fg.production_date,
  fg.destination_country,
  fg.buyer_name,
  fg.buyer_company,
  fg.dds_submitted,
  fg.dds_submitted_at,
  fg.dds_reference,
  fg.pedigree_verified,
  fg.verification_notes,
  pr.run_code AS processing_run_code,
  pr.facility_name,
  pr.facility_location,
  pr.input_weight_kg AS raw_input_kg,
  pr.output_weight_kg AS processed_output_kg,
  pr.recovery_rate,
  pr.standard_recovery_rate,
  pr.mass_balance_valid,
  pr.mass_balance_variance,
  pr.processed_at,
  o.name AS organization_name,
  o.logo_url AS organization_logo,
  (
    SELECT json_agg(json_build_object(
      'batch_id', cb.id,
      'collection_date', cb.created_at,
      'farm_id', cb.farm_id,
      'farmer_name', f.farmer_name,
      'community', f.community,
      'state', s.name,
      'area_hectares', f.area_hectares,
      'weight_kg', prb.weight_contribution_kg,
      'compliance_status', f.compliance_status,
      'boundary_geo', ST_AsGeoJSON(f.boundary_geo)::json
    ))
    FROM processing_run_batches prb
    JOIN collection_batches cb ON cb.id = prb.collection_batch_id
    JOIN farms f ON f.id = cb.farm_id
    LEFT JOIN states s ON s.id = f.state_id
    WHERE prb.processing_run_id = pr.id
  ) AS source_farms,
  (
    SELECT COUNT(DISTINCT cb.farm_id)
    FROM processing_run_batches prb
    JOIN collection_batches cb ON cb.id = prb.collection_batch_id
    WHERE prb.processing_run_id = pr.id
  ) AS total_smallholders,
  (
    SELECT SUM(f.area_hectares)
    FROM processing_run_batches prb
    JOIN collection_batches cb ON cb.id = prb.collection_batch_id
    JOIN farms f ON f.id = cb.farm_id
    WHERE prb.processing_run_id = pr.id
  ) AS total_farm_area_hectares
FROM finished_goods fg
JOIN processing_runs pr ON pr.id = fg.processing_run_id
JOIN organizations o ON o.id = fg.org_id;


-- System configuration table for tier templates and platform settings
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_service_role_only" ON system_config
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DOCUMENT VAULT (Phase 3)
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
    'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
    'quality_cert', 'other'
  )),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring_soon', 'archived')),
  linked_entity_type TEXT CHECK (linked_entity_type IN ('shipment', 'farm', 'farmer', 'organization', 'batch')),
  linked_entity_id UUID,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiry_30d', 'expiry_7d', 'expired')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their org" ON documents
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can create documents in their org" ON documents
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Users can update documents in their org" ON documents
  FOR UPDATE USING (org_id = get_user_org_id());

CREATE POLICY "Admins can delete documents in their org" ON documents
  FOR DELETE USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all documents" ON documents
  FOR ALL USING (is_system_admin());

CREATE POLICY "Users can view document alerts in their org" ON document_alerts
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can manage document alerts in their org" ON document_alerts
  FOR ALL USING (org_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_alerts_org_id ON document_alerts(org_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PAYMENT TRACKING (Phase 4)
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('farmer', 'aggregator', 'supplier')),
  payee_id UUID,
  payee_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP', 'XOF')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque')),
  reference_number TEXT,
  linked_entity_type TEXT CHECK (linked_entity_type IN ('collection_batch', 'contract')),
  linked_entity_id UUID,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their org" ON payments
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can create payments in their org" ON payments
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Admins can manage payments in their org" ON payments
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all payments" ON payments
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- BUYER PORTAL (Phase 5)
-- ============================================

CREATE TABLE IF NOT EXISTS buyer_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT,
  industry TEXT,
  contact_email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'buyer_admin' CHECK (role IN ('buyer_admin', 'buyer_viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS supply_chain_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(buyer_org_id, exporter_org_id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_reference TEXT NOT NULL,
  commodity TEXT NOT NULL,
  quantity_mt DECIMAL(12,2),
  quality_requirements JSONB DEFAULT '{}',
  required_certifications JSONB DEFAULT '[]',
  delivery_deadline DATE,
  destination_port TEXT,
  compliance_profile_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'fulfilled', 'cancelled')),
  price_per_unit DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHIPMENTS (Export Readiness)
-- ============================================

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  compliance_profile_id UUID,
  destination_country TEXT,
  total_weight_kg DECIMAL(12,2),
  readiness_score DECIMAL(5,2),
  readiness_decision TEXT CHECK (readiness_decision IN
    ('go', 'conditional_go', 'no_go', 'pending')),
  status TEXT DEFAULT 'draft' CHECK (status IN
    ('draft', 'ready', 'shipped', 'cancelled')),
  risk_flags JSONB DEFAULT '[]',
  score_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(org_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

CREATE TABLE IF NOT EXISTS contract_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  shipment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, shipment_id)
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipments in their org"
  ON shipments FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage shipments"
  ON shipments FOR ALL
  USING (
    org_id = public.get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "Buyer users can view their own org" ON buyer_organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = buyer_organizations.id)
    OR is_system_admin()
  );

CREATE POLICY "System admins can manage buyer orgs" ON buyer_organizations
  FOR ALL USING (is_system_admin());

CREATE POLICY "Buyer users can view their own profile" ON buyer_profiles
  FOR SELECT USING (user_id = auth.uid() OR is_system_admin());

CREATE POLICY "System admins can manage buyer profiles" ON buyer_profiles
  FOR ALL USING (is_system_admin());

CREATE POLICY "Linked parties can view supply chain links" ON supply_chain_links
  FOR SELECT USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = supply_chain_links.buyer_org_id)
    OR is_system_admin()
  );

CREATE POLICY "Buyer admins can create supply chain links" ON supply_chain_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = supply_chain_links.buyer_org_id AND role = 'buyer_admin')
  );

CREATE POLICY "Linked parties can view contracts" ON contracts
  FOR SELECT USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = contracts.buyer_org_id)
    OR is_system_admin()
  );

CREATE POLICY "Buyer admins can manage contracts" ON contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = contracts.buyer_org_id AND role = 'buyer_admin')
  );

CREATE POLICY "System admins can manage all contracts" ON contracts
  FOR ALL USING (is_system_admin());

CREATE POLICY "Linked parties can view contract shipments" ON contract_shipments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_shipments.contract_id AND (
      c.exporter_org_id = get_user_org_id()
      OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = c.buyer_org_id)
    ))
    OR is_system_admin()
  );

CREATE INDEX IF NOT EXISTS idx_supply_chain_links_buyer ON supply_chain_links(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_links_exporter ON supply_chain_links(exporter_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer ON contracts(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_exporter ON contracts(exporter_org_id);

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLIANCE PROFILES (Phase 6)
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_market TEXT NOT NULL,
  regulation_framework TEXT NOT NULL CHECK (regulation_framework IN ('EUDR', 'FSMA_204', 'UK_Environment_Act', 'custom')),
  required_documents JSONB DEFAULT '[]',
  required_certifications JSONB DEFAULT '[]',
  geo_verification_level TEXT DEFAULT 'polygon' CHECK (geo_verification_level IN ('basic', 'polygon', 'satellite')),
  min_traceability_depth INTEGER DEFAULT 1,
  custom_rules JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance profiles in their org" ON compliance_profiles
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage compliance profiles" ON compliance_profiles
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all compliance profiles" ON compliance_profiles
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_compliance_profiles_org ON compliance_profiles(org_id);

CREATE TRIGGER update_compliance_profiles_updated_at BEFORE UPDATE ON compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DIGITAL PRODUCT PASSPORT (Phase 8)
-- ============================================

CREATE TABLE IF NOT EXISTS digital_product_passports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finished_good_id UUID NOT NULL REFERENCES finished_goods(id) ON DELETE CASCADE,
  dpp_code TEXT NOT NULL UNIQUE,
  product_category TEXT NOT NULL,
  origin_country TEXT DEFAULT 'NG',
  sustainability_claims JSONB DEFAULT '{}',
  carbon_footprint_kg DECIMAL(10,2),
  certifications JSONB DEFAULT '[]',
  processing_history JSONB DEFAULT '[]',
  chain_of_custody JSONB DEFAULT '[]',
  regulatory_compliance JSONB DEFAULT '{}',
  machine_readable_data JSONB DEFAULT '{}',
  passport_version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'revoked')),
  issued_at TIMESTAMPTZ,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digital_product_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DPPs in their org" ON digital_product_passports
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage DPPs" ON digital_product_passports
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all DPPs" ON digital_product_passports
  FOR ALL USING (is_system_admin());

CREATE POLICY "Public can view active DPPs" ON digital_product_passports
  FOR SELECT USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_dpp_org ON digital_product_passports(org_id);
CREATE INDEX IF NOT EXISTS idx_dpp_code ON digital_product_passports(dpp_code);
CREATE INDEX IF NOT EXISTS idx_dpp_finished_good ON digital_product_passports(finished_good_id);

CREATE TRIGGER update_dpp_updated_at BEFORE UPDATE ON digital_product_passports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENTERPRISE API KEYS (Phase 9)
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  rate_limit_per_hour INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API keys in their org" ON api_keys
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all API keys" ON api_keys
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- API RATE LIMITS (Database-backed)
-- ============================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_prefix TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key_prefix)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_end);

-- ============================================
-- DEFORESTATION CHECK (Phase 10)
-- ============================================

ALTER TABLE farms ADD COLUMN IF NOT EXISTS deforestation_check JSONB;

-- ============================================
-- AUDIT EVENTS (Phase 11 — Immutable Append-Only Log)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit events" ON audit_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);

-- ============================================
-- WEBHOOK ENDPOINTS & DELIVERIES (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage webhooks" ON webhook_endpoints
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- ============================================
-- FARMER DIGITAL IDENTITY (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  farmer_code TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  pin_hash TEXT,
  invite_token TEXT UNIQUE,
  preferred_locale TEXT DEFAULT 'en',
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own account" ON farmer_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Org members can view farmer accounts" ON farmer_accounts
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_accounts_phone ON farmer_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_farm ON farmer_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_org ON farmer_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_token ON farmer_accounts(invite_token);

-- ============================================
-- FARMER TRAINING MODULES (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_training (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_account_id UUID REFERENCES farmer_accounts(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_type TEXT NOT NULL CHECK (module_type IN ('gap', 'safety', 'sustainability', 'organic', 'child_labor', 'eudr_awareness')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  score DECIMAL,
  certificate_url TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage training" ON farmer_training
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_training_farmer ON farmer_training(farmer_account_id);
CREATE INDEX IF NOT EXISTS idx_farmer_training_org ON farmer_training(org_id);

-- ============================================
-- FARMER AGRICULTURAL INPUTS (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('fertilizer', 'pesticide', 'herbicide', 'seed', 'organic_amendment')),
  product_name TEXT,
  quantity DECIMAL,
  unit TEXT CHECK (unit IN ('kg', 'liters', 'bags', 'units')),
  application_date DATE,
  area_applied_hectares DECIMAL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage inputs" ON farmer_inputs
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_inputs_farm ON farmer_inputs(farm_id);

-- ============================================
-- YIELD BENCHMARKS (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS yield_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity TEXT NOT NULL,
  country TEXT,
  region TEXT,
  season TEXT,
  avg_yield_per_hectare DECIMAL,
  min_yield DECIMAL,
  max_yield DECIMAL,
  source TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed benchmark data for key commodities
INSERT INTO yield_benchmarks (commodity, country, region, avg_yield_per_hectare, min_yield, max_yield, source, year) VALUES
  ('Cocoa', 'Nigeria', 'South West', 0.35, 0.15, 0.60, 'ICCO/FAO', 2024),
  ('Cocoa', 'Ghana', 'Western Region', 0.45, 0.20, 0.80, 'COCOBOD', 2024),
  ('Cocoa', 'Côte d''Ivoire', 'Sud-Comoé', 0.55, 0.25, 0.90, 'CCC', 2024),
  ('Coffee', 'Nigeria', 'Plateau', 0.60, 0.30, 1.00, 'FAO', 2024),
  ('Coffee', 'Côte d''Ivoire', 'Man', 0.50, 0.25, 0.85, 'FAO', 2024),
  ('Cashew', 'Nigeria', 'Kogi', 0.80, 0.40, 1.50, 'ACA', 2024),
  ('Cashew', 'Ghana', 'Bono', 0.70, 0.35, 1.20, 'FAO', 2024),
  ('Sesame', 'Nigeria', 'Nassarawa', 0.45, 0.20, 0.80, 'FAO', 2024),
  ('Shea', 'Nigeria', 'Niger', 0.25, 0.10, 0.50, 'Global Shea Alliance', 2024),
  ('Shea', 'Ghana', 'Northern', 0.30, 0.12, 0.55, 'Global Shea Alliance', 2024)
ON CONFLICT DO NOTHING;

-- ============================================
-- FARM CERTIFICATIONS REGISTRY (Phase 11)
-- ============================================

CREATE TABLE IF NOT EXISTS farm_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_body TEXT NOT NULL CHECK (certification_body IN ('rainforest_alliance', 'utz', 'fairtrade', 'organic', 'globalgap', 'fsc', 'pefc', 'other')),
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  verification_url TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage certifications" ON farm_certifications
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farm_certifications_farm ON farm_certifications(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_certifications_expiry ON farm_certifications(expiry_date);

-- ============================================
-- SCHEMA FIXES — Compliance Gaps (Phase 11)
-- ============================================

-- Fix regulation_framework CHECK to include all 7 frameworks
ALTER TABLE compliance_profiles DROP CONSTRAINT IF EXISTS compliance_profiles_regulation_framework_check;
ALTER TABLE compliance_profiles ADD CONSTRAINT compliance_profiles_regulation_framework_check
  CHECK (regulation_framework IN ('EUDR', 'FSMA_204', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'UAE_Halal', 'custom'));

-- Fix compliance_files file_type CHECK to support all regulatory document types
ALTER TABLE compliance_files DROP CONSTRAINT IF EXISTS compliance_files_file_type_check;
ALTER TABLE compliance_files ADD CONSTRAINT compliance_files_file_type_check
  CHECK (file_type IN (
    'land_title', 'id_card', 'photo', 'other',
    'phytosanitary_certificate', 'fumigation_certificate', 'certificate_of_origin',
    'halal_certificate', 'gacc_certificate', 'food_safety_plan', 'haccp_certificate',
    'health_certificate', 'inspection_report', 'esma_certificate', 'moccae_permit',
    'import_permit', 'labeling_compliance', 'training_certificate', 'input_record',
    'deforestation_declaration', 'due_diligence_statement', 'risk_assessment',
    'supply_chain_map', 'forced_labor_declaration', 'species_identification'
  ));

-- Add preferred_locale to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en';

-- ============================================
-- IDEMPOTENT COLUMN RENAMES (Schema Drift Fix)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bags' AND column_name = 'weight'
  ) THEN
    ALTER TABLE bags RENAME COLUMN weight TO weight_kg;
  END IF;
END $$;

-- ============================================
-- BOUNDARY ANALYSIS (Phase 12)
-- ============================================

ALTER TABLE farms ADD COLUMN IF NOT EXISTS boundary_analysis JSONB;

-- ============================================
-- SPOT MARKET / TENDER SYSTEM (Phase 12)
-- ============================================

CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  commodity TEXT NOT NULL,
  quantity_mt DECIMAL(12,2) NOT NULL,
  target_price_per_mt DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  delivery_deadline DATE,
  destination_country TEXT,
  destination_port TEXT,
  quality_requirements JSONB DEFAULT '{}',
  certifications_required TEXT[] DEFAULT '{}',
  regulation_framework TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'invited')),
  invited_orgs UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tender_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  price_per_mt DECIMAL(12,2) NOT NULL,
  quantity_available_mt DECIMAL(12,2) NOT NULL,
  delivery_date DATE,
  notes TEXT,
  compliance_score DECIMAL(5,2),
  certifications TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'awarded', 'rejected', 'withdrawn')),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer orgs can manage their tenders" ON tenders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = tenders.buyer_org_id AND role = 'buyer_admin')
  );

CREATE POLICY "Exporters can view public or invited tenders" ON tenders
  FOR SELECT USING (
    (visibility = 'public' AND status = 'open')
    OR (visibility = 'invited' AND get_user_org_id() = ANY(invited_orgs))
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = tenders.buyer_org_id)
    OR is_system_admin()
  );

CREATE POLICY "System admins can manage all tenders" ON tenders
  FOR ALL USING (is_system_admin());

CREATE POLICY "Exporters can manage their own bids" ON tender_bids
  FOR ALL USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_bids.tender_id AND EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = t.buyer_org_id))
    OR is_system_admin()
  );

CREATE INDEX IF NOT EXISTS idx_tenders_buyer_org ON tenders(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_commodity ON tenders(commodity);
CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_exporter ON tender_bids(exporter_org_id);

-- ============================================
-- MISSING TABLE DEFINITIONS (Schema Completeness)
-- Tables actively used in the codebase but previously
-- not documented in this schema file.
-- ============================================

-- Additional columns on shipments table used in code
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_code TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS commodity TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS buyer_company TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS buyer_contact TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS target_regulations TEXT[];
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS destination_port TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_ship_date DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================
-- BATCH CONTRIBUTIONS (Multi-farm batch collection)
-- ============================================

CREATE TABLE IF NOT EXISTS batch_contributions (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE batch_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batch contributions in their org" ON batch_contributions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Authorized users can manage batch contributions" ON batch_contributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all batch contributions" ON batch_contributions
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_batch_contributions_batch ON batch_contributions(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_contributions_farm ON batch_contributions(farm_id);

-- ============================================
-- SHIPMENT ITEMS (Line items within a shipment)
-- ============================================

CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('batch', 'finished_good')),
  batch_id INTEGER REFERENCES collection_batches(id) ON DELETE SET NULL,
  finished_good_id UUID REFERENCES finished_goods(id) ON DELETE SET NULL,
  farm_id INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  farm_count INTEGER DEFAULT 0,
  traceability_complete BOOLEAN DEFAULT false,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipment items in their org" ON shipment_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Authorized users can manage shipment items" ON shipment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all shipment items" ON shipment_items
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_batch ON shipment_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_finished_good ON shipment_items(finished_good_id);

-- ============================================
-- SHIPMENT LOTS (Sub-groupings within a shipment)
-- ============================================

CREATE TABLE IF NOT EXISTS shipment_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  commodity TEXT,
  notes TEXT,
  total_weight_kg NUMERIC(12,2) DEFAULT 0,
  total_bags INTEGER DEFAULT 0,
  farm_count INTEGER DEFAULT 0,
  mass_balance_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipment lots in their org" ON shipment_lots
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Authorized users can manage shipment lots" ON shipment_lots
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all shipment lots" ON shipment_lots
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_shipment_lots_shipment ON shipment_lots(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lots_org ON shipment_lots(org_id);

CREATE TRIGGER update_shipment_lots_updated_at BEFORE UPDATE ON shipment_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SHIPMENT LOT ITEMS (Items assigned to a lot)
-- ============================================

CREATE TABLE IF NOT EXISTS shipment_lot_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES shipment_lots(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES shipment_items(id) ON DELETE SET NULL,
  batch_id INTEGER REFERENCES collection_batches(id) ON DELETE SET NULL,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_lot_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipment lot items via lot org" ON shipment_lot_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shipment_lots sl WHERE sl.id = shipment_lot_items.lot_id AND sl.org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Authorized users can manage shipment lot items" ON shipment_lot_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shipment_lots sl WHERE sl.id = shipment_lot_items.lot_id AND sl.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all shipment lot items" ON shipment_lot_items
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_shipment_lot_items_lot ON shipment_lot_items(lot_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lot_items_shipment_item ON shipment_lot_items(shipment_item_id);

-- ============================================
-- NOTIFICATIONS (User notification inbox)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR is_system_admin());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System admins can manage all notifications" ON notifications
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- AUDIT LOGS (Superadmin action log, distinct from audit_events)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_system_admin());

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System admins can manage all audit logs" ON audit_logs
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- DELEGATIONS (Admin-to-aggregator permission delegation)
-- ============================================

CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delegated_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('conflict_resolution', 'compliance_review')),
  region_scope JSONB,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delegations in their org" ON delegations
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage delegations in their org" ON delegations
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System admins can manage all delegations" ON delegations
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_delegations_org ON delegations(org_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegated_to ON delegations(delegated_to);
CREATE INDEX IF NOT EXISTS idx_delegations_active ON delegations(org_id, is_active);

-- ============================================
-- DELEGATION AUDIT LOG (Tracks delegation lifecycle events)
-- ============================================

CREATE TABLE IF NOT EXISTS delegation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delegation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delegation audit log in their org" ON delegation_audit_log
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "System can insert delegation audit log" ON delegation_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System admins can manage all delegation audit logs" ON delegation_audit_log
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_delegation_audit_log_delegation ON delegation_audit_log(delegation_id);
CREATE INDEX IF NOT EXISTS idx_delegation_audit_log_org ON delegation_audit_log(org_id);

-- ============================================
-- TENANT HEALTH METRICS (Superadmin dashboard)
-- Stores aggregated per-org health snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_health_metrics (
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  org_name TEXT,
  subscription_tier TEXT,
  org_created_at TIMESTAMPTZ,
  total_users INTEGER DEFAULT 0,
  agent_count INTEGER DEFAULT 0,
  total_farms INTEGER DEFAULT 0,
  total_batches INTEGER DEFAULT 0,
  flagged_batches INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(14,2) DEFAULT 0,
  last_collection_date TIMESTAMPTZ,
  growth_trend TEXT CHECK (growth_trend IN ('growing', 'stable', 'declining')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id)
);

ALTER TABLE tenant_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view tenant health metrics" ON tenant_health_metrics
  FOR SELECT USING (is_system_admin());

CREATE POLICY "Service role can manage tenant health metrics" ON tenant_health_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System admins can manage all tenant health metrics" ON tenant_health_metrics
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_tenant_health_metrics_tier ON tenant_health_metrics(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_tenant_health_metrics_trend ON tenant_health_metrics(growth_trend);

-- ============================================
-- FARMER PERFORMANCE LEDGER TABLE
-- Stores per-farm per-season performance snapshots
-- (Separate from the farmer_performance_ledger VIEW
--  which provides real-time aggregation)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_performance_ledger_table (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(12,2) DEFAULT 0,
  avg_grade TEXT,
  yield_per_hectare NUMERIC(10,2),
  compliance_score INTEGER DEFAULT 0,
  payment_reliability INTEGER DEFAULT 100,
  quality_consistency INTEGER DEFAULT 100,
  credit_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, farm_id, season)
);

ALTER TABLE farmer_performance_ledger_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view farmer performance in their org" ON farmer_performance_ledger_table
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can manage farmer performance in their org" ON farmer_performance_ledger_table
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );

CREATE POLICY "System admins can manage all farmer performance" ON farmer_performance_ledger_table
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_farmer_perf_ledger_org ON farmer_performance_ledger_table(org_id);
CREATE INDEX IF NOT EXISTS idx_farmer_perf_ledger_farm ON farmer_performance_ledger_table(farm_id);
CREATE INDEX IF NOT EXISTS idx_farmer_perf_ledger_season ON farmer_performance_ledger_table(season);

CREATE TRIGGER update_farmer_performance_ledger_updated_at BEFORE UPDATE ON farmer_performance_ledger_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PEDIGREE VERIFICATION TABLE
-- Stores verified pedigree records as immutable snapshots
-- (Separate from the pedigree_verification VIEW
--  which provides real-time joins)
-- ============================================

CREATE TABLE IF NOT EXISTS pedigree_verification_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finished_good_id UUID NOT NULL REFERENCES finished_goods(id) ON DELETE CASCADE,
  pedigree_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  finished_weight_kg NUMERIC(12,2),
  production_date DATE,
  destination_country TEXT,
  buyer_name TEXT,
  buyer_company TEXT,
  dds_submitted BOOLEAN DEFAULT false,
  dds_submitted_at TIMESTAMPTZ,
  dds_reference TEXT,
  pedigree_verified BOOLEAN DEFAULT true,
  verification_notes TEXT,
  processing_run_code TEXT,
  facility_name TEXT,
  facility_location TEXT,
  raw_input_kg NUMERIC(12,2),
  processed_output_kg NUMERIC(12,2),
  recovery_rate NUMERIC(5,2),
  standard_recovery_rate NUMERIC(5,2),
  mass_balance_valid BOOLEAN DEFAULT true,
  mass_balance_variance NUMERIC(5,2),
  processed_at TIMESTAMPTZ,
  organization_name TEXT,
  organization_logo TEXT,
  source_farms JSONB,
  total_smallholders INTEGER DEFAULT 0,
  total_farm_area_hectares NUMERIC(12,2),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(finished_good_id)
);

ALTER TABLE pedigree_verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pedigree records in their org" ON pedigree_verification_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM finished_goods fg WHERE fg.id = pedigree_verification_records.finished_good_id AND fg.org_id = get_user_org_id())
    OR is_system_admin()
  );

CREATE POLICY "Admins can manage pedigree records" ON pedigree_verification_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM finished_goods fg WHERE fg.id = pedigree_verification_records.finished_good_id AND fg.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "System admins can manage all pedigree records" ON pedigree_verification_records
  FOR ALL USING (is_system_admin());

CREATE POLICY "Public can view verified pedigree records" ON pedigree_verification_records
  FOR SELECT USING (pedigree_verified = true);

CREATE INDEX IF NOT EXISTS idx_pedigree_verification_fg ON pedigree_verification_records(finished_good_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_verification_code ON pedigree_verification_records(pedigree_code);
CREATE INDEX IF NOT EXISTS idx_pedigree_verification_verified ON pedigree_verification_records(pedigree_verified);

CREATE TRIGGER update_pedigree_verification_updated_at BEFORE UPDATE ON pedigree_verification_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commodity Master
CREATE TABLE IF NOT EXISTS commodity_master (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'crop',
  unit TEXT NOT NULL DEFAULT 'kg',
  is_active BOOLEAN DEFAULT true,
  created_by_org_id INTEGER,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grades TEXT[] DEFAULT '{}',
  moisture_min NUMERIC,
  moisture_max NUMERIC,
  collection_metrics JSONB DEFAULT '{}'
);

ALTER TABLE commodity_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read commodities" ON commodity_master
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert commodities" ON commodity_master
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    OR is_system_admin()
  );

CREATE POLICY "Admins can update commodities" ON commodity_master
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    OR is_system_admin()
  );

CREATE POLICY "System admins can delete commodities" ON commodity_master
  FOR DELETE USING (is_system_admin());
