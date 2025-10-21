import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

export default function Sidebar() {
  const navigate = useNavigate();  
  const location = useLocation();
  const { user, login, logout, activeRole, switchRole, isSwitchingRole, authFetch } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false); // เพิ่ม state สำหรับจัดการสถานะการลบ
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

    if (!isSwitchingRole) {
      // Log activity using authFetch
      authFetch("http://localhost:5000/api/log-activity", {
        method: "POST",
        body: {
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          action_type: 'SWITCH_ROLE',
          details: { from_role: activeRole, to_role: newRole },
        },
      }).catch(err => console.error("Failed to log activity:", err));
      switchRole(newRole);
      if (newRole === "ผู้ดูแลระบบ") {
        navigate("/index");
      } else {
        navigate("/classes");
      }
    }
  };

  const handleOverviewClick = () => {
    if (activeRole === "ผู้ดูแลระบบ") {
      navigate("/index");
    } else {
      navigate("/classes");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDeletePhoto = async () => {
    if (!user?.photo) return;

    if (isDeleting) return; // ป้องกันการคลิกซ้ำ

    if (window.confirm('คุณต้องการลบรูปโปรไฟล์หรือไม่?')) {
      setIsDeleting(true); // เริ่มการลบ
      try {
        const response = await authFetch('http://localhost:5000/api/users/profile-picture', {
          method: 'DELETE',
          params: { email: user.email }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'ลบรูปโปรไฟล์ไม่สำเร็จ');
        }
        
        const data = await response.json();
        login(data); // อัปเดตข้อมูลผู้ใช้ใน context ด้วยข้อมูลใหม่ที่ไม่มีรูป
        alert('ลบรูปโปรไฟล์สำเร็จ');
      } catch (error) {
        console.error('Delete photo error:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
        setIsDeleting(false); // สิ้นสุดการลบ
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('email', user.email);

    try {
      const response = await authFetch('http://localhost:5000/api/users/profile-picture', {
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
    } finally {
      // Reset the file input value to allow re-uploading the same file
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          className="lg:hidden fixed inset-0 bg-white/85 z-40"
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
            <div className="relative group">
              <img
                src={user?.photo ? `http://localhost:5000/uploads/${user.photo}` : profile}
                width={100}
                height={100}
                className="w-[100px] h-[100px] object-cover rounded-full my-auto"
                alt="profile"
              />
              <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {user?.photo ? (
                  <>
                    {/* ปุ่มเปลี่ยนรูป */}
                    <button
                      onClick={handleUploadClick}
                      className="p-2 rounded-full hover: transition-colors"
                      title="เปลี่ยนรูปโปรไฟล์"
                    >
                      <EditIcon />
                    </button>
                    {/* ปุ่มลบรูป */}
                    <button
                      onClick={handleDeletePhoto}
                      disabled={isDeleting}
                      className="p-2 rounded-full hover: transition-colors disabled:opacity-50"
                      title="ลบรูปโปรไฟล์"
                    >
                      {isDeleting ? <LoadingSpinner /> : <DeleteIcon />}
                    </button>
                  </>
                ) : (
                  // ปุ่มเพิ่มรูป
                  <button onClick={handleUploadClick} className="p-3 rounded-full hover: transition-colors" title="เพิ่มรูปโปรไฟล์">
                    <AddIcon />
                  </button>
                )}
              </div>
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
                <span className="text-xs text-black py-1">({activeRole})</span>
              </div>
              <span
              className="font-semibold mt-1 cursor-pointer hover:underline"
              style={{ color: "black" }}
              onClick={() => {
                // Log activity using authFetch
                authFetch("http://localhost:5000/api/log-activity", {
                  method: "POST",
                  body: {
                    user_id: user.id,
                    user_name: user.name,
                    user_email: user.email,
                    action_type: 'LOGOUT',
                  },
                }).catch(err => console.error("Failed to log activity:", err));
                logout();
                alert("ออกจากระบบสำเร็จ");
                navigate("/login");
              }}
            >
              <span className="font-semibold"> ออกจากระบบ </span>
            </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-5 mt-4">
            {isAdmin ? (
              <>
                <span
                  onClick={handleOverviewClick}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/index' ? 'underline' : ''}`}
                  style={{ background: "transparent", borderColor: "" }}
                >
                  ห้องเรียนทั้งหมด
                </span>

                <span
                  onClick={() => navigate("/creations")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/creations' ? 'underline' : ''}`}
                >
                  สร้างห้องเรียน
                </span>

                <span
                  onClick={() => navigate("/statistics")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/statistics' ? 'underline' : ''}`}
                >
                  สถิติ
                </span>

                <span
                  onClick={() => navigate("/admin/class-requests")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/admin/class-requests' ? 'underline' : ''}`}
                >
                  จัดการคำขอ
                </span>

                <span
                  onClick={() => navigate("/user-management")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/user-management' ? 'underline' : ''}`}
                >
                  สิทธิ์
                </span>

                <span
                  onClick={() => navigate("/activity-logs")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/activity-logs' ? 'underline' : ''}`}
                >
                  ประวัติการใช้งาน
                </span>
              </>
            ) : (
              <>
                <span
                  onClick={() => navigate("/classes")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/classes' ? 'underline' : ''}`}
                >
                  ห้องเรียน
                </span>
                <span
                  onClick={() => navigate("/past-classes")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/past-classes' ? 'underline' : ''}`}
                >
                  ประวัติการเข้าร่วม
                </span>
                <span
                  onClick={() => navigate("/class-request")}
                  className={`text-black cursor-pointer hover:underline text-[1.25rem] ${location.pathname === '/class-request' ? 'underline' : ''}`}
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
