-- Create issue_task_mapping table to link GitHub Issues with Google Tasks
CREATE TABLE IF NOT EXISTS issue_task_mapping (
  url TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);