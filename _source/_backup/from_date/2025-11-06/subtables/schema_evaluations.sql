CREATE TABLE evaluations (
    evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id VARCHAR(6) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    score_content TINYINT,
    score_material TINYINT,
    score_duration TINYINT,
    score_format TINYINT,
    score_speaker TINYINT,
    comments TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,

    UNIQUE KEY unique_evaluation (class_id, user_email)
);

SELECT * FROM evaluations;  