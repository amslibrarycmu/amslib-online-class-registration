-- Step 1: Update the 'materials' column with data from the 'files' column
-- for active classes where 'materials' is currently empty or NULL.
UPDATE classes
SET materials = files
WHERE status != 'closed' AND (materials IS NULL OR materials = '[]');

-- Step 2: (Optional but recommended) Verify the data has been copied.
-- SELECT class_id, files, materials, status FROM classes WHERE status != 'closed';

-- Step 3: Drop the now-redundant 'files' column.
-- ALTER TABLE classes DROP COLUMN files;
-- Note: Make sure you have a backup before running a DROP COLUMN command.