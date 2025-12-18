import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import cmuLogo from "../assets/cmu-logo.svg";

const LoginPage = () => {
  const { login, user } = useAuth(); // Add user from useAuth
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        login(userData, token); // Just log the user in
        // The redirection logic will be handled by the effect below
      } catch (error) {
        console.error("Failed to parse user data from URL:", error);
        alert("เกิดข้อผิดพลาดในการล็อกอินด้วย CMU Account");
        navigate("/login", { replace: true });
      }
    }
  }, []); // Run only once on component mount

  useEffect(() => {
    // This effect runs when the user state changes after login
    if (user) {
      // If profile is not completed, App.jsx will show the modal.
      // We just need to navigate to a protected route.
      // The user will stay on the page with the modal.
      if (!user.profile_completed) {
        navigate("/index", { replace: true });
        return;
      }

      // Redirect based on role for users with completed profiles
      if (Array.isArray(user.roles) && user.roles.includes("ผู้ดูแลระบบ")) {
        navigate("/index", { replace: true });
      } else {
        navigate("/classes", { replace: true });
      }
    }
  }, [user, navigate]);

  const handleCmuLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/login";
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
        <p className="text-2xl font-semibold mb-6 px-15 leading-10">
          ระบบจัดการการอบรมเชิงปฏิบัติการ  <br /> AMS Library Class
          <br />  
        </p>
        <div className="flex flex-col items-center gap- w-80 mx-auto mb-4">
          <button
            onClick={handleCmuLogin}
            className="bg-[#9f75b4] w-full text-white font-bold py-2 px-4 rounded-md shadow-md hover:bg-[#8e68a4] transition-colors flex items-center justify-center gap-2"
          >
            <img src={cmuLogo} alt="CMU Logo" className="h-6 w-7" />
            <span>เข้าสู่ระบบด้วย</span>
            <span> CMU Account</span>
          </button>
        </div>
        {/* <div className="relative flex py-5 items-center w-80 mx-auto">
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <form
          onSubmit={handleLogin}
          className="flex flex-col items-center gap-4 w-80 mx-auto"
        >
          <input
            type="email"
            placeholder="ระบุอีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 w-full text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
          >
            เข้าสู่ระบบ
          </button>
        </form> */}
      </div>
    </div>
  );
};

export default LoginPage;
