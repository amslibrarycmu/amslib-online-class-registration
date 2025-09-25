import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);

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
      setActiveRole(newRole);
    }
  };

  return (
    <AuthContext.Provider value={{ user, activeRole, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);