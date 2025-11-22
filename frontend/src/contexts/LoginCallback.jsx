import React, { useEffect, useContext } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // Corrected to useAuth

const LoginCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, setNewUserTempData } = useAuth(); // Import setNewUserTempData

  useEffect(() => {
    const permanentToken = searchParams.get("token");
    const temporaryToken = searchParams.get("temp_token");

    const handlePermanentLogin = async (token) => {
      try {
        // --- Correctly decode JWT payload with UTF-8 support ---
        // The old way `atob()` does not handle UTF-8 characters correctly.
        const base64Url = token.split(".")[1];
        // Replace URL-specific characters
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // Decode from Base64, then decode the resulting percent-encoded string
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const userPayload = JSON.parse(jsonPayload);

        // Determine the initial active role. Prioritize 'ผู้ดูแลระบบ'.
        let initialActiveRole = userPayload.roles?.[0] || null;
        const isAdmin = Array.isArray(userPayload.roles) && userPayload.roles.includes("ผู้ดูแลระบบ");

        if (isAdmin) {
          initialActiveRole = "ผู้ดูแลระบบ";
        }

        // Login with the determined initial active role
        login(userPayload, token, initialActiveRole);

        // Redirect based on the determined role
        if (isAdmin) {
          navigate("/index", { replace: true });
        } else {
          navigate("/classes", { replace: true });
        }
      } catch (error) {
        console.error("Permanent login callback failed:", error);
        navigate("/login", { replace: true, state: { error: "Authentication failed." } });
      }
    };

    const handleTemporaryLogin = (token) => {
      try {
        const tempData = JSON.parse(atob(token.split(".")[1]));
        setNewUserTempData(tempData, token); // Store temp data in context
        navigate("/index", { replace: true }); // Navigate to a protected route
      } catch (error) {
        console.error("Temporary login callback failed:", error);
        navigate("/login", { replace: true, state: { error: "Invalid temporary token." } });
      }
    };

    if (permanentToken) {
      // Case 1: Existing user with a permanent token
      handlePermanentLogin(permanentToken);
    } else if (temporaryToken) {
      // Case 2: New user with a temporary token.
      handleTemporaryLogin(temporaryToken);
    } else {
      // Case 3: No token found, invalid access.
      navigate("/login", { replace: true, state: { error: "Invalid login attempt." } });
    }
  }, [searchParams, navigate, login]);

  return <div>กำลังตรวจสอบข้อมูลและนำท่านเข้าสู่ระบบ...</div>;
};

export default LoginCallback;