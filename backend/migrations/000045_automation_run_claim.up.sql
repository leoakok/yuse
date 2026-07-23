CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_runs_one_running_per_automation
    ON automation_runs (automation_id)
    WHERE status = 'RUNNING';
