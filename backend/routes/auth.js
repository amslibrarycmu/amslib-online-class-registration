const express = require("express");
const router = express.Router();
const { ConfidentialClientApplication } = require("@azure/msal-node");
const jwt = require("jsonwebtoken");

module.exports = (db, logActivity) => {
  // --- Initialize MSAL Client Application once ---
  const pca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MS_ENTRA_ID_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.MS_ENTRA_ID_TENANT_ID}`,
      clientSecret: process.env.MS_ENTRA_ID_CLIENT_SECRET,
    },
  });

  const redirectUri = process.env.MS_ENTRA_ID_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  // Route to initiate login
  router.get("/login", (req, res) => {
    const authCodeUrlParameters = {
      // Explicitly request both standard OIDC scopes and the necessary Graph API scope.
      // This ensures we get an ID token and an access token with the right permissions.
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

  // Route for handling the redirect from Microsoft
  router.get("/callback", async (req, res) => {
    // Handle authentication errors from Microsoft
    if (req.query.error) {
      console.error(
        `Error from Microsoft: ${req.query.error}: ${req.query.error_description}`
      );
      // Redirect back to login with an error message
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          req.query.error_description || "Authentication failed"
        )}`
      );
    }

    const tokenRequest = {
      code: req.query.code,
      // Use the standard Microsoft Graph API scope
      scopes: ["openid", "profile", "email", "User.Read"],
      redirectUri: redirectUri,
    };

    try {
      const response = await pca.acquireTokenByCode(tokenRequest);
      const { accessToken, account } = response;

      // Use the accessToken to get the user's profile from Microsoft Graph API
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

      // --- 🟡 เพิ่ม LOG เพื่อดักจับตัวร้าย ---
      console.log("DEBUG: Status Code:", graphResponse.status);
      console.log(
        "DEBUG: Response Body (First 100 chars):",
        responseText.substring(0, 100)
      );
      // ------------------------------------

      let graphData;

      try {
        graphData = JSON.parse(responseText);
      } catch (e) {
        console.error("--- ERROR: FAILED TO PARSE MS GRAPH API RESPONSE ---");
        console.error("Status Code:", graphResponse.status); // ดู Status code
        console.error("Full Response Text:", responseText); // ดูข้อความเต็มๆ ว่า "บ..." คืออะไร
        console.error("--- END OF MS GRAPH API RESPONSE ---");

        // ส่ง Error กลับไปแบบจัดการได้ แทนที่จะปล่อยให้ Server Crash
        return res.redirect(
          `${frontendUrl}/login?error=${encodeURIComponent(
            "Microsoft Graph Error: " + responseText.substring(0, 50)
          )}`
        );
      }

      // Use the standard fields from the Microsoft Graph API response
      const email =
        graphData.mail || graphData.userPrincipalName || account.username;
      const name = graphData.displayName || account.name;

      // Check if user exists in our database
      const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);

      let user;
      if (users.length > 0) {
        user = users[0];
        // The mysql2 driver automatically parses JSON columns, so user.roles is already an array.
        if (!Array.isArray(user.roles)) {
          user.roles = [];
        }

        // --- Existing User Flow ---
        // Create a JWT for our application
        const jwtPayload = {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles, // Use the user.roles array that was already parsed
          profile_completed: !!user.profile_completed, // Ensure this is a boolean
        };
        const appToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
          expiresIn: "1d",
        });

        // Log the successful login activity
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
        // Redirect to the callback page with the permanent token
        return res.redirect(
          `${frontendUrl}/login-callback?token=${tokenParam}`
        );
      } else {
        // --- New User Flow ---
        // Don't create in DB yet. Create a temporary token.
        const tempPayload = {
          email,
          name,
          is_temporary: true, // Flag to indicate this is a temporary token
        };
        const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, {
          expiresIn: "15m", // Short-lived token for completing registration
        });

        // Redirect to the callback page with the temporary token
        return res.redirect(
          `${frontendUrl}/login-callback?temp_token=${tempToken}`
        );
      }
    } catch (error) {
      console.error("Error acquiring token or fetching user data:", error);
      res.status(500).send("Error during authentication callback");
    }
  });

  // Route for completing the registration for a new user
  router.post("/complete-registration", async (req, res) => {
    const { temp_token, roles, phone, pdpa } = req.body;

    if (!temp_token) {
      return res.status(401).json({ message: "Missing temporary token." });
    }

    try {
      // 1. Verify the temporary token
      const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
      if (!decoded.is_temporary) {
        return res.status(403).json({ message: "Invalid token type." });
      }

      const { email, name } = decoded;

      // 2. Check if user has been created in the meantime
      const [existingUsers] = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: "User already exists." });
      }

      // 3. Create the new user in the database
      const newUser = {
        email,
        name,
        original_name: name, // Set original_name to the name from CMU OAuth
        roles: JSON.stringify(roles || []),
        phone: phone || null,
        pdpa: pdpa ? 1 : 0,
        is_active: true,
        profile_completed: true, // Profile is complete upon creation
      };

      const [result] = await db.query("INSERT INTO users SET ?", newUser);
      const newUserId = result.insertId;

      // 4. Log the registration activity
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

      // 5. Create a final, permanent JWT for the new user
      const finalPayload = {
        id: newUserId,
        email: email,
        name: name,
        roles: roles || [],
        profile_completed: true,
      };
      const finalToken = jwt.sign(finalPayload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      // 6. Send back the final token and user data
      res.status(201).json({
        message: "User registered successfully.",
        token: finalToken,
        user: finalPayload, // Send user payload back to frontend
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
