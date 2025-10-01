import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, login, logout, activeRole, switchRole } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = activeRole === "ผู้ดูแลระบบ";

  let firstname = "";
  let lastname = "";
  if (user?.name) {
    const parts = user.name.split(" ");
    firstname = parts[0] || "";
    lastname = parts.slice(1).join(" ") || "";
  }

  const handleRoleSwitch = () => {
    if (!user?.roles || user.roles.length <= 1) return;

    const currentIndex = user.roles.indexOf(activeRole);
    const nextIndex = (currentIndex + 1) % user.roles.length;
    const newRole = user.roles[nextIndex];

    switchRole(newRole);
    if (newRole === "ผู้ดูแลระบบ") {
      navigate("/index");
    } else {
      navigate("/classes");
    }
  };

  const handleOverviewClick = () => {
    if (activeRole === "ผู้ดูแลระบบ") {
      navigate("/index");
    } else {
      navigate("/classes");
    }
  };

  const handleProfileClick = async () => {
    if (user?.photo) {
      if (window.confirm('คุณมีรูปโปรไฟล์อยู่แล้ว ต้องการลบรูปเก่าก่อนอัปโหลดรูปใหม่หรือไม่?')) {
        try {
          const response = await fetch('http://localhost:5000/api/users/profile-picture', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
          });
          if (!response.ok) throw new Error('ลบรูปโปรไฟล์เดิมไม่สำเร็จ');
          
          const updatedUser = await response.json();
          login(updatedUser);
          alert('ลบรูปโปรไฟล์เดิมสำเร็จแล้ว กรุณาเลือกรูปใหม่');
          fileInputRef.current.click();
        } catch (error) {
          alert(error.message);
        }
      } else {
        fileInputRef.current.click();
      }
    } else {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('email', user.email);

    try {
      const response = await fetch('http://localhost:5000/api/users/profile-picture', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('อัปโหลดรูปภาพไม่สำเร็จ');
      }

      const updatedUser = await response.json();
      login(updatedUser);
      alert('อัปเดตโปรไฟล์สำเร็จ');
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.message);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      <button
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-full shadow-lg"
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
          className="lg:hidden fixed inset-0 bg-white/90 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div
        className={`w-[325px] flex-shrink-0 min-h-screen text-center bg-[#f0f0f0] flex flex-col gap-[10px] p-[1rem] transition-transform duration-300 ease-in-out
                    lg:translate-x-0 lg:relative lg:z-auto
                    ${
                      isSidebarOpen
                        ? "translate-x-0 fixed z-50"
                        : "-translate-x-full fixed"
                    }`}
      >
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <img src={amsliblogo} width={200} className="mx-auto" alt="logo" />
          </div>
          <p className="text-[16px] font-semibold text-black">
            AMS Library Class Registration System (HSL KM)
          </p>
          <div className="flex items-center justify-center gap-[15px] my-[10px]">
            <img
              src={user?.photo ? `http://localhost:5000/uploads/${user.photo}` : profile}
              width={75}
              height={75}
              className="w-[100px] h-[100px] object-cover rounded-full my-auto cursor-pointer"
              alt="profile"
              onClick={handleProfileClick}
              title="เปลี่ยนรูปโปรไฟล์"
            />
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
                  </button>
                )}
                <span className="text-xs text-black py-1">({activeRole})</span>
              </div>
              <span
                className="font-semibold cursor-pointer hover:underline"
                style={{ color: "black" }}
                onClick={() => {
                  logout();
                  alert("ออกจากระบบสำเร็จ");
                  navigate("/login");
                }}
              >
                <span className="font-semibold"> ออกจากระบบ </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-5">
            {isAdmin ? (
              <>
                <span
                  onClick={handleOverviewClick}
                  className="text-black cursor-pointer hover:underline text-[1.25rem] "
                  style={{ background: "transparent", borderColor: "" }}
                >
                  ห้องเรียนทั้งหมด
                </span>

                <span
                  onClick={() => navigate("/creations")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  สร้างห้องเรียน
                </span>

                <span
                  onClick={() => navigate("/statistics")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  สถิติ
                </span>

                <span
                  onClick={() => navigate("/admin/class-requests")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  จัดการคำขอ
                </span>

                <span
                  onClick={() => navigate("/user-management")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  สิทธิ์
                </span>

                <span
                  onClick={() => navigate("/activity-logs")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  ประวัติการใช้งาน
                </span>
              </>
            ) : (
              <>
                <span
                  onClick={() => navigate("/classes")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  ห้องเรียน
                </span>
                <span
                  onClick={() => navigate("/past-classes")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  ประวัติการเข้าร่วม
                </span>
                <span
                  onClick={() => navigate("/class-request")}
                  className="text-black cursor-pointer hover:underline text-[1.25rem]"
                >
                  ยื่นคำขอเปิดห้องเรียน
                </span>
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
