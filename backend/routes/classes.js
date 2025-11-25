const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Custom storage for materials to handle Thai filenames correctly
const materialsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/materials");
  },
  filename: (req, file, cb) => {
    const decodedOriginalName = Buffer.from(
      file.originalname,
      "latin1"
    ).toString("utf8");
    cb(null, `${Date.now()}-${decodedOriginalName}`);
  },
});
const uploadMaterials = multer({ storage: materialsStorage });

const { requireAdminLevel } = require("../middleware/auth");

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

    // 🟢 ใช้ admin_level ในการตรวจสอบสิทธิ์
    if (req.user && req.user.admin_level > 0) {
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

  // Helper function to generate a unique 6-digit class ID
  const generateUniqueClassId = async () => {
    let classId;
    let isUnique = false;
    while (!isUnique) {
      classId = Math.floor(100000 + Math.random() * 900000).toString();
      const [existing] = await db.query(
        "SELECT 1 FROM classes WHERE class_id = ?",
        [classId]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
    }
    return classId;
  };

  router.get("/promoted", async (req, res) => {
    const sql =
      "SELECT * FROM classes WHERE promoted = 1 AND status != 'closed' ORDER BY start_date ASC";
    try {
      const [results] = await db.query(sql);
      res.json(results);
    } catch (err) {
      console.error("Error fetching promoted classes:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/:classId/registrants", requireAdminLevel(1), async (req, res) => {
    const { classId } = req.params;
    const findClassSql =
      "SELECT registered_users FROM classes WHERE class_id = ?";

    try {
      const [results] = await db.query(findClassSql, [classId]);
      if (results.length === 0) {
        return res.status(404).json({ message: "Class not found." });
      }

      const registeredEmails = JSON.parse(results[0].registered_users || "[]");
      if (registeredEmails.length === 0) {
        return res.json([]);
      }

      const getUsersSql =
        "SELECT name, email, phone, roles FROM users WHERE email IN (?)";
      const [userResults] = await db.query(getUsersSql, [registeredEmails]);
      res.json(userResults);
    } catch (err) {
      console.error("Error fetching registrants:", err);
      return res.status(500).json({ message: "Database server error." });
    }
  });

  router.post("/", requireAdminLevel(1), upload.array("files"), async (req, res) => {
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
      location,
      max_participants,
      target_groups,
    } = req.body;

    // --- Input Validation ---
    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required." });
    }
    if (title.length > 255) {
      return res
        .status(400)
        .json({ message: "Title must not exceed 255 characters." });
    }
    try {
      const speakerArray = JSON.parse(speaker);
      if (!Array.isArray(speakerArray) || speakerArray.length === 0) {
        return res
          .status(400)
          .json({ message: "กรุณาระบุวิทยากรอย่างน้อย 1 คน" });
      }
    } catch (e) {
      return res.status(400).json({ message: "รูปแบบข้อมูลวิทยากรไม่ถูกต้อง" });
    }

    const created_by_email = req.user.email; // Get email from JWT
    const materialFileNames = req.files
      ? req.files.map((file) => file.filename)
      : [];
    const classId = await generateUniqueClassId();
    const sql = `
      INSERT INTO classes (class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, materials, created_by_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      classId,
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
      JSON.stringify(materialFileNames),
      created_by_email,
    ];

    try {
      const [result] = await db.query(sql, params);
      const newClassId = result.insertId;
      logActivity(
        req,
        req.user.id,
        req.user.name,
        created_by_email,
        "CREATE_CLASS",
        "CLASS",
        newClassId,
        { class_title: title }
      );
      res
        .status(201)
        .json({
          message: "Class created successfully",
          classId: classId,
          id: newClassId,
        });
    } catch (err) {
      console.error("❌ Error creating class:", err);
      return res
        .status(500)
        .json({ message: "เซิร์ฟเวอร์ผิดพลาด", error: err });
    }
  });

  router.put("/:classId", requireAdminLevel(1), upload.array("files"), async (req, res) => {
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
      existingFiles,
    } = req.body;
    const newMaterialFiles = req.files
      ? req.files.map((file) => file.filename)
      : [];

    // --- Input Validation --- //
    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required." });
    }
    if (title.length > 255) {
      return res
        .status(400)
        .json({ message: "Title must not exceed 255 characters." });
    }

    const user_email = req.user.email; // Get email from JWT

    // Combine existing files (that were not deleted) with newly uploaded files
    let existingFileNames = [];
    try {
      existingFileNames = existingFiles ? JSON.parse(existingFiles) : [];
    } catch (e) {
      console.error("Could not parse existingFiles:", e);
    }
    const finalFileNames = [...existingFileNames, ...newMaterialFiles]; // Combine both lists

    let sql = `
      UPDATE classes SET title = ?, speaker = ?, start_date = ?, end_date = ?,
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

    // Always update the files column to reflect deletions
    sql += ", materials = ? WHERE class_id = ?"; // Use materials column
    params.push(JSON.stringify(finalFileNames)); // Save to materials
    params.push(classId);

    try {
      // --- IDOR Prevention ---
      // Check if the user is an admin (any level) or the owner of the class
      if (!req.user.roles.includes("ผู้ดูแลระบบ")) {
        const [classCheck] = await db.query(
          "SELECT created_by_email FROM classes WHERE class_id = ?",
          [classId]
        );
        if (
          classCheck.length === 0 ||
          classCheck[0].created_by_email !== user_email
        ) {
          return res
            .status(403)
            .json({
              message:
                "Forbidden: You do not have permission to edit this class.",
            });
        }
      }
      // --- End IDOR Prevention ---

      const [result] = await db.query(sql, params);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Class not found" });
      }
      logActivity(
        req,
        req.user.id,
        req.user.name,
        user_email,
        "UPDATE_CLASS",
        "CLASS",
        classId,
        { class_title: title }
      );
      res.status(200).json({ message: "Class updated successfully" });
    } catch (err) {
      console.error("❌ Error updating class:", err);
      return res
        .status(500)
        .json({ message: "Database server error", error: err });
    }
  });

  router.delete("/:classId", requireAdminLevel(1), async (req, res) => {
    const { classId } = req.params;
    try {
      const [findResults] = await db.query(
        "SELECT title FROM classes WHERE class_id = ?",
        [classId]
      );
      const classTitle =
        findResults.length > 0 ? findResults[0].title : classId;

      const [result] = await db.query(
        "DELETE FROM classes WHERE class_id = ?",
        [classId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Class not found" });
      }

      logActivity(req, req.user.id, req.user.name, req.user.email, "DELETE_CLASS", "CLASS", classId, {
        class_title: classTitle,
      });
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

      const [results] = await connection.query(
        "SELECT * FROM classes WHERE class_id = ? FOR UPDATE",
        [classId]
      );
      if (results.length === 0) {
        throw { status: 404, message: "Class not found." };
      }

      const course = results[0];
      const registeredUsers = JSON.parse(course.registered_users || "[]");

      if (
        course.max_participants !== 999 &&
        registeredUsers.length >= course.max_participants
      ) {
        throw { status: 409, message: "This class is already full." };
      }

      if (registeredUsers.includes(email)) {
        throw {
          status: 409,
          message: "You are already registered for this class.",
        };
      }

      registeredUsers.push(email);
      await connection.query(
        "UPDATE classes SET registered_users = ? WHERE class_id = ?",
        [JSON.stringify(registeredUsers), classId]
      );

      await connection.commit();

      logActivity(
        req,
        req.user.id,
        name,
        email,
        "REGISTER_CLASS",
        "CLASS",
        classId,
        { class_title: course.title }
      );
      res.status(200).json({ message: "ลงทะเบียนสำเร็จแล้ว" });

      // Email notifications can be sent here, outside the transaction
      const emailClassDetails = { ...course };
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(
          ", "
        );
      } catch (e) {
        /* Ignore */
      }

      // 1. Send confirmation to the user
      sendRegistrationConfirmation(email, emailClassDetails, name);

      // 2. Send notification to all admins
      const [userResults] = await db.query(
        "SELECT name, email FROM users WHERE email IN (?)",
        [registeredUsers]
      );
      const [adminResults] = await db.query(
        "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')"
      );
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        sendAdminNotification(adminEmails, emailClassDetails, userResults);
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

      const [results] = await connection.query(
        "SELECT * FROM classes WHERE class_id = ? FOR UPDATE",
        [classId]
      );
      if (results.length === 0) {
        throw { status: 404, message: "Class not found." };
      }

      const course = results[0];
      const registeredUsers = JSON.parse(course.registered_users || "[]");

      if (!registeredUsers.includes(email)) {
        throw {
          status: 409,
          message: "You are not registered for this class.",
        };
      }

      const updatedUsers = registeredUsers.filter(
        (userEmail) => userEmail !== email
      );
      await connection.query(
        "UPDATE classes SET registered_users = ? WHERE class_id = ?",
        [JSON.stringify(updatedUsers), classId]
      );

      await connection.commit();

      logActivity(
        req,
        req.user.id,
        req.user.name,
        email,
        "CANCEL_CLASS_REGISTRATION",
        "CLASS",
        classId,
        { class_title: course.title }
      );
      res.status(200).json({ message: "ยกเลิกการลงทะเบียนสำเร็จแล้ว" });

      // --- Email Notification for Admin ---
      const [userResults] = await db.query(
        "SELECT name FROM users WHERE email = ?",
        [email]
      );
      const cancelingUserName =
        userResults.length > 0 ? userResults[0].name : email;

      const emailClassDetails = { ...course };
      try {
        emailClassDetails.speaker = JSON.parse(emailClassDetails.speaker).join(
          ", "
        );
      } catch (e) {
        /* Ignore */
      }

      const [adminResults] = await db.query(
        "SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')"
      );
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        const [remainingUserResults] =
          updatedUsers.length > 0
            ? await db.query(
                "SELECT name, email FROM users WHERE email IN (?)",
                [updatedUsers]
              )
            : [[]];

        sendAdminCancellationNotification(
          adminEmails,
          cancelingUserName,
          email,
          emailClassDetails,
          remainingUserResults
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

  router.post(
    "/:classId/close",
    uploadMaterials.array("materials"),
    requireAdminLevel(1),
    async (req, res) => {
      const { classId } = req.params;
      const { video_link, existing_materials } = req.body;
      const isEditing = req.body.is_editing === "true";

      const newMaterialFiles = req.files
        ? req.files.map((file) => file.filename)
        : [];
      let finalMaterials = [];
      try {
        const existing = existing_materials
          ? JSON.parse(existing_materials)
          : [];
        finalMaterials = [...existing, ...newMaterialFiles];
      } catch (error) {
        finalMaterials = newMaterialFiles;
      }

      const sql = `UPDATE classes SET status = 'closed', video_link = ?, materials = ? WHERE class_id = ?`;
      const params = [
        video_link || null,
        JSON.stringify(finalMaterials),
        classId,
      ];

      try {
        const [result] = await db.query(sql, params);
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Class not found" });
        }
        const actionType = isEditing ? "UPDATE_CLOSED_CLASS" : "CLOSE_CLASS";
        logActivity(
          req,
          req.user.id,
          req.user.name,
          req.user.email,
          actionType,
          "CLASS",
          classId,
          { class_id: classId }
        );
        res
          .status(200)
          .json({
            message: "Class closed and materials uploaded successfully",
          });
      } catch (err) {
        console.error("❌ Error closing class:", err);
        return res.status(500).json({ message: "Database server error" });
      }
    }
  );

  router.put("/:classId/promote", requireAdminLevel(1), async (req, res) => {
    const { classId } = req.params;
    const { promoted } = req.body;
    const promotedValue = promoted ? 1 : 0;
    const sql = "UPDATE classes SET promoted = ? WHERE class_id = ?";

    try {
      const [result] = await db.query(sql, [promotedValue, classId]);
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Class not found or no changes made" });
      }
      logActivity(
        req,
        req.user.id,
        req.user.name,
        req.user.email,
        promoted ? "PROMOTE_CLASS" : "UNPROMOTE_CLASS",
        "CLASS",
        classId,
        { class_id: classId }
      );
      res
        .status(200)
        .json({ message: "Promotion status updated successfully" });
    } catch (err) {
      console.error("Error updating promotion status:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.get("/:classId/evaluations", requireAdminLevel(1), async (req, res) => {
    const classId = req.params.classId;
    const sql = `
      SELECT u.name, e.score_content, e.score_material, e.score_duration,
             e.score_format, e.score_speaker, e.comments
      FROM evaluations e
      JOIN users u ON e.user_email = u.email COLLATE utf8mb4_unicode_ci
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
