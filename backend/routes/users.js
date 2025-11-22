const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

function serveProtectedFile(req, res, next) {
  const { filename } = req.params;
  // Basic security: prevent path traversal
  if (filename.includes("..")) {
    return res.status(400).send("Invalid filename.");
  }

  // 🔴 แก้ไขตรงนี้ครับ: ลด .. เหลือตัวเดียว เพื่อให้อยู่ใน backend/uploads
  // จากเดิม: path.join(__dirname, "..", "..", "uploads", filename);
  
  // ✅ เปลี่ยนเป็น:
  const filePath = path.join(__dirname, "..", "uploads", filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error(`File not found at: ${filePath}`); // เพิ่ม log ช่วยดู
    res.status(404).send("File not found.");
  }
}

module.exports = (db, logActivity, adminOnly, upload) => {
  // GET /api/users - ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
  router.get("/", adminOnly, async (req, res) => {
    const sql =
      "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
    try {
      const [results] = await db.query(sql);
      // No need to parse roles, mysql2 driver handles it.
      const users = results;
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // GET /api/users/me - ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่
  router.get("/me", async (req, res) => {
    // req.user is populated by the JWT authentication middleware
    if (!req.user || !req.user.email) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user session found" });
    }

    const { email } = req.user;
    const sql =
      "SELECT id, name, email, roles, is_active, photo, phone, pdpa, profile_completed, created_at, updated_at FROM users WHERE email = ?";
    try {
      const [results] = await db.query(sql, [email]);
      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      // No need to parse roles
      const user = results[0];
      res.json(user);
    } catch (err) {
      console.error(`Error fetching current user with email ${email}:`, err);
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
      // No need to parse roles
      const user = results[0];
      res.json(user);
    } catch (err) {
      console.error(`Error fetching user with id ${id}:`, err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // GET /api/users/photo/:filename - ดึงไฟล์รูปภาพ (สำหรับผู้ใช้ที่ล็อกอินแล้ว)
  router.get("/photo/:filename", serveProtectedFile);

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
        logActivity(
          req,
          req.user.id,
          req.user.name,
          req.user.email,
          "UPDATE_ROLE",
          "USER",
          id,
          {
            target_user: `${targetUser.name} (${targetUser.email})`,
            new_roles: roles,
          }
        );
      }

      const [users] = await db.query(
        "SELECT id, name, email, roles, is_active, photo FROM users WHERE id = ?",
        [id]
      );
      // No need to parse roles
      const updatedUser = users[0];
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
        logActivity(
          req,
          req.user.id,
          req.user.name,
          req.user.email,
          "UPDATE_STATUS",
          "USER",
          id,
          {
            target_user: `${targetUser.name} (${targetUser.email})`,
            new_status: is_active ? "active" : "inactive",
          }
        );
      }

      res.status(200).json({ message: "User status updated successfully" });
    } catch (err) {
      console.error("Error updating user status:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // PUT /api/users/update-profile - อัปเดตโปรไฟล์ส่วนตัว
  router.put("/update-profile", async (req, res) => {
    const { id: userId, email } = req.user; // Use user ID and email from verified JWT
    const { name, roles, phone, pdpa, original_name, name_updated_by_user } =
      req.body;

    // Ensure roles is always stored as a JSON array string.
    // This handles cases where the frontend might send a single string instead of an array.
    const rolesToSave = Array.isArray(roles) ? roles : (roles ? [roles] : []);

    console.log("--- DEBUG: UPDATE PROFILE ---");
    console.log("Received roles:", roles);
    console.log("Type of roles:", typeof roles);
    console.log("Value to be saved for roles:", JSON.stringify(rolesToSave));
    console.log("--- END DEBUG ---");

    const sql =
      "UPDATE users SET name = ?, roles = ?, phone = ?, pdpa = ?, original_name = ?, name_updated_by_user = ?, profile_completed = 1 WHERE id = ?";
    const values = [
      name,
      JSON.stringify(rolesToSave),
      phone,
      pdpa ? 1 : 0,
      original_name,
      name_updated_by_user ? 1 : 0,
      userId, // Use ID from JWT for WHERE clause
    ];

    try {
      const [result] = await db.query(sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      logActivity(
        req,
        req.user.id,
        name,
        email,
        "UPDATE_PROFILE",
        "USER",
        req.user.id,
        {
          updated_fields: {
            name,
            roles,
            phone,
            pdpa,
            original_name,
            name_updated_by_user,
          },
        }
      );

      // Fetch the updated user data from the database to send back
      const [updatedUsers] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      if (updatedUsers.length === 0) {
        throw new Error("Could not find updated user to return.");
      }
      const updatedUser = updatedUsers[0];

      // Issue a new token with the updated profile_completed status
      const jwt = require("jsonwebtoken");
      const newPayload = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles || [], // roles is already an array
        profile_completed: true, // Explicitly set to true
      };
      const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({ user: updatedUser, token: newToken });
    } catch (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // PUT /api/users/profile-picture - อัปเดตรูปโปรไฟล์
  router.put("/profile-picture", upload.single("photo"), async (req, res) => {
    const jwt = require("jsonwebtoken");
    const { email } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!email || !photo) {
      return res.status(400).json({ message: "Email and photo are required." });
    }

    // Also update profile_completed status to true when a photo is uploaded.
    const sql = "UPDATE users SET photo = ?, profile_completed = 1 WHERE email = ?";
    try {
      const [result] = await db.query(sql, [photo, email]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      logActivity(req, null, "User", email, "UPDATE_PHOTO", "USER", email, {
        new_photo: photo,
      });

      const [users] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      const updatedUser = users[0];

      // Issue a new token with the updated profile_completed status
      const newPayload = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles || [],
        profile_completed: true, // Explicitly set to true
      };
      const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({ user: updatedUser, token: newToken });
    } catch (err) {
      console.error("Error updating profile picture:", err);
      return res.status(500).json({ message: "Database error." });
    }
  });

  // DELETE /api/users/profile-picture - ลบรูปโปรไฟล์
  router.delete("/profile-picture", async (req, res) => {
    const jwt = require("jsonwebtoken");
    const { email } = req.query; // Changed from req.body to req.query
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    try {
      const [findResults] = await db.query(
        "SELECT photo FROM users WHERE email = ?",
        [email]
      );
      const oldPhoto = findResults[0]?.photo;

      await db.query("UPDATE users SET photo = NULL WHERE email = ?", [email]);

      logActivity(req, null, "User", email, "DELETE_PHOTO", "USER", email, {
        old_photo: oldPhoto,
      });

      if (oldPhoto) {
        const filePath = path.join(__dirname, "..", "uploads", oldPhoto);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting old photo file:", unlinkErr);
          else console.log(`✅ Deleted old photo file: ${oldPhoto}`);
        });
      }

      const [users] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      const updatedUser = users[0];

      // Issue a new token with the updated user data (photo is now null)
      const newPayload = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        roles: updatedUser.roles || [],
        profile_completed: updatedUser.profile_completed, // Use the current value from DB
      };
      const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(200).json({ user: updatedUser, token: newToken });
    } catch (err) {
      console.error("Error deleting profile picture:", err);
      return res.status(500).json({ message: "Database error." });
    }
  });

  // DELETE /api/users/:id - ลบผู้ใช้ (สำหรับ Admin)
  router.delete("/:id", adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
      const [users] = await db.query(
        "SELECT id, name, email, roles, photo FROM users WHERE id = ?",
        [id]
      );
      if (users.length === 0)
        return res.status(404).json({ error: "User not found" });

      const userToDelete = users[0];
      const userRoles = JSON.parse(userToDelete.roles || "[]");

      if (userRoles.includes("ผู้ดูแลระบบ")) {
        const [countResults] = await db.query(
          "SELECT COUNT(*) as adminCount FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')"
        );
        if (countResults[0].adminCount <= 1) {
          return res
            .status(400)
            .json({ error: "Cannot delete the last admin" });
        }
      }

      await db.query("DELETE FROM users WHERE id = ?", [id]);
      logActivity(
        req,
        req.user.id,
        req.user.name,
        req.user.email,
        "DELETE_USER",
        "USER",
        id,
        {
          deleted_user_details: {
            id: userToDelete.id,
            name: userToDelete.name,
            email: userToDelete.email,
          },
        }
      );

      if (userToDelete.photo) {
        const filePath = path.join(
          __dirname,
          "..",
          "uploads",
          userToDelete.photo
        );
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting photo file:", unlinkErr);
        });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};
