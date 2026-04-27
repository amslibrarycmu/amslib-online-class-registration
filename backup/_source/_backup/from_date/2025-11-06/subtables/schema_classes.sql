CREATE DATABASE IF NOT EXISTS amslib
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE amslib;

DROP TABLE IF EXISTS classes;

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(6) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  speaker JSON,
  format VARCHAR(100),
  join_link TEXT,
  location VARCHAR(255),
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  max_participants INT,
  target_groups JSON,
  files JSON,
  created_by_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open',
  promoted BOOLEAN DEFAULT FALSE,
  video_link TEXT,
  materials JSON,
  registered_users JSON
);

DESCRIBE classes;

SELECT * FROM classes;

ALTER TABLE `classes` ADD `reminder_sent` BOOLEAN NOT NULL DEFAULT FALSE AFTER `status`;

USE amslib;

SET FOREIGN_KEY_CHECKS = 0; -- ปิด FK check ชั่วคราว

-- ข้อมูลถูกแปลงกลับเป็นภาษาไทยที่ถูกต้อง และค่า NaN ถูกแทนที่ด้วย NULL
-- speaker, target_groups, files, materials, registered_users ถูกแปลงเป็น JSON object ที่ถูกต้อง
ALTER TABLE `classes` ADD `reminder_sent` BOOLEAN NOT NULL DEFAULT FALSE AFTER `status`;

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

ALTER TABLE classes DROP COLUMN files;



