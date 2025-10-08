import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import cmuLogo from "../assets/cmu-logo.svg";
import CompleteProfileModal from "../components/CompleteProfileModal";

const LoginPage = () => {
  const { login, authFetch } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));

        // Check if the user needs to complete their profile
        if (!userData.profile_completed) {
          setProfileData(userData);
          setIsModalOpen(true);
          // We still log them in so authFetch works for the profile update
          login(userData, token);
        } else {
          login(userData, token);
          // Redirect based on role after successful login
          if (Array.isArray(userData.roles) && userData.roles.includes("ผู้ดูแลระบบ")) {
            navigate("/index", { replace: true });
          } else {
            navigate("/classes", { replace: true });
          }
        }
      } catch (error) {
        console.error("Failed to parse user data from URL:", error);
        alert("เกิดข้อผิดพลาดในการล็อกอินด้วย CMU Account");
        navigate("/login", { replace: true });
      }
    }
  }, [login, navigate]);

  const performLogin = async (email) => {
    // This function is for the old email login, which is currently disabled.
    // It can be re-enabled if needed.
    console.log(`Attempting to log in with ${email}`);
  };

  const handleProfileSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Assuming you have an `authFetch` in your useAuth context
      // that handles authenticated requests.
      const payload = {
        ...formData,
        original_name: profileData.name, // Add original name from initial data
      };

      const response = await authFetch(
        `http://localhost:5000/api/users/update-profile`,
        {
          method: "PUT",
          body: payload,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedUser = await response.json();
      setIsModalOpen(false);
      // Re-login with updated user data
      const token = localStorage.getItem('token');
      login(updatedUser, token);

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
