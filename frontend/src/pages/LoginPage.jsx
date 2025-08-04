import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";

const LoginPage = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "useradmin@email.com" }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      setUser(userData); // อัปเดตข้อมูลผู้ใช้ใน AuthContext
      console.log("Login successful:", userData); // แสดงข้อมูลผู้ใช้ใน console
      navigate("/dashboard"); // นำทางไปยังหน้า Dashboard
    } catch (error) {
      console.error("Login error:", error);
      alert("ไม่สามารถเข้าสู่ระบบได้");
    }
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
        <button
          onClick={handleLogin}
          className="bg-purple-700 border border-gray-400 text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
        >
          เข้าสู่ระบบผ่านบัญชี CMU
        </button>
      </div>
    </div>
  );
};

export default LoginPage;