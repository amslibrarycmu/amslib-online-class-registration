import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

// --- 🟢 1. กำหนดค่าคงที่ของ Admin Level ---
const ADMIN_LEVELS = {
  VIEWER: 1,
  MANAGER: 2,
  SUPER: 3,
};

const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const SwitchRoleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.666-1.885z"
      clipRule="evenodd"
    />
  </svg>
);

// 🟢 เพิ่ม Mapping สำหรับชื่อบทบาทตาม Level
const ADMIN_LEVEL_ROLE_MAP = {
  1: "ผู้สอน",
  2: "ผู้จัดการเนื้อหา",
  3: "ผู้ดูแลระบบ",
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    login,
    logout,
    activeRole,
    switchRole,
    isSwitchingRole,
    authFetch,
  } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  // --- State ใหม่สำหรับรูป Preview ชั่วคราว ---
  const [localPreview, setLocalPreview] = useState(null);

  // --- 🟢 2. ดึงค่า admin_level (ถ้าไม่มีให้เป็น 3 กรณีที่เป็นผู้ดูแลระบบ) ---
  const adminLevel = user?.admin_level || (activeRole === "ผู้ดูแลระบบ" ? 3 : 0);

  // 🟢 แก้ไขเงื่อนไข: เป็นผู้ดูแลระบบเมื่อ role ตรง
  const isAdminRoleActive = activeRole === "ผู้ดูแลระบบ";

  // 🟢 หาชื่อบทบาทที่ถูกต้องเพื่อแสดงผล
  const displayRole = isAdminRoleActive
    ? (ADMIN_LEVEL_ROLE_MAP[adminLevel] || activeRole)
    : activeRole;

  let firstname = "";
  let lastname = "";
  if (user?.name) {
    const parts = user.name.split(" ");
    firstname = parts[0] || "";
    lastname = parts.slice(1).join(" ") || "";
  }

  // เคลียร์ memory เมื่อ component ถูกทำลาย
  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  // เคลียร์ preview เมื่อ user เปลี่ยน (เช่น logout)
  useEffect(() => {
    setLocalPreview(null);
  }, [user?.email]);

  // ทำให้ useEffect นี้ทำงานเมื่อ user.photo "เปลี่ยนค่า" เท่านั้น
  // ไม่ใช่ทำงานทุกครั้งที่มัน "มีค่า"
  useEffect(() => {
    setImageVersion(Date.now());
  }, [user?.photo]); // Dependency array ยังคงเดิม แต่ logic ภายในเปลี่ยน

  const handleRoleSwitch = () => {
    if (!user?.roles || user.roles.length <= 1) return;
    const currentIndex = user.roles.indexOf(activeRole);
    const nextIndex = (currentIndex + 1) % user.roles.length;
    const newRole = user.roles[nextIndex];
    if (!isSwitchingRole) {
      authFetch(`${import.meta.env.VITE_API_URL}/api/log-activity`, {
        method: "POST",
        body: {
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          action_type: "SWITCH_ROLE",
          details: { from_role: activeRole, to_role: newRole },
        },
      }).catch((err) => console.error("Failed to log activity:", err));
      switchRole(newRole);
      if (newRole === "ผู้ดูแลระบบ") navigate("/index");
      else navigate("/classes");
    }
  };

  const handleOverviewClick = () => {
    if (activeRole === "ผู้ดูแลระบบ") navigate("/index");
    else navigate("/classes");
  };

  // --- Logic เลือกรูปที่จะแสดง ---
  const displayImageSrc = localPreview
    ? localPreview // 1. ถ้ามีรูปเพิ่งอัปโหลด ให้ใช้เลย
    : user?.photo // 2. ถ้าไม่มี ให้ใช้รูปจาก Server
    ? `${import.meta.env.VITE_API_URL}/api/users/photo/${user.photo}?t=${imageVersion}`
    : profile; // 3. ถ้าไม่มีอะไรเลย ใช้รูป Default

  // --- 🟢 Helper Component สำหรับสร้างลิงก์เมนู ---
  const MenuLink = ({ to, label }) => (
    <span
      onClick={() => navigate(to)}
      className={`text-black cursor-pointer hover:underline text-[1.25rem] ${
        location.pathname === to ? "underline" : ""
      }`}
    >
      {label}
    </span>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white/50 backdrop-blur-md rounded-full shadow-lg"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-white/85 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div
        className={`w-[325px] flex-shrink-0 min-h-screen text-center bg-[#f0f0f0] flex flex-col gap-[10px] p-[1rem] transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-auto ${
          isSidebarOpen ? "translate-x-0 fixed z-50" : "-translate-x-full fixed"
        }`}
      >
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-4">
            <img src={amsliblogo} width={200} className="mx-auto" alt="logo" />
          </div>
          <p className="text-[16px] font-semibold text-black my-6">
            ระบบจัดการการอบรมเชิงปฏิบัติการ <br /> AMS Library Class
          </p>
          <div className="flex items-center justify-center gap-[15px] my-[10px]">
            <div className="relative">
              <img
                key={localPreview || imageVersion} // บังคับวาดใหม่ถ้า preview หรือ version เปลี่ยน
                src={displayImageSrc}
                width={100}
                height={100}
                className="w-[100px] h-[100px] object-cover rounded-full my-auto bg-gray-200 border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                alt="profile"
                onError={(e) => {
                  e.target.src = profile;
                  // ถ้า preview พัง ให้ล้างออกแล้วลองโหลดจาก server
                  if (localPreview) setLocalPreview(null);
                }}
                // onClick ถูกปิดไว้ตามความต้องการ
              />
            </div>

            <div className="flex flex-col text-start px-0 grow text-black">
              <span>
                {firstname} {lastname}
              </span>{" "}
              <span className="text-xs text-black">{user?.email}</span>
              <div className="flex items-center gap-2">
                {user?.roles && user.roles.length > 1 && (
                  <button
                    onClick={handleRoleSwitch}
                    className="text-purple-600 hover:text-purple-800"
                    title="สลับบทบาท"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "black",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <SwitchRoleIcon />
                  </button>
                )}
                <span className="text-xs text-black py-1">({displayRole})</span>
              </div>
              <span
                className="font-semibold mt-1 cursor-pointer hover:underline"
                style={{ color: "black" }}
                onClick={() => {
                  authFetch(`${import.meta.env.VITE_API_URL}/api/log-activity`, {
                    method: "POST",
                    body: {
                      user_id: user.id,
                      user_name: user.name,
                      user_email: user.email,
                      action_type: "LOGOUT",
                    },
                  }).catch((err) =>
                    console.error("Failed to log activity:", err)
                  );
                  logout();
                  alert("ออกจากระบบสำเร็จ");
                  navigate("/login");
                }}
              >
                <span className="font-semibold"> ออกจากระบบ </span>
              </span>
            </div>
          </div>

          {/* --- 🟢 3. ส่วนแสดงเมนูตาม Level (โครงสร้างใหม่ตามคำขอ) --- */}
          <div className="flex flex-col items-center gap-5 mt-4">
            {isAdminRoleActive ? (
              <>
                {/* === Level 1+ (ผู้สอน) === */}
                {adminLevel >= ADMIN_LEVELS.VIEWER && (
                  <>
                    <MenuLink to="/index" label="ห้องเรียน" />
                    <MenuLink to="/creations" label="สร้าง" />
                  </>
                )}

                {/* === Level 2+ (ผู้จัดการเนื้อหา) === */}
                {adminLevel >= ADMIN_LEVELS.MANAGER && (
                  <>
                    <MenuLink to="/statistics" label="สถิติ" />
                    <MenuLink to="/admin/class-requests" label="ตรวจสอบคำขอ" />
                    <MenuLink to="/topic-management" label="จัดการหัวข้อ" />
                  </>
                )}

                {/* === Level 3 (ผู้ดูแลระบบสูงสุด) === */}
                {adminLevel >= ADMIN_LEVELS.SUPER && (
                  <>
                    <MenuLink to="/user-management" label="สิทธิ์" />
                    <MenuLink to="/activity-logs" label="ประวัติการใช้งาน" />
                  </>
                )}
              </>
            ) : (
              <>
                <MenuLink to="/classes" label="หัวข้อที่เปิดสอน" />
                <MenuLink to="/past-classes" label="ประวัติการเข้าร่วม" />
                <MenuLink to="/class-request" label="สร้างคำขอ" />
              </>
            )}
          </div>
        </div>
        <div className="mt-auto lg:hidden">
          <button
            className="w-full flex items-center justify-center p-3 rounded-lg text-black hover:bg-gray-200 transition-colors"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="หดเมนู"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
            <span className="ml-2 font-semibold">ปิดเมนู</span>
          </button>
        </div>
      </div>
    </>
  );
}
