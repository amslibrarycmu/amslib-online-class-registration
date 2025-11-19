import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newUserTempData, setNewUserTempDataState] = useState(null); // For new user registration flow

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const storedRole = localStorage.getItem("activeRole");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        setActiveRole(storedRole || (storedUser.roles && storedUser.roles[0]));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      // Clear corrupted data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeRole");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData, newUserToken) => {
    const roleToSet =
      userData.roles && userData.roles.length > 0 ? userData.roles[0] : null;
    const tokenToSet = newUserToken || token; // Use new token if provided, otherwise keep the old one

    setUser(userData);
    setToken(tokenToSet);
    setActiveRole(roleToSet);

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", tokenToSet);
    localStorage.setItem("activeRole", roleToSet);
  }, [token]); // Add token to dependency array

  const setNewUserTempData = useCallback((data, tempToken) => {
    setNewUserTempDataState({ ...data, tempToken });
  }, []);

  const clearNewUserTempData = useCallback(() => {
    setNewUserTempDataState(null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setActiveRole(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("activeRole");
    setNewUserTempDataState(null); // Also clear temp data on logout
  }, []);

  const switchRole = useCallback(
    (newRole) => {
      if (user && user.roles.includes(newRole)) {
        setIsSwitchingRole(true);
        setActiveRole(newRole);
        localStorage.setItem("activeRole", newRole);
        // Use a timeout to simulate the role switch transition and prevent race conditions
        setTimeout(() => setIsSwitchingRole(false), 50);
      }
    },
    [user]
  );

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...options.headers,
      };

      // Handle query parameters for GET/DELETE requests
      if (options.params && Object.keys(options.params).length > 0) {
        const query = new URLSearchParams(options.params).toString();
        // Check if URL already has query params
        url += (url.includes('?') ? '&' : '?') + query;
        delete options.params;
      }

      // Automatically add the Authorization header if a token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Automatically stringify the body and set Content-Type for JSON objects
      if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        logout(); // Token is invalid or expired
        window.location.href = "/login?reason=unauthorized";
        throw new Error("Unauthorized");
      }

      if (response.status === 403) {
        try {
          const errorData = await response.json();
          if (errorData.code === 'PROFILE_INCOMPLETE') {
            // Redirect to login page, which will then show the complete profile modal
            window.location.href = "/login?reason=incomplete_profile";
            throw new Error("Profile Incomplete");
          }
        } catch (e) { /* Ignore if parsing fails, will fall through to generic error */ }
        logout(); // For any other 403, treat as forbidden and logout
        window.location.href = "/login?reason=forbidden";
        throw new Error("Forbidden");
      }

      return response;
    },
    [token, logout]
  );

  const value = {
    user,
    token,
    login,
    logout,
    activeRole,
    switchRole,
    isSwitchingRole,
    loading,
    authFetch,
    newUserTempData,
    setNewUserTempData,
    clearNewUserTempData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function for logging frontend activities
export const logFrontendActivity = (user, action_type, details = {}) => {
  if (!user) return;
  // This function now needs to use an authenticated fetch.
  // Since it's outside the component tree, we can't use the hook.
  // A better approach is to pass `authFetch` to it or handle it inside a component.
  // For now, we'll assume it's called from a place that has access to the token.
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch("http://localhost:5000/api/log-activity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action_type,
      details,
    }),
  }).catch((err) => console.error("Failed to log frontend activity:", err));
};