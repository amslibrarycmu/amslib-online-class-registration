SELECT * FROM users; 

-- เปลี่ยนชื่อคอลัมน์ status เป็น roles และเปลี่ยนประเภทข้อมูลเป็น JSON
ALTER TABLE users CHANGE COLUMN status roles JSON;

-- ตัวอย่างการอัปเดตข้อมูลผู้ใช้ให้มี 2 บทบาท
UPDATE users SET roles = '["ผู้ดูแลระบบ", "บุคลากร"]' WHERE email = 'useradmin@email.com';

--  เพิ่มคอลัมน์ roles ใหม่
ALTER TABLE users ADD COLUMN roles JSON;

--  ย้ายข้อมูลจากคอลัมน์ status เดิมไปที่ roles ใหม่ในรูปแบบ JSON Array
UPDATE users SET roles = JSON_ARRAY(status);

--  ลบคอลัมน์ status เดิมที่ไม่ใช้งานแล้ว
ALTER TABLE users DROP COLUMN status;

--  ปิด Safe Update Mode ชั่วคราวสำหรับ session นี้
SET SQL_SAFE_UPDATES = 0;

UPDATE users 
SET roles = JSON_ARRAY_APPEND(roles, '$', 'บุคลากร') 
WHERE email = 'useradmin@email.com';

ALTER TABLE users ADD COLUMN photo VARCHAR(255) DEFAULT NULL;

