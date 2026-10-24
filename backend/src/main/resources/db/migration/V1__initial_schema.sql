CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(32),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('CITIZEN','WORKER','SUPERVISOR','ADMIN')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES app_users(id),
  storage_key VARCHAR(512) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES app_users(id),
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING_VERIFICATION','REJECTED','VERIFIED','ASSIGNED','IN_PROGRESS','CLEANUP_SUBMITTED','CLOSED','CANCELLED')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 5 AND 2000),
  location GEOGRAPHY(Point, 4326) NOT NULL,
  ai_severity VARCHAR(16),
  ai_infestation_score NUMERIC(5,4),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE complaint_media (
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES media_assets(id),
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('BEFORE','AFTER')),
  PRIMARY KEY (complaint_id, asset_id)
);

CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boundary GEOGRAPHY(Polygon, 4326) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id),
  assigned_worker_id UUID NOT NULL REFERENCES app_users(id),
  status VARCHAR(32) NOT NULL CHECK (status IN ('OPEN','ASSIGNED','ACCEPTED','ON_SITE','RESOLUTION_SUBMITTED','REWORK_REQUIRED','COMPLETED','CANCELLED')),
  priority VARCHAR(16) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_complaints (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  PRIMARY KEY (task_id, complaint_id)
);

CREATE TABLE worker_locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES app_users(id),
  point GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy_meters NUMERIC(8,2) NOT NULL CHECK (accuracy_meters >= 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES app_users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX complaints_location_gix ON complaints USING GIST (location);
CREATE INDEX geofences_boundary_gix ON geofences USING GIST (boundary);
CREATE INDEX worker_locations_point_gix ON worker_locations USING GIST (point);
CREATE INDEX complaint_queue_idx ON complaints(status, created_at DESC);
CREATE INDEX task_worker_idx ON tasks(assigned_worker_id, status, due_at);
CREATE INDEX worker_location_worker_time_idx ON worker_locations(worker_id, recorded_at DESC);
