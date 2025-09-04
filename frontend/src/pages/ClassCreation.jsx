import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import ClassCreationModal from "../components/ClassCreationsModal";

export default function ClassCreation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [showExistingList, setShowExistingList] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const perPage = 5;

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
        )}&status=${encodeURIComponent(user.status)}&t=${new Date().getTime()}`
      );
      const data = await response.json();
      setClassesList(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClassesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleCreateNewClick = () => {
    setSelectedClassToEdit(null);
    setShowExistingList(false);
    setIsDuplicating(false);
    setShowForm(true);
  };

  const handleEditExistingClick = (cls) => {
    setSelectedClassToEdit(cls);
    setShowExistingList(false);
    setIsDuplicating(true);
    setShowForm(true);
  };

  const handleModalSubmit = async (formData) => {
    const newForm = new FormData();
    // When duplicating, we don't send the original class_id, the backend will generate a new one.
    // However, for this implementation, the backend seems to require a class_id.
    // We will generate a new one on the client-side for creation/duplication.
    const classId = Math.floor(100000 + Math.random() * 900000);
    newForm.append("class_id", classId);
    
    newForm.append("title", formData.title);
    newForm.append("speaker", JSON.stringify(formData.speaker));
    newForm.append("start_date", formData.start_date);
    newForm.append("end_date", formData.end_date);
    newForm.append("start_time", formData.start_time);
    newForm.append("end_time", formData.end_time);
    newForm.append("description", formData.description);
    newForm.append("format", formData.format);
    newForm.append("join_link", formData.join_link);
    newForm.append("max_participants", formData.max_participants);
    const allGroups = ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"];
    let groupsToSend = formData.target_groups.filter(
      (g) => g !== "" && g !== null
    );
    if (groupsToSend.length === 0) {
      groupsToSend = allGroups;
    }
    newForm.append("target_groups", JSON.stringify(groupsToSend));
    formData.files.forEach((file) => {
      newForm.append("files", file);
    });
    newForm.append("location", formData.location);
    newForm.append("created_by_email", user.email);

    try {
      const res = await fetch("http://localhost:5000/api/classes", {
        method: "POST",
        body: newForm,
      });

      if (res.ok) {
        alert("✅ สร้างห้องเรียนสำเร็จ");
        navigate("/index");
      } else {
        alert("❌ สร้างห้องเรียนไม่สำเร็จ");
      }
    } catch (error) {
      console.error("💥 error", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setSelectedClassToEdit(null);
    setIsDuplicating(false);
  };

  return (
    <div className="w-screen grid grid-cols-[auto_1fr] h-screen">
      <Sidebar />
      <div className="p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">สร้างห้องเรียน</h1>
        <div className="flex flex-row gap-10 justify-center mb-8">
    
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleCreateNewClick}
              className="w-52 h-52 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105"
              aria-label="สร้างใหม่ทั้งหมด"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6e11b0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="font-semibold mt-1">สร้างใหม่ทั้งหมด</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                setShowExistingList(true);
                setShowForm(false);
              }}
              className="w-52 h-52 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105"
              aria-label="สร้างโดยแก้ไขจากข้อมูลเดิม"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6e11b0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <span className="font-semibold mt-1"><h2>สร้างโดยแก้ไขจากข้อมูลเดิม</h2>
            </span>
          </div>
        </div>

        {showExistingList && (
          <div className="w-full max-w-4xl mx-auto space-y-4 bg-white text-black p-6 rounded shadow">
            <h2 className="font-bold text-xl">เลือกห้องเรียนที่ต้องการใช้เป็นต้นฉบับ</h2>
            {loading ? (
              <p>กำลังโหลดข้อมูล...</p>
            ) : (
              <ul className="space-y-2">
                {classesList.map((cls) => (
                  <li
                    key={cls.class_id}
                    className="flex justify-between items-center p-3 border rounded-md shadow-sm"
                  >
                    <span>
                      {cls.title}
                      <span className="text-red-500 font-bold">
                        {" "}
                        (ID:{cls.class_id}){" "}
                      </span>
                    </span>
                    <button
                      onClick={() => handleEditExistingClick(cls)}
                      className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                    >
                      ใช้เป็นต้นฉบับ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <ClassCreationModal
          onClose={handleCloseModal}
          initialData={selectedClassToEdit}
          onSubmit={handleModalSubmit}
          isEditing={false}
          isDuplicating={isDuplicating}
        />
      )}
    </div>
  );
}
