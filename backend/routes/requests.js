const express = require("express");
const router = express.Router();

module.exports = (db, logActivity, sendNewClassRequestAdminNotification, sendRequestSubmittedConfirmation) => {
  // GET /api/requests - ดึงข้อมูลคำขอของผู้ใช้ที่ล็อกอินอยู่
  router.get("/", async (req, res, next) => {
    const { email } = req.user; // ดึงอีเมลจาก JWT token ที่ผ่านการ verify แล้ว
    const sql = `
      SELECT request_id, title, created_at, updated_at, status, start_date, end_date, start_time, end_time, admin_comment, speaker, reason, format 
      FROM class_requests 
      WHERE requested_by_email = ?
      ORDER BY created_at DESC`;

    try {
      const [results] = await db.query(sql, [email]);
      res.json(results);
    } catch (err) {
      console.error("❌ Error fetching class requests:", err);
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    const {
      title, reason, startDate, endDate, startTime, endTime, format, speaker
    } = req.body;
    const { email: requested_by_email, name: requested_by_name } = req.user;

    if (!title || !requested_by_email) {
      return res.status(400).json({ message: "Title and requestedBy email are required." });
    }

    const sql = `
      INSERT INTO class_requests (title, reason, start_date, end_date, start_time, end_time, format, speaker, requested_by_email, requested_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      title, reason || null, startDate || null, endDate || null,
      startTime || null, endTime || null, format || "ONLINE",
      speaker || null, requested_by_email, requested_by_name
    ];

    try {
      const [result] = await db.query(sql, values);
      logActivity(req, req.user.id, req.user.name, req.user.email, "SUBMIT_CLASS_REQUEST", "REQUEST", result.insertId, { request_title: title });

      // --- Email Notification for Admins ---
      const [userResults] = await db.query("SELECT name FROM users WHERE email = ?", [requested_by_email]);
      const requesterName = userResults.length > 0 ? userResults[0].name : requested_by_email;

      const requestDetailsForEmail = {
        title,
        reason,
        requestedBy: { name: requesterName, email: requested_by_email },
      };
      // 1. Send confirmation to the user who submitted the request
      sendRequestSubmittedConfirmation(requested_by_email, requestDetailsForEmail, requesterName);

      const [adminResults] = await db.query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        sendNewClassRequestAdminNotification(adminEmails, requestDetailsForEmail);
      }

      res.status(201).json({ message: "Class request submitted successfully!" });
    } catch (err) {
      console.error("❌ Error submitting class request:", err);
      next(err);
    }
  });

  router.put("/:requestId", async (req, res, next) => {
    const { requestId } = req.params;
    const {
      title, reason, startDate, endDate, startTime, endTime, format, speaker
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const sql = `
      UPDATE class_requests SET title = ?, reason = ?, start_date = ?, end_date = ?, 
      start_time = ?, end_time = ?, format = ?, speaker = ?,
      status = 'pending', admin_comment = NULL
      WHERE request_id = ?
    `;
    const values = [
      title, reason, startDate, endDate, startTime, endTime, format, speaker, requestId,
    ];

    try {
      // --- IDOR Prevention: Check ownership before updating ---
      const [requestCheck] = await db.query("SELECT requested_by_email FROM class_requests WHERE request_id = ?", [requestId]);
      if (requestCheck.length === 0) {
        return res.status(404).json({ message: "Request not found." });
      }
      if (requestCheck[0].requested_by_email !== req.user.email) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to edit this request." });
      }
      // --- End IDOR Prevention ---

      const [result] = await db.query(sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Request not found." });
      }
      logActivity(req, req.user.id, req.user.name, req.user.email, "UPDATE_CLASS_REQUEST", "REQUEST", requestId, { request_title: title });
      res.status(200).json({ message: "Class request updated successfully!" });
    } catch (err) {
      console.error("❌ Error updating class request:", err);
      next(err);
    }
  });

  router.delete("/:requestId", async (req, res, next) => {
    const { requestId } = req.params;
    const sql = "DELETE FROM class_requests WHERE request_id = ?";

    try {
      // --- IDOR Prevention: Check ownership before deleting ---
      const [requestCheck] = await db.query("SELECT requested_by_email FROM class_requests WHERE request_id = ?", [requestId]);
      if (requestCheck.length === 0) {
        return res.status(404).json({ message: "Request not found." });
      }
      if (requestCheck[0].requested_by_email !== req.user.email) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to delete this request." });
      }
      // --- End IDOR Prevention ---

      const [result] = await db.query(sql, [requestId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Class request not found." });
      }
      logActivity(
        req, req.user.id, req.user.name, req.user.email, "DELETE_CLASS_REQUEST", "REQUEST", requestId,
        { deleted_request_id: requestId }
      );
      res.status(200).json({ message: "Class request deleted successfully!" });
    } catch (err) {
      console.error("❌ Error deleting class request:", err);
      next(err);
    }
  });

  return router;
};