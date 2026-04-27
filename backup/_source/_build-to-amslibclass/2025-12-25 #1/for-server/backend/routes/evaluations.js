const express = require("express");
const router = express.Router();

module.exports = (db, logActivity) => {
  // Get all class IDs the currently logged-in user has evaluated
  router.get("/user-status", async (req, res) => {
    const { email } = req.user; // Get email from the JWT payload
    const sql = "SELECT DISTINCT class_id FROM evaluations WHERE user_email = ?";
    try {
      const [results] = await db.query(sql, [email]);
      const classIds = results.map((row) => row.class_id);
      return res.json(classIds);
    } catch (err) {
      console.error(`Error fetching evaluations for user ${email}:`, err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  // Submit a new evaluation
  router.post("/", async (req, res) => {
    const {
      class_id, score_content, score_material,
      score_duration, score_format, score_speaker, comment,
    } = req.body;
    const { email: user_email } = req.user; // Get email from JWT
    if (!class_id || score_content === undefined) {
      return res.status(400).json({ error: "Missing required evaluation data." });
    }

    try {
      const checkSql = "SELECT evaluation_id FROM evaluations WHERE class_id = ? AND user_email = ?";
      const [checkResults] = await db.query(checkSql, [class_id, user_email]);

      if (checkResults.length > 0) {
        return res.status(409).json({
          error: "You have already submitted an evaluation for this class.",
        });
      }

      const insertSql = `
        INSERT INTO evaluations (class_id, user_email, score_content, score_material, score_duration, score_format, score_speaker, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        class_id, user_email, score_content, score_material,
        score_duration, score_format, score_speaker, comment || null,
      ];

      await db.query(insertSql, values);

      logActivity(req, null, "User", user_email, "SUBMIT_EVALUATION", "CLASS", class_id, {
        class_id: class_id,
      });

      res.status(201).json({ message: "Evaluation submitted successfully." });
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      return res.status(500).json({ error: "Failed to submit evaluation." });
    }
  });

  return router;
};