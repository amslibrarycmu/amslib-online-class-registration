// Dashboard.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import ClassCreationModal from "../components/ClassCreationsModal"; // แก้ไข Path ตามที่ร้องขอ

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ฟังก์ชันสำหรับเรียกข้อมูล
  const fetchClasses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/classes?email=${encodeURIComponent(
          user.email
        )}`
      );
      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleEditClick = (cls) => {
    setEditingClass(cls);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingClass(null);
  };

  const handleUpdateClass = async (updatedData) => {
    const classId = updatedData.class_id;
    const updateForm = new FormData();

    // Loop through updatedData to append fields to FormData
    for (const key in updatedData) {
      if (key === 'speaker' || key === 'target_groups') {
        updateForm.append(key, JSON.stringify(updatedData[key]));
      } else if (key !== 'files') {
        updateForm.append(key, updatedData[key]);
      }
    }
    updateForm.append("created_by_email", user.email);

    try {
      const response = await fetch(
        `http://localhost:5000/api/classes/${classId}`,
        {
          method: "PUT",
          body: updateForm,
        }
      );

      if (response.ok) {
        alert("✅ อัปเดตข้อมูลสำเร็จ");
        handleCloseModal();
        fetchClasses(); // Refresh the class list
      } else {
        const errorData = await response.json();
        alert(`❌ อัปเดตข้อมูลไม่สำเร็จ: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating class:", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  // โค้ดที่เพิ่ม: ฟังก์ชันสำหรับการลบห้องเรียน
  const handleDeleteClick = async (classId) => {
    if (window.confirm("คุณต้องการลบห้องเรียนนี้หรือไม่?")) { // ยืนยันการลบ
      try {
        const response = await fetch(
          `http://localhost:5000/api/classes/${classId}`,
          {
            method: "DELETE", // ใช้เมธอด DELETE
          }
        );
        if (response.ok) {
          alert("✅ ลบข้อมูลสำเร็จ");
          fetchClasses(); // อัปเดตรายการใหม่หลังจากลบ
        } else {
          alert("❌ ลบข้อมูลไม่สำเร็จ");
        }
      } catch (error) {
        console.error("Error deleting class:", error);
        alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    }
  };

  return (
    <div className="flex w-screen">
      <Sidebar />
      <div className="flex-2 flex-row p-8 w-fit">
        <h1 className="text-2xl font-bold mb-6 text-center">ภาพรวม</h1>
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-bold mb-[10px] text-[1.25rem]">
            รายการห้องเรียนที่คุณสร้าง
          </h2>
          {loading ? (
            <p>กำลังโหลดข้อมูล...</p>
          ) : !user ? (
            <p>กรุณาล็อกอินเพื่อดูรายการห้องเรียนของคุณ</p>
          ) : classes.length > 0 ? (
            <ul className="space-y-4">
              {classes.map((cls) => {
                let speakerDisplay = "ยังไม่ระบุ";
                if (cls.speaker) {
                  try {
                    const parsedSpeakers = JSON.parse(cls.speaker);
                    if (
                      Array.isArray(parsedSpeakers) &&
                      parsedSpeakers.length > 0
                    ) {
                      speakerDisplay = parsedSpeakers.join(", ");
                    }
                  } catch (e) {
                    speakerDisplay = cls.speaker;
                  }
                }
                return (
                  <li
                    key={cls.class_id || cls.id}
                    className="bg-gray-50 p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-purple-800 justify-center">
                        {cls.title}
                      </h3>
                    </div>

                    <div className="text-md text-gray-700 mt-2 flex flex-wrap gap-x-10 gap-y-2">
                      <p>
                        <strong>ID:</strong> {cls.class_id}
                      </p>
                      <p>
                        <strong>วันที่:</strong>{" "}
                        {cls.start_date
                          ? new Date(cls.start_date).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}{" "}
                        -{" "}
                        {cls.end_date
                          ? new Date(cls.end_date).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                      <p>
                        <strong>เวลา:</strong>{" "}
                        {cls.start_time
                          ? cls.start_time.substring(0, 5)
                          : "N/A"}{" "}
                        - {cls.end_time ? cls.end_time.substring(0, 5) : "N/A"}
                      </p>
                      <p className="sm:col-span-2 md:col-span-3">
                        <strong>สร้างเมื่อ:</strong>{" "}
                        {cls.created_at
                          ? new Date(cls.created_at).toLocaleString("th-TH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"} {""} น.
                      </p>
                    </div>

                    <div className="flex items-center mt-4 pt-4 border-t border-gray-200">
                      <button
                        title="แก้ไข"
                        className="text-blue-600 hover:text-blue-800 rounded-full p-1"
                        onClick={() => handleEditClick(cls)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                          <path
                            fillRule="evenodd"
                            d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        title="ลบ"
                        className="text-red-600 hover:text-red-800 rounded-full p-1"
                        onClick={() => handleDeleteClick(cls.class_id)} // เรียกใช้ handleDeleteClick
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <label
                        htmlFor={`promote-${cls.class_id}`}
                        className="flex items-center cursor-pointer px-5"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            id={`promote-${cls.class_id}`}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-4 bg-gray-400 rounded-full shadow-inner"></div>
                          <div className="dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition-transform duration-300 ease-in-out peer-checked:translate-x-full peer-checked:bg-green-500"></div>
                        </div>
                        <div className="ml-3 text-gray-700 font-medium">
                          โปรโมทห้องเรียน
                        </div>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>คุณยังไม่ได้สร้างห้องเรียนใดๆ</p>
          )}
        </div>
      </div>
      {isEditModalOpen && editingClass && (
        <ClassCreationModal
          isEditing={true}
          initialData={editingClass}
          onClose={handleCloseModal}
          onSubmit={handleUpdateClass}
        />
      )}
    </div>
  );
};

export default Dashboard;
