/*
# Disaster Response Platform Database Schema

## Overview
This migration creates the complete database schema for the disaster response coordination platform, including geospatial capabilities, caching, and audit trails.

## Tables Created
1. **disasters** - Core disaster records with geospatial location support
2. **reports** - User-submitted reports with image verification
3. **resources** - Emergency resources with geospatial location
4. **cache** - API response caching with TTL

## Security
- Row Level Security (RLS) enabled on all tables
- Policies for authenticated users to manage their own data
- Admin policies for full access

## Indexes
- Geospatial indexes (GIST) for location-based queries
- GIN indexes for array/JSONB columns
- Standard indexes for foreign keys and frequently queried columns

## Functions
- Geospatial query functions for finding nearby resources
*/

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table
CREATE TABLE IF NOT EXISTS disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location_name text DEFAULT '',
  location geography(POINT, 4326),
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  owner_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  audit_trail jsonb DEFAULT '[]'::jsonb
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  content text NOT NULL,
  image_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'authentic', 'suspicious', 'manipulated', 'error')),
  verification_analysis text,
  created_at timestamptz DEFAULT now()
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid REFERENCES disasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_name text DEFAULT '',
  location geography(POINT, 4326),
  type text NOT NULL,
  description text DEFAULT '',
  contact_info jsonb DEFAULT '{}'::jsonb,
  capacity integer,
  availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'full', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cache table
CREATE TABLE IF NOT EXISTS cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Geospatial indexes
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);

-- Regular indexes
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_idx ON disasters (owner_id);
CREATE INDEX IF NOT EXISTS disasters_created_idx ON disasters (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_disaster_idx ON reports (disaster_id);
CREATE INDEX IF NOT EXISTS reports_user_idx ON reports (user_id);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS resources_disaster_idx ON resources (disaster_id);
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type);
CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at);

-- Enable Row Level Security
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disasters
CREATE POLICY "Anyone can read disasters"
  ON disasters
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create disasters"
  ON disasters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own disasters"
  ON disasters
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.jwt() ->> 'sub' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (owner_id = auth.jwt() ->> 'sub' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete own disasters"
  ON disasters
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.jwt() ->> 'sub' OR auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for reports
CREATE POLICY "Anyone can read reports"
  ON reports
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.jwt() ->> 'sub' OR auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for resources
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create resources"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for cache (service role only)
CREATE POLICY "Service role can manage cache"
  ON cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to find nearby resources (fixed parameter naming conflict)
CREATE OR REPLACE FUNCTION find_nearby_resources(
  target_disaster_id uuid,
  center_lat double precision,
  center_lon double precision,
  radius_km double precision DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  disaster_id uuid,
  name text,
  location_name text,
  type text,
  description text,
  availability_status text,
  distance_km double precision,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.disaster_id,
    r.name,
    r.location_name,
    r.type,
    r.description,
    r.availability_status,
    ST_Distance(
      r.location::geometry,
      ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geometry
    ) / 1000 AS distance_km,
    r.created_at
  FROM resources r
  WHERE r.disaster_id = target_disaster_id
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geometry,
      ST_SetSRID(ST_Point(center_lon, center_lat), 4326)::geometry,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM cache WHERE expires_at < now();
END;
$$;

-- Trigger to update updated_at on disasters
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_disasters_updated_at 
  BEFORE UPDATE ON disasters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at 
  BEFORE UPDATE ON resources 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO disasters (id, title, location_name, description, tags, owner_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'NYC Flood Emergency', 'Manhattan, NYC', 'Heavy flooding reported in downtown Manhattan area affecting multiple blocks', ARRAY['flood', 'emergency', 'nyc'], 'netrunnerX'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Brooklyn Bridge Fire', 'Brooklyn, NYC', 'Structure fire reported near Brooklyn Bridge with smoke visible from Manhattan', ARRAY['fire', 'emergency', 'brooklyn'], 'reliefAdmin'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Queens Power Outage', 'Queens, NYC', 'Widespread power outage affecting residential areas in Queens borough', ARRAY['power', 'outage', 'queens'], 'netrunnerX')
ON CONFLICT (id) DO NOTHING;

-- Insert sample resources
INSERT INTO resources (id, disaster_id, name, location_name, type, availability_status) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Red Cross Emergency Shelter', 'Lower East Side, NYC', 'shelter', 'available'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'NYC Emergency Medical Station', 'Wall Street, NYC', 'medical', 'available'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Emergency Food Distribution', 'Chinatown, NYC', 'food', 'limited'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Brooklyn Fire Department Station', 'Brooklyn Heights, NYC', 'emergency_services', 'available'),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Queens Community Center', 'Astoria, Queens', 'shelter', 'available')
ON CONFLICT (id) DO NOTHING;