-- สคริปต์นี้ใช้สำหรับอัปเดต Role นักศึกษาในฐานข้อมูลจากคำเดิม เป็นคำใหม่
-- คุณสามารถนำไปรันใน phpMyAdmin หรือ MySQL Client ได้เลยครับ

-- 1. อัปเดตตาราง users
-- (หากคอลัมน์ของคุณชื่อ status หรืออื่นๆ โปรดเปลี่ยนชื่อคอลัมน์ roles เป็นชื่อที่ถูกต้อง)
UPDATE users 
SET roles = REPLACE(roles, 'นักศึกษาปริญญาตรี', 'นักศึกษาระดับปริญญาตรี');

UPDATE users 
SET roles = REPLACE(roles, 'นักศึกษาบัณฑิต', 'นักศึกษาระดับบัณฑิตศึกษา');

-- หากตาราง users ใช้คอลัมน์ status ให้ใช้คำสั่งด้านล่างนี้แทน
-- UPDATE users SET status = REPLACE(status, 'นักศึกษาปริญญาตรี', 'นักศึกษาระดับปริญญาตรี');
-- UPDATE users SET status = REPLACE(status, 'นักศึกษาบัณฑิต', 'นักศึกษาระดับบัณฑิตศึกษา');


-- 2. อัปเดตตาราง classes (กลุ่มเป้าหมาย)
UPDATE classes 
SET target_groups = REPLACE(target_groups, 'นักศึกษาปริญญาตรี', 'นักศึกษาระดับปริญญาตรี');

UPDATE classes 
SET target_groups = REPLACE(target_groups, 'นักศึกษาบัณฑิต', 'นักศึกษาระดับบัณฑิตศึกษา');


-- 3. อัปเดตตาราง registrations (ถ้ามีการบันทึก status ของผู้สมัครไว้)
-- สมมติว่ามีคอลัมน์ user_status
-- UPDATE registrations SET user_status = REPLACE(user_status, 'นักศึกษาปริญญาตรี', 'นักศึกษาระดับปริญญาตรี');
-- UPDATE registrations SET user_status = REPLACE(user_status, 'นักศึกษาบัณฑิต', 'นักศึกษาระดับบัณฑิตศึกษา');

-- ตรวจสอบข้อมูลว่าเปลี่ยนเรียบร้อยแล้ว
-- SELECT * FROM users WHERE roles LIKE '%นักศึกษาระดับ%';
-- SELECT * FROM classes WHERE target_groups LIKE '%นักศึกษาระดับ%';
