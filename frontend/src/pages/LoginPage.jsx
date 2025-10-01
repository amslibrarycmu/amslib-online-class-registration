import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import cmuLogo from "../assets/cmu-logo.svg";
import CompleteProfileModal from "../components/CompleteProfileModal";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const performLogin = async (email) => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/check-or-create-user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        throw new Error(`Login failed for ${email}`);
      }

      const result = await response.json();

      if (result.status === "profile_incomplete") {
        setProfileData(result.user);
        setIsModalOpen(true);
      } else {
        login(result.user);
        if (
          Array.isArray(result.user.roles) &&
          result.user.roles.includes("ผู้ดูแลระบบ")
        ) {
          navigate("/index");
        } else {
          navigate("/classes");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("ไม่สามารถเข้าสู่ระบบได้");
    }
  };

  const handleProfileSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/update-profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setIsModalOpen(false);
      login(updatedUser);

      if (
        Array.isArray(updatedUser.roles) &&
        updatedUser.roles.includes("ผู้ดูแลระบบ")
      ) {
        navigate("/index");
      } else {
        navigate("/classes");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [email, setEmail] = useState("");
  const handleLogin = async (e) => {
    e.preventDefault();
    performLogin(email);
  };

  const handleAdminLogin = () => {
    performLogin("useradmin@email.com");
  };

  const handleNormalUserLogin = () => {
    performLogin("usernormal@email.com");
  };

  const handleCmuLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/login";
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-white">
      <CompleteProfileModal
        isOpen={isModalOpen}
        user={profileData}
        onSubmit={handleProfileSubmit}
        isSubmitting={isSubmitting}
      />
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
        <div className="relative flex py-5 items-center w-80 mx-auto">
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
        </form>
        <div className="relative flex py-5 items-center w-80 mx-auto">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400">หรือ</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <div className="flex flex-col items-center gap-4 w-80 mx-auto">
          <button
            onClick={handleAdminLogin}
            className="bg-purple-700 w-full text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
          >
            ทดสอบในบทบาท "ผู้ดูแลระบบ"
          </button>
          <button
            onClick={handleNormalUserLogin}
            className="bg-gray-500 w-full text-white font-bold py-2 px-6 rounded-full shadow hover:shadow-md"
          >
            ทดสอบในบทบาท "ผู้ใช้ทั่วไป"
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
