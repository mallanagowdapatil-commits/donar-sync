-- =============================================================================
-- DONORSYNC: CLINICAL HEALTHCARE POSTGRESQL DATABASE MIGRATION
-- Non-destructive alignment script for existing Supabase project: hrzmpljhfhahezwtesak
-- Run this in your Supabase Dashboard SQL Editor (Project > SQL Editor)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------
-- 1. EXTEND EXISTING USERS TABLE
-- -------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -------------------------------------------------------------
-- 2. EXTEND EXISTING DONORS TABLE
-- -------------------------------------------------------------
ALTER TABLE donors ADD COLUMN IF NOT EXISTS search_radius_km INT DEFAULT 15;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS active_rating NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_available ON donors(available);

-- -------------------------------------------------------------
-- 3. EXTEND EXISTING BLOOD_REQUESTS TABLE
-- -------------------------------------------------------------
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS units_fulfilled INT DEFAULT 0;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS hospital_name TEXT;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) DEFAULT 12.9716;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) DEFAULT 77.5946;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS required_time TIMESTAMPTZ;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_group ON blood_requests(blood_group);

-- -------------------------------------------------------------
-- 4. EXTEND EXISTING BLOOD_INVENTORY TABLE
-- -------------------------------------------------------------
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS available_units INT DEFAULT 0;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS reserved_units INT DEFAULT 0;
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'IN_STOCK';
ALTER TABLE blood_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_blood_inventory_group ON blood_inventory(blood_group);

-- -------------------------------------------------------------
-- 5. EXTEND EXISTING NOTIFICATIONS TABLE
-- -------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'SYSTEM';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- -------------------------------------------------------------
-- 6. CREATE AUXILIARY OPERATIONAL TABLES
-- -------------------------------------------------------------

-- Donor Matches (Links emergency requests to candidate donors)
CREATE TABLE IF NOT EXISTS donor_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    donor_id UUID,
    status TEXT NOT NULL DEFAULT 'ALERTED' CHECK (status IN ('ALERTED', 'ACCEPTED', 'DECLINED', 'FULFILLED')),
    distance_km NUMERIC(6,2),
    match_score INT,
    response_eta_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id);

-- Inventory Transactions (Full regulatory audit trail)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID,
    bank_id UUID,
    blood_group TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    units INT NOT NULL,
    previous_units INT DEFAULT 0,
    new_units INT DEFAULT 0,
    reason TEXT,
    logged_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_blood_group ON inventory_transactions(blood_group);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    emergency_alerts BOOLEAN DEFAULT TRUE,
    nearby_requests BOOLEAN DEFAULT TRUE,
    inventory_alerts BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expiry Packets (Per-unit batch management)
CREATE TABLE IF NOT EXISTS expiry_packets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blood_group TEXT NOT NULL,
    units INT DEFAULT 1,
    expiry_date DATE NOT NULL,
    bank_name TEXT,
    status TEXT DEFAULT 'EXPIRING_SOON' CHECK (status IN ('EXPIRING_SOON', 'DISPATCHED', 'DISCARDED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (Clinical system action logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT DEFAULT 'Info',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Campaigns (NGO / Organization blood drives)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_units INT DEFAULT 100,
    collected_units INT DEFAULT 0,
    status TEXT DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- -------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES & GRANTS
-- -------------------------------------------------------------
-- Grant appropriate access to service_role and anon/authenticated roles

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Helper to create permissive policy if not exists
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users', 'donors', 'blood_requests', 'blood_inventory', 'notifications',
        'hospitals', 'donations', 'patients', 'feedback', 'organizations',
        'donor_matches', 'inventory_transactions', 'notification_preferences',
        'expiry_packets', 'audit_logs', 'campaigns'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "donorsync_full_access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "donorsync_full_access" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('GRANT ALL ON %I TO anon, authenticated, service_role;', tbl);
    END LOOP;
END $$;
