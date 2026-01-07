SET FOREIGN_KEY_CHECKS = 0;
SET NAMES 'utf8mb4';

DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE `evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` varchar(10) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `score_content` int(11) DEFAULT NULL,
  `score_material` int(11) DEFAULT NULL,
  `score_duration` int(11) DEFAULT NULL,
  `score_format` int(11) DEFAULT NULL,
  `score_speaker` int(11) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `class_user_unique` (`class_id`,`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1; 

SELECT * FROM evaluations;