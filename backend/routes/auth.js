const express = require("express");
const router = express.Router();

module.exports = (db, logActivity) => {
  router.post("/login", async (req, res) => {
    const { email } = req.body;
    const sql =
      "SELECT id, name, roles, email, phone, pdpa, is_active, photo FROM users WHERE email = ? AND is_active = 1";
    try {
      const [results] = await db.query(sql, [email]);
      if (results.length === 0) {
        return res
          .status(401)
          .json({ error: "Invalid email or user not found" });
      }
      const user = results[0];
      logActivity(
        req,
        user.id,
        user.name,
        user.email,
        "LOGIN_SUCCESS",
        "SESSION",
        null,
        null
      );
      res.json({
        id: user.id,
        name: user.name,
        roles: JSON.parse(user.roles || "[]"),
        email: user.email,
        phone: user.phone,
        pdpa: user.pdpa,
        is_active: user.is_active,
        photo: user.photo,
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  router.post("/check-or-create-user", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const formatUser = (user) => ({
      ...user,
      roles: JSON.parse(user.roles || "[]"),
    });

    try {
      const findSql = "SELECT * FROM users WHERE email = ?";
      const [results] = await db.query(findSql, [email]);

      if (results.length > 0) {
        const user = results[0];
        if (user.pdpa === 1 && user.is_active === 1) {
          logActivity(req, user.id, user.name, user.email, "LOGIN_SUCCESS", "SESSION", null, null);
          res.json({ status: "ok", user: formatUser(user) });
        } else {
          res.json({ status: "profile_incomplete", user: formatUser(user) });
        }
      } else {
        const insertSql =
          "INSERT INTO users (email, name, roles, pdpa, is_active) VALUES (?, ?, ?, ?, ?)";
        const newUser = {
          email,
          name: "",
          roles: "[]",
          pdpa: 0,
          is_active: 1,
        };
        const [insertResult] = await db.query(insertSql, [
          newUser.email,
          newUser.name,
          newUser.roles,
          newUser.pdpa,
          newUser.is_active,
        ]);

        logActivity(
          req,
          insertResult.insertId,
          newUser.name,
          newUser.email,
          "CREATE_USER",
          "USER",
          insertResult.insertId,
          null
        );

        const createdUser = { id: insertResult.insertId, ...newUser };
        res.json({ status: "profile_incomplete", user: formatUser(createdUser) });
      }
    } catch (err) {
      console.error("Check or create user error:", err);
      return res.status(500).json({ error: "Database error" });
    }
  });

  return router;
};