-- Each account has exactly one application role. Existing development records retain one role.
ALTER TABLE app_users ADD COLUMN role VARCHAR(32);

UPDATE app_users u
SET role = COALESCE(
  (SELECT ur.role FROM user_roles ur WHERE ur.user_id = u.id ORDER BY ur.role LIMIT 1),
  'CITIZEN'
);

ALTER TABLE app_users
  ALTER COLUMN role SET NOT NULL,
  ADD CONSTRAINT app_users_role_check CHECK (role IN ('CITIZEN','WORKER','SUPERVISOR','ADMIN'));

DROP TABLE user_roles;

