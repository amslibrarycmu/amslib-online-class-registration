-- This script creates the `requests` table for class registration requests.

-- Drop the table if it already exists to ensure a clean setup.
-- WARNING: This will delete all existing request data. Use with caution.
DROP TABLE IF EXISTS `requests`;

-- Create the `requests` table with a consolidated and improved structure
CREATE TABLE requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(255) DEFAULT NULL COMMENT 'Suggested speaker for the class',
    format VARCHAR(50) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    start_time TIME DEFAULT NULL,
    end_time TIME DEFAULT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'e.g., pending, approved, rejected',
    requested_by_email VARCHAR(255) NOT NULL,
    requested_by_name VARCHAR(255) DEFAULT NULL COMMENT 'Name of the user at the time of request',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    admin_comment TEXT DEFAULT NULL COMMENT 'Comment from admin for approval or rejection',
    action_by_email VARCHAR(255) DEFAULT NULL COMMENT 'Email of the admin who approved or rejected the request',
    action_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp of when the action (approve/reject) was taken',
    FOREIGN KEY (requested_by_email) REFERENCES users(email) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM requests;
