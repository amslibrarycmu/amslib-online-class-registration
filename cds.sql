CREATE DATABASE amslib;

USE amslib;

CREATE TABLE classes (
  class_id INT PRIMARY KEY,
  title TEXT NOT NULL,
  speaker TEXT,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  description TEXT,
  format VARCHAR(100),
  join_link TEXT,
  max_participants INT,
  evaluation_link TEXT,
  target_groups JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SHOW TABLES IN amslib;


