-- Apply separately after validated backup; never as an implicit deploy step.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS profileDetails TEXT NULL;
