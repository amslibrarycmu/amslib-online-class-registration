-- Set character encoding and disable foreign key checks for bulk load
SET NAMES 'utf8mb4';
SET FOREIGN_KEY_CHECKS = 0;

--
-- (บรรทัด "USE ${DB_DATABASE};" ที่เป็นปัญหา ถูกลบออกจากตรงนี้แล้ว) --
--

--
-- Table structure for table `users`
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roles` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pdpa` tinyint(1) DEFAULT '0',
  `photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_completed` tinyint(1) DEFAULT '0',
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_updated_by_user` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load data from users.csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/users.csv'
INTO TABLE `users`
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' -- ใช้ OPTIONALLY เพื่อรองรับ "
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, name, email, roles, is_active, @phone, pdpa, @photo, profile_completed, original_name, name_updated_by_user, created_at, updated_at)
SET
  phone = NULLIF(@phone, ''),
  photo = NULLIF(@photo, 'NULL');

--
-- Table structure for table `classes`
--
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `class_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `speaker` json DEFAULT NULL,
  `format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `join_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `max_participants` int(11) DEFAULT '999',
  `target_groups` json DEFAULT NULL,
  `created_by_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `reminder_sent` tinyint(1) DEFAULT '0',
  `promoted` tinyint(1) DEFAULT '0',
  `video_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materials` json DEFAULT NULL,
  `registered_users` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `class_id` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load data from classes.csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/classes.csv'
INTO TABLE `classes`
FIELDS TERMINATED BY ';' OPTIONALLY ENCLOSED BY '"' -- ใช้ ; เป็นตัวคั่น และ OPTIONALLY
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, class_id, title, @description, speaker, format, @join_link, @location, start_date, end_date, start_time, end_time, max_participants, target_groups, @created_by_email, created_at, status, reminder_sent, promoted, @video_link, materials, registered_users)
SET
  description = NULLIF(@description, 'NULL'),
  join_link = NULLIF(@join_link, 'NULL'),
  location = NULLIF(@location, 'NULL'),
  created_by_email = NULLIF(@created_by_email, ''),
  video_link = NULLIF(@video_link, 'NULL');

--
-- Table structure for table `evaluations`
--
DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE `evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score_content` int(11) DEFAULT NULL,
  `score_material` int(11) DEFAULT NULL,
  `score_duration` int(11) DEFAULT NULL,
  `score_format` int(11) DEFAULT NULL,
  `score_speaker` int(11) DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`evaluation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load data from evaluations.csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/evaluations.csv'
INTO TABLE `evaluations`
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' -- ใช้ OPTIONALLY
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(evaluation_id, class_id, user_email, score_content, score_material, score_duration, score_format, score_speaker, @comments, submitted_at)
SET
  comments = NULLIF(@comments, 'NULL');

--
-- Table structure for table `activity_log`
--
DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE `activity_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load data from activity_log.csv
-- !!! ข้ามการโหลด ACTIVITY LOG ไปก่อน เนื่องจากข้อมูล CSV เสียหาย !!!
/*
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/activity_log.csv'
INTO TABLE `activity_log`
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' -- ใช้ OPTIONALLY
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(log_id, timestamp, user_id, user_name, user_email, action_type, @target_type, @target_id, @details, ip_address)
SET
  target_type = NULLIF(@target_type, 'NULL'),
  target_id = NULLIF(@target_id, 'NULL'),
  details = NULLIF(@details, 'NULL');
*/

--
-- Table structure for table `requests`
--
DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `speaker` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requested_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `admin_comment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_by_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_at` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load data from requests.csv
LOAD DATA LOCAL INFILE '/docker-entrypoint-initdb.d/requests.csv'
INTO TABLE `requests`
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' -- ใช้ OPTIONALLY
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;