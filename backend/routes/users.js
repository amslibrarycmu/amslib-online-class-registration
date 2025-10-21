const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

module.exports = (db, logActivity, adminOnly, upload) => {
  // GET /api/users - ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
  router.get("/", adminOnly, async (req, res) => {
    const sql =
      "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
    try {
      const [results] = await db.query(sql);
      const users = results.map((user) => ({
        ...user,
        roles: JSON.parse(user.roles || "[]"),
      }));
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // GET /api/users/:id - ดึงข้อมูลผู้ใช้คนเดียว (สำหรับ Admin)
  router.get("/:id", adminOnly, async (req, res) => {
    const { id } = req.params;
    const sql =
      "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users WHERE id = ?";
    try {
      const [results] = await db.query(sql, [id]);
      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = {
        ...results[0],
        roles: JSON.parse(results[0].roles || "[]"),
      };
      res.json(user);
    } catch (err) {
      console.error(`Error fetching user with id ${id}:`, err);
      return res.status(500).json({ error: "Database error" });
    }
  });
  // PUT /api/users/:id/roles - อัปเดตสิทธิ์ผู้ใช้ (สำหรับ Admin)
  router.put("/:id/roles", adminOnly, async (req, res) => {
    const { id } = req.params;
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: "Roles must be an array" });
    }

    const sql = "UPDATE users SET roles = ? WHERE id = ?";
    try {
      const [result] = await db.query(sql, [JSON.stringify(roles), id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const [targetUsers] = await db.query(
        "SELECT name, email FROM users WHERE id = ?",
        [id]
      );
      if (targetUsers.length > 0) {
        const targetUser = targetUsers[0];
        logActivity(req, req.user.id, req.user.name, req.user.email, "UPDATE_ROLE", "USER", id, {
          target_user: `${targetUser.name} (${targetUser.email})`,
          new_roles: roles,
        });
      }

      const [users] = await db.query(
        "SELECT id, name, email, roles, is_active, photo FROM users WHERE id = ?",
        [id]
      );
      const updatedUser = {
        ...users[0],
        roles: JSON.parse(users[0].roles || "[]"),
      };
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating user roles:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // PUT /api/users/:id/status - อัปเดตสถานะผู้ใช้ (สำหรับ Admin)
  router.put("/:id/status", adminOnly, async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active must be a boolean" });
    }

    try {
      if (is_active === false) {
        const [usersToDeactivate] = await db.query(
          "SELECT roles FROM users WHERE id = ?",
          [id]
        );
        if (usersToDeactivate.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }
        const userRoles = JSON.parse(usersToDeactivate[0].roles || "[]");
        if (userRoles.includes("ผู้ดูแลระบบ")) {
          const [countResults] = await db.query(
            "SELECT COUNT(*) as activeAdminCount FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"') AND is_active = 1"
          );
          if (countResults[0].activeAdminCount <= 1) {
            return res
              .status(400)
              .json({ error: "Cannot deactivate the last active admin" });
          }
        }
      }

      const sql = "UPDATE users SET is_active = ? WHERE id = ?";
      const [result] = await db.query(sql, [is_active, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const [targetUsers] = await db.query(
        "SELECT name, email FROM users WHERE id = ?",
        [id]
      );
      if (targetUsers.length > 0) {
        const targetUser = targetUsers[0];
        logActivity(req, req.user.id, req.user.name, req.user.email, "UPDATE_STATUS", "USER", id, {
          target_user: `${targetUser.name} (${targetUser.email})`,
          new_status: is_active ? "active" : "inactive",
        });
      }

      res.status(200).json({ message: "User status updated successfully" });
    } catch (err) {
      console.error("Error updating user status:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // PUT /api/users/update-profile - อัปเดตโปรไฟล์ส่วนตัว
  router.put("/update-profile", async (req, res) => {
    const { name, email, roles, phone, pdpa, original_name, name_updated_by_user } = req.body;
    const sql =
      "UPDATE users SET name = ?, roles = ?, phone = ?, pdpa = ?, original_name = ?, name_updated_by_user = ?, profile_completed = 1 WHERE email = ?";
    const values = [
      name,
      JSON.stringify(roles),
      phone,
      pdpa ? 1 : 0,
      original_name,
      name_updated_by_user ? 1 : 0,
      email,
    ];

    try {
      const [result] = await db.query(sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      logActivity(req, req.user.id, name, email, "UPDATE_PROFILE", "USER", req.user.id, {
        updated_fields: { name, roles, phone, pdpa, original_name, name_updated_by_user },
      });

      const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      const updatedUser = {
        ...users[0],
        roles: JSON.parse(users[0].roles || "[]"),
      };
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // PUT /api/users/profile-picture - อัปเดตรูปโปรไฟล์
  router.put("/profile-picture", upload.single("photo"), async (req, res) => {
    const { email } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!email || !photo) {
      return res.status(400).json({ message: "Email and photo are required." });
    }

    const sql = "UPDATE users SET photo = ? WHERE email = ?";
    try {
      const [result] = await db.query(sql, [photo, email]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      logActivity(req, null, "User", email, "UPDATE_PHOTO", "USER", email, {
        new_photo: photo,
      });

      const [users] = await db.query(
        "SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?",
        [email]
      );
      const updatedUser = {
        ...users[0],
        roles: JSON.parse(users[0].roles || "[]"),
      };
      res.status(200).json(updatedUser);
    } catch (err) {
      console.error("Error updating profile picture:", err);
      return res.status(500).json({ message: "Database error." });
    }
  });

  // DELETE /api/users/profile-picture - ลบรูปโปรไฟล์
  router.delete("/profile-picture", async (req, res) => {
    const { email } = req.query; // Changed from req.body to req.query
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    try {
      const [findResults] = await db.query("SELECT photo FROM users WHERE email = ?", [email]);
      const oldPhoto = findResults[0]?.photo;

      await db.query("UPDATE users SET photo = NULL WHERE email = ?", [email]);

      logActivity(req, null, "User", email, "DELETE_PHOTO", "USER", email, { old_photo: oldPhoto });

      if (oldPhoto) {
        const filePath = path.join(__dirname, "..", "uploads", oldPhoto);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting old photo file:", unlinkErr);
          else console.log(`✅ Deleted old photo file: ${oldPhoto}`);
        });
      }

      const [users] = await db.query("SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ?", [email]);
      const updatedUser = { ...users[0], roles: JSON.parse(users[0].roles || "[]") };
      res.status(200).json(updatedUser);
    } catch (err) {
      console.error("Error deleting profile picture:", err);
      return res.status(500).json({ message: "Database error." });
    }
  });

  // DELETE /api/users/:id - ลบผู้ใช้ (สำหรับ Admin)
  router.delete("/:id", adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
      const [users] = await db.query("SELECT id, name, email, roles, photo FROM users WHERE id = ?", [id]);
      if (users.length === 0) return res.status(404).json({ error: "User not found" });

      const userToDelete = users[0];
      const userRoles = JSON.parse(userToDelete.roles || "[]");

      if (userRoles.includes("ผู้ดูแลระบบ")) {
        const [countResults] = await db.query("SELECT COUNT(*) as adminCount FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
        if (countResults[0].adminCount <= 1) {
          return res.status(400).json({ error: "Cannot delete the last admin" });
        }
      }

      await db.query("DELETE FROM users WHERE id = ?", [id]);
      logActivity(req, req.user.id, req.user.name, req.user.email, "DELETE_USER", "USER", id, { deleted_user_details: { id: userToDelete.id, name: userToDelete.name, email: userToDelete.email } });

      if (userToDelete.photo) {
        const filePath = path.join(__dirname, "..", "uploads", userToDelete.photo);
        fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error("Error deleting photo file:", unlinkErr); });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};