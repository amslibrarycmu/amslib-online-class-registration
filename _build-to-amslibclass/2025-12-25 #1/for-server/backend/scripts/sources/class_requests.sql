SET FOREIGN_KEY_CHECKS = 0;
SET NAMES 'utf8mb4';

DROP TABLE IF EXISTS `class_requests`;
CREATE TABLE `class_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `speaker` varchar(255) DEFAULT NULL,
  `format` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `requested_by_email` varchar(255) NOT NULL,
  `requested_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `admin_comment` text DEFAULT NULL,
  `action_by_email` varchar(255) DEFAULT NULL,
  `action_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1; 

SELECT * FROM class_requests;