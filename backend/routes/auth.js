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
      scopes: ["user.read"],
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
      console.error(`Error from Microsoft: ${req.query.error}: ${req.query.error_description}`);
      // Redirect back to login with an error message
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(req.query.error_description || 'Authentication failed')}`);
    }

    const tokenRequest = {
      code: req.query.code,
      scopes: ["user.read"],
      redirectUri: redirectUri,
    };

    try {
      const response = await pca.acquireTokenByCode(tokenRequest);
      const { accessToken, account } = response;

      // Use accessToken to get user profile from Microsoft Graph API
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!graphResponse.ok) {
        throw new Error("Failed to fetch user profile from Microsoft Graph");
      }

      const graphData = await graphResponse.json();
      const email = graphData.mail || graphData.userPrincipalName;
      const name = graphData.displayName;

      // Check if user exists in our database
      const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);

      let user;
      if (users.length > 0) {
        user = users[0];
        user.roles = JSON.parse(user.roles || "[]");
      } else {
        // Create a new user if they don't exist
        const defaultRole = []; // Set default role to empty
        const newUser = {
          email,
          name,
          roles: JSON.stringify(defaultRole),
          is_active: true,
          profile_completed: false, // Explicitly set to false for new users
        };
        const [result] = await db.query("INSERT INTO users SET ?", newUser);
        user = {
          ...newUser,
          id: result.insertId, // Get the newly created user ID
          roles: defaultRole };
      }

      // Create a JWT for our application
      const jwtPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        profile_completed: user.profile_completed, // Add profile completion status to JWT
      };
      const appToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

      // Log the successful login activity
      logActivity(req, user.id, user.name, user.email, "LOGIN_SUCCESS", "USER", user.id, null);

      const userParam = encodeURIComponent(JSON.stringify(user));
      const tokenParam = encodeURIComponent(appToken);

      res.redirect(`${frontendUrl}/login?token=${tokenParam}&user=${userParam}`);
    } catch (error) {
      console.error("Error acquiring token or fetching user data:", error);
      res.status(500).send("Error during authentication callback");
    }
  });

  return router;
};