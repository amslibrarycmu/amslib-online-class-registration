SET FOREIGN_KEY_CHECKS = 0;
SET NAMES 'utf8mb4';

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `roles` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `photo` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `pdpa` tinyint(1) DEFAULT 0,
  `profile_completed` tinyint(1) DEFAULT 0,
  `original_name` varchar(255) DEFAULT NULL,
  `name_updated_by_user` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1; 

SELECT * FROM users;