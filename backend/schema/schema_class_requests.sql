CREATE TABLE requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    reason TEXT,
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    format VARCHAR(50),
    suggested_speaker VARCHAR(255),
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

ALTER TABLE requests
ADD COLUMN approved_by VARCHAR(255),
ADD COLUMN approval_date TIMESTAMP NULL;

ALTER TABLE requests
ADD COLUMN rejection_reason TEXT;
SELECT * FROM requests;  