-- This script updates the 'classes' table to support the class closing feature.
-- It adds columns for status, video link, and teaching materials.

ALTER TABLE `classes`
ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'Class status: open, closed, etc.',
ADD COLUMN `video_link` TEXT COMMENT 'Link to the recorded class video',
ADD COLUMN `materials` JSON COMMENT 'JSON array of paths to supplementary materials';
