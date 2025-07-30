import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // mock user admin
  const [user, setUser] = useState({
    name: "user admin",
    status: "ผู้ดูแลระบบ",
    email: "useradmin@email.com",
    phone: "0900000000",
    pdpa: true,
    is_active: true,
  });

  // mock login function
  const loginWithCMU = async () => {
    setUser({
      name: "user admin",
      status: "ผู้ดูแลระบบ",
      email: "useradmin@email.com",
      phone: "0900000000",
      pdpa: true,
      is_active: true,
    });
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, loginWithCMU }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
