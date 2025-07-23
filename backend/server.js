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
  console.log("✅ Connected to MySQL");
});

// 🔽 POST พร้อมรับไฟล์
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
    evaluation_link,
    target_groups,
  } = req.body;

  const fileNames = req.files.map((file) => file.filename); // ชื่อไฟล์ทั้งหมด

  const sql = `
    INSERT INTO classes (
      class_id, title, speaker, start_date, end_date,
      start_time, end_time, description, format,
      join_link, max_participants, evaluation_link, target_groups, files
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
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
      evaluation_link,
      JSON.stringify(target_groups),
      JSON.stringify(fileNames),
    ],
    (err, result) => {
      if (err) {
        console.error("❌ บันทึกไม่สำเร็จ:", err);
        return res.status(500).send("Server Error");
      }
      console.log("✅ บันทึกข้อมูลสำเร็จ:", result);
      res.status(201).json({ message: "Class created successfully" });
    }
  );
});

// เปิดใช้โฟลเดอร์สำหรับแสดงไฟล์ (ถ้าต้องการ)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
