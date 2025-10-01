const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");

const {
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendAdminCancellationNotification,
  sendNewClassRequestAdminNotification,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification,
  sendReminderEmail,
} = require("./email.js");

const MS_ENTRA_CONFIG = {
  // *** แทนที่ค่า 'YOUR_...' เมื่อได้รับข้อมูลจากหน่วยงาน ***
  CLIENT_ID: process.env.ENTRA_CLIENT_ID || "YOUR_APPLICATION_CLIENT_ID",
  CLIENT_SECRET: process.env.ENTRA_CLIENT_SECRET || "YOUR_CLIENT_SECRET_VALUE",
  // มักใช้ 'common' หรือ Directory (Tenant) ID เฉพาะของ มช.
  TENANT_ID: process.env.ENTRA_TENANT_ID || "common",
  // ต้องเป็น URL เดียวกันกับที่ลงทะเบียนใน Entra ID (Redirect URI)
  REDIRECT_URI:
    process.env.ENTRA_REDIRECT_URI || "http://localhost:5000/api/auth/callback",
  SCOPES: "openid profile email", // สิทธิ์พื้นฐานที่ร้องขอ
};

const AUTHORITY = `https://login.microsoftonline.com/${MS_ENTRA_CONFIG.TENANT_ID}/v2.0`;
const AUTHORIZATION_ENDPOINT = `${AUTHORITY}/authorize`;
const TOKEN_ENDPOINT = `${AUTHORITY}/token`;

const uploadsDir = path.join(__dirname, "uploads");
const materialsDir = path.join(__dirname, "uploads/materials");

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
app.get("/api/classes/:classId/evaluations", (req, res) => {
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
      return res.status(500).json({ error: "Database error" });
    }

    if (!results || results.length === 0) {
      return res.json({ evaluations: [], suggestions: [] });
    }

    const suggestions = results
      .map((r) => r.comments)
      .filter((c) => c && c.trim() !== "" && c.trim().toLowerCase() !== "null");

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

// --- Activity Logging ---
function logActivity(req, userId, userName, userEmail, actionType, targetType, targetId, details) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const log = {
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    details: details ? JSON.stringify(details) : null,
    ip_address: ip
  };
  const sql = "INSERT INTO activity_logs SET ?";
  db.query(sql, log, (err) => {
    if (err) {
      console.error("❌ Failed to log activity:", err);
    }
  });
}
// --- End Activity Logging ---

app.post("/api/login", (req, res) => {
  const { email } = req.body;
  const sql =
    "SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ? AND is_active = 1";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or user not found" });
    }
    const user = results[0];
    logActivity(req, user.id, user.name, user.email, 'LOGIN_SUCCESS', 'SESSION', null, null);
    res.json({
      id: user.id,
      name: user.name,
      roles: (() => {
        try {
          // Attempt to parse if it's a JSON string; otherwise, return it if it's already an array or default to empty.
          return Array.isArray(user.roles)
            ? user.roles
            : JSON.parse(user.roles || "[]");
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

app.get("/api/users", (req, res) => {
  // In a real app, you'd have middleware to check if the user is an admin
  const sql =
    "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const users = results.map((user) => ({
      ...user,
      roles: JSON.parse(user.roles || "[]"),
    }));
    res.json(users);
  });
});

app.put("/api/users/:id/roles", (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!Array.isArray(roles)) {
    return res.status(400).json({ error: "Roles must be an array" });
  }

  const sql = "UPDATE users SET roles = ? WHERE id = ?";
  db.query(sql, [JSON.stringify(roles), id], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });

    // Log this activity
    // This assumes you have a middleware that puts the logged-in user on req.user
    const adminUser = req.user || { id: null, name: 'System', email: 'system' };
    db.query("SELECT name, email FROM users WHERE id = ?", [id], (fetchErr, targetUsers) => {
      if (!fetchErr && targetUsers.length > 0) {
        const targetUser = targetUsers[0];
        logActivity(req, adminUser.id, adminUser.name, adminUser.email, 'UPDATE_ROLE', 'USER', id, {
          target_user: `${targetUser.name} (${targetUser.email})`,
          new_roles: roles
        });
      }
    });


    // Fetch the updated user to return
    db.query(
      "SELECT id, name, email, roles, is_active, photo FROM users WHERE id = ?",
      [id],
      (fetchErr, users) => {
        if (fetchErr || users.length === 0)
          return res
            .status(500)
            .json({ error: "Could not fetch updated user" });
        const updatedUser = {
          ...users[0],
          roles: JSON.parse(users[0].roles || "[]"),
        };
        res.json(updatedUser);
      }
    );
  });
});

app.put("/api/users/:id/status", (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: "is_active must be a boolean" });
  }

  // Prevent deactivating the last active admin
  if (is_active === false) {
    db.query("SELECT roles, is_active FROM users WHERE id = ?", [id], (err, users) => {
      if (err || users.length === 0) return res.status(500).json({ error: "User not found or database error" });

      const userToDeactivate = users[0];
      const userRoles = JSON.parse(userToDeactivate.roles || "[]");

      if (userRoles.includes("ผู้ดูแลระบบ")) {
        db.query("SELECT COUNT(*) as activeAdminCount FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"') AND is_active = 1", (countErr, countResults) => {
          if (countErr) return res.status(500).json({ error: "Database error on admin count" });

          if (countResults[0].activeAdminCount <= 1) {
            return res.status(400).json({ error: "Cannot deactivate the last active admin" });
          }
          updateStatus();
        });
      } else {
        updateStatus();
      }
    });
  } else {
    updateStatus();
  }

  function updateStatus() {
    const sql = "UPDATE users SET is_active = ? WHERE id = ?";
    db.query(sql, [is_active, id], (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });

      // Log this activity
      // This assumes you have a middleware that puts the logged-in user on req.user
      const adminUser = req.user || { id: null, name: 'System', email: 'system' };
      db.query("SELECT name, email FROM users WHERE id = ?", [id], (fetchErr, targetUsers) => {
        if (!fetchErr && targetUsers.length > 0) {
          const targetUser = targetUsers[0];
          logActivity(req, adminUser.id, adminUser.name, adminUser.email, 'UPDATE_STATUS', 'USER', id, {
            target_user: `${targetUser.name} (${targetUser.email})`,
            new_status: is_active ? 'active' : 'inactive'
          });
        }
      });
      res.status(200).json({ message: "User status updated successfully" });
    });
  }
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;

  // First, get user details to check for admin status and photo
  db.query("SELECT id, name, email, roles, photo FROM users WHERE id = ?", [id], (err, users) => {
    if (err) return res.status(500).json({ error: "Database error on find" });
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    const userToDelete = users[0];
    const userRoles = Array.isArray(userToDelete.roles) ? userToDelete.roles : JSON.parse(userToDelete.roles || "[]");

    // Check if the user is the last admin
    if (userRoles.includes("ผู้ดูแลระบบ")) {
      db.query("SELECT COUNT(*) as adminCount FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')", (countErr, countResults) => {
        if (countErr) return res.status(500).json({ error: "Database error on count" });

        if (countResults[0].adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin" });
        }
        // If not the last admin, proceed to delete
        deleteUser();
      });
    } else {
      // If not an admin, proceed to delete
      deleteUser();
    }

    function deleteUser() {
      db.query("DELETE FROM users WHERE id = ?", [id], (deleteErr, result) => {
        if (deleteErr) return res.status(500).json({ error: "Database error on delete" });

        // Log this activity
        // This assumes you have a middleware that puts the logged-in user on req.user
        const adminUser = req.user || { id: null, name: 'System', email: 'system' };
        logActivity(req, adminUser.id, adminUser.name, adminUser.email, 'DELETE_USER', 'USER', id, {
          deleted_user_details: { id: userToDelete.id, name: userToDelete.name, email: userToDelete.email }
        });

        // If user had a photo, delete it from the filesystem
        if (userToDelete.photo) {
          const filePath = path.join(__dirname, "uploads", userToDelete.photo);
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting photo file:", unlinkErr);
          });
        }
        res.status(200).json({ message: "User deleted successfully" });
      });
    }
  });
});

app.post("/api/auth/check-or-create-user", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const findSql = "SELECT * FROM users WHERE email = ?";
  db.query(findSql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error on find" });

    const formatUser = (user) => ({
      ...user,
      roles: JSON.parse(user.roles || "[]"),
    });

    if (results.length > 0) {
      // User exists
      const user = results[0];
      if (user.pdpa === 1 && user.is_active === 1) {
        // Profile is complete and active, proceed to login
        res.json({ status: "ok", user: formatUser(user) });
      } else {
        // Profile is incomplete, prompt user to complete it
        res.json({ status: "profile_incomplete", user: formatUser(user) });
      }
    } else {
      // User does not exist, create a new one
      const insertSql =
        "INSERT INTO users (email, name, roles, pdpa, is_active) VALUES (?, ?, ?, ?, ?)";
      const newUser = {
        email,
        name: "",
        roles: "[]",
        pdpa: 0,
        is_active: 1, // Activate user by default
      };
      db.query(
        insertSql,
        [
          newUser.email,
          newUser.name,
          newUser.roles,
          newUser.pdpa,
          newUser.is_active,
        ],
        (insertErr, insertResult) => {
          if (insertErr)
            return res.status(500).json({ error: "Database error on create" });

          logActivity(req, insertResult.insertId, newUser.name, newUser.email, 'CREATE_USER', 'USER', insertResult.insertId, null);

          const createdUser = { id: insertResult.insertId, ...newUser };
          res.json({
            status: "profile_incomplete",
            user: formatUser(createdUser),
          });
        }
      );
    }
  });
});

app.put("/api/users/update-profile", (req, res) => {
  const { name, email, roles, phone, pdpa } = req.body;

  const sql =
    "UPDATE users SET name = ?, roles = ?, phone = ?, pdpa = ? WHERE email = ?";
  const values = [name, JSON.stringify(roles), phone, pdpa ? 1 : 0, email];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });

    // Log this activity
    logActivity(req, null, name, email, 'UPDATE_PROFILE', 'USER', email, {
      updated_fields: { name, roles, phone, pdpa }
    });

    // Fetch the updated user to return
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      (fetchErr, users) => {
        if (fetchErr || users.length === 0)
          return res
            .status(500)
            .json({ error: "Could not fetch updated user" });
        const updatedUser = {
          ...users[0],
          roles: JSON.parse(users[0].roles || "[]"),
        };
        res.json(updatedUser);
      }
    );
  });
});

app.put("/api/users/profile-picture", upload.single("photo"), (req, res) => {
  const { email } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!email || !photo) {
    return res.status(400).json({ message: "Email and photo are required." });
  }

  const sql = "UPDATE users SET photo = ? WHERE email = ?";
  db.query(sql, [photo, email], (err, result) => {
    if (err) {
      console.error("Error updating profile picture:", err);
      return res.status(500).json({ message: "Database error." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    logActivity(req, null, 'User', email, 'UPDATE_PHOTO', 'USER', email, {
      new_photo: photo
    });

    // Fetch the updated user data to send back to the client
    const fetchUserSql =
      "SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?";
    db.query(fetchUserSql, [email], (fetchErr, users) => {
      if (fetchErr || users.length === 0) {
        return res
          .status(500)
          .json({ message: "Could not fetch updated user data." });
      }
      const updatedUser = users[0];
      updatedUser.roles = JSON.parse(updatedUser.roles || "[]");
      res.status(200).json(updatedUser);
    });
  });
});

app.delete("/api/users/profile-picture", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  // First, get the current photo filename to delete it from the filesystem
  const findUserSql = "SELECT photo FROM users WHERE email = ?";
  db.query(findUserSql, [email], (findErr, findResults) => {
    if (findErr) {
      return res.status(500).json({ message: "Database error on find." });
    }
    if (findResults.length === 0) {
      // User exists but might not have a photo, which is fine. Proceed to update DB.
    }

    const oldPhoto = findResults[0]?.photo;

    // Update the database to set photo to NULL
    const sql = "UPDATE users SET photo = NULL WHERE email = ?";
    db.query(sql, [email], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error on update." });
      }

      logActivity(req, null, 'User', email, 'DELETE_PHOTO', 'USER', email, { old_photo: oldPhoto });

      // Delete the old file from the filesystem if it exists
      if (oldPhoto) {
        const filePath = path.join(__dirname, "uploads", oldPhoto);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting old photo file:", unlinkErr);
          else console.log(`✅ Deleted old photo file: ${oldPhoto}`);
        });
      }

      // Fetch and return the updated user data
      const fetchUserSql =
        "SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?";
      db.query(fetchUserSql, [email], (fetchErr, users) => {
        if (fetchErr || users.length === 0)
          return res
            .status(500)
            .json({ message: "Could not fetch updated user data." });
        const updatedUser = users[0];
        updatedUser.roles = JSON.parse(updatedUser.roles || "[]");
        res.status(200).json(updatedUser);
      });
    });
  });
});

// API to fetch activity logs
app.get("/api/activity-logs", (req, res) => {
  // In a real app, add middleware to ensure only admins can access this
  const { page = 1, limit = 25 } = req.query;
  const offset = (page - 1) * limit;

  const sql = "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  db.query(sql, [parseInt(limit), parseInt(offset)], (err, results) => {
    if (err) {
      console.error("Error fetching activity logs:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/api/classes", (req, res) => {
  const { email, roles } = req.query;
  let sql;
  let params = [];
  // ตรวจสอบว่ามีบทบาท 'ผู้ดูแลระบบ' หรือไม่
  const userRoles = roles ? roles.split(",") : [];
  if (userRoles.includes("ผู้ดูแลระบบ")) {
    sql = "SELECT * FROM classes";
  } else {
    sql = "SELECT * FROM classes WHERE created_by_email = ?";
    params.push(email);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

app.get("/api/classes/promoted", (req, res) => {
  const sql = "SELECT * FROM classes WHERE promoted = 1";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching promoted classes:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

app.get("/api/classes/:classId/registrants", (req, res) => {
  const { classId } = req.params;
  const findClassSql =
    "SELECT registered_users FROM classes WHERE class_id = ?";
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
      registeredEmails = JSON.parse(results[0].registered_users || "[]");
    } catch (e) {
      console.error("❌ Error parsing registered_users JSON:", e);
      return res
        .status(500)
        .json({ message: "Error processing registration data." });
    }

    if (registeredEmails.length === 0) {
      return res.json([]);
    }

    const getUsersSql =
      "SELECT name, email, roles FROM users WHERE email IN (?)";
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
    location,
    max_participants,
    target_groups,
    created_by_email,
  } = req.body;
  const fileNames = req.files ? req.files.map((file) => file.filename) : [];
  const sql = `
    INSERT INTO classes (class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, files, created_by_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      location || "",
      max_participants,
      target_groups,
      JSON.stringify(fileNames),
      created_by_email || "",
    ],
    (err, result) => {
      if (err) {
        console.error("❌ บันทึกไม่สำเร็จ:", err);
        return res
          .status(500)
          .json({ message: "เซิร์ฟเวอร์ผิดพลาด", error: err });
      }
      console.log("✅ บันทึกข้อมูลสำเร็จ:", result);
      res.status(201).json({ message: "Class created successfully" });
    }
  );
});

app.post("/api/requests", (req, res) => {
  const {
    title,
    reason,
    startDate,
    endDate,
    startTime,
    endTime,
    format,
    speaker,
    requestedBy,
  } = req.body;

  // Basic validation
  if (!title || !requestedBy) {
    return res
      .status(400)
      .json({ message: "Title and requestedBy email are required." });
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
    format || "ONLINE",
    speaker || null,
    requestedBy,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error submitting class request:", err);
      return res
        .status(500)
        .json({ message: "Database server error.", error: err });
    }
    console.log("✅ Class request submitted successfully:", result);
    res.status(201).json({ message: "Class request submitted successfully!" });

    // --- Email Notification for Admins ---
    const userQuery = "SELECT name FROM users WHERE email = ?";
    db.query(userQuery, [requestedBy], (userErr, userResults) => {
      if (userErr || userResults.length === 0) {
        console.error(
          "Error fetching user name for request notification:",
          userErr
        );
        // Fallback to email if name not found
        const requestDetails = {
          title,
          reason,
          requestedBy: { name: requestedBy, email: requestedBy },
        };
        sendNewClassRequestAdminNotification([], requestDetails); // Send with what we have
        return;
      }

      const requesterName = userResults[0].name;

      const adminQuery =
        "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
      db.query(adminQuery, (err, adminResults) => {
        if (err) {
          console.error(
            "Error fetching admin emails for request notification:",
            err
          );
          return;
        }
        const adminEmails = adminResults.map((admin) => admin.email);
        if (adminEmails.length > 0) {
          const requestDetails = {
            title,
            reason,
            requestedBy: { name: requesterName, email: requestedBy }, // Pass an object with name and email
          };
          sendNewClassRequestAdminNotification(adminEmails, requestDetails);
        }
      });
    });
  });
});

app.get("/api/requests", (req, res) => {
  const { user_email } = req.query;
  let sql =
    "SELECT request_id, title, request_date, status, start_date, end_date, start_time, end_time, rejection_reason FROM requests";
  const params = [];

  if (user_email) {
    sql += " WHERE user_email = ?";
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
app.get("/api/admin/class-requests", (req, res) => {
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
    sql += " WHERE r.status = ?";
    params.push(status);
  }

  sql += " ORDER BY r.request_date DESC";

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error fetching admin class requests:", err);
      return res.status(500).json({ message: "Database server error." });
    }
    res.json(results);
  });
});

// Admin API to approve or reject a class request
app.post("/api/admin/class-requests/:requestId/:action", async (req, res) => {
  const { requestId, action } = req.params;
  const { reason } = req.body; // Get reason from request body

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid action." });
  }

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      db.beginTransaction((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update request status and rejection reason if applicable
    let updateRequestSql;
    let updateParams;
    if (action === "reject") {
      // Ensure a reason is provided for rejection
      if (!reason || reason.trim() === "") {
        return res
          .status(400)
          .json({ message: "Rejection reason is required." });
      }
      updateRequestSql =
        "UPDATE requests SET status = ?, rejection_reason = ? WHERE request_id = ?";
      updateParams = ["rejected", reason, requestId];
    } else {
      updateRequestSql = "UPDATE requests SET status = ? WHERE request_id = ?";
      updateParams = ["approved", requestId];
    }

    await new Promise((resolve, reject) => {
      db.query(updateRequestSql, updateParams, (err, result) => {
        if (err) reject(err);
        else if (result.affectedRows === 0)
          reject(new Error("Request not found."));
        else resolve();
      });
    });

    if (action === "approve") {
      // Fetch request details to send approval email to requester
      const getRequestSql = `
        SELECT r.*, u.name as requested_by_name 
        FROM requests r 
        JOIN users u ON r.user_email = u.email 
        WHERE r.request_id = ?
      `;
      const requestDetails = await new Promise((resolve, reject) => {
        db.query(getRequestSql, [requestId], (err, results) => {
          if (err) reject(err);
          else if (results.length === 0)
            reject(new Error("Request details not found."));
          else resolve(results[0]);
        });
      });
      sendRequestApprovedNotification(requestDetails);
    }

    // If action is reject, send rejection email to requester
    if (action === "reject") {
      // Fetch request details to send rejection email
      const getRequestSql = `
        SELECT r.*, u.name as requested_by_name 
        FROM requests r 
        JOIN users u ON r.user_email = u.email 
        WHERE r.request_id = ?
      `;
      const requestDetails = await new Promise((resolve, reject) => {
        db.query(getRequestSql, [requestId], (err, results) => {
          if (err) reject(err);
          else if (results.length === 0)
            reject(new Error("Request details not found."));
          else resolve(results[0]);
        });
      });
      sendRequestRejectedNotification(requestDetails, reason);
    }

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.commit((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({ message: `Request ${action}ed successfully.` });
  } catch (error) {
    // Rollback transaction on error
    await new Promise((resolve) => {
      db.rollback(() => {
        console.error("❌ Transaction rolled back:", error);
        resolve();
      });
    });
    console.error(`Error ${action}ing class request:`, error);
    res
      .status(500)
      .json({ message: "Database server error.", error: error.message });
  }
});

app.put("/api/requests/:requestId", (req, res) => {
  const { requestId } = req.params;
  const {
    title,
    reason,
    startDate,
    endDate,
    startTime,
    endTime,
    format,
    speaker,
  } = req.body;

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
  const values = [
    title,
    reason,
    startDate,
    endDate,
    startTime,
    endTime,
    format,
    speaker,
    requestId,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error updating class request:", err);
      return res
        .status(500)
        .json({ message: "Database server error.", error: err });
    }
    console.log(`✅ Class request ${requestId} updated successfully.`);
    res.status(200).json({ message: "Class request updated successfully!" });
  });
});

app.delete("/api/requests/:requestId", (req, res) => {
  const { requestId } = req.params;
  const sql = "DELETE FROM requests WHERE request_id = ?";
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

app.delete("/api/classes/:classId", (req, res) => {
  const { classId } = req.params;
  const sql = "DELETE FROM classes WHERE class_id = ?";
  db.query(sql, [classId], (err, result) => {
    if (err) {
      console.error("Error deleting class:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Class not found" });
    }
    res.status(200).json({ message: "Class deleted successfully" });
  });
});

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
  const fileNames = req.files ? req.files.map((file) => file.filename) : [];

  let sql = `
    UPDATE classes SET
      title = ?, speaker = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, description = ?, format = ?,
      join_link = ?, location = ?, max_participants = ?, target_groups = ?
  `;
  const params = [
    title,
    speaker,
    start_date,
    end_date,
    start_time,
    end_time,
    description,
    format,
    join_link,
    location || "",
    max_participants,
    target_groups,
  ];

  if (fileNames.length > 0) {
    sql += ", files = ?";
    params.push(JSON.stringify(fileNames));
  }

  sql += " WHERE class_id = ?";
  params.push(classId);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("❌ Error updating class:", err);
      return res
        .status(500)
        .json({ message: "Database server error", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Class not found" });
    }
    console.log("✅ Class updated successfully:", result);
    res.status(200).json({ message: "Class updated successfully" });
  });
});

const materialsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/materials");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadMaterials = multer({ storage: materialsStorage });
app.post(
  "/api/classes/:classId/close",
  uploadMaterials.array("materials"),
  (req, res) => {
    const { classId } = req.params;
    const { video_link, existing_materials } = req.body;

    // Get the filenames of newly uploaded files
    const newMaterialFiles = req.files
      ? req.files.map((file) => file.filename)
      : [];

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
    const params = [
      video_link || null,
      JSON.stringify(finalMaterials),
      classId,
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
      res
        .status(200)
        .json({ message: "Class closed and materials uploaded successfully" });
    });
  }
);

app.put("/api/classes/:classId/promote", (req, res) => {
  const { classId } = req.params;
  const { promoted } = req.body;
  const promotedValue = promoted ? 1 : 0;
  const sql = "UPDATE classes SET promoted = ? WHERE class_id = ?";
  db.query(sql, [promotedValue, classId], (err, result) => {
    if (err) {
      console.error("Error updating promotion status:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Class not found or no changes made" });
    }
    res.status(200).json({ message: "Promotion status updated successfully" });
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
      registeredUsers = JSON.parse(course.registered_users || "[]");
    } catch (e) {
      console.error("❌ Error parsing registered_users JSON:", e);
      registeredUsers = [];
    }

    if (maxParticipants !== 999 && registeredUsers.length >= maxParticipants) {
      return res.status(409).json({ message: "This class is already full." });
    }

    const isAlreadyRegistered = registeredUsers.includes(email);
    if (isAlreadyRegistered) {
      return res
        .status(409)
        .json({ message: "You are already registered for this class." });
    }

    registeredUsers.push(email);

    const updateSql =
      "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(
      updateSql,
      [JSON.stringify(registeredUsers), classId],
      (updateErr, updateResult) => {
        if (updateErr) {
          console.error("❌ Database error while updating class:", updateErr);
          return res
            .status(500)
            .json({ message: "Failed to update registration." });
        }

        console.log(`✅ User ${email} registered for class ${classId}`);
        res
          .status(200)
          .json({ message: "Successfully registered for the class!" });

        // --- Email Notifications ---
        const emailClassDetails = JSON.parse(JSON.stringify(course));
        try {
          emailClassDetails.speaker = JSON.parse(
            emailClassDetails.speaker
          ).join(", ");
        } catch (e) {
          /* Ignore parsing errors */
        }

        // 1. Send confirmation to the user
        sendRegistrationConfirmation(email, emailClassDetails, name);

        // 2. Send notification to all admins
        // Fetch full user details for all registered users to include names in the admin email
        const userDetailsQuery =
          "SELECT name, email FROM users WHERE email IN (?)";
        db.query(
          userDetailsQuery,
          [registeredUsers],
          (userErr, userResults) => {
            if (userErr) {
              console.error(
                "Error fetching user details for admin notification:",
                userErr
              );
              // Don't block the main response, just log the error
              return;
            }

            const adminQuery =
              "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
            db.query(adminQuery, (adminErr, adminResults) => {
              if (adminErr) {
                console.error("Error fetching admin emails:", adminErr);
                return;
              }
              const adminEmails = adminResults.map((admin) => admin.email);
              if (adminEmails.length > 0) {
                sendAdminNotification(
                  adminEmails,
                  emailClassDetails,
                  userResults
                );
              }
            });
          }
        );
      }
    );
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
      return res
        .status(500)
        .json({ message: "Error processing registration data." });
    }

    if (!registeredUsers.includes(email)) {
      return res
        .status(409)
        .json({ message: "You are not registered for this class." });
    }

    const updatedUsers = registeredUsers.filter(
      (userEmail) => userEmail !== email
    );
    const updateSql =
      "UPDATE classes SET registered_users = ? WHERE class_id = ?";
    db.query(
      updateSql,
      [JSON.stringify(updatedUsers), classId],
      (updateErr, updateResult) => {
        if (updateErr) {
          console.error("❌ Database error while updating class:", updateErr);
          return res
            .status(500)
            .json({ message: "Failed to update registration." });
        }
        console.log(
          `✅ User ${email} canceled registration for class ${classId}`
        );
        res
          .status(200)
          .json({ message: "Successfully canceled your registration." });

        // --- Email Notification for Admin ---
        const userQuery = "SELECT name FROM users WHERE email = ?";
        db.query(userQuery, [email], (err, userResults) => {
          if (err || userResults.length === 0) {
            console.error(
              "Error fetching user name for cancellation email:",
              err
            );
            return;
          }
          const cancelingUserName = userResults[0].name;
          const emailClassDetails = JSON.parse(JSON.stringify(course));
          try {
            emailClassDetails.speaker = JSON.parse(
              emailClassDetails.speaker
            ).join(", ");
          } catch (e) {
            /* Ignore parsing errors */
          }

          const adminQuery =
            "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')";
          db.query(adminQuery, (adminErr, adminResults) => {
            if (adminErr) {
              console.error(
                "Error fetching admin emails for cancellation:",
                adminErr
              );
              return;
            }
            const adminEmails = adminResults.map((admin) => admin.email);
            if (adminEmails.length > 0) {
              if (updatedUsers.length > 0) {
                const remainingUsersQuery =
                  "SELECT name, email FROM users WHERE email IN (?)";
                db.query(
                  remainingUsersQuery,
                  [updatedUsers],
                  (remainingErr, remainingUserResults) => {
                    if (remainingErr) {
                      console.error(
                        "Error fetching remaining users for cancellation email:",
                        remainingErr
                      );
                      // Send with what we have, even if names are missing
                      sendAdminCancellationNotification(
                        adminEmails,
                        cancelingUserName,
                        email,
                        emailClassDetails,
                        []
                      );
                      return;
                    }
                    sendAdminCancellationNotification(
                      adminEmails,
                      cancelingUserName,
                      email,
                      emailClassDetails,
                      remainingUserResults
                    );
                  }
                );
              } else {
                sendAdminCancellationNotification(
                  adminEmails,
                  cancelingUserName,
                  email,
                  emailClassDetails,
                  []
                );
              }
            }
          });
        });
      }
    );
  });
});

app.get("/api/classes/registered/closed", (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res
      .status(400)
      .json({ message: "Email query parameter is required." });
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

app.get("/api/statistics/class-demographics", (req, res) => {
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

  if (year && year !== "all") {
    classesSql += " AND YEAR(c.start_date) = ?";
    params.push(year);
  }
  if (month && month !== "all") {
    classesSql += " AND MONTH(c.start_date) = ?";
    params.push(month);
  }

  db.query(classesSql, params, (err, classes) => {
    if (err) {
      console.error("Error fetching classes for statistics:", err);
      return res
        .status(500)
        .json({ error: "Database error while fetching classes." });
    }

    if (classes.length === 0) {
      return res.json([]);
    }

    const allRegisteredEmails = classes.reduce((emails, currentClass) => {
      try {
        const users = JSON.parse(currentClass.registered_users || "[]");
        return emails.concat(users);
      } catch (e) {
        return emails;
      }
    }, []);

    if (allRegisteredEmails.length === 0) {
      const stats = classes.map((c) => ({
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
    const usersSql = "SELECT email, roles FROM users WHERE email IN (?)";
    db.query(usersSql, [uniqueEmails], (userErr, users) => {
      if (userErr) {
        console.error("Error fetching users for statistics:", userErr);
        return res
          .status(500)
          .json({ error: "Database error while fetching users." });
      }

      const userRolesMap = users.reduce((map, user) => {
        try {
          map[user.email] = Array.isArray(user.roles)
            ? user.roles
            : JSON.parse(user.roles || "[]");
        } catch (e) {
          map[user.email] = [];
        }
        return map;
      }, {});

      const statistics = classes.map((currentClass) => {
        const demographics = {};
        try {
          const registeredEmails = JSON.parse(
            currentClass.registered_users || "[]"
          );
          registeredEmails.forEach((email) => {
            const roles = userRolesMap[email] || [];
            // Filter out the 'ผู้ดูแลระบบ' role from statistics
            const nonAdminRoles = roles.filter(
              (role) => role !== "ผู้ดูแลระบบ"
            );
            nonAdminRoles.forEach((role) => {
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

app.get("/api/statistics/evaluation-categories", (req, res) => {
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

  if (year && year !== "all") {
    sql += " AND YEAR(c.start_date) = ?";
    params.push(year);
  }
  if (month && month !== "all") {
    sql += " AND MONTH(c.start_date) = ?";
    params.push(month);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error fetching evaluation category summary:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results[0] || {});
  });
});

app.get("/api/statistics/evaluation-categories/:classId", (req, res) => {
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
      console.error(
        `Error fetching evaluation summary for class ${classId}:`,
        err
      );
      return res.status(500).json({ error: "Database error" });
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
app.get("/api/evaluations/user/:email", (req, res) => {
  const { email } = req.params;
  const sql = "SELECT DISTINCT class_id FROM evaluations WHERE user_email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(`Error fetching evaluations for user ${email}:`, err);
      return res.status(500).json({ error: "Database error" });
    }
    const classIds = results.map((row) => row.class_id);
    res.json(classIds);
  });
});

// Submit a new evaluation
app.post("/api/evaluations", (req, res) => {
  const {
    class_id,
    user_email,
    score_content,
    score_material,
    score_duration,
    score_format,
    score_speaker,
    comment,
  } = req.body;

  // Basic validation
  if (!class_id || !user_email || score_content === undefined) {
    return res.status(400).json({ error: "Missing required evaluation data." });
  }

  const checkSql =
    "SELECT evaluation_id FROM evaluations WHERE class_id = ? AND user_email = ?";
  db.query(checkSql, [class_id, user_email], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({
        error: "Database error while checking for existing evaluation.",
      });
    }
    if (checkResults.length > 0) {
      return res.status(409).json({
        error: "You have already submitted an evaluation for this class.",
      });
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
      comment || null,
    ];

    db.query(insertSql, values, (insertErr, result) => {
      if (insertErr) {
        console.error("Error submitting evaluation:", insertErr);
        return res.status(500).json({ error: "Failed to submit evaluation." });
      }
      res.status(201).json({ message: "Evaluation submitted successfully." });
    });
  });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * Schedules a daily task to send reminders for classes occurring the next day.
 * This cron job runs every day at 12:00 PM (noon).
 */
function scheduleDailyReminders() {
  // Cron pattern for 'at 12:00 on every day-of-week'
  cron.schedule(
    "00 12 * * *",
    () => {
      console.log(
        `[${new Date().toLocaleString(
          "th-TH"
        )}] Scheduled job running: Checking for tomorrow's classes...`
      );

      // Use a timezone-aware way to get tomorrow's date
      const nowInBKK = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
      );
      const tomorrowInBKK = new Date(nowInBKK);
      tomorrowInBKK.setDate(nowInBKK.getDate() + 1);
      const year = tomorrowInBKK.getFullYear();
      const month = (tomorrowInBKK.getMonth() + 1).toString().padStart(2, "0");
      const day = tomorrowInBKK.getDate().toString().padStart(2, "0");
      const tomorrowDateString = `${year}-${month}-${day}`;

      const sql = `
      SELECT * FROM classes 
      WHERE status != 'closed' 
      AND reminder_sent = 0
      AND start_date = ?
    `;

      db.query(sql, [tomorrowDateString], (err, classes) => {
        if (err) {
          console.error("❌ Error fetching classes for daily reminders:", err);
          return;
        }

        if (classes.length === 0) {
          console.log(
            `No classes found for tomorrow (${tomorrowDateString}). No reminders sent.`
          );
          return;
        }

        console.log(
          `Found ${classes.length} class(es) for tomorrow. Sending reminders...`
        );
        for (const cls of classes) {
          const registeredUsers = JSON.parse(cls.registered_users || "[]");
          if (registeredUsers.length > 0) {
            const userQuery =
              "SELECT name, email FROM users WHERE email IN (?)";
            db.query(userQuery, [registeredUsers], (userErr, users) => {
              if (userErr) {
                console.error(
                  `❌ Error fetching users for class ${cls.class_id}:`,
                  userErr
                );
                return; // Continue to the next class
              }

              let classDetails = { ...cls };
              try {
                classDetails.speaker = JSON.parse(classDetails.speaker).join(
                  ", "
                );
              } catch (e) {}

              for (const user of users) {
                sendReminderEmail(user.email, classDetails, user.name);
              }

              // Mark as sent to prevent duplicate emails
              db.query(
                "UPDATE classes SET reminder_sent = 1 WHERE class_id = ?",
                [cls.class_id]
              );
            });
          }
        }
      });
    },
    {
      scheduled: true,
      timezone: "Asia/Bangkok", // Ensure the job runs based on Thai time
    }
  );
}

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Schedule the daily reminder job
  scheduleDailyReminders();
  console.log(
    "✅ Daily reminder job scheduled to run at 12:00 PM (Asia/Bangkok)."
  );
});
