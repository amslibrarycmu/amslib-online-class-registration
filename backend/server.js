const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");

// --- Import Route Files ---
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const classRoutes = require("./routes/classes");
const requestRoutes = require("./routes/requests");
const evaluationRoutes = require("./routes/evaluations");

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
  CLIENT_ID: process.env.ENTRA_CLIENT_ID,
  CLIENT_SECRET: process.env.ENTRA_CLIENT_SECRET,
  TENANT_ID: process.env.ENTRA_TENANT_ID || "common",
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

const dbPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "amslib",
});

const db = dbPool.promise();

db.getConnection()
  .then(connection => {
  console.log("✅ เชื่อมต่อกับ MySQL");
    connection.release();
  })
  .catch(err => {
    console.error("❌ ไม่สามารถเชื่อมต่อกับ MySQL:", err);
  });

// --- Activity Logging ---
function logActivity(
  req,
  userId,
  userName,
  userEmail,
  actionType,
  targetType,
  targetId,
  details
) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const log = {
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    details: details ? JSON.stringify(details) : null,
    ip_address: ip,
  };
  const sql = "INSERT INTO activity_logs SET ?";
  db.query(sql, log).catch(err => {
    if (err) {
      console.error("❌ Failed to log activity:", err);
    }
  });
}

// API สำหรับบันทึก Activity จาก Frontend โดยเฉพาะ
app.post("/api/log-activity", (req, res) => {
  const {
    user_id,
    user_name,
    user_email,
    action_type,
    target_type,
    target_id,
    details,
  } = req.body;

  // ในระบบจริง ควรมีการตรวจสอบสิทธิ์ผู้ใช้ที่นี่ก่อนทำการบันทึก
  // แต่สำหรับตอนนี้ เราจะเชื่อข้อมูลที่ส่งมาจาก Frontend ไปก่อน
  logActivity(
    req,
    user_id,
    user_name,
    user_email,
    action_type,
    target_type,
    target_id,
    details
  );

  res.status(200).json({ message: "Activity logged" });
});

// --- End Activity Logging ---

// --- Middleware for Authorization ---
const adminOnly = (req, res, next) => {
  // In a real-world, production-ready application, this check should be based on
  // a verified JWT (JSON Web Token) or a secure session cookie, not a query parameter.
  // The token would be decoded, and the roles would be extracted from its payload.
  //
  // For the purpose of this project, we'll use a query parameter as a simplified
  // mechanism to demonstrate the middleware concept. This is NOT secure for production.
  const { roles } = req.query;
  const userRoles = roles ? roles.split(',') : [];

  if (userRoles.includes('ผู้ดูแลระบบ')) {
    next(); // User is an admin, proceed to the next function (the API handler).
  } else {
    // If the user is not an admin, block access immediately with a 403 Forbidden error.
    res.status(403).json({ message: "Forbidden: Administrator access required." });
  }
};

// --- Use Routes ---
app.use("/api/auth", authRoutes(db, logActivity));
app.use("/api/users", userRoutes(db, logActivity, adminOnly, upload));
app.use(
  "/api/classes",
  classRoutes(
    db,
    logActivity,
    adminOnly,
    upload,
    sendRegistrationConfirmation,
    sendAdminNotification,
    sendAdminCancellationNotification
  )
);
app.use(
  "/api/requests",
  requestRoutes(db, logActivity, sendNewClassRequestAdminNotification)
);
app.use("/api/evaluations", evaluationRoutes(db, logActivity));
app.use(
  "/api/admin",
  adminRoutes(db, logActivity, adminOnly, sendRequestApprovedNotification, sendRequestRejectedNotification)
);

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
