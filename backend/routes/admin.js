const express = require("express");
const router = express.Router();

const { requireAdminLevel } = require("../middleware/auth");

module.exports = (
  db,
  logActivity,
  adminOnly,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification
) => {
  // --- Activity Logs (Requires Level 3) ---
  router.get("/activity-logs", requireAdminLevel(3), async (req, res, next) => {
    const { page = 1, limit = 25, search = "", actionType = "" } = req.query;
    const offset = (page - 1) * limit;

    let sql = "SELECT * FROM activity_logs";
    const whereClauses = [];
    const countParams = [];
    const params = [];

    if (search) {
      whereClauses.push("(user_name LIKE ? OR user_email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (actionType) {
      whereClauses.push("action_type = ?");
      params.push(actionType);
    }
    
    countParams.push(...params);

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    try {
      // ดึงข้อมูล Logs
      const [results] = await db.query(sql, params);
      
      // ดึงจำนวนทั้งหมดแยกต่างหาก (ประสิทธิภาพดีกว่าใน MySQL 8.0)
      const [countResult] = await db.query("SELECT COUNT(*) as total FROM activity_logs" + (whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : ""), countParams);
      
      return res.json({
        logs: results,
        total: countResult[0].total,
      });
    } catch (err) {
      console.error("Error fetching activity logs:", err);
      next(err);
    }
  });

  router.get("/activity-logs/all", requireAdminLevel(3), async (req, res, next) => {
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
      console.error("Error fetching all activity logs:", err);
      next(err);
    }
  });

  // --- Class Requests (Admin - Requires Level 2) ---
  router.get("/class-requests", requireAdminLevel(2), async (req, res, next) => {
    const { status } = req.query;
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
      next(err);
    }
  });

  router.post("/class-requests/:requestId", requireAdminLevel(2), async (req, res, next) => {
    const { requestId } = req.params;
    const { action, reason } = req.body;
    const admin_email = req.user.email; // ใช้จาก Token เพื่อความปลอดภัย

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
          return res.status(400).json({ message: "Rejection reason is required." });
        }
        updateRequestSql = "UPDATE class_requests SET status = 'rejected', admin_comment = ?, action_by_email = ?, action_at = NOW() WHERE request_id = ?";
        updateParams = [reason, admin_email, requestId];
      } else {
        updateRequestSql = "UPDATE class_requests SET status = 'approved', admin_comment = NULL, action_by_email = ?, action_at = NOW() WHERE request_id = ?";
        updateParams = [admin_email, requestId];
      }

      const [updateResult] = await connection.query(updateRequestSql, updateParams);
      if (updateResult.affectedRows === 0) throw new Error("Request not found.");

      const getRequestSql = `SELECT r.*, u.name as requested_by_name FROM class_requests r LEFT JOIN users u ON r.requested_by_email = u.email WHERE r.request_id = ?`;
      const [requestResults] = await connection.query(getRequestSql, [requestId]);
      if (requestResults.length === 0) throw new Error("Request details not found.");
      const requestDetails = requestResults[0];

      if (action === "approve") {
        // 🟢 แบบใหม่: ยังไม่ส่งอีเมลที่นี่ จะไปส่งเมื่อสร้างห้องเรียนจริงใน classes.js
        logActivity(req, req.user.id, req.user.name, req.user.email, "APPROVE_CLASS_REQUEST", "REQUEST", requestId, { request_title: requestDetails.title, approved_by: req.user.email });
      } else {
        await sendRequestRejectedNotification(requestDetails.requested_by_email, requestDetails, reason);
        logActivity(req, req.user.id, req.user.name, req.user.email, "REJECT_CLASS_REQUEST", "REQUEST", requestId, { request_title: requestDetails.title, rejected_by: req.user.email, reason });
      }

      await connection.commit();
      return res.status(200).json({ message: `Request ${action}ed successfully.` });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  // --- 🟢 Statistics: Class Demographics & Scores (Logic ใหม่ + Safe Parse) 🟢 ---
  router.get("/statistics/class-demographics", requireAdminLevel(2), async (req, res, next) => {
    const { filterType, year, month, startDate, endDate, roles: rolesJSON } = req.query;
    const params = [];
    let dateWhereClauses = [];

    // 1. ดึงข้อมูล Class
    let sql = `
      SELECT c.class_id, c.title, c.start_date, c.registered_users
      FROM classes c
      WHERE c.status != 'draft' AND c.status != 'open'
    `;

    if (filterType === 'yearly' && year) {
        dateWhereClauses.push("YEAR(c.start_date) = ?");
        params.push(year);
    } else if (filterType === 'monthly' && year && month) {
        dateWhereClauses.push("YEAR(c.start_date) = ? AND MONTH(c.start_date) = ?");
        params.push(year, month);
    } else if (filterType === 'range') {
        if (startDate) { dateWhereClauses.push("c.start_date >= ?"); params.push(startDate); }
        if (endDate) { dateWhereClauses.push("c.start_date <= ?"); params.push(endDate); }
    }

    if (dateWhereClauses.length > 0) sql += " AND " + dateWhereClauses.join(" AND ");
    sql += " ORDER BY c.start_date DESC";

    try {
      const [classes] = await db.query(sql, params);

      // 2. ดึงข้อมูล Evaluations
      const classIds = classes.map(c => c.class_id);
      let evaluations = [];
      if (classIds.length > 0) {
        const [evals] = await db.query("SELECT * FROM evaluations WHERE class_id IN (?)", [classIds]);
        evaluations = evals;
      }

      // 3. รวบรวม Email เพื่อหา Role (พร้อม Safe Parse registered_users)
      const allEmails = new Set();
      classes.forEach((cls) => {
        let registeredUsersEmails = cls.registered_users;
        
        // 🛡️ Safe Parse: ป้องกันกรณี Database ส่งมาเป็น String
        if (typeof registeredUsersEmails === 'string') {
            try { registeredUsersEmails = JSON.parse(registeredUsersEmails); } catch(e) { registeredUsersEmails = []; }
        }
        
        // ถ้า parse แล้ว หรือเป็น array อยู่แล้ว ให้เก็บไว้ใช้ต่อเลย
        cls.registered_users_parsed = Array.isArray(registeredUsersEmails) ? registeredUsersEmails : [];

        cls.registered_users_parsed.forEach(email => allEmails.add(email));
      });
      evaluations.forEach(ev => allEmails.add(ev.user_email));

      // 4. สร้าง Map ของ User Roles (พร้อม Safe Parse user.roles)
      let userRoleMap = {};
      let rolesToFilter = [];
      try { if (rolesJSON) rolesToFilter = JSON.parse(rolesJSON); } catch (e) { }

      if (allEmails.size > 0) {
        const userRolesSql = "SELECT email, roles FROM users WHERE email IN (?)";
        const [userRoles] = await db.query(userRolesSql, [Array.from(allEmails)]);
        
        userRoles.forEach((user) => {
          let roles = user.roles;
          
          // 🛡️ Safe Parse: ป้องกันกรณี roles เป็น String
          if (typeof roles === 'string') {
             try { roles = JSON.parse(roles); } catch(e) { roles = []; }
          }
          if (!Array.isArray(roles)) roles = [];

          // 🟢 เลือกบทบาทที่ตรงกับตัวกรอง (ถ้ามี) หรือเลือกบทบาททั่วไปที่ไม่ใช่แอดมิน
          let displayRole = null;
          if (rolesToFilter.length > 0) {
            displayRole = roles.find(r => rolesToFilter.includes(r));
          }
          if (!displayRole) {
            displayRole = roles.find(r => r !== "ผู้ดูแลระบบ");
          }

          userRoleMap[user.email] = displayRole || (roles.length > 0 ? roles[0] : "Unknown");
        });
      }

      // 5. คำนวณสถิติ
      const finalStats = classes.map((cls) => {
        const demographics = {};
        const registeredUsersEmails = cls.registered_users_parsed || []; // ใช้ตัวที่ parse แล้ว

        // 5.1 คำนวณ Demographics
        for (const email of registeredUsersEmails) {
          const userRole = userRoleMap[email];
          const isNotAdminRole = userRole !== "ผู้ดูแลระบบ";
          const matchesFilter = rolesToFilter.length === 0 || rolesToFilter.includes(userRole);

          if (userRole && isNotAdminRole && matchesFilter) {
            demographics[userRole] = (demographics[userRole] || 0) + 1;
          }
        }

        // 5.2 คำนวณคะแนนเฉลี่ย (x̄)
        const clsEvals = evaluations.filter(e => e.class_id === cls.class_id);
        
        let totalContent = 0, totalMaterial = 0, totalDuration = 0, totalFormat = 0, totalSpeaker = 0;
        let validEvalCount = 0;

        clsEvals.forEach(ev => {
            const evaluatorRole = userRoleMap[ev.user_email];
            
            const isNotAdminRole = evaluatorRole !== "ผู้ดูแลระบบ";
            const matchesFilter = rolesToFilter.length === 0 || rolesToFilter.includes(evaluatorRole);

            if (evaluatorRole && isNotAdminRole && matchesFilter) {
                totalContent += parseFloat(ev.score_content || 0);
                totalMaterial += parseFloat(ev.score_material || 0);
                totalDuration += parseFloat(ev.score_duration || 0);
                totalFormat += parseFloat(ev.score_format || 0);
                totalSpeaker += parseFloat(ev.score_speaker || 0);
                validEvalCount++;
            }
        });

        // 6. ส่งข้อมูลกลับ
        delete cls.registered_users; 
        delete cls.registered_users_parsed; // ลบ temp data ออก
        
        return { 
            ...cls, 
            demographics,
            total_evaluations: validEvalCount, 
            avg_score_content: validEvalCount ? (totalContent / validEvalCount) : 0,
            avg_score_material: validEvalCount ? (totalMaterial / validEvalCount) : 0,
            avg_score_duration: validEvalCount ? (totalDuration / validEvalCount) : 0,
            avg_score_format: validEvalCount ? (totalFormat / validEvalCount) : 0,
            avg_score_speaker: validEvalCount ? (totalSpeaker / validEvalCount) : 0
        };
      });

      return res.json(finalStats);
    } catch (err) {
      console.error("❌ Error fetching class stats:", err);
      next(err);
    }
  });

  // --- Topic Management (จัดการหัวข้อ) ---
  router.get("/topics", requireAdminLevel(3), async (req, res, next) => {
    try {
      const [results] = await db.query("SELECT * FROM requestable_topics ORDER BY id DESC");
      return res.json(results);
    } catch (err) {
      console.error("Error fetching topics:", err);
      next(err);
    }
  });

  router.post("/topics", requireAdminLevel(3), async (req, res, next) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    try {
      await db.query("INSERT INTO requestable_topics (title, is_active) VALUES (?, true)", [title]);
      return res.status(201).json({ message: "Topic created" });
    } catch (err) {
      console.error("Error creating topic:", err);
      next(err);
    }
  });

  router.put("/topics/:id", requireAdminLevel(3), async (req, res, next) => {
    const { id } = req.params;
    const { title, is_active } = req.body;
    try {
      if (title !== undefined) {
        await db.query("UPDATE requestable_topics SET title = ? WHERE id = ?", [title, id]);
      }
      if (is_active !== undefined) {
        await db.query("UPDATE requestable_topics SET is_active = ? WHERE id = ?", [is_active, id]);
      }
      return res.json({ message: "Topic updated" });
    } catch (err) {
      console.error("Error updating topic:", err);
      next(err);
    }
  });

  router.delete("/topics/:id", requireAdminLevel(3), async (req, res, next) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM requestable_topics WHERE id = ?", [id]);
      return res.json({ message: "Topic deleted" });
    } catch (err) {
      console.error("Error deleting topic:", err);
      next(err);
    }
  });

  return router;
};