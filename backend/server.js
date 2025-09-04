const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
require('dotenv').config();

const { sendRegistrationConfirmation, sendAdminNotification, sendAdminCancellationNotification } = require('./email.js');

const uploadsDir = path.join(__dirname, 'uploads');
const materialsDir = path.join(__dirname, 'uploads/materials');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir);
}

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
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

app.get('/api/classes', (req, res) => {
  const { email, status } = req.query;
  let sql;
  let params = [];
  if (status === 'ผู้ดูแลระบบ') {
    sql = 'SELECT * FROM classes';
  } else {
    sql = 'SELECT * FROM classes WHERE created_by_email = ?';
    params.push(email);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

app.get('/api/classes/promoted', (req, res) => {
  const sql = 'SELECT * FROM classes WHERE promoted = 1';
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching promoted classes:", err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.post("/api/classes", upload.array("files"), (req, res) => {
  const { class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, max_participants, target_groups } = req.body;
  const fileNames = req.files.map((file) => file.filename);
  const sql = `
    INSERT INTO classes (class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, files, created_by_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, req.body.location || "", max_participants, target_groups, JSON.stringify(fileNames), req.body.created_by_email || ""],
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

app.put("/api/classes/:classId", upload.array("files"), (req, res) => {
  const { classId } = req.params;
  const { title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, max_participants, target_groups, location } = req.body;
  const fileNames = req.files.map((file) => file.filename);
  const sql = `
    UPDATE classes SET
      title = ?, speaker = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, description = ?, format = ?,
      join_link = ?, location = ?, max_participants = ?, target_groups = ?
      ${fileNames.length > 0 ? ", files = ?" : ""}
    WHERE class_id = ?
  `;
  const params = [title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location || "", max_participants, target_groups];
  if (fileNames.length > 0) {
    params.push(JSON.stringify(fileNames));
  }
  params.push(classId);
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error updating class:", err);
      return res.status(500).json({ message: "Database server error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Class not found" });
    }
    console.log("✅ Class updated successfully:", result);
    res.status(200).json({ message: "Class updated successfully" });
  });
});

const materialsStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, "uploads/materials"); },
  filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); },
});
const uploadMaterials = multer({ storage: materialsStorage });
app.post("/api/classes/:classId/close", uploadMaterials.array("materials"), (req, res) => {
  const { classId } = req.params;
  const { video_link } = req.body;
  const materialFiles = req.files.map((file) => file.filename);
  const sql = `UPDATE classes SET status = 'closed', video_link = ?, materials = ? WHERE class_id = ?`;
  const params = [video_link || null, JSON.stringify(materialFiles), classId];
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error closing class:", err);
      return res.status(500).json({ message: "Database server error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Class not found" });
    }
    console.log("✅ Class closed successfully:", result);
    res.status(200).json({ message: "Class closed and materials uploaded successfully" });
  });
});

app.put('/api/classes/:classId/promote', (req, res) => {
  const { classId } = req.params;
  const { promoted } = req.body;
  const promotedValue = promoted ? 1 : 0;
  const sql = 'UPDATE classes SET promoted = ? WHERE class_id = ?';
  db.query(sql, [promotedValue, classId], (err, result) => {
    if (err) {
      console.error('Error updating promotion status:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found or no changes made' });
    }
    res.status(200).json({ message: 'Promotion status updated successfully' });
  });
});

app.post("/api/classes/:classId/register", (req, res) => {
  const { classId } = req.params;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  const findClassSql = "SELECT * FROM classes WHERE class_id = ?";
  db.query(findClassSql, [classId], (err, results) => {
    if (err) {
      console.error("❌ Database error while fetching class:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Class not found." });
    }

    const course = results[0];
    const maxParticipants = course.max_participants;
    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(course.registered_users || '[]');
    } catch (e) {
      console.error("❌ Error parsing registered_users JSON:", e);
      registeredUsers = [];
    }

    if (maxParticipants !== 999 && registeredUsers.length >= maxParticipants) {
      return res.status(409).json({ message: "This class is already full." });
    }

    const isAlreadyRegistered = registeredUsers.some(user => user.email === email);
    if (isAlreadyRegistered) {
      return res.status(409).json({ message: "You are already registered for this class." });
    }

    const newUser = { name, email };
    registeredUsers.push(newUser);

    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(registeredUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }

      console.log(`✅ User ${name} registered for class ${classId}`);
      res.status(200).json({ message: "Successfully registered for the class!" });

      // --- Email Notifications ---
      const emailClassDetails = JSON.parse(JSON.stringify(course));
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(', ');
      } catch (e) { /* Ignore parsing errors */ }

      // 1. Send confirmation to the user
      sendRegistrationConfirmation(email, emailClassDetails, name);

      // 2. Send notification to all admins
      const adminQuery = "SELECT email FROM users WHERE status = 'ผู้ดูแลระบบ'";
      db.query(adminQuery, (err, adminResults) => {
        if (err) {
          console.error("Error fetching admin emails:", err);
          return;
        }
        const adminEmails = adminResults.map(admin => admin.email);
        if (adminEmails.length > 0) {
          sendAdminNotification(adminEmails, emailClassDetails, registeredUsers);
        }
      });
    });
  });
});

app.post("/api/classes/:classId/cancel", (req, res) => {
  const { classId } = req.params;
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }
  const findClassSql = "SELECT * FROM classes WHERE class_id = ?";
  db.query(findClassSql, [classId], (err, results) => {
    if (err) {
      console.error("❌ Database error while fetching class:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Class not found." });
    }
    const course = results[0];
    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(course.registered_users || "[]");
    } catch (e) {
      console.error("❌ Error parsing registered_users JSON:", e);
      return res.status(500).json({ message: "Error processing registration data." });
    }
    
    const cancelingUser = registeredUsers.find(user => user.email === email);
    if (!cancelingUser) {
      return res.status(409).json({ message: "You are not registered for this class." });
    }

    const updatedUsers = registeredUsers.filter(user => user.email !== email);
    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(updatedUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }
      console.log(`✅ User ${email} canceled registration for class ${classId}`);
      res.status(200).json({ message: "Successfully canceled your registration." });

      // --- Email Notification for Admin ---
      const emailClassDetails = JSON.parse(JSON.stringify(course));
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(', ');
      } catch (e) { /* Ignore parsing errors */ }

      const adminQuery = "SELECT email FROM users WHERE status = 'ผู้ดูแลระบบ'";
      db.query(adminQuery, (err, adminResults) => {
        if (err) {
          console.error("Error fetching admin emails for cancellation:", err);
          return;
        }
        const adminEmails = adminResults.map(admin => admin.email);
        if (adminEmails.length > 0) {
          sendAdminCancellationNotification(adminEmails, cancelingUser.name, email, emailClassDetails, updatedUsers);
        }
      });
    });
  });
});

app.get("/api/classes/registered/closed", (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: "Email query parameter is required." });
  }
  const sql = `
    SELECT * FROM classes
    WHERE status = 'closed'
    AND JSON_CONTAINS(registered_users, JSON_OBJECT('email', ?), '$')
  `;
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Error fetching registered closed classes:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.status(200).json(results);
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});