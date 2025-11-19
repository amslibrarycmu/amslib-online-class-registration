const express = require("express");
const router = express.Router();

module.exports = (
  db,
  logActivity,
  adminOnly,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification
) => {
  // --- Activity Logs ---
  router.get("/activity-logs", async (req, res, next) => {
    const { page = 1, limit = 25, search = "", actionType = "" } = req.query;
    const offset = (page - 1) * limit;

    let sql = "SELECT SQL_CALC_FOUND_ROWS * FROM activity_logs";
    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push("(user_name LIKE ? OR user_email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (actionType) {
      whereClauses.push("action_type = ?");
      params.push(actionType);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    try {
      const [results] = await db.query(sql, params);
      const [[{ total }]] = await db.query("SELECT FOUND_ROWS() as total");
      return res.json({
        logs: results,
        total: total,
      });
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      next(err); // Pass error to the centralized handler
    }
  });

  router.get("/activity-logs/all", async (req, res, next) => {
    const { search = "", actionType = "" } = req.query;

    let sql = "SELECT * FROM activity_logs";
    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push("(user_name LIKE ? OR user_email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (actionType) {
      whereClauses.push("action_type = ?");
      params.push(actionType);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY timestamp DESC";

    try {
      const [results] = await db.query(sql, params);
      return res.json(results);
    } catch (err) {
      console.error("Error fetching all activity logs for export:", err);
      next(err); // Pass error to the centralized handler
    }
  });

  // --- Class Requests (Admin) ---
  router.get("/class-requests", async (req, res, next) => {
    const { status, roles } = req.query;
    // Use LEFT JOIN to ensure all requests are returned, even if the requesting user has been deleted.
    // Use COALESCE to provide a fallback name if the user is not found.
    // Aliased table columns to match the frontend's expected field names.
    let sql = `
      SELECT
        r.request_id, r.title, r.reason, r.start_date, r.end_date, r.start_time, r.created_at,
        r.end_time, r.format, r.speaker, r.status, r.admin_comment,
        u_requester.id AS requested_by_id,
        COALESCE(u_requester.name, r.requested_by_name, r.requested_by_email) AS requested_by_name, 
        r.requested_by_email, 
        u_admin.name as action_by_name 
      FROM class_requests r
      LEFT JOIN users u_requester ON r.requested_by_email = u_requester.email
      LEFT JOIN users u_admin ON r.action_by_email = u_admin.email
    `;

    const params = [];

    if (status) {
      sql += " WHERE r.status = ?";
      params.push(status);
    }

    sql += " ORDER BY r.created_at DESC";

    try {
      const [results] = await db.query(sql, params);
      return res.json(results);
    } catch (err) {
      console.error("❌ Error fetching admin class requests:", err);
      return res.status(500).json({ message: "Database server error." });
    }
  });

  router.post("/class-requests/:requestId", async (req, res, next) => {
    const { requestId } = req.params;
    const { action, reason, admin_email } = req.body; // รับ action จาก body

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let updateRequestSql;
      let updateParams;
      if (action === "reject") {
        if (!reason || reason.trim() === "") {
          await connection.rollback();
          connection.release();
          return res
            .status(400)
            .json({ message: "Rejection reason is required." });
        }
        updateRequestSql =
          "UPDATE class_requests SET status = 'rejected', admin_comment = ?, action_by_email = ?, action_at = NOW() WHERE request_id = ?";
        updateParams = [reason, admin_email, requestId];
      } else {
        updateRequestSql =
          "UPDATE class_requests SET status = 'approved', admin_comment = NULL, action_by_email = ?, action_at = NOW() WHERE request_id = ?";
        updateParams = [admin_email, requestId];
      }

      const [updateResult] = await connection.query(
        updateRequestSql,
        updateParams
      );
      if (updateResult.affectedRows === 0) {
        throw new Error("Request not found.");
      }

      const getRequestSql = `
          SELECT r.*, u.name as requested_by_name 
          FROM class_requests r 
          LEFT JOIN users u ON r.requested_by_email = u.email 
          WHERE r.request_id = ?
        `;
      const [requestResults] = await connection.query(getRequestSql, [
        requestId,
      ]);
      if (requestResults.length === 0) {
        throw new Error("Request details not found.");
      }
      const requestDetails = requestResults[0];

      if (action === "approve") {
        await sendRequestApprovedNotification(
          requestDetails.requested_by_email,
          requestDetails
        );
        logActivity(
          req,
          req.user.id,
          req.user.name,
          req.user.email,
          "APPROVE_CLASS_REQUEST",
          "REQUEST",
          requestId,
          {
            request_title: requestDetails.title,
            approved_by: req.user.email,
            approved_by_name: req.user.name,
          }
        );
      } else {
        await sendRequestRejectedNotification(
          requestDetails.requested_by_email,
          requestDetails,
          reason
        );
        logActivity(
          req,
          req.user.id,
          req.user.name,
          req.user.email,
          "REJECT_CLASS_REQUEST",
          "REQUEST",
          requestId,
          {
            request_title: requestDetails.title,
            rejected_by: req.user.email,
            reason,
          }
        );
      }

      await connection.commit();
      return res
        .status(200)
        .json({ message: `Request ${action}ed successfully.` });
    } catch (error) {
      await connection.rollback();
      next(error); // Pass error to the centralized handler
    } finally {
      connection.release();
    }
  });

  // --- Statistics ---
  router.get("/statistics/class-demographics", async (req, res, next) => {
    const { year, month } = req.query;
    const params = [];
    const dateWhereClauses = [];

    // SQL: ดึงข้อมูลห้องเรียนพร้อมคะแนนเฉลี่ยการประเมิน
    let sql = `
      SELECT
        c.class_id,
        c.title,
        c.start_date,
        c.registered_users, -- ดึง JSON string ของอีเมลมาเพื่อประมวลผลต่อ
        (
            SELECT COUNT(e.evaluation_id) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS total_evaluations,
        (
            SELECT AVG(e.score_content) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS avg_score_content,
        (
            SELECT AVG(e.score_material) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS avg_score_material,
        (
            SELECT AVG(e.score_duration) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS avg_score_duration,
        (
            SELECT AVG(e.score_format) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS avg_score_format,
        (
            SELECT AVG(e.score_speaker) FROM evaluations e
            WHERE e.class_id = c.class_id
        ) AS avg_score_speaker
      FROM classes c
      WHERE c.status != 'draft' AND c.status != 'open' -- กรองเฉพาะห้องเรียนที่เสร็จสิ้นแล้ว (สมมติว่ามีสถานะ 'completed' หรือ 'closed')
    `;

    // การกรองตามปี/เดือน
    if (year && year !== "all") {
      dateWhereClauses.push("YEAR(c.start_date) = ?");
      params.push(year);
    }
    if (month && month !== "all") {
      dateWhereClauses.push("MONTH(c.start_date) = ?");
      params.push(month);
    }

    if (dateWhereClauses.length > 0) {
      sql += " AND " + dateWhereClauses.join(" AND ");
    }

    sql += " ORDER BY c.start_date DESC";

    try {
      // 1. ดึงข้อมูลห้องเรียนและคะแนนเฉลี่ย
      const [rawClassStats] = await db.query(sql, params);

      // 2. ประมวลผล Demographics
      const allEmails = new Set();
      rawClassStats.forEach((cls) => {
        // The mysql2 driver already parses the JSON column, so cls.registered_users is an array.
        const registeredUsersEmails = cls.registered_users || [];
        registeredUsersEmails.forEach(allEmails.add, allEmails);
      });

      let userRoleMap = {};
      if (allEmails.size > 0) {
        const userRolesSql =
          "SELECT email, roles FROM users WHERE email IN (?)";
        const [userRoles] = await db.query(userRolesSql, [
          Array.from(allEmails),
        ]);
        userRoles.forEach((user) => {
          // The mysql2 driver already parses the JSON column, so user.roles is an array.
          userRoleMap[user.email] =
            user.roles && user.roles.length > 0 ? user.roles[0] : "Unknown"; // ใช้ role แรก
        });
      }

      // 3. รวมข้อมูล Demographics เข้ากับสถิติห้องเรียน
      const classStatsWithDemographics = rawClassStats.map((cls) => {
        const demographics = {};
        const registeredUsersEmails = cls.registered_users || [];
        for (const email of registeredUsersEmails) {
          const role = userRoleMap[email];
          if (role) {
            demographics[role] = (demographics[role] || 0) + 1;
          }
        }
        delete cls.registered_users; // ลบข้อมูลที่ไม่จำเป็นออก
        return { ...cls, demographics };
      });

      return res.json(classStatsWithDemographics);
    } catch (err) {
      console.error("❌ Error fetching class demographics statistics:", err);
      next(err); // Pass error to the centralized handler
    }
  });

  return router;
};
