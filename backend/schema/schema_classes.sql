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
