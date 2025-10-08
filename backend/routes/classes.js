const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const materialsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/materials");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadMaterials = multer({ storage: materialsStorage });

module.exports = (
  db,
  logActivity,
  adminOnly,
  upload,
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendAdminCancellationNotification
) => {
  router.get("/", async (req, res) => {
    const { email, roles } = req.user; // Get user info from JWT payload
    let sql;
    let params = [];

    if (roles && roles.includes("ผู้ดูแลระบบ")) {
      sql = "SELECT * FROM classes ORDER BY created_at DESC";
    } else {
      sql = "SELECT * FROM classes WHERE created_by_email = ?";
      params.push(email);
    }

    try {
      const [results] = await db.query(sql, params);
      res.json(results);
    } catch (err) {
      console.error("Error fetching classes:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/promoted", async (req, res) => {
    const sql = "SELECT * FROM classes WHERE promoted = 1 AND status != 'closed' ORDER BY start_date ASC";
    try {
      const [results] = await db.query(sql);
      res.json(results);
    } catch (err) {
      console.error("Error fetching promoted classes:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/:classId/registrants", adminOnly, async (req, res) => {
    const { classId } = req.params;
    const findClassSql = "SELECT registered_users FROM classes WHERE class_id = ?";

    try {
      const [results] = await db.query(findClassSql, [classId]);
      if (results.length === 0) {
        return res.status(404).json({ message: "Class not found." });
      }

      const registeredEmails = JSON.parse(results[0].registered_users || "[]");
      if (registeredEmails.length === 0) {
        return res.json([]);
      }

      const getUsersSql = "SELECT name, email, phone, roles FROM users WHERE email IN (?)";
      const [userResults] = await db.query(getUsersSql, [registeredEmails]);
      res.json(userResults);
    } catch (err) {
      console.error("Error fetching registrants:", err);
      return res.status(500).json({ message: "Database server error." });
    }
  });

  router.post("/", upload.array("files"), async (req, res) => {
    const {
      title, speaker, start_date, end_date, start_time, end_time,
      description, format, join_link, location, max_participants,
      target_groups,
    } = req.body;
    const created_by_email = req.user.email; // Get email from JWT
    const fileNames = req.files ? req.files.map((file) => file.filename) : [];
    const sql = `
      INSERT INTO classes (title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, files, created_by_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location || "", max_participants, target_groups, JSON.stringify(fileNames), created_by_email,
    ];

    try {
      const [result] = await db.query(sql, params);
      const newClassId = result.insertId;
      logActivity(req, req.user.id, req.user.name, created_by_email, "CREATE_CLASS", "CLASS", newClassId, { class_title: title });
      res.status(201).json({ message: "Class created successfully", classId: newClassId });
    } catch (err) {
      console.error("❌ Error creating class:", err);
      return res.status(500).json({ message: "เซิร์ฟเวอร์ผิดพลาด", error: err });
    }
  });

  router.put("/:classId", upload.array("files"), async (req, res) => {
    const { classId } = req.params;
    const {
      title, speaker, start_date, end_date, start_time, end_time,
      description, format, join_link, max_participants, target_groups, location,
    } = req.body;
    const fileNames = req.files ? req.files.map((file) => file.filename) : [];
    const user_email = req.user.email; // Get email from JWT

    let sql = `
      UPDATE classes SET title = ?, speaker = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, description = ?, format = ?,
      join_link = ?, location = ?, max_participants = ?, target_groups = ?
    `;
    const params = [
      title, speaker, start_date, end_date, start_time, end_time, description,
      format, join_link, location || "", max_participants, target_groups,
    ];

    if (fileNames.length > 0) {
      sql += ", files = ?";
      params.push(JSON.stringify(fileNames));
    }

    sql += " WHERE class_id = ?";
    params.push(classId);

    try {
      const [result] = await db.query(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Class not found" });
      }
      logActivity(req, req.user.id, req.user.name, user_email, "UPDATE_CLASS", "CLASS", classId, { class_title: title });
      res.status(200).json({ message: "Class updated successfully" });
    } catch (err) {
      console.error("❌ Error updating class:", err);
      return res.status(500).json({ message: "Database server error", error: err });
    }
  });

  router.delete("/:classId", adminOnly, async (req, res) => {
    const { classId } = req.params;
    try {
      const [findResults] = await db.query("SELECT title FROM classes WHERE class_id = ?", [classId]);
      const classTitle = findResults.length > 0 ? findResults[0].title : classId;

      const [result] = await db.query("DELETE FROM classes WHERE class_id = ?", [classId]);
      if (result.affectedRows === 0) { 
        return res.status(404).json({ error: "Class not found" });
      }

      logActivity(req, null, "Admin", "N/A", "DELETE_CLASS", "CLASS", classId, { class_title: classTitle });
      res.status(200).json({ message: "Class deleted successfully" });
    } catch (err) {
      console.error("Error deleting class:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/:classId/register", async (req, res) => {
    const { classId } = req.params;
    const { name, email } = req.user; // Get user info from JWT

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [results] = await connection.query("SELECT * FROM classes WHERE class_id = ? FOR UPDATE", [classId]);
      if (results.length === 0) {
        throw { status: 404, message: "Class not found." };
      }

      const course = results[0];
      const registeredUsers = JSON.parse(course.registered_users || "[]");

      if (course.max_participants !== 999 && registeredUsers.length >= course.max_participants) {
        throw { status: 409, message: "This class is already full." };
      }

      if (registeredUsers.includes(email)) {
        throw { status: 409, message: "You are already registered for this class." };
      }

      registeredUsers.push(email);
      await connection.query("UPDATE classes SET registered_users = ? WHERE class_id = ?", [JSON.stringify(registeredUsers), classId]);

      await connection.commit();

      logActivity(req, req.user.id, name, email, "REGISTER_CLASS", "CLASS", classId, { class_title: course.title });
      res.status(200).json({ message: "Successfully registered for the class!" });

      // Email notifications can be sent here, outside the transaction
      const emailClassDetails = { ...course };
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(", ");
      } catch (e) { /* Ignore */ }

      // 1. Send confirmation to the user
      sendRegistrationConfirmation(email, emailClassDetails, name);

      // 2. Send notification to all admins
      const [userResults] = await db.query("SELECT name, email FROM users WHERE email IN (?)", [registeredUsers]);
      const [adminResults] = await db.query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        sendAdminNotification(
          adminEmails,
          emailClassDetails,
          userResults
        );
      }
    } catch (err) {
      await connection.rollback();
      console.error("Error during registration:", err);
      const status = err.status || 500;
      const message = err.message || "Database server error.";
      return res.status(status).json({ message });
    } finally {
      connection.release();
    }
  });

  router.post("/:classId/cancel", async (req, res) => {
    const { classId } = req.params;
    const { email } = req.user; // Get user info from JWT

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [results] = await connection.query("SELECT * FROM classes WHERE class_id = ? FOR UPDATE", [classId]);
      if (results.length === 0) {
        throw { status: 404, message: "Class not found." };
      }

      const course = results[0];
      const registeredUsers = JSON.parse(course.registered_users || "[]");

      if (!registeredUsers.includes(email)) {
        throw { status: 409, message: "You are not registered for this class." };
      }

      const updatedUsers = registeredUsers.filter(userEmail => userEmail !== email);
      await connection.query("UPDATE classes SET registered_users = ? WHERE class_id = ?", [JSON.stringify(updatedUsers), classId]);

      await connection.commit();

      logActivity(req, req.user.id, req.user.name, email, "CANCEL_CLASS_REGISTRATION", "CLASS", classId, { class_title: course.title });
      res.status(200).json({ message: "Successfully canceled your registration." });

      // --- Email Notification for Admin ---
      const [userResults] = await db.query("SELECT name FROM users WHERE email = ?", [email]);
      const cancelingUserName = userResults.length > 0 ? userResults[0].name : email;

      const emailClassDetails = { ...course };
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(", ");
      } catch (e) { /* Ignore */ }

      const [adminResults] = await db.query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        const [remainingUserResults] = updatedUsers.length > 0
          ? await db.query("SELECT name, email FROM users WHERE email IN (?)", [updatedUsers])
          : [[]];

        sendAdminCancellationNotification(
          adminEmails, cancelingUserName, email, emailClassDetails, remainingUserResults
        );
      }

    } catch (err) {
      await connection.rollback();
      console.error("Error during cancellation:", err);
      const status = err.status || 500;
      const message = err.message || "Database server error.";
      return res.status(status).json({ message });
    } finally {
      connection.release();
    }
  });

  router.get("/registered/closed", async (req, res) => {
    const { email } = req.user; // Get user info from JWT
    const sql = `
      SELECT * FROM classes
      WHERE status = 'closed' AND JSON_CONTAINS(registered_users, ?)
    `;
    try {
      const [results] = await db.query(sql, [`"${email}"`]);
      res.status(200).json(results);
    } catch (err) {
      console.error("❌ Error fetching registered closed classes:", err);
      return res.status(500).json({ message: "Database server error." });
    }
  });

  router.post("/:classId/close", uploadMaterials.array("materials"), async (req, res) => {
    const { classId } = req.params;
    const { video_link, existing_materials } = req.body;
    const isEditing = req.body.is_editing === "true";

    const newMaterialFiles = req.files ? req.files.map((file) => file.filename) : [];
    let finalMaterials = [];
    try {
      const existing = existing_materials ? JSON.parse(existing_materials) : [];
      finalMaterials = [...existing, ...newMaterialFiles];
    } catch (error) {
      finalMaterials = newMaterialFiles;
    }

    const sql = `UPDATE classes SET status = 'closed', video_link = ?, materials = ? WHERE class_id = ?`;
    const params = [video_link || null, JSON.stringify(finalMaterials), classId];

    try {
      const [result] = await db.query(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Class not found" });
      }
      const actionType = isEditing ? "UPDATE_CLOSED_CLASS" : "CLOSE_CLASS";
      logActivity(req, req.user.id, req.user.name, req.user.email, actionType, "CLASS", classId, { class_id: classId });
      res.status(200).json({ message: "Class closed and materials uploaded successfully" });
    } catch (err) {
      console.error("❌ Error closing class:", err);
      return res.status(500).json({ message: "Database server error" });
    }
  });

  router.put("/:classId/promote", adminOnly, async (req, res) => {
    const { classId } = req.params;
    const { promoted } = req.body;
    const promotedValue = promoted ? 1 : 0;
    const sql = "UPDATE classes SET promoted = ? WHERE class_id = ?";

    try {
      const [result] = await db.query(sql, [promotedValue, classId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Class not found or no changes made" });
      }
      logActivity(req, req.user.id, req.user.name, req.user.email, promoted ? "PROMOTE_CLASS" : "UNPROMOTE_CLASS", "CLASS", classId, { class_id: classId });
      res.status(200).json({ message: "Promotion status updated successfully" });
    } catch (err) {
      console.error("Error updating promotion status:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/:classId/evaluations", async (req, res) => {
    const classId = req.params.classId;
    const sql = `
      SELECT u.name, e.score_content, e.score_material, e.score_duration,
             e.score_format, e.score_speaker, e.comments
      FROM evaluations e
      JOIN users u ON e.user_email = u.email
      WHERE e.class_id = ?
    `;
    try {
      const [results] = await db.query(sql, [classId]);
      if (!results || results.length === 0) {
        return res.json({ evaluations: [], suggestions: [] });
      }
      const suggestions = results.map((r) => r.comments).filter(Boolean);
      res.json({ evaluations: results, suggestions });
    } catch (err) {
      console.error("Error fetching evaluation results:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};