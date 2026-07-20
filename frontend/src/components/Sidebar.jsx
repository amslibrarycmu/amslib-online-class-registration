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

// --- SVG Icons ---
const AcademicCapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
  </svg>
);
const PlusCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const InboxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 12.839a2.25 2.25 0 00-.1.661z" />
  </svg>
);
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const DocumentTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
  </svg>
);
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const LightBulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.82 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.496 1.508 1.333 1.508 2.316V18" />
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
  useEffect(() => {
    setImageVersion(Date.now());
  }, [user?.photo]);

  const handleRoleSwitch = () => {
    if (!user?.roles || user.roles.length <= 1) return;
    const currentIndex = user.roles.indexOf(activeRole);
    const nextIndex = (currentIndex + 1) % user.roles.length;
    const newRole = user.roles[nextIndex];
    if (!isSwitchingRole) {
      authFetch(`${import.meta.env.VITE_API_URL}/api/log-activity`, {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          action_type: "SWITCH_ROLE",
          details: { from_role: activeRole, to_role: newRole },
        }),
      }).catch((err) => console.error("Failed to log activity:", err));
      switchRole(newRole);
      if (newRole === "ผู้ดูแลระบบ") navigate("/index");
      else navigate("/classes");
    }
  };

  // --- Logic เลือกรูปที่จะแสดง ---
  const displayImageSrc = localPreview
    ? localPreview // 1. ถ้ามีรูปเพิ่งอัปโหลด ให้ใช้เลย
    : user?.photo // 2. ถ้าไม่มี ให้ใช้รูปจาก Server
    ? `${import.meta.env.VITE_API_URL}/api/users/photo/${user.photo}?t=${imageVersion}`
    : profile; // 3. ถ้าไม่มีอะไรเลย ใช้รูป Default

  // --- 🟢 Helper Component สำหรับสร้างลิงก์เมนูพร้อมไอคอน ---
  const MenuLink = ({ to, label, icon }) => {
    const isActive = location.pathname === to;
    return (
      <div
        onClick={() => navigate(to)}
        className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-xl cursor-pointer transition-all duration-200 ${
          isActive 
            ? "bg-purple-600 text-white shadow-md shadow-purple-500/30" 
            : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
        }`}
      >
        <div className={`w-6 h-6 flex-shrink-0 ${isActive ? "text-white" : "text-purple-600"}`}>
          {icon}
        </div>
        <span className={`text-[1.1rem] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden w-full bg-white shadow-sm flex items-center justify-between p-4 z-20 flex-shrink-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-purple-50 text-purple-700 rounded-lg shadow-sm hover:bg-purple-100 transition-colors"
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
        <img src={amsliblogo} className="h-10 object-contain" alt="logo" />
        <div className="w-10"></div> {/* Spacer to center the logo */}
      </div>

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-white/85 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div
        className={`w-[85vw] sm:w-[325px] max-w-[325px] flex-shrink-0 min-h-screen bg-[#f0f0f0] flex flex-col gap-[10px] pb-6 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-auto ${
          isSidebarOpen ? "translate-x-0 fixed z-50 overflow-y-auto" : "-translate-x-full fixed"
        }`}
      >
        <div className="flex-grow flex flex-col p-[1rem]">
          <div className="flex justify-between items-center mb-4">
            <img src={amsliblogo} className="mx-auto w-32 md:w-48 object-contain" alt="logo" />
          </div>
          <div className="flex items-center justify-center gap-[15px] my-[10px]">
            <div className="relative flex-shrink-0">
              <img
                key={localPreview || imageVersion}
                src={displayImageSrc}
                width={80}
                height={80}
                className="w-[80px] h-[80px] object-cover rounded-full my-auto bg-gray-200 border-2 border-white shadow-sm transition-transform hover:scale-105"
                alt="profile"
                onError={(e) => {
                  e.target.src = profile;
                  if (localPreview) setLocalPreview(null);
                }}
              />
            </div>

            <div className="flex flex-col text-start px-0 grow overflow-hidden text-black">
              <span className="font-bold truncate text-sm md:text-base">
                {firstname} {lastname}
              </span>
              <span className="text-xs text-gray-700 truncate">{user?.email}</span>
              <div className="flex items-center gap-2">
                {user?.roles && user.roles.length > 1 && (
                  <button
                    onClick={handleRoleSwitch}
                    className="text-purple-600 hover:text-purple-800"
                    title="สลับสถานะ"
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
                className="font-semibold mt-1 cursor-pointer hover:underline text-red-600"
                onClick={() => {
                  authFetch(`${import.meta.env.VITE_API_URL}/api/log-activity`, {
                    method: "POST",
                    body: JSON.stringify({
                      user_id: user.id,
                      user_name: user.name,
                      user_email: user.email,
                      action_type: "LOGOUT",
                    }),
                  }).catch((err) =>
                    console.error("Failed to log activity:", err)
                  );
                  logout();
                  alert("ออกจากระบบสำเร็จ");
                  navigate("/login");
                }}
              >
                ออกจากระบบ
              </span>
            </div>
          </div>

          <hr className="border-gray-300 my-4 mx-2" />

          {/* --- 🟢 3. ส่วนแสดงเมนูตาม Level --- */}
          <div className="flex flex-col items-stretch gap-1 mt-2">
            {isAdminRoleActive ? (
              <>
                {/* === Level 1+ (ผู้สอน) === */}
                {adminLevel >= ADMIN_LEVELS.VIEWER && (
                  <>
                    <MenuLink to="/index" label="ห้องเรียนทั้งหมด" icon={<AcademicCapIcon />} />
                    <MenuLink to="/creations" label="สร้างห้องเรียน" icon={<PlusCircleIcon />} />
                  </>
                )}

                {/* === Level 2+ (ผู้จัดการเนื้อหา) === */}
                {adminLevel >= ADMIN_LEVELS.MANAGER && (
                  <>
                    <MenuLink to="/statistics" label="สถิติ" icon={<ChartBarIcon />} />
                    <MenuLink to="/admin/class-requests" label="รายการคำขอ" icon={<InboxIcon />} />
                    <MenuLink to="/topic-management" label="จัดการหัวข้อ" icon={<FolderIcon />} />
                  </>
                )}

                {/* === Level 3 (ผู้ดูแลระบบสูงสุด) === */}
                {adminLevel >= ADMIN_LEVELS.SUPER && (
                  <>
                    <MenuLink to="/user-management" label="จัดการผู้ใช้งาน" icon={<UsersIcon />} />
                    <MenuLink to="/activity-logs" label="บันทึกระบบ" icon={<DocumentTextIcon />} />
                  </>
                )}
              </>
            ) : (
              <>
                <MenuLink to="/classes" label="หลักสูตรที่เปิดสอน" icon={<CalendarIcon />} />
                <MenuLink to="/past-classes" label="ประวัติการอบรม" icon={<ClockIcon />} />
                <MenuLink to="/class-request" label="สร้างคำขอเปิดหลักสูตร" icon={<LightBulbIcon />} />
              </>
            )}
          </div>
        </div>
        <div className="mt-auto lg:hidden px-4">
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
