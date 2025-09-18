import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAdmin = user?.status === "ผู้ดูแลระบบ";

  let firstname = "";
  let lastname = "";
  if (user?.name) {
    const parts = user.name.split(" ");
    firstname = parts[0] || "";
    lastname = parts.slice(1).join(" ") || "";
  }

  const handleOverviewClick = () => {
    if (isAdmin) {
      navigate("/index");
    } else {
      navigate("/classes");
    }
  };

  return (
    <>
      {/* Hamburger Menu Button for mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-full shadow-lg"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`w-[325px] flex-shrink-0 min-h-screen text-center bg-[#f0f0f0] flex flex-col gap-[10px] p-[1rem] transition-transform duration-300 ease-in-out
                    lg:translate-x-0 lg:relative lg:z-auto
                    ${isSidebarOpen ? 'translate-x-0 fixed z-50' : '-translate-x-full fixed'}`}
      >
        <div className="flex justify-between items-center">
          <img src={amsliblogo} width={200} className="mx-auto" alt="logo" />
          <button className="lg:hidden p-2" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-[16px] font-semibold text-black">
          AMS Library Class Registration System (HSL KM)
        </p>
        <div className="flex items-center justify-center gap-[15px] my-[10px]">
          <img
            src={profile}
            width={75}
            height={75}
            className="w-[100px] h-[100px] object-cover rounded-full my-auto"
            alt="profile"
          />
          <div className="flex flex-col text-start px-0 grow text-black">
            <span>
              {firstname} {lastname}
            </span>{" "}
            <span className="text-xs text-black">{user?.email}</span>
            <span className="text-xs text-black py-1">({user?.status})</span>
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
                ภาพรวม
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
    </>
  );
}