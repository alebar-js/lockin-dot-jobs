-- Drop the 'soft' value from the enum (requires recreating the enum)
-- First, delete all existing job analyses since we're changing the schema
DELETE FROM job_analysis_skills WHERE category = 'soft';

-- Update enum by creating a new one and switching
ALTER TYPE job_analysis_skill_category RENAME TO job_analysis_skill_category_old;
CREATE TYPE job_analysis_skill_category AS ENUM ('hard', 'domain');

-- Update the column to use the new enum
ALTER TABLE job_analysis_skills
  ALTER COLUMN category TYPE job_analysis_skill_category
  USING category::text::job_analysis_skill_category;

-- Drop the old enum
DROP TYPE job_analysis_skill_category_old;

-- Rename and add columns in job_analyses table
ALTER TABLE job_analyses RENAME COLUMN experience_level TO years_of_experience;
ALTER TABLE job_analyses RENAME COLUMN location_remote TO location;
ALTER TABLE job_analyses RENAME COLUMN company_summary TO company_name;
ALTER TABLE job_analyses ADD COLUMN job_title text;
