-- This script creates the `users` table for the AMS Library Course Registration system.
-- Drop the table if it already exists to ensure a clean setup.
-- WARNING: This will delete all existing user data. Use with caution.
DROP TABLE IF EXISTS `users`;

-- Create the `users` table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `roles` JSON NOT NULL COMMENT 'Stores user roles as a JSON array, e.g., ["ผู้ดูแลระบบ", "บุคลากร"]',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indicates if the user account is active (1) or disabled (0)',
  `phone` VARCHAR(20) DEFAULT NULL,
  `pdpa` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'PDPA consent status',
  `photo` VARCHAR(255) DEFAULT NULL COMMENT 'Filename of the user''s profile picture',
  `profile_completed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag to check if the user has completed their initial profile setup',
  `original_name` VARCHAR(255) DEFAULT NULL COMMENT 'Stores the original name from the first login (e.g., from CMU Account)',
  `name_updated_by_user` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag to check if the user has manually updated their name',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add a description to the table for clarity in database tools
ALTER TABLE `users` COMMENT = 'Stores user account information and roles for the registration system.';

SELECT * FROM users;