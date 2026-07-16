import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import ClassCreationModal from "./ClassCreationsModal";

export default function ClassCreation() {
  const { user, activeRole, authFetch } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("initial"); // 'initial', 'selection', 'new', 'duplicate', 'fromRequest'
  const [classesList, setClassesList] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [isClassListExpanded, setIsClassListExpanded] = useState(true);
  const [isRequestListExpanded, setIsRequestListExpanded] = useState(true);
  const perPage = 5;

  const fetchClasses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/classes`);
      const data = await response.json();
      setClassesList(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClassesList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedRequests = async () => {
    if (activeRole !== "ผู้ดูแลระบบ") return;
    try {
      setLoading(true);
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/admin/class-requests?status=approved`);
      const data = await response.json();
      setApprovedRequests(data);
    } catch (error) {
      console.error("Error fetching approved requests:", error);
      setApprovedRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "selection") {
      fetchClasses();
      fetchApprovedRequests();
    }
  }, [mode, user, activeRole]);

  const handleCreateNewClick = () => {
    setSelectedClassToEdit(null);
    setMode("new");
  };

  const handleEditExistingClick = (cls) => {
    // Create a copy of the class data and remove id/class_id to prevent issues on creation
    const classToDuplicate = { ...cls };
    delete classToDuplicate.id;
    delete classToDuplicate.class_id;
    setSelectedClassToEdit(classToDuplicate);
    setMode("duplicate");
  };

  const handleCreateFromRequestClick = (request) => {
    const requestAsClassData = {
      request_id: request.request_id, // 🟢 เก็บ ID คำขอไว้
      title: request.title,
      speaker: request.speaker ? [request.speaker] : [],
      start_date: request.start_date,
      end_date: request.end_date,
      start_time: request.start_time,
      end_time: request.end_time,
      description: request.reason,
      format: request.format,
    };
    setSelectedClassToEdit(requestAsClassData);
    setMode("fromRequest");
  };

  const handleModalSubmit = async (formData) => {
    const newForm = new FormData();

    // Append fields in the correct order
    newForm.append("title", formData.title);
    newForm.append("speaker", JSON.stringify(formData.speaker));
    newForm.append("start_date", formData.start_date);
    newForm.append("end_date", formData.end_date);
    newForm.append("start_time", formData.start_time);
    newForm.append("end_time", formData.end_time);
    newForm.append("description", formData.description);
    newForm.append("format", formData.format);
    newForm.append("join_link", formData.join_link);
    newForm.append("location", formData.location);
    newForm.append("max_participants", formData.max_participants);
    newForm.append("target_groups", JSON.stringify(formData.target_groups));
    newForm.append("language", formData.language);
    newForm.append("created_by_email", user.email);

    // 🟢 ถ้าสร้างจากคำขอ ให้ส่ง request_id ไปด้วยเพื่อให้ Backend ส่งอีเมลแจ้งเตือน
    if (formData.request_id) {
      newForm.append("request_id", formData.request_id);
    }
  
    // Append files: separate new files from existing file names
    formData.materials.forEach((file) => {
      if (file instanceof File) {
        // This is a new file to be uploaded
        newForm.append("files", file);
      } else if (file && typeof file.name === 'string') {
        // This is an existing file, just send its name
        newForm.append("existingFiles", file.name); // Backend will receive this as existingFiles
      }
    });
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/classes`, {
        method: "POST",
        body: newForm,
      });

      if (res.ok) {
        alert("✅ สร้างห้องเรียนสำเร็จ");
        navigate("/index");
      } else {
        const errorData = await res.json();
        console.error("Server error details:", errorData);
        alert(
          `❌ สร้างห้องเรียนไม่สำเร็จ: ${
            errorData.message || "ไม่ทราบสาเหตุ"
          }\n${errorData.error ? JSON.stringify(errorData.error, null, 2) : ""}`
        );
      }
    } catch (error) {
      console.error("💥 error", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  const handleCloseModal = () => {
    setMode("initial"); // Return to the very first screen
    setSelectedClassToEdit(null);
  };

  return (
    <div className="w-screen flex h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto bg-gray-100">

        <div className="flex flex-col md:flex-row gap-8 justify-center mb-8">
          {/* Card for creating a new class */}
          <div
            onClick={handleCreateNewClick}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl border border-transparent transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center w-full md:w-80"
            role="button"
            aria-label="สร้างใหม่ทั้งหมด"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
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
            </div>
            <h2 className="font-bold text-lg text-gray-800">สร้างใหม่ทั้งหมด</h2>
            <p className="text-sm text-gray-500 mt-1">
              เริ่มต้นสร้างห้องเรียนจากฟอร์มเปล่า
            </p>
          </div>

          {/* Card for creating from existing */}
          <div
            onClick={() => {
              setMode("selection"); // Change mode to show the lists
            }}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl border-transparent hover:border-purple-500 transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center w-full md:w-80"
            role="button"
            aria-label="สร้างโดยแก้ไขจากข้อมูลเดิม"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
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
            </div>
            <h2 className="font-bold text-lg text-gray-800">เรียกใช้ข้อมูลที่มี</h2>
            <p className="text-sm text-gray-500 mt-1">
              คัดลอกข้อมูลจากห้องเรียนที่เคยสร้าง <br />หรือจากคำขอที่อนุมัติแล้ว
            </p>
          </div>
        </div>

        {mode === "selection" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
            <div className="bg-white text-black p-6 rounded-md shadow">
              <div
                className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsClassListExpanded(!isClassListExpanded); }}
              >
                <h2 className="font-bold text-xl">เลือกห้องเรียนต้นฉบับ</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อห้องเรียน..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:outline-none focus:border-black"
                  />

                  <span className="transition-transform duration-300">
                    {isClassListExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </div>
              </div>
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isClassListExpanded ? 'max-h-[500px] mt-4' : 'max-h-0'}`}>
                {loading ? (
                  <p>กำลังโหลดข้อมูล...</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {classesList.length > 0 ? (
                      Array.from(new Map(classesList.map(item => [item.title, item])).values())
                        .filter((cls) => cls.title.toLowerCase().includes(classSearchTerm.toLowerCase()))
                        .map((cls) => (
                          <li
                            key={cls.class_id || cls.id} // Ensure key is here
                            className="flex bg-gray-50 p-4 rounded-lg shadow justify-between items-center hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-wrap break-normal w-full mr-6">
                            <span className="text-purple-800 font-bold text-wrap ml-2">
                              {cls.title}
                            </span>
                          </span>
                          <button
                                onClick={() => handleEditExistingClick(cls)}
                                className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 flex-shrink-0"
                              >
                                ใช้
                              </button>
                            </li>
                        ))
                    ) : (
                      <p className="text-gray-500">ไม่พบห้องเรียนที่สร้างไว้</p>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Side: Approved Requests */}
            <div className="bg-white text-black p-6 rounded-md shadow">
              <div
                className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsRequestListExpanded(!isRequestListExpanded); }}
              >
                <h2 className="font-bold text-xl">สร้างจากคำขอที่อนุมัติแล้ว</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="ค้นหาจากชื่อคำขอ"
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:outline-none focus:border-black"
                  />

                  <span className="transition-transform duration-300">
                    {isRequestListExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </div>
              </div>
              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isRequestListExpanded ? 'max-h-[500px] mt-4' : 'max-h-0'}`}>
                {loading ? (
                  <p>กำลังโหลดข้อมูล...</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {approvedRequests.length > 0 ? (
                      approvedRequests
                        .filter((req) =>
                          req.title
                            .toLowerCase()
                            .includes(requestSearchTerm.toLowerCase())
                        )
                        .map((req) => (
                          <li
                            key={req.request_id} // Ensure key is here
                            className="flex bg-green-50 p-4 rounded-lg shadow justify-between items-center hover:bg-green-100 transition-colors"
                          >
                            <span className="text-wrap break-normal w-full mr-6">
                              <span className="text-green-800 font-bold text-wrap">
                              {req.title}
                            </span>
                            <span className="text-xs text-gray-600 block">
                              (ผู้ขอ: {req.requested_by_name})
                            </span>
                          </span>
                          <button
                                onClick={() => handleCreateFromRequestClick(req)}
                                className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 flex-shrink-0"
                              >
                                สร้าง
                              </button>
                            </li>
                        ))
                    ) : (
                      <p className="text-gray-500 text-center">
                        ไม่มีคำขอที่ได้รับการอนุมัติ
                      </p>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {["new", "duplicate", "fromRequest"].includes(mode) && (
        <ClassCreationModal
          onClose={handleCloseModal}
          initialData={selectedClassToEdit}
          onSubmit={handleModalSubmit}
          mode={mode} // Pass the mode to the modal
        />
      )}
    </div>
  );
}
