import React, { createContext, useContext, useState } from 'react';

export const logFrontendActivity = async (user, actionType, details = {}) => {
  if (!user) return; // Don't log if user is not available
  try {
    await fetch('http://localhost:5000/api/log-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        details: details,
        user_id: user?.id,
        user_name: user?.name,
        user_email: user?.email,
      }),
    });
  } catch (error) {
    console.error('Failed to log frontend activity:', error);
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const login = (userData) => {
    setUser(userData);
    // Set the initial active role. Prioritize 'ผู้ดูแลระบบ'.
    if (userData?.roles?.includes("ผู้ดูแลระบบ")) {
      setActiveRole("ผู้ดูแลระบบ");
    } else {
      setActiveRole(userData?.roles?.[0] || null);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveRole(null);
  };

  const switchRole = (newRole) => {
    if (user?.roles?.includes(newRole)) {
      setIsSwitchingRole(true);
      setActiveRole(newRole);
      // Reset after a short delay to allow navigation to complete
      setTimeout(() => setIsSwitchingRole(false), 500);
    }
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, isSwitchingRole, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);