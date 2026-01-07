const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// นำเข้า Middleware
const { requireAdminLevel } = require("../middleware/auth");

function serveProtectedFile(req, res, next) {
  const { filename } = req.params;
  if (filename.includes("..")) {
    return res.status(400).send("Invalid filename.");
  }
  const filePath = path.join(__dirname, "..", "uploads", filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found.");
  }
}

module.exports = (db, logActivity, adminOnly, upload) => {
  
  // --- 🟢 ZONE 1: Specific Routes (วางไว้บนสุด ห้ามย้ายลงล่าง!) 🟢 ---

  // GET /api/users/me - ดึงข้อมูลตัวเอง
  router.get("/me", async (req, res) => {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { email } = req.user;
    const sql = `
      SELECT u.id, u.name, u.email, u.roles, u.is_active, u.photo, u.phone, u.pdpa, u.profile_completed, u.created_at, u.updated_at, ap.admin_level
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      WHERE u.email = ?
    `;
    try {
      const [results] = await db.query(sql, [email]);
      if (results.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(results[0]);
    } catch (err) {
      console.error(`Error fetching me:`, err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // GET /api/users/admins - ดึงรายชื่อแอดมินทั้งหมด
  router.get("/admins", requireAdminLevel(3), async (req, res) => {
    const sql = `
      SELECT u.id as user_id, u.name, u.email, u.photo, ap.admin_level
      FROM users u
      JOIN admin_permissions ap ON u.id = ap.user_id
      ORDER BY ap.admin_level DESC, u.name ASC
    `;
    try {
      const [results] = await db.query(sql);
      res.json(results);
    } catch (err) {
      console.error("Error fetching admins:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // 🟢 GET /api/users/search - ค้นหาผู้ใช้ทั้งหมด พร้อมระบุสถานะแอดมิน
  router.get("/search", requireAdminLevel(3), async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim() === "") return res.json([]);
    
    const searchTerm = `${q.trim()}%`;

    const sql = `
      SELECT u.id, u.name, u.email, u.photo, (ap.id IS NOT NULL) AS is_admin
      FROM users u
      LEFT JOIN admin_permissions ap ON u.id = ap.user_id
      WHERE (u.name LIKE ? OR u.email LIKE ?)
      LIMIT 10
    `;

    try {
      const [results] = await db.query(sql, [searchTerm, searchTerm]);
      // แปลง is_admin จาก 0/1 เป็น boolean
      res.json(results.map(r => ({...r, is_admin: !!r.is_admin})));
    } catch (err) {
      console.error("Error searching users:", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // POST /api/users/admins/appoint - แต่งตั้งแอดมิน
  router.post("/admins/appoint", requireAdminLevel(3), async (req, res) => {
    const { user_id, admin_level } = req.body;
    if (!user_id || !admin_level) return res.status(400).json({ message: "Missing data" });

    try {
      // เพิ่ม role 'ผู้ดูแลระบบ' ในตาราง users
      await db.query(`
        UPDATE users 
        SET roles = JSON_ARRAY_APPEND(COALESCE(roles, '[]'), '$', 'ผู้ดูแลระบบ')
        WHERE id = ? AND NOT JSON_CONTAINS(COALESCE(roles, '[]'), '"ผู้ดูแลระบบ"', '$');
      `, [user_id]);

      // เพิ่มในตาราง admin_permissions
      const sql = "INSERT INTO admin_permissions (user_id, admin_level) VALUES (?, ?) ON DUPLICATE KEY UPDATE admin_level = VALUES(admin_level)";
      await db.query(sql, [user_id, admin_level]);

      logActivity(req, req.user.id, req.user.name, req.user.email, "APPOINT_ADMIN", "USER", user_id, { new_level: admin_level });
      res.status(201).json({ message: "Appointed successfully" });
    } catch (err) {
      console.error("Error appointing:", err);
      res.status(500).json({ message: "Database error" });
    }
  });

  // PUT /api/users/admins/:userId/level - เปลี่ยนระดับ
  router.put("/admins/:userId/level", requireAdminLevel(3), async (req, res) => {
    const { userId } = req.params;
    const { admin_level } = req.body;
    try {
      const [result] = await db.query("UPDATE admin_permissions SET admin_level = ? WHERE user_id = ?", [admin_level, userId]);
      if (result.affectedRows === 0) return res.status(404).json({ message: "Admin not found" });
      
      logActivity(req, req.user.id, req.user.name, req.user.email, "CHANGE_ADMIN_LEVEL", "USER", userId, { new_level: admin_level });
      res.json({ message: "Level updated" });
    } catch (err) {
      res.status(500).json({ message: "Database error" });
    }
  });

  // DELETE /api/users/admins/:userId - ถอนสิทธิ์
  router.delete("/admins/:userId", requireAdminLevel(3), async (req, res) => {
    const { userId } = req.params;
    if (parseInt(userId) === req.user.id) return res.status(400).json({ message: "Cannot remove yourself" });

    try {
      const [result] = await db.query("DELETE FROM admin_permissions WHERE user_id = ?", [userId]);
      if (result.affectedRows === 0) return res.status(404).json({ message: "Admin not found" });

      await db.query(`
        UPDATE users
        SET roles = JSON_REMOVE(roles, JSON_UNQUOTE(JSON_SEARCH(roles, 'one', 'ผู้ดูแลระบบ')))
        WHERE id = ? AND JSON_CONTAINS(roles, '"ผู้ดูแลระบบ"', '$');
      `, [userId]);

      logActivity(req, req.user.id, req.user.name, req.user.email, "REVOKE_ADMIN", "USER", userId, {});
      res.json({ message: "Admin removed" });
    } catch (err) {
      res.status(500).json({ message: "Database error" });
    }
  });

  // GET Photo
  router.get("/photo/:filename", serveProtectedFile);

  // --- 🟢 ZONE 2: General Routes 🟢 ---

  // GET /api/users (All)
  router.get("/", requireAdminLevel(3), async (req, res) => {
    const { search = "" } = req.query;
    let sql = "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
    const params = [];

    if (search) {
      // 🟢 แก้ไข: ใช้ LIKE สำหรับการค้นหาทั้งชื่อและอีเมล
      sql += " WHERE name LIKE ? OR email LIKE ?";
      params.push(`${search}%`, `${search}%`);
    }
    sql += " ORDER BY name ASC";
    try {
      const [results] = await db.query(sql, params);
      res.json(results);
    } catch (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // ⚠️ Route นี้ต้องอยู่ล่างสุดในกลุ่ม GET เพราะมันดักทุกอย่างที่เป็น /:id
  router.get("/:id", adminOnly, async (req, res) => {
    const { id } = req.params;
    const sql = "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users WHERE id = ?";
    try {
      const [results] = await db.query(sql, [id]);
      if (results.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(results[0]);
    } catch (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // --- ZONE 3: Update/Delete Routes ---

  router.put("/:id/roles", requireAdminLevel(3), async (req, res) => {
      const { id } = req.params; const { roles } = req.body;
      if (!Array.isArray(roles)) return res.status(400).json({ error: "Roles must be array" });
      try {
          await db.query("UPDATE users SET roles = ? WHERE id = ?", [JSON.stringify(roles), id]);
          const [users] = await db.query(`SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.id = ?`, [id]);
          res.json(users[0]);
      } catch(e) { res.status(500).json({error: "DB Error"}); }
  });

  router.put("/:id/status", requireAdminLevel(3), async (req, res) => {
      const { id } = req.params; const { is_active } = req.body;
      try {
          if (is_active === false) {
             const [chk] = await db.query("SELECT COUNT(*) as c FROM admin_permissions ap JOIN users u ON ap.user_id = u.id WHERE u.is_active=1");
             const [usr] = await db.query("SELECT user_id FROM admin_permissions WHERE user_id=?", [id]);
             if(usr.length > 0 && chk[0].c <= 1) return res.status(400).json({error: "Cannot disable last admin"});
          }
          await db.query("UPDATE users SET is_active = ? WHERE id = ?", [is_active, id]);
          res.json({message: "Status updated"});
      } catch(e) { res.status(500).json({error: "DB Error"}); }
  });

  router.put("/update-profile", async (req, res) => {
      const { id, email } = req.user; const { name, roles, phone, pdpa, original_name, name_updated_by_user } = req.body;
      try {
          await db.query("UPDATE users SET name=?, roles=?, phone=?, pdpa=?, original_name=?, name_updated_by_user=?, profile_completed=1 WHERE id=?", 
              [name, JSON.stringify(Array.isArray(roles)?roles:[roles]), phone, pdpa?1:0, original_name, name_updated_by_user?1:0, id]);
          const [u] = await db.query(`SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?`, [email]);
          const jwt = require("jsonwebtoken");
          const t = jwt.sign({ ...u[0], photo: u[0].photo, admin_level: u[0].admin_level||null }, process.env.JWT_SECRET, { expiresIn: "1d" });
          res.json({ user: u[0], token: t });
      } catch(e) { res.status(500).json({error: "DB Error"}); }
  });

  router.put("/profile-picture", upload.single("photo"), async (req, res) => {
      const { email } = req.body; const photo = req.file ? req.file.filename : null;
      if (!email || !photo) return res.status(400).json({ message: "Email and photo required." });
      try {
          await db.query("UPDATE users SET photo = ?, profile_completed = 1 WHERE email = ?", [photo, email]);
          const [u] = await db.query(`SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?`, [email]);
          const jwt = require("jsonwebtoken");
          const t = jwt.sign({ ...u[0], photo, admin_level: u[0].admin_level||null }, process.env.JWT_SECRET, { expiresIn: "1d" });
          res.json({ user: u[0], token: t });
      } catch(e) { res.status(500).json({ message: "DB Error" }); }
  });

  router.delete("/profile-picture", async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).json({ message: "Email required" });
      try {
          const [rows] = await db.query("SELECT photo FROM users WHERE email=?", [email]);
          if(rows[0]?.photo) fs.unlink(path.join(__dirname, "..", "uploads", rows[0].photo), ()=>{});
          await db.query("UPDATE users SET photo=NULL WHERE email=?", [email]);
          const [u] = await db.query(`SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?`, [email]);
          const jwt = require("jsonwebtoken");
          const t = jwt.sign({ ...u[0], photo: null, admin_level: u[0].admin_level||null }, process.env.JWT_SECRET, { expiresIn: "1d" });
          res.json({ user: u[0], token: t });
      } catch(e) { res.status(500).json({ message: "DB Error" }); }
  });

  router.delete("/:id", requireAdminLevel(3), async (req, res) => {
      const { id } = req.params;
      try {
          const [chk] = await db.query("SELECT COUNT(*) as c FROM admin_permissions");
          const [usr] = await db.query("SELECT user_id FROM admin_permissions WHERE user_id=?", [id]);
          if(usr.length > 0 && chk[0].c <= 1) return res.status(400).json({message: "Cannot delete last admin"});
          
          const [u] = await db.query("SELECT photo FROM users WHERE id=?", [id]);
          if(u[0]?.photo) fs.unlink(path.join(__dirname, "..", "uploads", u[0].photo), ()=>{});
          
          await db.query("DELETE FROM users WHERE id=?", [id]);
          res.json({ message: "User deleted" });
      } catch(e) { res.status(500).json({ error: "DB Error" }); }
  });

  return router;
};