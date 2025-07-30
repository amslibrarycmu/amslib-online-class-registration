/* Delete: users */
DROP TABLE IF EXISTS users;

/* Create: users */
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  pdpa BOOLEAN DEFAULT 0,
  password VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

/* Look for datas in users */
SELECT * FROM users;

/* Insert datas to users */
INSERT INTO users (name, status, email, phone, pdpa)
VALUES ('user admin', 'ผู้ดูแลระบบ', 'useradmin@email.com', '0900000000', 1);