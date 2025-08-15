const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require('fs');

// Create upload directories if they don't exist
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

// GET /api/classes/promoted - for public users
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

// POST พร้อมรับไฟล์
app.post("/api/classes", upload.array("files"), (req, res) => {
  const {
    class_id,
    title,
    speaker, // Expecting a JSON string from the client
    start_date,
    end_date,
    start_time,
    end_time,
    description,
    format,
    join_link,
    max_participants,
    target_groups, // Expecting a JSON string from the client
  } = req.body;

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
      speaker, // Pass the already stringified JSON from the client
      start_date,
      end_date,
      start_time,
      end_time,
      description,
      format,
      join_link,
      req.body.location || "",
      max_participants,
      target_groups, // Pass the already stringified JSON from the client
      JSON.stringify(fileNames),
      req.body.created_by_email || "",
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

// PUT /api/classes/:classId - To update a class
app.put("/api/classes/:classId", upload.array("files"), (req, res) => {
  const { classId } = req.params;
  const {
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
    location,
  } = req.body;

  const fileNames = req.files.map((file) => file.filename);

  const sql = `
    UPDATE classes SET
      title = ?, speaker = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, description = ?, format = ?,
      join_link = ?, location = ?, max_participants = ?, target_groups = ?
      ${fileNames.length > 0 ? ", files = ?" : ""}
    WHERE class_id = ?
  `;

  const params = [
    title,
    speaker, // From frontend, this is already a JSON string
    start_date,
    end_date,
    start_time,
    end_time,
    description,
    format,
    join_link,
    location || "",
    max_participants,
    target_groups, // From frontend, this is already a JSON string
  ];

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

// POST /api/classes/:classId/close - To close a class and upload materials
const materialsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/materials"); // Separate folder for class materials
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadMaterials = multer({ storage: materialsStorage });

app.post("/api/classes/:classId/close", uploadMaterials.array("materials"), (req, res) => {
  const { classId } = req.params;
  const { video_link } = req.body;
  const materialFiles = req.files.map((file) => file.filename);

  const sql = `
    UPDATE classes SET
      status = 'closed',
      video_link = ?,
      materials = ?
    WHERE class_id = ?
  `;

  const params = [
    video_link || null,
    JSON.stringify(materialFiles),
    classId
  ];

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

// PUT /api/classes/:classId/promote
app.put('/api/classes/:classId/promote', (req, res) => {
  const { classId } = req.params;
  const { promoted } = req.body; // Expecting a boolean true/false

  // Convert boolean to 0 or 1 for MySQL TINYINT/BOOLEAN column
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

// POST /api/classes/:classId/register - To register a user for a class
app.post("/api/classes/:classId/register", (req, res) => {
  const { classId } = req.params;
  const { name, email } = req.body; // User's name and email

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
        registeredUsers = JSON.parse(course.registered_users);
    } catch(e) {
        console.error("❌ Error parsing registered_users JSON:", e);
        registeredUsers = [];
    }

    // Check if the class is full
    if (registeredUsers.length >= maxParticipants) {
      return res.status(409).json({ message: "This class is already full." });
    }

    // Check if the user is already registered
    const isAlreadyRegistered = registeredUsers.some(user => user.email === email);
    if (isAlreadyRegistered) {
      return res.status(409).json({ message: "You are already registered for this class." });
    }

    // Add the new user
    const newUser = { name, email };
    registeredUsers.push(newUser);

    // Update the database
    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(registeredUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }
      
      console.log(`✅ User ${name} registered for class ${classId}`);
      res.status(200).json({ message: "Successfully registered for the class!" });
    });
  });
});

// POST /api/classes/:classId/cancel - To cancel a user's registration for a class
app.post("/api/classes/:classId/cancel", (req, res) => {
  const { classId } = req.params;
  const { email } = req.body; // User's email

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
    } catch(e) {
        console.error("❌ Error parsing registered_users JSON:", e);
        return res.status(500).json({ message: "Error processing registration data." });
    }

    // Check if the user is actually registered
    const isRegistered = registeredUsers.some(user => user.email === email);
    if (!isRegistered) {
      return res.status(409).json({ message: "You are not registered for this class." });
    }

    // Filter out the user who is canceling
    const updatedUsers = registeredUsers.filter(user => user.email !== email);

    // Update the database
    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(updatedUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }
      
      console.log(`✅ User ${email} canceled registration for class ${classId}`);
      res.status(200).json({ message: "Successfully canceled your registration." });
    });
  });
});

// GET /api/classes/registered/closed - To get closed classes a user has registered for
app.get("/api/classes/registered/closed", (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email query parameter is required." });
  }

  const sql = `
    SELECT * FROM classes
    WHERE status = 'closed'
    AND JSON_CONTAINS(registered_users, JSON_OBJECT('email', ?), '
)
  `;

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("❌ Error fetching registered closed classes:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.status(200).json(results);
  });
});

// เปิดใช้โฟลเดอร์สำหรับแสดงไฟล์ (ถ้าต้องการ)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
