ALTER TABLE tasks ADD COLUMN resolution_note TEXT;

ALTER TABLE tasks ADD CONSTRAINT tasks_resolution_note_length_check
  CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000);
