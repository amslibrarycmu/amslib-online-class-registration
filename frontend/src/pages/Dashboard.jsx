// Dashboard.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import ClassCreationModal from "../components/ClassCreationsModal";
import RegistrantsModal from "../components/RegistrantsModal";
import CloseClassModal from "../components/CloseClassModal";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [activeClasses, setActiveClasses] = useState([]);
  const [closedClasses, setClosedClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // State for the registrants modal
  const [isRegistrantsModalOpen, setIsRegistrantsModalOpen] = useState(false);
  const [selectedClassForRegistrants, setSelectedClassForRegistrants] =
    useState(null);

  // State for the close class modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedClassToClose, setSelectedClassToClose] = useState(null);

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
        )}&status=${encodeURIComponent(user.status)}&t=${new Date().getTime()}`
      );
      const data = await response.json();
      setClasses(data); // Keep original fetched data if needed elsewhere

      // Sort data by start date, newest first
      const sortedData = data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

      // Separate classes into active and closed from the sorted list
      const active = sortedData.filter(cls => cls.status !== 'closed');
      const closed = sortedData.filter(cls => cls.status === 'closed');

      setActiveClasses(active);
      setClosedClasses(closed);
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

  // Handlers for the registrants modal
  const handleOpenRegistrantsModal = async (cls) => {
    try {
      const response = await fetch(`http://localhost:5000/api/classes/${cls.class_id}/registrants`);
      if (!response.ok) {
        throw new Error('Failed to fetch registrants');
      }
      const registrants = await response.json();
      const classWithRegistrants = { ...cls, registered_users: registrants };
      setSelectedClassForRegistrants(classWithRegistrants);
      setIsRegistrantsModalOpen(true);
    } catch (error) {
      console.error("Error fetching registrants:", error);
      alert("⚠️ ไม่สามารถดึงข้อมูลผู้ลงทะเบียนได้");
    }
  };

  const handleCloseRegistrantsModal = () => {
    setIsRegistrantsModalOpen(false);
    setSelectedClassForRegistrants(null);
  };

  // Handlers for the close class modal
  const handleOpenCloseClassModal = (cls) => {
    setSelectedClassToClose(cls);
    setIsCloseModalOpen(true);
  };

  const handleCloseCloseClassModal = () => {
    setIsCloseModalOpen(false);
    setSelectedClassToClose(null);
  };

  const handleCloseClassSubmit = async (formData) => {
    if (!selectedClassToClose) return;

    const classId = selectedClassToClose.class_id;
    const closeForm = new FormData();

    // Append the video link
    closeForm.append("video_link", formData.video_link);

    // Append the list of existing files to keep
    closeForm.append("existing_materials", JSON.stringify(formData.existing_materials));

    // Append new files
    for (const file of formData.new_materials) {
      closeForm.append("materials", file);
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/classes/${classId}/close`,
        {
          method: "POST",
          body: closeForm,
        }
      );

      if (response.ok) {
        alert("✅ ปิดห้องเรียนและบันทึกข้อมูลสำเร็จ");
        handleCloseCloseClassModal();
        fetchClasses(); // Refresh the class list
      } else {
        const errorData = await response.json();
        alert(
          `❌ ปิดห้องเรียนไม่สำเร็จ: ${
            errorData.message || response.statusText
          }`
        );
      }
    } catch (error) {
      console.error("Error closing class:", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleUpdateClass = async (updatedData) => {
    const classId = updatedData.class_id;
    const updateForm = new FormData();

    for (const key in updatedData) {
      if (key === "speaker" || key === "target_groups") {
        updateForm.append(key, JSON.stringify(updatedData[key]));
      } else if (key !== "files") {
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
        fetchClasses();
      } else {
        const errorData = await response.json();
        alert(
          `❌ อัปเดตข้อมูลไม่สำเร็จ: ${
            errorData.message || response.statusText
          }`
        );
      }
    } catch (error) {
      console.error("Error updating class:", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleDeleteClick = async (classId) => {
    if (window.confirm("คุณต้องการลบห้องเรียนนี้หรือไม่?")) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/classes/${classId}`,
          {
            method: "DELETE",
          }
        );
        if (response.ok) {
          alert("✅ ลบข้อมูลสำเร็จ");
          fetchClasses();
        } else {
          alert("❌ ลบข้อมูลไม่สำเร็จ");
        }
      } catch (error) {
        console.error("Error deleting class:", error);
        alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    }
  };

  const handlePromoteToggle = async (classId, isPromoted) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/classes/${classId}/promote`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ promoted: isPromoted }),
        }
      );

      if (response.ok) {
        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.class_id === classId
              ? { ...cls, promoted: isPromoted ? 1 : 0 }
              : cls
          )
        );
        alert(
          `✅ ห้องเรียนถูก${isPromoted ? "โปรโมท" : "ยกเลิกการโปรโมท"}แล้ว`
        );
      } else {
        const errorData = await response.json();
        alert(
          `❌ ไม่สามารถ${
            isPromoted ? "โปรโมท" : "ยกเลิกการโปรโมท"
          }ห้องเรียนได้: ${errorData.message || response.statusText}`
        );
        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.class_id === classId ? { ...cls, promoted: !isPromoted } : cls
          )
        );
      }
    } catch (error) {
      console.error("Error toggling promotion status:", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่ออัปเดตสถานะโปรโมท");
      setClasses((prevClasses) =>
        prevClasses.map((cls) =>
          cls.class_id === classId ? { ...cls, promoted: !isPromoted } : cls
        )
      );
    }
  };

  return (
    <div className="w-screen grid grid-cols-[auto_1fr] h-screen">
      <Sidebar />
      <div className="p-8 overflow-y-auto bg-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-center">ภาพรวม</h1>
          <h2 className="font-bold mb-[10px] text-[1.25rem]">
            {user && user.status === "ผู้ดูแลระบบ"
              ? "รายการห้องเรียนทั้งหมด"
              : "รายการห้องเรียนที่คุณสร้าง"}
          </h2>
          {loading ? (
            <p>กำลังโหลดข้อมูล...</p>
          ) : !user ? (
            <p>กรุณาล็อกอินเพื่อดูรายการห้องเรียนของคุณ</p>
          ) : (
            <>
              {activeClasses.length > 0 && (
                <ul className="space-y-4">
                  {activeClasses.map((cls) => {
                    let speakerDisplay = "ยังไม่ระบุ";
                    if (
                      cls.speaker &&
                      typeof cls.speaker === "string" &&
                      cls.speaker.length > 4
                    ) {
                      speakerDisplay = cls.speaker
                        .slice(2, -2)
                        .replace(/\",\"/g, ", ");
                    } else if (cls.speaker) {
                      speakerDisplay = String(cls.speaker);
                    }

                    const registrants =
                      typeof cls.registered_users === "string"
                        ? JSON.parse(cls.registered_users || "[]")
                        : cls.registered_users || [];

                    return (
                      <li
                        key={cls.class_id || cls.id}
                        className="bg-gray-50 p-4 rounded-lg shadow-md hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg text-purple-800 justify-center">
                            <strong className="text-red-500">
                              {cls.class_id}{" "}
                            </strong>{" "}
                            {"  "} {cls.title}
                          </h3>
                        </div>

                        <div className="text-md text-gray-700 mt-2 flex flex-wrap gap-x-10 gap-y-2">
                          <p>
                            <strong>วิทยากร:</strong> {speakerDisplay}
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
                              ? new Date(cls.end_date).toLocaleDateString(
                                  "th-TH",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )
                              : "N/A"}
                          </p>
                          <p>
                            <strong>เวลา:</strong>{" "}
                            {cls.start_time
                              ? cls.start_time.substring(0, 5)
                              : "N/A"}{" "}
                            - {cls.end_time ? cls.end_time.substring(0, 5) : "N/A"}
                          </p>
                          <p>
                            <strong>รูปแบบ:</strong> {cls.format}
                          </p>
                          <p>
                            <strong>ผู้ลงทะเบียน:</strong> {registrants.length} /{" "}
                            {cls.max_participants === 999
                              ? "ไม่จำกัด"
                              : cls.max_participants}
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
                              : "N/A"}{" "}
                            น.
                          </p>
                        </div>

                        <div className="flex items-center mt-4 pt-4 border-t border-gray-200">
                          <button
                            title="ดูรายชื่อผู้ลงทะเบียน"
                            className="text-green-600 hover:text-green-800 rounded-full p-1"
                            onClick={() => handleOpenRegistrantsModal(cls)}
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
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                          </button>
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
                            onClick={() => handleDeleteClick(cls.class_id)}
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
                                checked={cls.promoted === 1}
                                onChange={(e) =>
                                  handlePromoteToggle(
                                    cls.class_id,
                                    e.target.checked
                                  )
                                }
                              />
                              <div className="w-10 h-4 bg-gray-400 rounded-full shadow-inner"></div>
                              <div className="dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition-transform duration-300 ease-in-out peer-checked:translate-x-full peer-checked:bg-green-500"></div>
                            </div>
                            <div className="ml-3 text-gray-700 font-medium">
                              โปรโมทห้องเรียน
                            </div>
                          </label>
                          <button
                            title="จบการสอน"
                            className="ml-auto bg-amber-500 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded"
                            onClick={() => handleOpenCloseClassModal(cls)}
                          >
                            จบการสอน
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {closedClasses.length > 0 && (
                <>
                  <h2 className="font-bold mb-[10px] text-[1.25rem] mt-10">
                    รายการห้องเรียนที่จบการสอนแล้ว
                  </h2>
                  <ul className="space-y-4">
                    {closedClasses.map((cls) => {
                      let speakerDisplay = "ยังไม่ระบุ";
                      if (
                        cls.speaker &&
                        typeof cls.speaker === "string" &&
                        cls.speaker.length > 4
                      ) {
                        speakerDisplay = cls.speaker
                          .slice(2, -2)
                          .replace(/\",\"/g, ", ");
                      } else if (cls.speaker) {
                        speakerDisplay = String(cls.speaker);
                      }

                      const registrants =
                        typeof cls.registered_users === "string"
                          ? JSON.parse(cls.registered_users || "[]")
                          : cls.registered_users || [];

                      return (
                        <li
                          key={cls.class_id || cls.id}
                          className="bg-gray-50 p-4 rounded-lg shadow-md"
                        >
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-lg text-gray-600 justify-center">
                              <strong className="text-red-500">
                                {cls.class_id}{" "}
                              </strong >{" "}
                              <strong className="text-purple-800"> {"  "} {cls.title} </strong>
                              
                            </h3>
                          </div>

                          <div className="text-md text-gray-700 mt-2 flex flex-wrap gap-x-10 gap-y-2">
                            <p>
                              <strong>วิทยากร:</strong> {speakerDisplay}
                            </p>
                            <p>
                              <strong>วันที่:</strong>{" "}
                              {cls.start_date
                                ? new Date(cls.start_date).toLocaleString(
                                    "th-TH",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : "N/A"}{" "}
                              -{" "}
                              {cls.end_date
                                ? new Date(cls.end_date).toLocaleDateString(
                                    "th-TH",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : "N/A"}
                            </p>
                            <p>
                              <strong>เวลา:</strong>{" "}
                              {cls.start_time
                                ? cls.start_time.substring(0, 5)
                                : "N/A"}{" "}
                              -{" "}
                              {cls.end_time
                                ? cls.end_time.substring(0, 5)
                                : "N/A"}
                            </p>
                            <p>
                              <strong>รูปแบบ:</strong> {cls.format}
                            </p>
                            <p>
                              <strong>ผู้ลงทะเบียน:</strong>{" "}
                              {registrants.length} /{" "}
                              {cls.max_participants === 999
                                ? "ไม่จำกัด"
                                : cls.max_participants}
                            </p>
                            <p className="sm:col-span-2 md:col-span-3">
                              <strong>สร้างเมื่อ:</strong>{" "}
                              {cls.created_at
                                ? new Date(cls.created_at).toLocaleString(
                                    "th-TH",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "N/A"}{" "}
                              น.
                            </p>
                          </div>

                          <div className="flex items-center mt-4 pt-4 border-t border-gray-200">
                            <button
                              title="ดูรายชื่อผู้ลงทะเบียน"
                              className="text-green-600 hover:text-green-800 rounded-full p-1"
                              onClick={() => handleOpenRegistrantsModal(cls)}
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
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                            </button>
                            <button
                              title="ลบ"
                              className="text-red-600 hover:text-red-800 rounded-full p-1"
                              onClick={() => handleDeleteClick(cls.class_id)}
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
                            <button
                              title="แก้ไข"
                              className="ml-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                              onClick={() => handleOpenCloseClassModal(cls)}
                            >
                              แก้ไข
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {activeClasses.length === 0 && closedClasses.length === 0 && (
                <p>คุณยังไม่ได้สร้างห้องเรียนใดๆ</p>
              )}
            </>
          )}
        
      </div>
      {isEditModalOpen && editingClass && (
        <ClassCreationModal
          isEditing={true}
          isDuplicating={false}
          initialData={editingClass}
          onClose={handleCloseModal}
          onSubmit={handleUpdateClass}
        />
      )}
      {isRegistrantsModalOpen && selectedClassForRegistrants && (
        <RegistrantsModal
          isOpen={isRegistrantsModalOpen}
          onClose={handleCloseRegistrantsModal}
          classData={selectedClassForRegistrants}
        />
      )}
      {isCloseModalOpen && (
        <CloseClassModal
          isOpen={isCloseModalOpen}
          onClose={handleCloseCloseClassModal}
          onSubmit={handleCloseClassSubmit}
          classData={selectedClassToClose}
          isEditing={selectedClassToClose?.status === 'closed'}
        />
      )}
    </div>
  );
};

export default Dashboard;
