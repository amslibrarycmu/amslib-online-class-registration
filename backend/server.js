const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());

// ใช้ JSON สำหรับ request ทั่วไป
app.use(express.json());

// ตั้งค่า multer สำหรับรับไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads"); // โฟลเดอร์ปลายทาง
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // ตั้งชื่อไฟล์ใหม่
  },
});

const upload = multer({ storage });

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "amslib",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ เชื่อมต่อกับ MySQL");
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND is_active = 1';

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or user not found' });
    }

    const user = results[0];
    res.json({
      id: user.id,
      name: user.name,
      status: user.status,
      email: user.email,
      phone: user.phone,
      pdpa: user.pdpa,
      is_active: user.is_active,
    });
  });
});

// GET /api/classes
app.get('/api/classes', (req, res) => {
  const { email } = req.query;
  const sql = 'SELECT * FROM classes WHERE created_by_email = ?';

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// POST พร้อมรับไฟล์
app.post("/api/classes", upload.array("files"), (req, res) => {
  const {
    class_id,
    title,
    speaker,
    start_date,
    end_date,
    start_time,
    end_time,
    description,
    format,
    join_link,
    max_participants,
    target_groups,
  } = req.body;

  let speakerValue = speaker;
  try {
    if (typeof speaker === 'string' && speaker.trim().startsWith('[')) {
      speakerValue = JSON.parse(speaker);
    }
  } catch (e) {
    speakerValue = speaker;
  }

  const allGroups = ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"];
  let groupsValue = target_groups;
  try {
    if (typeof target_groups === 'string') {
      groupsValue = JSON.parse(target_groups);
    }
  } catch (e) {
    groupsValue = (target_groups || "").split(",").map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(groupsValue) || groupsValue.length === 0) {
    groupsValue = allGroups;
  }

  const fileNames = req.files.map((file) => file.filename);

  const sql = `
  INSERT INTO classes (
    class_id, title, speaker, start_date, end_date,
    start_time, end_time, description, format,
    join_link, location, max_participants, target_groups, files, created_by_email
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

  db.query(
    sql,
    [
      class_id,
      title,
      JSON.stringify(speakerValue),
      start_date,
      end_date,
      start_time,
      end_time,
      description,
      format,
      join_link,
      req.body.location || "",
      max_participants,
      JSON.stringify(groupsValue),
      JSON.stringify(fileNames),
      req.body.created_by_email || "", // เพิ่ม created_by_email
    ],
    (err, result) => {
      if (err) {
        console.error("❌ บันทึกไม่สำเร็จ:", err);
        return res.status(500).send("เซิร์ฟเวอร์ผิดพลาด");
      }
      console.log("✅ บันทึกข้อมูลสำเร็จ:", result);
      res.status(201).json({ message: "Class created successfully" });
    }
  );
});

// DELETE /api/classes/:classId
app.delete('/api/classes/:classId', (req, res) => {
  const { classId } = req.params;
  const sql = 'DELETE FROM classes WHERE class_id = ?';

  db.query(sql, [classId], (err, result) => {
    if (err) {
      console.error('Error deleting class:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.status(200).json({ message: 'Class deleted successfully' });
  });
});

// เปิดใช้โฟลเดอร์สำหรับแสดงไฟล์ (ถ้าต้องการ)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
