import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";

const LoginPage = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Generic login handler
  const performLogin = async (email) => {
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Login failed for ${email}`);
      }

      const userData = await response.json();
      setUser(userData);
      console.log("Login successful:", userData);

      // Redirect based on user status
      if (userData.status === 'ผู้ดูแลระบบ') {
        navigate("/index");
      } else {
        navigate("/classes");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("ไม่สามารถเข้าสู่ระบบได้");
    }
  };

  const handleAdminLogin = () => {
    performLogin("useradmin@email.com");
    //performLogin("usersupport@email.com");
  };

  const handleNormalUserLogin = () => {
    //performLogin("usernormal@email.com");
    performLogin("usernew@email.com");
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-white">
      <div className="text-center">
        <img
          src={amsliblogo}
          alt="AMS Library Logo"
          className="mx-auto mb-4"
          width={250}
        />
        <p className="text-2xl font-semibold mb-6 px-15">
          AMS Library Class Registration System
          <br />
          (HSL KM)
        </p>
        <div className="flex flex-col items-center gap-4 w-80 mx-auto">
            <button
              onClick={handleAdminLogin}
              className="bg-purple-700 w-full text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
            >
              เข้าสู่ระบบ (ผู้ดูแลระบบ)
            </button>
            <button
              onClick={handleNormalUserLogin}
              className="bg-gray-500 w-full text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
            >
              เข้าสู่ระบบ (ผู้ใช้ทั่วไป)
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;