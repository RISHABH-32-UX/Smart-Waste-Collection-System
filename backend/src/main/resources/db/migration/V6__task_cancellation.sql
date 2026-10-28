ALTER TABLE tasks ADD COLUMN cancellation_reason TEXT;

ALTER TABLE tasks ADD CONSTRAINT tasks_cancellation_reason_length_check
  CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500);