const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // ใส่รหัสผ่านของคุณ ถ้ามี
  database: "amslib",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ Connected to MySQL");
});

app.post("/api/classes", (req, res) => {
  console.log("📥 รับข้อมูลจากฟอร์ม:", req.body); // ✅ เช็คค่าที่ส่งมาจาก React

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

  const sql = `
    INSERT INTO classes (
      class_id, title, speaker, start_date, end_date,
      start_time, end_time, description, format,
      join_link, max_participants, evaluation_link, target_groups
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
