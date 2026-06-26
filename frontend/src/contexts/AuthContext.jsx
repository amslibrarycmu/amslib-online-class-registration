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
  const [newUserTempData, setNewUserTempDataState] = useState(null);

  // ฟังก์ชันช่วยแกะ Token (Decode JWT)
  const decodeToken = (token) => {
    try {
      // ถ้ามี lib jwt-decode ให้ใช้: return jwtDecode(token);
      // ถ้าไม่มี ใช้แบบบ้านๆ (Base64 decode) ไปก่อน:
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to decode token", error);
      return null;
    }
  };

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const storedRole = localStorage.getItem("activeRole");

      if (storedToken && storedUser) {
        setToken(storedToken);
        
        // 🟢 สำคัญ! อ่านข้อมูลล่าสุดจาก Token เสมอ (รวมถึง admin_level)
        const decoded = decodeToken(storedToken);
        const updatedUser = { 
            ...storedUser, 
            // ถ้าใน token มี admin_level ให้เอามาทับค่าเก่า
            admin_level: decoded?.admin_level || storedUser.admin_level || 0 
        };

        let initialActiveRole = storedRole;
        if (!initialActiveRole && updatedUser.roles) {
            initialActiveRole = updatedUser.roles.includes("ผู้ดูแลระบบ") 
                ? "ผู้ดูแลระบบ" 
                : updatedUser.roles[0];
        }

        setUser(updatedUser);
        setActiveRole(initialActiveRole);
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeRole");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    (userData, newUserToken, initialRole = null) => {
      return new Promise((resolve) => {
        const tokenToSet = newUserToken || token;
        
        // 🟢 แกะ Token ใหม่เพื่อเอา admin_level ล่าสุด
        let finalUserData = { ...userData };
        if (tokenToSet) {
            const decoded = decodeToken(tokenToSet);
            if (decoded && decoded.admin_level !== undefined) {
                finalUserData.admin_level = decoded.admin_level;
            }
        }

        let defaultRole = finalUserData.roles?.[0] || null;
        if (finalUserData.roles?.includes("ผู้ดูแลระบบ")) {
            defaultRole = "ผู้ดูแลระบบ";
        }

        const roleToSet =
          initialRole && finalUserData.roles?.includes(initialRole)
            ? initialRole
            : defaultRole;

        setUser(finalUserData);
        setToken(tokenToSet);
        setActiveRole(roleToSet);
        
        localStorage.setItem("user", JSON.stringify(finalUserData));
        localStorage.setItem("token", tokenToSet);
        localStorage.setItem("activeRole", roleToSet);
        resolve();
      });
    },
    [token]
  );

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
    setNewUserTempDataState(null);
  }, []);

  const switchRole = useCallback(
    (newRole) => {
      if (user && user.roles.includes(newRole)) {
        setIsSwitchingRole(true);
        setActiveRole(newRole);
        localStorage.setItem("activeRole", newRole);
        setTimeout(() => setIsSwitchingRole(false), 50);
      }
    },
    [user]
  );

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = { ...options.headers };
      if (options.params && Object.keys(options.params).length > 0) {
        const query = new URLSearchParams(options.params).toString();
        url += (url.includes('?') ? '&' : '?') + query;
        delete options.params;
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        logout();
        window.location.href = "/login?reason=unauthorized";
        throw new Error("Unauthorized");
      }
      if (response.status === 403) {
        try {
          const errorData = await response.json();
          if (errorData.code === 'PROFILE_INCOMPLETE') {
            window.location.href = "/login?reason=incomplete_profile";
            throw new Error("Profile Incomplete");
          }
        } catch (e) { /* Ignore */ }
        logout();
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

export const logFrontendActivity = (user, action_type, details = {}) => {
  if (!user) return;
  const token = localStorage.getItem("token");
  if (!token) return;

  fetch(`${import.meta.env.VITE_API_URL}/api/log-activity`, {
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