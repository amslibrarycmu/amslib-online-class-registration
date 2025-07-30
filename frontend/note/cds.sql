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
  target_groups JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SHOW TABLES IN amslib;

DELETE FROM classes;
TRUNCATE TABLE classes;
SELECT * FROM classes;

SHOW CREATE TABLE classes;