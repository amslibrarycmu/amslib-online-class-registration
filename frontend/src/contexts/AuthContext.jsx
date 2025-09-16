import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: 99,
    name: 'นักศึกษาทดสอบ (Test Student)',
    status: 'นักศึกษา',
    email: 'usernormal@email.com',
    phone: '0123456789',
    pdpa: 1,
    is_active: 1,
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
