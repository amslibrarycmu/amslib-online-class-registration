const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config(); // Load environment variables from .env file
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const axios = require("axios");
const userRoutes = require("./backend/routes/users.js");
const authRoutes = require("./backend/routes/auth.js");
const adminRoutes = require("./backend/routes/admin.js");
const classRoutes = require("./backend/routes/classes.js");
const requestRoutes = require("./backend/routes/requests.js");
const evaluationRoutes = require("./backend/routes/evaluations.js");
const userRoutes = require("./routes/users.js");
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const classRoutes = require("./routes/classes.js");
const requestRoutes = require("./routes/requests.js");
const evaluationRoutes = require("./routes/evaluations.js");

const {
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendAdminCancellationNotification,
  sendNewClassRequestAdminNotification,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification,
  sendReminderEmail,
  sendRequestSubmittedConfirmation,
} = require("./backend/email.js");
} = require("./email.js");

const uploadsDir = path.join(__dirname, "uploads");
const materialsDir = path.join(__dirname, "uploads/materials");
const uploadsDir = path.join(__dirname, "..", "uploads"); // Adjust path to project root's uploads folder
const materialsDir = path.join(__dirname, "..", "uploads/materials"); // Adjust path

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir);
}

const app = express();
app.set("trust proxy", 1);

if (!process.env.FRONTEND_URL) {
  console.warn("⚠️ Warning: FRONTEND_URL is not defined in environment variables.");
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    origin: process.env.FRONTEND_URL, // Should be specific in production, remove "|| *"
    credentials: true,
  }),
);
app.use(express.json());

app.use("/library/amslibclass/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/library/amslibclass", express.static(path.join(__dirname, "dist")));
app.use("/library/amslibclass/uploads", express.static(path.join(__dirname, "..", "uploads"))); // Adjust path
app.use("/library/amslibclass", express.static(path.join(__dirname, "..", "frontend", "dist"))); // Adjust path to frontend's dist folder

const setSecurityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
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
    const decodedOriginalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, Date.now() + "-" + decodedOriginalName);
  },
});

const upload = multer({ storage });

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || "10.110.6.20",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 20000,
  charset: "utf8mb4",
});

const db = dbPool.promise();

db.getConnection()
  .then((connection) => {
    console.log("✅ เชื่อมต่อกับ MySQL (10.110.6.20)");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ ไม่สามารถเชื่อมต่อกับ MySQL:", err);
  });

function logActivity(req, userId, userName, userEmail, actionType, targetType, targetId, details) {
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
    if (err) console.error("❌ Failed to log activity:", err);
  });
}

app.post("/api/log-activity", (req, res) => {
  const { user_id, user_name, user_email, action_type, target_type, target_id, details } = req.body;
  logActivity(req, user_id, user_name, user_email, action_type, target_type, target_id, details);
  res.status(200).json({ message: "Activity logged" });
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized: No token provided." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden: Invalid token." });
    req.user = user;
    next();
  });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.includes("ผู้ดูแลระบบ")) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Administrator access required." });
  }
};

app.get("/api/user-photo", async (req, res) => {
  const msToken = req.headers["x-ms-token"];
  if (!msToken) return res.status(400).json({ message: "Microsoft Access Token is required" });

  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: `Bearer ${msToken}` },
      responseType: "arraybuffer",
    });
    res.setHeader("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) return res.status(404).json({ message: "No photo found" });
    res.status(500).json({ message: "Failed to fetch photo" });
  }
});

app.use("/api/auth", authRoutes(db, logActivity));
app.use("/api/users", verifyToken, userRoutes(db, logActivity, adminOnly, upload));
app.use("/api/classes", verifyToken, classRoutes(db, logActivity, adminOnly, upload, sendRegistrationConfirmation, sendAdminNotification, sendAdminCancellationNotification, sendRequestApprovedNotification));
app.use("/api/requests", verifyToken, requestRoutes(db, logActivity, sendNewClassRequestAdminNotification, sendRequestSubmittedConfirmation));
app.use("/api/evaluations", verifyToken, evaluationRoutes(db, logActivity));
app.use("/api/admin", verifyToken, adminOnly, adminRoutes(db, logActivity, adminOnly, sendRequestApprovedNotification, sendRequestRejectedNotification));

app.get("/library/amslibclass/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.get("/library/amslibclass", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use((err, req, res, next) => {
  console.error("❌ An unhandled error occurred:", err);
  const statusCode = err.statusCode || 500;
  const response = { message: "เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์" };
  if (process.env.NODE_ENV !== "production") {
    response.error = err.message;
    response.stack = err.stack;
  }
  res.status(statusCode).json(response);
});

function scheduleDailyReminders() {
  cron.schedule("00 12 * * *", async () => {
  }, { scheduled: true, timezone: "Asia/Bangkok" });
}

const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  scheduleDailyReminders();
});