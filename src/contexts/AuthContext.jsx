import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const loginWithCMU = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          name: "example cmu",
          email: "example@cmu.ac.th",
          role: "user",
        };
        setUser(mockUser);
        resolve(true);
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithCMU, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
