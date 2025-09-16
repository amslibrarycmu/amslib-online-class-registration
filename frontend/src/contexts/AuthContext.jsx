import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // TEMPORARY: Hardcoded admin user for development UI testing.
  // REMEMBER TO REVERT THIS BEFORE DEPLOYMENT!
  const [user, setUser] = useState({
    id: "dev-admin-123",
    username: "devadmin",
    status: "ผู้ดูแลระบบ",
    // Add any other properties that your application expects for an admin user
    // e.g., email: "devadmin@example.com", name: "Development Admin"
  });

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
