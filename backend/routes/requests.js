const express = require("express");
const router = express.Router();

module.exports = (db, logActivity, sendNewClassRequestAdminNotification, sendRequestSubmittedConfirmation) => {
  // GET /api/requests - ดึงข้อมูลคำขอของผู้ใช้ที่ล็อกอินอยู่
  router.get("/", async (req, res) => {
    const { email } = req.user; // ดึงอีเมลจาก JWT token ที่ผ่านการ verify แล้ว
    const sql = `
      SELECT request_id, title, request_date, status, start_date, end_date, start_time, end_time, rejection_reason, suggested_speaker, reason, format 
      FROM requests 
      WHERE user_email = ? 
      ORDER BY request_date DESC`;

    try {
      const [results] = await db.query(sql, [email]);
      res.json(results);
    } catch (err) {
      console.error("❌ Error fetching class requests:", err);
      return res.status(500).json({ message: "Database server error." });
    }
  });

  router.post("/", async (req, res) => {
    const {
      title, reason, startDate, endDate, startTime, endTime,
      format, speaker, requestedBy,
    } = req.body;

    if (!title || !requestedBy) {
      return res.status(400).json({ message: "Title and requestedBy email are required." });
    }

    const sql = `
      INSERT INTO requests (title, reason, start_date, end_date, start_time, end_time, format, suggested_speaker, user_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      title, reason || null, startDate || null, endDate || null,
      startTime || null, endTime || null, format || "ONLINE",
      speaker || null, requestedBy,
    ];

    try {
      const [result] = await db.query(sql, values);
      logActivity(req, req.user.id, req.user.name, req.user.email, "SUBMIT_CLASS_REQUEST", "REQUEST", result.insertId, { request_title: title });

      // --- Email Notification for Admins ---
      const [userResults] = await db.query("SELECT name FROM users WHERE email = ?", [requestedBy]);
      const requesterName = userResults.length > 0 ? userResults[0].name : requestedBy;

      const requestDetailsForEmail = {
        title,
        reason,
        requestedBy: { name: requesterName, email: requestedBy },
      };
      // 1. Send confirmation to the user who submitted the request
      sendRequestSubmittedConfirmation(requestedBy, requestDetailsForEmail, requesterName);

      const [adminResults] = await db.query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
      const adminEmails = adminResults.map((admin) => admin.email);

      if (adminEmails.length > 0) {
        const requestDetails = {
          title,
          reason,
          requestedBy: { name: requesterName, email: requestedBy },
        };
        sendNewClassRequestAdminNotification(adminEmails, requestDetailsForEmail);
      }

      res.status(201).json({ message: "Class request submitted successfully!" });
    } catch (err) {
      console.error("❌ Error submitting class request:", err);
      return res.status(500).json({ message: "Database server error.", error: err });
    }
  });

  router.put("/:requestId", async (req, res) => {
    const { requestId } = req.params;
    const {
      title, reason, startDate, endDate, startTime, endTime, format, speaker
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const sql = `
      UPDATE requests SET title = ?, reason = ?, start_date = ?, end_date = ?, 
      start_time = ?, end_time = ?, format = ?, suggested_speaker = ?,
      status = 'pending', rejection_reason = NULL
      WHERE request_id = ?
    `;
    const values = [
      title, reason, startDate, endDate, startTime, endTime, format, speaker, requestId,
    ];

    try {
      const [result] = await db.query(sql, values);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Request not found." });
      }
      logActivity(req, req.user.id, req.user.name, req.user.email, "UPDATE_CLASS_REQUEST", "REQUEST", requestId, { request_title: title });
      res.status(200).json({ message: "Class request updated successfully!" });
    } catch (err) {
      console.error("❌ Error updating class request:", err);
      return res.status(500).json({ message: "Database server error.", error: err });
    }
  });

  router.delete("/:requestId", async (req, res) => {
    const { requestId } = req.params;
    const sql = "DELETE FROM requests WHERE request_id = ?";

    try {
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
      return res.status(500).json({ message: "Database server error." });
    }
  });

  return router;
};