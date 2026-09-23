-- =============================================================================
-- DONORSYNC: AI-POWERED BLOOD MANAGEMENT SYSTEM
-- Production PostgreSQL Database Schema & Row-Level Security (RLS) Policies
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS & AUTHENTICATION
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Donor', 'Receiver', 'Hospital', 'Blood Bank', 'Admin')),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. DONOR PROFILES
CREATE TABLE IF NOT EXISTS donor_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    donor_code TEXT UNIQUE NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    phone TEXT NOT NULL,
    age INT NOT NULL CHECK (age >= 18 AND age <= 65),
    weight NUMERIC(5,2) NOT NULL CHECK (weight >= 50.0),
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Undisclosed')),
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    search_radius_km INT DEFAULT 15 CHECK (search_radius_km BETWEEN 5 AND 100),
    is_available BOOLEAN DEFAULT TRUE,
    last_donation_date DATE,
    active_rating NUMERIC(3,2) DEFAULT 5.0 CHECK (active_rating BETWEEN 1.0 AND 5.0),
    total_donations INT DEFAULT 0 CHECK (total_donations >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_blood_group ON donor_profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_donor_available ON donor_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_donor_location ON donor_profiles(latitude, longitude);

-- 3. RECEIVER PROFILES
CREATE TABLE IF NOT EXISTS receiver_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    default_hospital TEXT,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    emergency_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HOSPITAL PROFILES
CREATE TABLE IF NOT EXISTS hospital_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    license_number TEXT,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_location ON hospital_profiles(latitude, longitude);

-- 5. BLOOD BANK PROFILES
CREATE TABLE IF NOT EXISTS blood_bank_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    license_number TEXT,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BLOOD REQUESTS
CREATE TABLE IF NOT EXISTS blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_required INT NOT NULL CHECK (units_required > 0),
    units_fulfilled INT DEFAULT 0 CHECK (units_fulfilled >= 0),
    urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHING', 'DONOR_CONTACTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
    hospital TEXT NOT NULL,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    required_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_group ON blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency ON blood_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_blood_requests_location ON blood_requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_blood_requests_creator ON blood_requests(created_by);

-- 7. DONOR MATCHES
CREATE TABLE IF NOT EXISTS donor_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES donor_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ALERTED' CHECK (status IN ('ALERTED', 'ACCEPTED', 'DECLINED', 'DISPATCHED', 'COMPLETED')),
    distance_km NUMERIC(5,2) NOT NULL,
    match_score INT NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    response_eta_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(request_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_status ON donor_matches(status);

-- 8. BLOOD BANK INVENTORY
CREATE TABLE IF NOT EXISTS blood_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    available_units INT NOT NULL DEFAULT 0 CHECK (available_units >= 0),
    reserved_units INT NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
    target_safety_units INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bank_id, blood_group)
);

CREATE INDEX IF NOT EXISTS idx_inventory_bank ON blood_inventory(bank_id);

-- 9. INVENTORY TRANSACTIONS AUDIT
CREATE TABLE IF NOT EXISTS blood_inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES blood_inventory(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INFLOW_DONATION', 'OUTFLOW_TRANSFUSION', 'RESERVED', 'RELEASED', 'EXPIRED_DISCARD', 'ADJUSTMENT')),
    units INT NOT NULL CHECK (units != 0),
    previous_units INT NOT NULL,
    new_units INT NOT NULL,
    reason TEXT,
    logged_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXPIRY PACKETS MANAGEMENT
CREATE TABLE IF NOT EXISTS expiry_packets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units INT NOT NULL CHECK (units > 0),
    expiry_date DATE NOT NULL,
    bank_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SAFE' CHECK (status IN ('SAFE', 'EXPIRING_SOON', 'EXPIRED', 'DISCARDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expiry_packets_bank ON expiry_packets(bank_id);
CREATE INDEX IF NOT EXISTS idx_expiry_packets_status ON expiry_packets(status);

-- 11. IN-APP NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('EMERGENCY_REQUEST', 'NEARBY_MATCH', 'REQUEST_ACCEPTED', 'REQUEST_DECLINED', 'REQUEST_FULFILLED', 'LOW_STOCK_ALERT', 'SYSTEM')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 12. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    emergency_alerts BOOLEAN DEFAULT TRUE,
    nearby_requests BOOLEAN DEFAULT TRUE,
    inventory_alerts BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. WEB PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- 14. COMPREHENSIVE SECURITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'Info' CHECK (severity IN ('Info', 'Low', 'High', 'Critical')),
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
