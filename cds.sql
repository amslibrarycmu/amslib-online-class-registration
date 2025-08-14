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
SELECT * FROM users;
SELECT * FROM classes;

SHOW CREATE TABLE classes;

DESCRIBE classes;

ALTER TABLE classes ADD COLUMN location VARCHAR(255) AFTER join_link;
ALTER TABLE classes ADD COLUMN created_by_email VARCHAR(255);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  pdpa BOOLEAN DEFAULT 0
);

SELECT 
    class_id, 
    speaker 
FROM 
    classes
WHERE 
    speaker LIKE '"[%\"%]"';
    
    
SET SQL_SAFE_UPDATES = 0;

UPDATE 
    classes
SET 
    speaker = REPLACE(JSON_UNQUOTE(speaker), '\\"', '"')
WHERE 
    speaker LIKE '"[%\"%]"';
    
ALTER TABLE classes
ADD COLUMN registered_users JSON NOT NULL DEFAULT '[]';

INSERT INTO users (name, email, status, phone, pdpa, password, created_at, is_active)
VALUES ('user normal', 'usernormal@email.com', 'ผู้ใช้ทั่วไป', '0900000001', 1, NULL, '2025-08-13 16:30:00', 1);
