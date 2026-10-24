-- A task can be unassigned while awaiting a supervisor decision or queued for a busy worker.
ALTER TABLE tasks
  ALTER COLUMN assigned_worker_id DROP NOT NULL,
  ADD COLUMN queued_worker_id UUID REFERENCES app_users(id),
  ADD COLUMN queued_for_at TIMESTAMPTZ;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN (
  'AWAITING_ASSIGNMENT', 'QUEUED', 'OPEN', 'ASSIGNED', 'ACCEPTED', 'ON_SITE',
  'RESOLUTION_SUBMITTED', 'REWORK_REQUIRED', 'COMPLETED', 'CANCELLED'
));

ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN (
  'PENDING_VERIFICATION', 'REJECTED', 'VERIFIED', 'ASSIGNMENT_QUEUED', 'ASSIGNED',
  'IN_PROGRESS', 'CLEANUP_SUBMITTED', 'CLOSED', 'CANCELLED'
));

CREATE INDEX queued_task_due_idx ON tasks(queued_for_at)
  WHERE status = 'QUEUED';
CREATE INDEX active_task_worker_idx ON tasks(assigned_worker_id)
  WHERE status IN ('ASSIGNED', 'ACCEPTED', 'ON_SITE', 'RESOLUTION_SUBMITTED', 'REWORK_REQUIRED');

