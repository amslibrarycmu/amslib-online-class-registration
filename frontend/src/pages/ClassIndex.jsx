import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import ClassCreationModal from "../components/ClassCreationsModal";
import RegistrantsModal from "../components/RegistrantsModal";
import CloseClassModal from "../components/CloseClassModal";
import EvaluationResultsModal from "../components/EvaluationResultsModal";
const ClassIndex = () => {
  const { user, activeRole, authFetch } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // State for evaluation results modal
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState(null);
  const [selectedClassForEvaluation, setSelectedClassForEvaluation] =
    useState(null);

  // State for the registrants modal
  const [isRegistrantsModalOpen, setIsRegistrantsModalOpen] = useState(false);
  const [selectedClassForRegistrants, setSelectedClassForRegistrants] =
    useState(null);

  // State for the close class modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [selectedClassToClose, setSelectedClassToClose] = useState(null);
  const [closedClassSortKey, setClosedClassSortKey] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [closedClassSearchTerm, setClosedClassSearchTerm] = useState("");

  const sortedClasses = useMemo(() => {
    // Ensure all class_id are numbers and sort by start_date
    return classes
      .map(cls => ({
        ...cls,
        class_id: parseInt(cls.class_id, 10)
      })).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [classes]);

  const activeClasses = useMemo(() => {
    return sortedClasses.filter((cls) => cls.status !== "closed");
  }, [sortedClasses]);

  const closedClasses = useMemo(() => {
    return sortedClasses.filter((cls) => cls.status === "closed");
  }, [sortedClasses]);

  const filteredClosedClasses = useMemo(() => {
    let filtered = [...closedClasses];

    if (closedClassSearchTerm) {
      filtered = filtered.filter(
        (cls) =>
          cls.title
            .toLowerCase()
            .includes(closedClassSearchTerm.toLowerCase()) ||
          cls.class_id.toString().includes(closedClassSearchTerm.toLowerCase())
      );
    }

    const parseSpeaker = (speakerField) => {
      if (!speakerField) return "";
      if (Array.isArray(speakerField)) return speakerField[0] || "";
      try {
        const parsed = JSON.parse(speakerField);
        return Array.isArray(parsed) ? parsed[0] || "" : "";
      } catch {
        return "";
      }
    };

    filtered.sort((a, b) => {
      let valA, valB;
      switch (closedClassSortKey) {
        case "title":
          valA = a.title;
          valB = b.title;
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        case "class_id":
          valA = a.class_id;
          valB = b.class_id;
          break;
        case "speaker":
          valA = parseSpeaker(a.speaker);
          valB = parseSpeaker(b.speaker);
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        case "format":
          valA = a.format;
          valB = b.format;
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        case "created_at":
        case "start_date":
        default: // Default to start_date
          valA = new Date(a[closedClassSortKey] || a.start_date);
          valB = new Date(b[closedClassSortKey] || b.start_date);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return filtered;
  }, [closedClasses, closedClassSearchTerm, closedClassSortKey, sortOrder]);

  // ฟังก์ชันสำหรับเรียกข้อมูล
  const fetchClasses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await authFetch(`http://localhost:5000/api/classes`);
      const data = await response.json();
      setClasses(data); // Keep original fetched data if needed elsewhere
    } catch (error) {
      console.error("Error fetching classes:", error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();

    // Cleanup function to reset state when the component unmounts
    return () => {
      setClasses([]);
    };
  }, [user, activeRole]);

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
      const response = await authFetch(`http://localhost:5000/api/classes/${cls.class_id}/registrants`);
      if (!response.ok) {
        throw new Error("Failed to fetch registrants");
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
    closeForm.append(
      "existing_materials",
      JSON.stringify(formData.existing_materials)
    );

    // Append new files
    for (const file of formData.new_materials) {
      closeForm.append("materials", file);
    }

    try {
      const response = await authFetch(`http://localhost:5000/api/classes/${classId}/close`, {
        method: "POST",
        body: closeForm,
      });

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
      } else if (key !== "materials") { // Ignore 'materials' as we handle it separately
        updateForm.append(key, updatedData[key]);
      }
    }

    // Handle files separately to distinguish between new and existing files
    const existingFiles = [];
    updatedData.materials.forEach((file) => {
      if (file instanceof File) {
        updateForm.append("files", file); // New files to upload
      } else if (file && typeof file.name === 'string') {
        existingFiles.push(file.name); // Names of files to keep
      }
    });
    updateForm.append("existingFiles", JSON.stringify(existingFiles));
    updateForm.append("user_email", user.email);
    try {
      const response = await authFetch(`http://localhost:5000/api/classes/${classId}`, {
        method: "PUT",
        body: updateForm,
      });
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
        const response = await authFetch(`http://localhost:5000/api/classes/${classId}`, {
          method: "DELETE",
        });
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

  const handleEvaluationResultsClick = async (cls) => {
    try {
      const response = await authFetch(`http://localhost:5000/api/classes/${cls.class_id}/evaluations`);
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลผลการประเมินได้");
      const data = await response.json();
      setEvaluationData(data);
      setSelectedClassForEvaluation(cls);
      setIsEvaluationModalOpen(true);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCloseEvaluationModal = () => {
    setIsEvaluationModalOpen(false);
    setEvaluationData(null);
    setSelectedClassForEvaluation(null);
  };

  const handlePromoteToggle = async (classId, isPromoted) => {
    try {
      const response = await authFetch(
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
            parseInt(cls.class_id, 10) === classId
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
            parseInt(cls.class_id, 10) === classId ? { ...cls, promoted: !isPromoted } : cls
          )
        );
      }
    } catch (error) {
      console.error("Error toggling promotion status:", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่ออัปเดตสถานะโปรโมท");
      setClasses((prevClasses) =>
        prevClasses.map((cls) =>
          parseInt(cls.class_id, 10) === classId ? { ...cls, promoted: !isPromoted } : cls
        )
      );
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
          ภาพรวม
        </h1>
        <h2 className="font-bold mb-[10px] text-[1.25rem]">
          ห้องเรียนที่เปิดสอนได้
        </h2>
        {loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : !user ? (
          <p>กรุณาล็อกอินเพื่อดูรายการห้องเรียนของคุณ</p>
        ) : (
          <>
            {activeClasses.length > 0 ? (
              <ul className="space-y-4">
                {activeClasses.map((cls) => (
                  <li
                    key={cls.class_id || cls.id}
                    className="bg-white p-4 rounded-lg shadow-md hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-purple-800 justify-center">
                        <strong className="text-red-500">
                          {cls.class_id}{" "}
                        </strong>{" "}
                        {"  "} {cls.title}
                      </h3>
                    </div>
                    
                    <div className="text-sm text-gray-700 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        <span><strong>วิทยากร:</strong> {cls.speaker && typeof cls.speaker === "string" && cls.speaker.length > 4 ? cls.speaker.slice(2, -2).replace(/\\"/g, '"').replace(/","/g, ", ") : String(cls.speaker || "ยังไม่ระบุ")}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                        <span><strong>วันที่:</strong> {cls.start_date ? new Date(cls.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span><strong>เวลา:</strong> {cls.start_time ? cls.start_time.substring(0, 5) : "N/A"} - {cls.end_time ? cls.end_time.substring(0, 5) : "N/A"} น.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        <span><strong>รูปแบบ:</strong> {cls.format}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.077 17.077 0 003.293-3.643 19.024 19.098 0 01-2.06-3.056A1 1 0 013.266 6.05a17.204 17.204 0 001.78 2.802 16.76 16.76 0 01-.656-1.852H4a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 011 1v1h5.292a1 1 0 110 2H17v6a1 1 0 11-2 0v-6h-2.292a1 1 0 110-2H15V9a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span><strong>ภาษา:</strong> {cls.language === 'TH' ? 'ไทย (TH)' : cls.language === 'EN' ? 'อังกฤษ (ENG)' : 'ไทยและอังกฤษ (TH & ENG)'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        <span><strong>ผู้ลงทะเบียน:</strong> {(typeof cls.registered_users === "string" ? JSON.parse(cls.registered_users || "[]") : cls.registered_users || []).length} / {cls.max_participants === 999 ? "ไม่จำกัด" : cls.max_participants}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span><strong>สร้างเมื่อ:</strong> {cls.created_at ? new Date(cls.created_at).toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"} น.</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        title="ดูรายชื่อผู้ลงทะเบียน"
                        className="text-green-600 hover:text-green-800 rounded-full p-1"
                        onClick={() => handleOpenRegistrantsModal(cls)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.273-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.273.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </button>
                      <button
                        title="แก้ไข"
                        className="text-blue-600 hover:text-blue-800 rounded-full p-1"
                        onClick={() => handleEditClick(cls)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                      </button>
                      <button
                        title="ลบ"
                        className="text-red-600 hover:text-red-800 rounded-full p-1"
                        onClick={() => handleDeleteClick(cls.class_id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                      </button>

                      <label htmlFor={`promote-${cls.class_id}`} className="flex items-center cursor-pointer px-5">
                        <div className="relative">
                          <input type="checkbox" id={`promote-${cls.class_id}`} className="sr-only peer" checked={cls.promoted === 1} onChange={(e) => handlePromoteToggle(cls.class_id, e.target.checked)} />
                          <div className="w-10 h-4 bg-gray-400 rounded-full shadow-inner"></div>
                          <div className="dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition-transform duration-300 ease-in-out peer-checked:translate-x-full peer-checked:bg-green-500"></div>
                        </div>
                        <div className="ml-3 text-gray-700 font-medium">โปรโมทห้องเรียน</div>
                      </label>
                      <button
                        title="จบการสอน"
                        className="sm:ml-auto bg-amber-500 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                        onClick={() => handleOpenCloseClassModal(cls)}
                      >
                        จบการสอน
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">ไม่มี</p>
            )}
          </>
        )}
            <h2 className="font-bold mb-[10px] text-[1.25rem] mt-10">
              ห้องเรียนที่จบการสอนแล้ว
            </h2>
            <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto flex-grow">
                <input
                  type="text"
                  placeholder="ค้นหา Class ID หรือชื่อห้องเรียน"
                  value={closedClassSearchTerm}
                  onChange={(e) => setClosedClassSearchTerm(e.target.value)}
                  className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort-closed-by"
                  className="text-sm font-medium text-gray-700 whitespace-nowrap"
                >
                  เรียงโดย:
                </label>
                <select
                  id="sort-closed-by"
                  value={closedClassSortKey}
                  onChange={(e) => setClosedClassSortKey(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="class_id">Class ID</option>
                  <option value="title">ชื่อห้องเรียน</option>
                  <option value="speaker">วิทยากร</option>
                  <option value="start_date">วันที่เริ่ม</option>
                  <option value="created_at">วันที่สร้าง</option>
                  <option value="format">รูปแบบ</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors focus:outline-none"
                  title="สลับทิศทางการเรียง"
                >
                  {sortOrder === "asc" ? "▲" : "▼"}
                </button>
              </div>
            </div>
            {closedClasses.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                ยังไม่มีห้องเรียนที่จบการสอนแล้ว
              </p>
            ) : filteredClosedClasses.length > 0 ? (
              <ul className="space-y-4">
                {filteredClosedClasses.map((cls) => (
                  <li
                    key={cls.class_id || cls.id}
                    className="bg-gray-50 p-4 rounded-lg shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-gray-600 justify-center">
                        <strong className="text-red-500">
                          {cls.class_id}{" "}
                        </strong>{" "}
                        <strong className="text-purple-800">
                          {" "}
                          {"  "} {cls.title}{" "}
                        </strong>
                      </h3>
                    </div>
                    
                    <div className="text-sm text-gray-700 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        <span><strong>วิทยากร:</strong> {cls.speaker && typeof cls.speaker === "string" && cls.speaker.length > 4 ? cls.speaker.slice(2, -2).replace(/\\"/g, '"').replace(/","/g, ", ") : String(cls.speaker || "ยังไม่ระบุ")}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                        <span><strong>วันที่:</strong> {cls.start_date ? new Date(cls.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span><strong>เวลา:</strong> {cls.start_time ? cls.start_time.substring(0, 5) : "N/A"} - {cls.end_time ? cls.end_time.substring(0, 5) : "N/A"} น.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        <span><strong>รูปแบบ:</strong> {cls.format}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.077 17.077 0 003.293-3.643 19.024 19.098 0 01-2.06-3.056A1 1 0 013.266 6.05a17.204 17.204 0 001.78 2.802 16.76 16.76 0 01-.656-1.852H4a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 011 1v1h5.292a1 1 0 110 2H17v6a1 1 0 11-2 0v-6h-2.292a1 1 0 110-2H15V9a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span><strong>ภาษา:</strong> {cls.language === 'TH' ? 'ไทย (TH)' : cls.language === 'EN' ? 'อังกฤษ (ENG)' : 'ไทยและอังกฤษ (TH & ENG)'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        <span><strong>ผู้ลงทะเบียน:</strong> {(typeof cls.registered_users === "string" ? JSON.parse(cls.registered_users || "[]") : cls.registered_users || []).length} / {cls.max_participants === 999 ? "ไม่จำกัด" : cls.max_participants}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span><strong>สร้างเมื่อ:</strong> {cls.created_at ? new Date(cls.created_at).toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"} น.</span>
                      </div>
                    </div>

                    <div className="flex items-center mt-4 pt-4 border-t border-gray-200">
                      <button
                        title="ดูรายชื่อผู้ลงทะเบียน" // Icon buttons
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
                        title="ลบ" // Icon buttons
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
                      <div className="flex items-center sm:ml-auto gap-x-2">
                        <button
                          title="ผลการประเมินความพึงพอใจ"
                          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                          onClick={() => handleEvaluationResultsClick(cls)}
                        >
                          ผลการประเมิน
                        </button>
                        <button
                          title="แก้ไข"
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
                          onClick={() => handleOpenCloseClassModal(cls)}
                        >
                          แก้ไข
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">
                ไม่พบห้องเรียนที่ตรงกับการค้นหา
              </p>
            )}</div>
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
          isEditing={selectedClassToClose?.status === "closed"}
        />
      )}
      {isEvaluationModalOpen && selectedClassForEvaluation && (
        <EvaluationResultsModal
          isOpen={isEvaluationModalOpen}
          onClose={handleCloseEvaluationModal}
          evaluationData={evaluationData}
          classTitle={selectedClassForEvaluation.title}
        />
      )}
    </div>
  );
};

export default ClassIndex;
