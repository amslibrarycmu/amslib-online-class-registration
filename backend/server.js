const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
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

// ตรวจสอบ Environment Variables ที่สำคัญ
if (!process.env.FRONTEND_URL) {
  console.warn("⚠️ Warning: FRONTEND_URL is not defined in environment variables.");
}

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true
}));
app.use(express.json());

// ---------------------------------------------------------------------
// ✅ 1. Serve Static Files (สำคัญมากสำหรับ Docker Deploy)
// ---------------------------------------------------------------------
// เสิร์ฟไฟล์ที่อัปโหลด (รูปภาพ/เอกสาร)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// เสิร์ฟไฟล์ React Frontend (HTML/CSS/JS) ที่ Docker Build มาวางไว้ที่ public
app.use(express.static(path.join(__dirname, "public")));


// --- Middleware for Security Headers ---
const setSecurityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};
app.use(setSecurityHeaders);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const decodedOriginalName = Buffer.from(
      file.originalname,
      "latin1"
    ).toString("utf8");
    cb(null, Date.now() + "-" + decodedOriginalName);
  },
});

const upload = multer({ storage });

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 20000,
  charset: "utf8mb4",
});

const db = dbPool.promise();

db.getConnection()
  .then((connection) => {
    console.log("✅ เชื่อมต่อกับ MySQL");
    connection.release();
  })
  .catch((err) => {
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
  db.query(sql, log).catch((err) => {
    if (err) {
      console.error("❌ Failed to log activity:", err);
    }
  });
}

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

// --- Middleware for JWT Verification ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token." });
    }
    req.user = user;
    next();
  });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.includes("ผู้ดูแลระบบ")) {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Forbidden: Administrator access required." });
  }
};

// --- API: Microsoft Graph Photo Proxy ---
app.get("/api/user-photo", async (req, res) => {
  const msToken = req.headers["x-ms-token"];

  if (!msToken) {
    return res.status(400).json({ message: "Microsoft Access Token is required" });
  }

  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me/photo/$value",
      {
        headers: { Authorization: `Bearer ${msToken}` },
        responseType: "arraybuffer",
      }
    );

    res.setHeader("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "No photo found" });
    }
    console.error("Error fetching photo from Graph:", error.message);
    res.status(500).json({ message: "Failed to fetch photo" });
  }
});

// --- Use Routes (API) ---
app.use("/api/auth", authRoutes(db, logActivity));

app.use(
  "/api/users",
  verifyToken,
  userRoutes(db, logActivity, adminOnly, upload)
);
app.use(
  "/api/classes",
  verifyToken,
  classRoutes(
    db,
    logActivity,
    adminOnly,
    upload,
    sendRegistrationConfirmation,
    sendAdminNotification,
    sendAdminCancellationNotification,
    sendRequestApprovedNotification
  )
);
app.use(
  "/api/requests",
  verifyToken,
  requestRoutes(
    db,
    logActivity,
    sendNewClassRequestAdminNotification,
    sendRequestSubmittedConfirmation
  )
);
app.use("/api/evaluations", verifyToken, evaluationRoutes(db, logActivity));
app.use(
  "/api/admin",
  verifyToken,
  adminOnly,
  adminRoutes(
    db,
    logActivity,
    adminOnly,
    sendRequestApprovedNotification,
    sendRequestRejectedNotification
  )
);

// ---------------------------------------------------------------------
// ✅ 2. React Router Fallback (สำคัญมากสำหรับ SPA)
// ---------------------------------------------------------------------
// ต้องวางไว้หลัง API Routes ทั้งหมด แต่ก่อน Error Handling
// เพื่อให้ URL ที่ไม่ใช่ API ถูกส่งไปให้ React จัดการ (เช่น /login, /admin-panel)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error("❌ An unhandled error occurred:", err);
  const statusCode = err.statusCode || 500;
  const response = {
    message: "เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์",
  };
  if (process.env.NODE_ENV !== "production") {
    response.error = err.message;
    response.stack = err.stack;
  }
  res.status(statusCode).json(response);
});

// --- Cron Jobs ---
function scheduleDailyReminders() {
  cron.schedule(
    "00 12 * * *",
    async () => {
      console.log(
        `[${new Date().toLocaleString(
          "th-TH"
        )}] Scheduled job running: Checking for tomorrow's classes...`
      );

      const nowInBKK = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
      );
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
          console.log(
            `No classes found for tomorrow (${tomorrowDateString}). No reminders sent.`
          );
          return;
        }

        console.log(
          `Found ${classes.length} class(es) for tomorrow. Preparing to send reminders...`
        );

        const allUserEmails = new Set();
        classes.forEach((cls) => {
          const users = JSON.parse(cls.registered_users || "[]");
          users.forEach((email) => allUserEmails.add(email));
        });

        if (allUserEmails.size === 0) {
          console.log("No registered users in any of tomorrow's classes.");
          return;
        }

        const [allUsers] = await db.query(
          "SELECT name, email FROM users WHERE email IN (?)",
          [[...allUserEmails]]
        );
        const userMap = new Map(allUsers.map((user) => [user.email, user]));

        const classIdsToUpdate = [];

        for (const cls of classes) {
          const registeredUsers = JSON.parse(cls.registered_users || "[]");
          if (registeredUsers.length > 0) {
            let classDetails = { ...cls };
            try {
              classDetails.speaker = JSON.parse(classDetails.speaker).join(
                ", "
              );
            } catch (e) {}

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
          await db.query(
            "UPDATE classes SET reminder_sent = 1 WHERE class_id IN (?)",
            [classIdsToUpdate]
          );
          console.log(
            `✅ Marked ${classIdsToUpdate.length} class(es) as reminder-sent.`
          );
        }
      } catch (error) {
        console.error("❌ Error in scheduled job for daily reminders:", error);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Bangkok",
    }
  );
}

const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  scheduleDailyReminders();
  console.log(
    "✅ Daily reminder job scheduled to run at 12:00 PM (Asia/Bangkok)."
  );
});