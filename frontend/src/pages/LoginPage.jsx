import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import amsliblogo from "../assets/amslib-logo.svg";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCMU } = useAuth();

  const handleLogin = async () => {
    const success = await loginWithCMU();
    if (success) {
      navigate("/dashboard");
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
          className="bg-white border border-gray-400 text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
        >
          เข้าสู่ระบบผ่านบัญชี CMU
        </button>
      </div>
    </div>
  );
}
