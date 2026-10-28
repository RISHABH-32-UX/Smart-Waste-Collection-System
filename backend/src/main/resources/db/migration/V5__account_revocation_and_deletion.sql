ALTER TABLE app_users ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX app_users_current_role_idx ON app_users(role, active) WHERE deleted_at IS NULL;
