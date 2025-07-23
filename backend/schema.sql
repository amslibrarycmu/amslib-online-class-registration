CREATE DATABASE IF NOT EXISTS amslib
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE amslib;

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(6) NOT NULL UNIQUE,
  activity_name VARCHAR(255) NOT NULL,
  description TEXT,
  speaker VARCHAR(255),
  platform VARCHAR(100),
  link TEXT,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  max_participants INT,
  audience JSON,
  evaluation_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
