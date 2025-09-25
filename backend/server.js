const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
require('dotenv').config();

const { sendRegistrationConfirmation, sendAdminNotification, sendAdminCancellationNotification, sendNewClassRequestAdminNotification, sendRequestApprovedNotification, sendRequestRejectedNotification } = require('./email.js');

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

// API: ผลการประเมินห้องเรียน
app.get('/api/classes/:classId/evaluations', (req, res) => {
  const classId = req.params.classId;
  const sql = `
    SELECT
      u.name,
      e.score_content,
      e.score_material,
      e.score_duration,
      e.score_format,
      e.score_speaker,
      e.comments
    FROM evaluations e
    JOIN users u ON e.user_email = u.email
    WHERE e.class_id = ?
  `;
  db.query(sql, [classId], (err, results) => {
    if (err) {
      console.error("Error fetching evaluation results:", err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!results || results.length === 0) {
      return res.json({ evaluations: [], suggestions: [] });
    }

    const suggestions = results
      .map(r => r.comments)
      .filter(c => c && c.trim() !== '' && c.trim().toLowerCase() !== 'null');

    // The results are already in the format of { name, score_content, ... }
    // So we can just pass them as 'evaluations'
    res.json({ evaluations: results, suggestions });
  });
});

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
  const sql = 'SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ? AND is_active = 1';
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or user not found' });
    }
    const user = results[0];
    res.json({
      id: user.id,
      name: user.name,
      roles: (() => {
        try {
          // Attempt to parse if it's a JSON string; otherwise, return it if it's already an array or default to empty.
          return Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles || '[]');
        } catch (e) {
          return []; // Return empty array on parsing error
        }
      })(),
      email: user.email,
      phone: user.phone,
      pdpa: user.pdpa,
      is_active: user.is_active,
      photo: user.photo,
    });
  });
});

app.put('/api/users/profile-picture', upload.single('photo'), (req, res) => {
  const { email } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!email || !photo) {
    return res.status(400).json({ message: 'Email and photo are required.' });
  }

  const sql = 'UPDATE users SET photo = ? WHERE email = ?';
  db.query(sql, [photo, email], (err, result) => {
    if (err) {
      console.error('Error updating profile picture:', err);
      return res.status(500).json({ message: 'Database error.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch the updated user data to send back to the client
    const fetchUserSql = 'SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?';
    db.query(fetchUserSql, [email], (fetchErr, users) => {
      if (fetchErr || users.length === 0) {
        return res.status(500).json({ message: 'Could not fetch updated user data.' });
      }
      const updatedUser = users[0];
      updatedUser.roles = JSON.parse(updatedUser.roles || '[]');
      res.status(200).json(updatedUser);
    });
  });
});

app.delete('/api/users/profile-picture', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // First, get the current photo filename to delete it from the filesystem
  const findUserSql = 'SELECT photo FROM users WHERE email = ?';
  db.query(findUserSql, [email], (findErr, findResults) => {
    if (findErr) {
      return res.status(500).json({ message: 'Database error on find.' });
    }
    if (findResults.length === 0) {
      // User exists but might not have a photo, which is fine. Proceed to update DB.
    }

    const oldPhoto = findResults[0]?.photo;

    // Update the database to set photo to NULL
    const sql = 'UPDATE users SET photo = NULL WHERE email = ?';
    db.query(sql, [email], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error on update.' });
      }

      // Delete the old file from the filesystem if it exists
      if (oldPhoto) {
        const filePath = path.join(__dirname, 'uploads', oldPhoto);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting old photo file:', unlinkErr);
          else console.log(`✅ Deleted old photo file: ${oldPhoto}`);
        });
      }

      // Fetch and return the updated user data
      const fetchUserSql = 'SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?';
      db.query(fetchUserSql, [email], (fetchErr, users) => {
        if (fetchErr || users.length === 0) return res.status(500).json({ message: 'Could not fetch updated user data.' });
        const updatedUser = users[0];
        updatedUser.roles = JSON.parse(updatedUser.roles || '[]');
        res.status(200).json(updatedUser);
      });
    });
  });
});

app.get('/api/classes', (req, res) => {
  const { email, roles } = req.query;
  let sql;
  let params = [];
  // ตรวจสอบว่ามีบทบาท 'ผู้ดูแลระบบ' หรือไม่
  const userRoles = roles ? roles.split(',') : [];
  if (userRoles.includes('ผู้ดูแลระบบ')) {
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

app.get('/api/classes/:classId/registrants', (req, res) => {
  const { classId } = req.params;
  const findClassSql = "SELECT registered_users FROM classes WHERE class_id = ?";
  db.query(findClassSql, [classId], (err, results) => {
    if (err) {
      console.error("❌ Database error while fetching class:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Class not found." });
    }

    let registeredEmails = [];
    try {
      registeredEmails = JSON.parse(results[0].registered_users || '[]');
    } catch (e) {
      console.error("❌ Error parsing registered_users JSON:", e);
      return res.status(500).json({ message: "Error processing registration data." });
    }

    if (registeredEmails.length === 0) {
      return res.json([]);
    }

    const getUsersSql = "SELECT name, email, roles FROM users WHERE email IN (?)";
    db.query(getUsersSql, [registeredEmails], (err, userResults) => {
      if (err) {
        console.error("❌ Database error while fetching users:", err);
        return res.status(500).json({ message: "Database server error." });
      }
      res.json(userResults);
    });
  });
});

app.post("/api/classes", upload.array("files"), (req, res) => {
  const { class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, created_by_email } = req.body;
  const fileNames = req.files ? req.files.map((file) => file.filename) : [];
  const sql = `
    INSERT INTO classes (class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, files, created_by_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location || "", max_participants, target_groups, JSON.stringify(fileNames), created_by_email || ""],
    (err, result) => {
      if (err) {
        console.error("❌ บันทึกไม่สำเร็จ:", err);
        return res.status(500).json({ message: "เซิร์ฟเวอร์ผิดพลาด", error: err });
      }
      console.log("✅ บันทึกข้อมูลสำเร็จ:", result);
      res.status(201).json({ message: "Class created successfully" });
    }
  );
});

app.post("/api/requests", (req, res) => {
  const { title, reason, startDate, endDate, startTime, endTime, format, speaker, requestedBy } = req.body;

  // Basic validation
  if (!title || !requestedBy) {
    return res.status(400).json({ message: "Title and requestedBy email are required." });
  }

  const sql = `
    INSERT INTO requests (title, reason, start_date, end_date, start_time, end_time, format, suggested_speaker, user_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    title,
    reason || null,
    startDate || null,
    endDate || null,
    startTime || null,
    endTime || null,
    format || 'ONLINE',
    speaker || null,
    requestedBy,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error submitting class request:", err);
      return res.status(500).json({ message: "Database server error.", error: err });
    }
    console.log("✅ Class request submitted successfully:", result);
    res.status(201).json({ message: "Class request submitted successfully!" });

    // --- Email Notification for Admins ---
    const adminQuery = "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
    db.query(adminQuery, (err, adminResults) => {
      if (err) {
        console.error("Error fetching admin emails for request notification:", err);
        return;
      }
      const adminEmails = adminResults.map(admin => admin.email);
      if (adminEmails.length > 0) {
        const requestDetails = {
          title,
          reason,
          startDate,
          endDate,
          startTime,
          endTime,
          format,
          speaker,
          requestedBy,
        };
        sendNewClassRequestAdminNotification(adminEmails, requestDetails);
      }
    });
  });
});

app.get('/api/requests', (req, res) => {
  const { user_email } = req.query;
  let sql = 'SELECT request_id, title, request_date, status, start_date, end_date, start_time, end_time, rejection_reason FROM requests';
  const params = [];

  if (user_email) {
    sql += ' WHERE user_email = ?';
    params.push(user_email);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching class requests:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.json(results);
  });
});

// Admin API to get all class requests with user details
app.get('/api/admin/class-requests', (req, res) => {
  const { status } = req.query;

  let sql = `
    SELECT
      r.request_id,
      r.title,
      r.reason,
      r.start_date,
      r.end_date,
      r.start_time,
      r.end_time,
      r.format,
      r.suggested_speaker,
      r.request_date,
      r.status,
      r.rejection_reason,
      u.name AS requested_by_name,
      u.email AS requested_by_email
    FROM requests r
    JOIN users u ON r.user_email = u.email
  `;
  const params = [];

  if (status) {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY r.request_date DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching admin class requests:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.json(results);
  });
});

// Admin API to approve or reject a class request
app.post('/api/admin/class-requests/:requestId/:action', async (req, res) => {
  const { requestId, action } = req.params;
  const { reason } = req.body; // Get reason from request body

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: "Invalid action." });
  }

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      db.beginTransaction(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update request status and rejection reason if applicable
    let updateRequestSql;
    let updateParams;
    if (action === 'reject') {
      // Ensure a reason is provided for rejection
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: "Rejection reason is required." });
      }
      updateRequestSql = 'UPDATE requests SET status = ?, rejection_reason = ? WHERE request_id = ?';
      updateParams = ['rejected', reason, requestId];
    } else {
      updateRequestSql = 'UPDATE requests SET status = ? WHERE request_id = ?';
      updateParams = ['approved', requestId];
    }

    await new Promise((resolve, reject) => {
      db.query(updateRequestSql, updateParams, (err, result) => {
        if (err) reject(err);
        else if (result.affectedRows === 0) reject(new Error("Request not found."));
        else resolve();
      });
    });

    if (action === 'approve') {
      // Fetch request details to send approval email to requester
      const getRequestSql = 'SELECT * FROM requests WHERE request_id = ?';
      const requestDetails = await new Promise((resolve, reject) => {
        db.query(getRequestSql, [requestId], (err, results) => {
          if (err) reject(err);
          else if (results.length === 0) reject(new Error("Request details not found."));
          else resolve(results[0]);
        });
      });
      sendRequestApprovedNotification(requestDetails.user_email, requestDetails);
    }

    // If action is reject, send rejection email to requester
    if (action === 'reject') {
      // Fetch request details to send rejection email
      const getRequestSql = 'SELECT * FROM requests WHERE request_id = ?';
      const requestDetails = await new Promise((resolve, reject) => {
        db.query(getRequestSql, [requestId], (err, results) => {
          if (err) reject(err);
          else if (results.length === 0) reject(new Error("Request details not found."));
          else resolve(results[0]);
        });
      });
      sendRequestRejectedNotification(requestDetails.user_email, requestDetails, reason);
    }

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.commit(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({ message: `Request ${action}ed successfully.` });
  } catch (error) {
    // Rollback transaction on error
    await new Promise(resolve => {
      db.rollback(() => {
        console.error("❌ Transaction rolled back:", error);
        resolve();
      });
    });
    console.error(`Error ${action}ing class request:`, error);
    res.status(500).json({ message: "Database server error.", error: error.message });
  }
});

app.put('/api/requests/:requestId', (req, res) => {
  const { requestId } = req.params;
  const { title, reason, startDate, endDate, startTime, endTime, format, speaker } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required." });
  }

  const sql = `
    UPDATE requests 
    SET 
      title = ?, 
      reason = ?, 
      start_date = ?, 
      end_date = ?, 
      start_time = ?, 
      end_time = ?, 
      format = ?, 
      suggested_speaker = ?,
      status = 'pending',
      rejection_reason = NULL
    WHERE request_id = ?
  `;
  const values = [title, reason, startDate, endDate, startTime, endTime, format, speaker, requestId];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error updating class request:", err);
      return res.status(500).json({ message: "Database server error.", error: err });
    }
    console.log(`✅ Class request ${requestId} updated successfully.`);
    res.status(200).json({ message: "Class request updated successfully!" });
  });
});

app.delete('/api/requests/:requestId', (req, res) => {
  const { requestId } = req.params;
  const sql = 'DELETE FROM requests WHERE request_id = ?';
  db.query(sql, [requestId], (err, result) => {
    if (err) {
      console.error("❌ Error deleting class request:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Class request not found." });
    }
    console.log(`✅ Class request ${requestId} deleted successfully.`);
    res.status(200).json({ message: "Class request deleted successfully!" });
  });
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
  const fileNames = req.files ? req.files.map((file) => file.filename) : [];

  let sql = `
    UPDATE classes SET
      title = ?, speaker = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, description = ?, format = ?,
      join_link = ?, location = ?, max_participants = ?, target_groups = ?
  `;
  const params = [title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location || "", max_participants, target_groups];

  if (fileNames.length > 0) {
    sql += ", files = ?";
    params.push(JSON.stringify(fileNames));
  }

  sql += " WHERE class_id = ?";
  params.push(classId);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error updating class:", err);
      return res.status(500).json({ message: "Database server error", error: err });
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
  const { video_link, existing_materials } = req.body;

  // Get the filenames of newly uploaded files
  const newMaterialFiles = req.files ? req.files.map((file) => file.filename) : [];

  // Parse the list of existing materials to keep
  let finalMaterials = [];
  try {
    const existing = existing_materials ? JSON.parse(existing_materials) : [];
    // Combine existing files with new files
    finalMaterials = [...existing, ...newMaterialFiles];
  } catch (error) {
    console.error("Error parsing existing_materials:", error);
    // If parsing fails, just use the new files to prevent data loss
    finalMaterials = newMaterialFiles;
  }

  const sql = `UPDATE classes SET status = 'closed', video_link = ?, materials = ? WHERE class_id = ?`;
  const params = [video_link || null, JSON.stringify(finalMaterials), classId];

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

    const isAlreadyRegistered = registeredUsers.includes(email);
    if (isAlreadyRegistered) {
      return res.status(409).json({ message: "You are already registered for this class." });
    }

    registeredUsers.push(email);

    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(registeredUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }

      console.log(`✅ User ${email} registered for class ${classId}`);
      res.status(200).json({ message: "Successfully registered for the class!" });

      // --- Email Notifications ---
      const emailClassDetails = JSON.parse(JSON.stringify(course));
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(', ');
      } catch (e) { /* Ignore parsing errors */ }

      // 1. Send confirmation to the user
      sendRegistrationConfirmation(email, emailClassDetails, name);

      // 2. Send notification to all admins
      const adminQuery = "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
      db.query(adminQuery, (err, adminResults) => {
        if (err) {
          console.error("Error fetching admin emails:", err);
          return;
        }
        const adminEmails = adminResults.map(admin => admin.email);
        if (adminEmails.length > 0) {
          sendAdminNotification(adminEmails, emailClassDetails, registeredUsers.map(e => ({ email: e })));
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
    
    if (!registeredUsers.includes(email)) {
      return res.status(409).json({ message: "You are not registered for this class." });
    }

    const updatedUsers = registeredUsers.filter(userEmail => userEmail !== email);
    const updateSql = "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(updateSql, [JSON.stringify(updatedUsers), classId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("❌ Database error while updating class:", updateErr);
        return res.status(500).json({ message: "Failed to update registration." });
      }
      console.log(`✅ User ${email} canceled registration for class ${classId}`);
      res.status(200).json({ message: "Successfully canceled your registration." });

      // --- Email Notification for Admin ---
      const userQuery = "SELECT name FROM users WHERE email = ?";
      db.query(userQuery, [email], (err, userResults) => {
        if (err || userResults.length === 0) {
            console.error("Error fetching user name for cancellation email:", err);
            return; 
        }
        const cancelingUserName = userResults[0].name;
        const emailClassDetails = JSON.parse(JSON.stringify(course));
        try {
            emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(', ');
        } catch (e) { /* Ignore parsing errors */ }

        const adminQuery = "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
        db.query(adminQuery, (err, adminResults) => {
            if (err) {
            console.error("Error fetching admin emails for cancellation:", err);
            return;
            }
            const adminEmails = adminResults.map(admin => admin.email);
            if (adminEmails.length > 0) {
            sendAdminCancellationNotification(adminEmails, cancelingUserName, email, emailClassDetails, updatedUsers.map(e => ({email: e})));
            }
        });
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
    AND JSON_CONTAINS(registered_users, ?, '$')
  `;
  const values = [`"${email}"`];

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error("❌ Error fetching registered closed classes:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.status(200).json(results);
  });
});

app.get('/api/statistics/class-demographics', (req, res) => {
  const { year, month } = req.query;

  let classesSql = `
    SELECT
      c.class_id,
      c.title,
      c.registered_users,
      c.start_date,
      eval_stats.total_evaluations,
      eval_stats.avg_score_content,
      eval_stats.avg_score_material,
      eval_stats.avg_score_duration,
      eval_stats.avg_score_format,
      eval_stats.avg_score_speaker
    FROM
      classes c
    LEFT JOIN (
      SELECT
        class_id,
        COUNT(evaluation_id) AS total_evaluations,
        AVG(score_content) AS avg_score_content,
        AVG(score_material) AS avg_score_material,
        AVG(score_duration) AS avg_score_duration,
        AVG(score_format) AS avg_score_format,
        AVG(score_speaker) AS avg_score_speaker
      FROM
        evaluations
      GROUP BY
        class_id
    ) AS eval_stats
    ON
      c.class_id = eval_stats.class_id
    WHERE
      c.status = 'closed'
  `;
  const params = [];

  if (year && year !== 'all') {
    classesSql += ' AND YEAR(c.start_date) = ?';
    params.push(year);
  }
  if (month && month !== 'all') {
    classesSql += ' AND MONTH(c.start_date) = ?';
    params.push(month);
  }

  db.query(classesSql, params, (err, classes) => {
    if (err) {
      console.error("Error fetching classes for statistics:", err);
      return res.status(500).json({ error: 'Database error while fetching classes.' });
    }

    if (classes.length === 0) {
      return res.json([]);
    }

    const allRegisteredEmails = classes.reduce((emails, currentClass) => {
      try {
        const users = JSON.parse(currentClass.registered_users || '[]');
        return emails.concat(users);
      } catch (e) {
        return emails;
      }
    }, []);

    if (allRegisteredEmails.length === 0) {
      const stats = classes.map(c => ({
        class_id: c.class_id,
        title: c.title,
        start_date: c.start_date,
        demographics: {},
        total_evaluations: c.total_evaluations || 0,
        avg_score_content: c.avg_score_content,
        avg_score_material: c.avg_score_material,
        avg_score_duration: c.avg_score_duration,
        avg_score_format: c.avg_score_format,
        avg_score_speaker: c.avg_score_speaker,
      }));
      return res.json(stats);
    }

    const uniqueEmails = [...new Set(allRegisteredEmails)];
    const usersSql = 'SELECT email, roles FROM users WHERE email IN (?)';
    db.query(usersSql, [uniqueEmails], (userErr, users) => {
      if (userErr) {
        console.error("Error fetching users for statistics:", userErr);
        return res.status(500).json({ error: 'Database error while fetching users.' });
      }

      const userRolesMap = users.reduce((map, user) => {
        try {
          map[user.email] = Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles || '[]');
        } catch (e) {
          map[user.email] = [];
        }
        return map;
      }, {});

      const statistics = classes.map(currentClass => {
        const demographics = {};
        try {
          const registeredEmails = JSON.parse(currentClass.registered_users || '[]');
          registeredEmails.forEach(email => {
            const roles = userRolesMap[email] || [];
            // Filter out the 'ผู้ดูแลระบบ' role from statistics
            const nonAdminRoles = roles.filter(role => role !== 'ผู้ดูแลระบบ');
            nonAdminRoles.forEach(role => {
              demographics[role] = (demographics[role] || 0) + 1;
            });
          });
        } catch (e) {
          // Ignore parsing errors for a specific class
        }
        return {
          class_id: currentClass.class_id,
          title: currentClass.title,
          start_date: currentClass.start_date,
          demographics,
          total_evaluations: currentClass.total_evaluations || 0,
          avg_score_content: currentClass.avg_score_content,
          avg_score_material: currentClass.avg_score_material,
          avg_score_duration: currentClass.avg_score_duration,
          avg_score_format: currentClass.avg_score_format,
          avg_score_speaker: currentClass.avg_score_speaker,
        };
      });

      res.json(statistics);
    });
  });
});

app.get('/api/statistics/evaluation-categories', (req, res) => {
  const { year, month } = req.query;

  let sql = `
    SELECT 
      AVG(e.score_content) AS avg_score_content,
      AVG(e.score_material) AS avg_score_material,
      AVG(e.score_duration) AS avg_score_duration,
      AVG(e.score_format) AS avg_score_format,
      AVG(e.score_speaker) AS avg_score_speaker
    FROM evaluations e
    JOIN classes c ON e.class_id = c.class_id
    WHERE c.status = 'closed'
  `;
  const params = [];

  if (year && year !== 'all') {
    sql += ' AND YEAR(c.start_date) = ?';
    params.push(year);
  }
  if (month && month !== 'all') {
    sql += ' AND MONTH(c.start_date) = ?';
    params.push(month);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching evaluation category summary:", err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results[0] || {});
  });
});

app.get('/api/statistics/evaluation-categories/:classId', (req, res) => {
  const { classId } = req.params;
  const sql = `
    SELECT 
      AVG(score_content) AS avg_score_content,
      AVG(score_material) AS avg_score_material,
      AVG(score_duration) AS avg_score_duration,
      AVG(score_format) AS avg_score_format,
      AVG(score_speaker) AS avg_score_speaker
    FROM evaluations
    WHERE class_id = ?
  `;
  db.query(sql, [classId], (err, results) => {
    if (err) {
      console.error(`Error fetching evaluation summary for class ${classId}:`, err);
      return res.status(500).json({ error: 'Database error' });
    }
    // results[0] will contain the averages. If no evaluations exist, the values will be null.
    // Check if the first average is null to determine if any evaluations were found.
    if (results.length > 0 && results[0].avg_score_content !== null) {
      res.json(results[0]);
    } else {
      res.json({}); // Return empty object if no evaluations found
    }
  });
});

// Get all class IDs a user has evaluated
app.get('/api/evaluations/user/:email', (req, res) => {
  const { email } = req.params;
  const sql = 'SELECT DISTINCT class_id FROM evaluations WHERE user_email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(`Error fetching evaluations for user ${email}:`, err);
      return res.status(500).json({ error: 'Database error' });
    }
    const classIds = results.map(row => row.class_id);
    res.json(classIds);
  });
});

// Submit a new evaluation
app.post('/api/evaluations', (req, res) => {
  const {
    class_id,
    user_email,
    score_content,
    score_material,
    score_duration,
    score_format,
    score_speaker,
    comment
  } = req.body;

  // Basic validation
  if (!class_id || !user_email || score_content === undefined) {
    return res.status(400).json({ error: 'Missing required evaluation data.' });
  }

  const checkSql = 'SELECT evaluation_id FROM evaluations WHERE class_id = ? AND user_email = ?';
  db.query(checkSql, [class_id, user_email], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: 'Database error while checking for existing evaluation.' });
    }
    if (checkResults.length > 0) {
      return res.status(409).json({ error: 'You have already submitted an evaluation for this class.' });
    }

    const insertSql = `
      INSERT INTO evaluations (class_id, user_email, score_content, score_material, score_duration, score_format, score_speaker, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      class_id,
      user_email,
      score_content,
      score_material,
      score_duration,
      score_format,
      score_speaker,
      comment || null
    ];

    db.query(insertSql, values, (insertErr, result) => {
      if (insertErr) {
        console.error('Error submitting evaluation:', insertErr);
        return res.status(500).json({ error: 'Failed to submit evaluation.' });
      }
      res.status(201).json({ message: 'Evaluation submitted successfully.' });
    });
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
