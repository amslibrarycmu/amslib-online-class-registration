const express = require("express");
const router = express.Router();
const { ConfidentialClientApplication } = require("@azure/msal-node");
const jwt = require("jsonwebtoken");

module.exports = (db, logActivity) => {
  if (!process.env.JWT_SECRET) {
    console.error("❌ FATAL ERROR: JWT_SECRET is not defined.");
  }

  const pca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MS_ENTRA_ID_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.MS_ENTRA_ID_TENANT_ID}`,
      clientSecret: process.env.MS_ENTRA_ID_CLIENT_SECRET,
    },
  });

  const redirectUri = process.env.MS_ENTRA_ID_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  router.get("/login", (req, res) => {
    const authCodeUrlParameters = {
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: redirectUri,
    };

    pca
      .getAuthCodeUrl(authCodeUrlParameters)
      .then((response) => {
        res.redirect(response);
      })
      .catch((error) => {
        console.error("Error generating auth code URL:", error);
        res.status(500).send("Error initiating login");
      });
  });

  router.get("/callback", async (req, res) => {
    if (req.query.error) {
      console.error(
        `Error from Microsoft: ${req.query.error}: ${req.query.error_description}`
      );
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          req.query.error_description || "Authentication failed"
        )}`
      );
    }

    const tokenRequest = {
      code: req.query.code,
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: redirectUri,
    };

    try {
      const response = await pca.acquireTokenByCode(tokenRequest);
      const { accessToken, account } = response;
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!graphResponse.ok) {
        const errorBody = await graphResponse
          .text()
          .catch(() => "Could not read error body");
        console.error("Graph API request failed:", {
          status: graphResponse.status,
          body: errorBody,
        });
        throw new Error(
          `Failed to fetch user profile from Microsoft Graph. Status: ${graphResponse.status}`
        );
      }

      const responseText = await graphResponse.text();
      let graphData;

      try {
        graphData = JSON.parse(responseText);
      } catch (e) {
        console.error("--- ERROR: FAILED TO PARSE MS GRAPH API RESPONSE ---");
        console.error("Status Code:", graphResponse.status);
        console.error("Full Response Text:", responseText);
        console.error("--- END OF MS GRAPH API RESPONSE ---");

        return res.redirect(
          `${frontendUrl}/login?error=${encodeURIComponent(
            "Microsoft Graph Error: " + responseText.substring(0, 50)
          )}`
        );
      }

      const email = graphData.mail || graphData.userPrincipalName || account.username;
      const name = graphData.displayName || account.name;

      const userQuery = `
        SELECT u.*, ap.admin_level 
        FROM users u
        LEFT JOIN admin_permissions ap ON u.id = ap.user_id
        WHERE u.email = ?
      `;

      const [users] = await db.query(userQuery, [email]);

      let user;
      if (users.length > 0) {
        user = users[0];
        
        if (typeof user.roles === 'string') {
            try {
                user.roles = JSON.parse(user.roles || "[]");
            } catch (e) {
                user.roles = [];
            }
        } else if (!Array.isArray(user.roles)) {
            user.roles = [];
        }
        const jwtPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          admin_level: user.admin_level !== null ? parseInt(user.admin_level) : null,
          profile_completed: !!user.profile_completed,
          photo: user.photo, 
        };
        const appToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
          expiresIn: "1d",
        });

        logActivity(
          req,
          user.id,
          user.name,
          user.email,
          "LOGIN_SUCCESS",
          "USER",
          user.id,
          null
        );

        const tokenParam = encodeURIComponent(appToken);
        return res.redirect(
          `${frontendUrl}/login-callback?token=${tokenParam}`
        );
      } else {
        const tempPayload = {
          email,
          name,
          is_temporary: true, 
        };
        const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, {
          expiresIn: "15m", 
        });

        return res.redirect(
          `${frontendUrl}/login-callback?temp_token=${tempToken}`
        );
      }
    } catch (error) {
      console.error("Error acquiring token or fetching user data:", error);
      const errorMessage = encodeURIComponent("Authentication failed during callback");
      return res.redirect(
        `${frontendUrl}/login?error=${errorMessage}`
      );
    }
  });


  router.post("/complete-registration", async (req, res) => {
    const { temp_token, roles, phone, pdpa } = req.body;

    if (!temp_token) {
      return res.status(401).json({ message: "Missing temporary token." });
    }

    try {
      const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
      if (!decoded.is_temporary) {
        return res.status(403).json({ message: "Invalid token type." });
      }

      const { email, name } = decoded;

      const [existingUsers] = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: "User already exists." });
      }

      const newUser = {
        email,
        name,
        original_name: name, 
        roles: JSON.stringify(roles || []),
        phone: phone || null,
        pdpa: pdpa ? 1 : 0,
        is_active: true,
        profile_completed: true, 
      };

      const [result] = await db.query("INSERT INTO users SET ?", newUser);
      const newUserId = result.insertId;

      logActivity(
        req,
        newUserId,
        name,
        email,
        "REGISTER_USER",
        "USER",
        newUserId,
        {
          source: "CMU_OAUTH",
        }
      );

      const finalPayload = {
        id: newUserId,
        email: email,
        name: name,
        roles: roles || [],
        profile_completed: true,
        admin_level: null,
        photo: null,
      };
      const finalToken = jwt.sign(finalPayload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res.status(201).json({
        message: "User registered successfully.",
        token: finalToken,
        user: finalPayload, 
      });
    } catch (error) {
      console.error("Error during registration completion:", error);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Registration session expired. Please log in again.",
        });
      }
      return res
        .status(500)
        .json({ message: "Server error during registration." });
    }
  });

  return router;
};