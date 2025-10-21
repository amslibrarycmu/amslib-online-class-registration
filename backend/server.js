const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const axios = require("axios");

// --- Import Route Files ---
const userRoutes = require("./routes/users");
// const authRoutes = require("./routes/auth"); // This will be added back
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
  sendRequestSubmittedConfirmation,
} = require("./email.js");

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

// --- Middleware for JWT Verification and Authorization ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token." });
    }
    req.user = user; // Attach user payload to the request object

    // Enforce profile completion for all protected routes except the update-profile route itself
    // and the logout route.
    if (!user.profile_completed && req.originalUrl !== '/api/users/update-profile' && req.originalUrl !== '/api/auth/logout') {
      return res.status(403).json({
        message: "Forbidden: Profile not completed.",
        code: "PROFILE_INCOMPLETE",
      });
    }

    next();
  });
};

const adminOnly = (req, res, next) => {
  // This middleware now runs *after* verifyToken, so req.user is available.
  if (req.user && req.user.roles && req.user.roles.includes('ผู้ดูแลระบบ')) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Administrator access required." });
  }
};

// --- Use Routes ---
// The authRoutes for MS Entra ID login needs to be added here
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes(db, logActivity));

// app.use("/api/auth", authRoutes(db, logActivity));
app.use("/api/users", verifyToken, userRoutes(db, logActivity, adminOnly, upload));
app.use(
  "/api/classes",
  verifyToken, // Add protection to all class routes
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
  verifyToken, // Add protection
  requestRoutes(db, logActivity, sendNewClassRequestAdminNotification, sendRequestSubmittedConfirmation)
);
app.use("/api/evaluations", verifyToken, evaluationRoutes(db, logActivity, ));
app.use(
  "/api/admin",
  verifyToken, adminOnly,
  adminRoutes(
    db,
    logActivity,
    adminOnly, // Pass the middleware function itself
    sendRequestApprovedNotification,
    sendRequestRejectedNotification
  )
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * Schedules a daily task to send reminders for classes occurring the next day.
 * This cron job runs every day at 12:00 PM (noon).
 */
function scheduleDailyReminders() {
  cron.schedule("00 12 * * *", async () => {
    console.log(`[${new Date().toLocaleString("th-TH")}] Scheduled job running: Checking for tomorrow's classes...`);

    const nowInBKK = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const tomorrowInBKK = new Date(nowInBKK);
    tomorrowInBKK.setDate(nowInBKK.getDate() + 1);
    const year = tomorrowInBKK.getFullYear();
    const month = (tomorrowInBKK.getMonth() + 1).toString().padStart(2, "0");
    const day = tomorrowInBKK.getDate().toString().padStart(2, "0");
    const tomorrowDateString = `${year}-${month}-${day}`;

    try {
      const classesSql = `
      SELECT * FROM classes 
      WHERE status != 'closed' 
      AND reminder_sent = 0
      AND start_date = ?
    `;
      const [classes] = await db.query(classesSql, [tomorrowDateString]);

      if (classes.length === 0) {
        console.log(`No classes found for tomorrow (${tomorrowDateString}). No reminders sent.`);
        return;
      }

      console.log(`Found ${classes.length} class(es) for tomorrow. Preparing to send reminders...`);

      const allUserEmails = new Set();
      classes.forEach(cls => {
        const users = JSON.parse(cls.registered_users || "[]");
        users.forEach(email => allUserEmails.add(email));
      });

      if (allUserEmails.size === 0) {
        console.log("No registered users in any of tomorrow's classes.");
        return;
      }

      const [allUsers] = await db.query("SELECT name, email FROM users WHERE email IN (?)", [[...allUserEmails]]);
      const userMap = new Map(allUsers.map(user => [user.email, user]));

      const classIdsToUpdate = [];

      for (const cls of classes) {
        const registeredUsers = JSON.parse(cls.registered_users || "[]");
        if (registeredUsers.length > 0) {
          let classDetails = { ...cls };
          try { classDetails.speaker = JSON.parse(classDetails.speaker).join(", "); } catch (e) {}

          for (const email of registeredUsers) {
            const user = userMap.get(email);
            if (user) {
              sendReminderEmail(user.email, classDetails, user.name);
            }
          }
          classIdsToUpdate.push(cls.class_id);
        }
      }

      if (classIdsToUpdate.length > 0) {
        await db.query("UPDATE classes SET reminder_sent = 1 WHERE class_id IN (?)", [classIdsToUpdate]);
        console.log(`✅ Marked ${classIdsToUpdate.length} class(es) as reminder-sent.`);
      }
    } catch (error) {
      console.error("❌ Error in scheduled job for daily reminders:", error);
    }
  }, {
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
