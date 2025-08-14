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
        )}`
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
    setShowForm(true);
  };

  const handleEditExistingClick = (cls) => {
    setSelectedClassToEdit(cls);
    setShowExistingList(false);
    setShowForm(true);
  };

  const handleModalSubmit = async (formData) => {
    const newForm = new FormData();
    const classId =
      formData.class_id || Math.floor(100000 + Math.random() * 900000);
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
        navigate("/admin/index");
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
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex flex-col w-full gap-5 min-h-screen p-5">
        <h1 className="text-2xl font-bold mb-6 text-center">สร้างห้องเรียน</h1>
        <div className="flex flex-row gap-x-10 items-center w-[400px] justify-between">
          <div className="flex flex-col gap-3 w-full max-w-2xl">
            <button
              onClick={handleCreateNewClick}
              className="text-black font-bold cursor-pointer hover:underline bg-gray-200 px-4 py-2 rounded"
            >
              สร้างใหม่ทั้งหมด
            </button>
            <button
              onClick={() => {
                setShowExistingList(true);
                setShowForm(false);
              }}
              className="text-black font-bold cursor-pointer hover:underline bg-gray-200 px-4 py-2 rounded"
            >
              สร้างโดยแก้ไขจากข้อมูลเดิม
            </button>
          </div>
        </div>

        {showExistingList && (
          <div className="w-screen max-w-2xl space-y-4 bg-white text-black p-6 rounded shadow my-5">
            <h2 className="font-bold text-xl">เลือกห้องเรียนที่ต้องการแก้ไข</h2>
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
                      แก้ไข
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
          isEditing={!!selectedClassToEdit}
        />
      )}
    </div>
  );
}
