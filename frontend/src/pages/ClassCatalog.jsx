import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const DescriptionModal = ({ isOpen, onClose, title, description }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-purple-800 mb-4 text-center">{title}</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            รายละเอียด
          </h3>
          <div className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-md border min-h-[100px]  break-words">
            {description || (
              <p className="text-gray-400 italic">ไม่มีรายละเอียดเพิ่มเติม</p>
            )}
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const ClassCatalog = () => {
  const { user, authFetch } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'available', 'registered'
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [selectedClassForDescription, setSelectedClassForDescription] =
    useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const fetchPromotedClasses = async () => {
    try {
      setLoading(true);
      const response = await authFetch("http://localhost:5000/api/classes/promoted");
      if (!response.ok) {
        throw new Error("Failed to fetch classes.");
      }
      const data = await response.json();
      const parsedData = data.map((cls) => ({
        ...cls,
        speaker: parseAndJoin(cls.speaker),
        target_groups: parseAndJoin(cls.target_groups),
        registered_users: cls.registered_users || [], // Directly use the array from backend, default to [] if null/undefined
      }));
      // Filter out closed classes for ClassCatalog
      const activeClasses = parsedData.filter((cls) => cls.status !== "closed");
      setClasses(activeClasses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { // Use authFetch in dependency array
    if (user) { // Only fetch if user is loaded
      fetchPromotedClasses();
    }
  }, [user, authFetch]);

  const handleRegister = async (classId) => {
    if (!user) {
      alert("Please log in to register.");
      return;
    }
    try {
      const response = await authFetch(`http://localhost:5000/api/classes/${classId}/register`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.class_id === classId
              ? {
                  ...cls,
                  registered_users: [...cls.registered_users, user.email],
                }
              : cls
          )
        );
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      alert("An error occurred during registration.");
    }
  };

  const handleCancelRegistration = async (classId) => {
    if (!user) {
      alert("Please log in.");
      return;
    }
    try {
      const response = await authFetch(`http://localhost:5000/api/classes/${classId}/cancel`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.class_id === classId
              ? {
                  ...cls,
                  registered_users: cls.registered_users.filter(
                    (email) => email !== user.email
                  ),
                }
              : cls
          )
        );
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error("Cancellation failed:", err);
      alert("An error occurred during cancellation.");
    }
  };

  const handleSelectClass = (classId) => {
    setSelectedClasses((prevSelected) =>
      prevSelected.includes(classId)
        ? prevSelected.filter((id) => id !== classId)
        : [...prevSelected, classId]
    );
  };

  const handleBulkRegister = async () => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบเพื่อลงทะเบียน");
      return;
    }
    if (selectedClasses.length === 0) {
      return;
    }

    if (!window.confirm(`คุณต้องการลงทะเบียน ${selectedClasses.length} คลาสที่เลือกใช่หรือไม่?`)) {
      return;
    }

    setIsBulkRegistering(true);
    const results = { success: [], failed: [] };

    for (const classId of selectedClasses) {
      const cls = classMap[classId];
      if (!cls || !isUserInTargetGroup(cls)) {
        results.failed.push({ classId, message: "คุณไม่มีสิทธิ์ในการลงทะเบียนเรียนคลาสนี้" });
        continue; // Skip to the next class
      }

      try {
        const response = await authFetch(`http://localhost:5000/api/classes/${classId}/register`, {
          method: "POST",
        });
        const data = await response.json();
        if (response.ok) {
          results.success.push(classId);
        } else {
          results.failed.push({ classId, message: data.message });
        }
      } catch (err) {
        results.failed.push({ classId, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
      }
    }

    setIsBulkRegistering(false);
    alert(
      `ลงทะเบียนแล้ว\nสำเร็จ: ${results.success.length} ห้องเรียน\nล้มเหลว: ${results.failed.length} ห้องเรียน`
    );

    await fetchPromotedClasses(); // Refresh data from server
    setSelectedClasses([]);
  };

  const parseAndJoin = (speakerData) => {
    if (!speakerData) return "N/A";
    if (typeof speakerData !== "string") return String(speakerData);
    try {
      let parsed = JSON.parse(speakerData);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch (e) {
      return speakerData.replace(/["[\]]/g, "").replace(/,/g, ", ");
    }
    return speakerData;
  };

  const isUserRegistered = (cls) => {
    if (!user || !Array.isArray(cls.registered_users)) return false;
    return cls.registered_users.includes(user.email);
  };

  const isUserInTargetGroup = (cls) => {
    if (!user || !user.roles || !Array.isArray(user.roles)) return false;

    // Ensure cls.target_groups is parsed as an array
    const targetGroups = Array.isArray(cls.target_groups)
      ? cls.target_groups
      : typeof cls.target_groups === 'string'
        ? cls.target_groups.split(',').map(group => group.trim())
        : [];

    // Check if any of the user's roles are in the targetGroups
    return user.roles.some(role => targetGroups.includes(role));
  };

  const getFilteredClasses = () => {
    if (filter === "available") {
      return classes.filter(
        (cls) =>
          !isUserRegistered(cls) &&
          (cls.max_participants === 999 ||
            cls.registered_users.length < cls.max_participants)
      );
    }
    if (filter === "registered") {
      return classes.filter(isUserRegistered);
    }
    return classes; // 'all'
  };

  // --- คำนวณจำนวนรายการสำหรับแต่ละ Tab ---
  const availableCount = classes.filter(cls => !isUserRegistered(cls) && (cls.max_participants === 999 || cls.registered_users.length < cls.max_participants)).length;
  const registeredCount = classes.filter(isUserRegistered).length;

  const classMap = classes.reduce((acc, cls) => {
    acc[cls.class_id] = cls;
    return acc;
  }, {});

  const handleOpenDescriptionModal = (cls) => {
    setSelectedClassForDescription(cls);
    setIsDescriptionModalOpen(true);
  };

  const filteredClasses = getFilteredClasses();

  return (
    <div className="w-screen flex flex-col lg:flex-row">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <DescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        title={selectedClassForDescription?.title}
        description={selectedClassForDescription?.description}
      />
      {/* Floating Action Button for Mobile */}
      {selectedClasses.length > 0 && (
        <div className="fixed bottom-4 right-4 z-20 lg:hidden">
          <button
            onClick={handleBulkRegister}
            disabled={isBulkRegistering}
            className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-green-700 transition-all disabled:bg-gray-400 disabled:cursor-wait"
          >
            {isBulkRegistering
              ? "..."
              : `ลงทะเบียน (${selectedClasses.length})`}
          </button>
        </div>
      )}

      <div className="flex-1 p-4 md:p-8 bg-gray-100 min-h-screen">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800 text-center">
          หัวข้อที่เปิดสอน
        </h1>

        {/* --- TABS --- */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-y-4">
            <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-8" aria-label="Tabs">
              <button onClick={() => setFilter('all')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filter === 'all' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                ทั้งหมด ({classes.length})
              </button>
              <button onClick={() => setFilter('registered')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filter === 'registered' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                ลงทะเบียนแล้ว ({registeredCount})
              </button>
            </nav>
            {/* Bulk Register Button for Desktop */}
            {selectedClasses.length > 0 && (
              <div className="hidden lg:block">
                <button onClick={handleBulkRegister} disabled={isBulkRegistering} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all disabled:bg-gray-400 disabled:cursor-wait">
                  {isBulkRegistering ? "กำลังลงทะเบียน..." : `ลงทะเบียน ${selectedClasses.length} ห้องเรียนที่เลือก`}
                </button>
              </div>
            )}
          </div>
        </div>

        {filter !== 'registered' && (
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              คุณสามารถลงทะเบียนหลายหัวข้อได้พร้อมกันในครั้งเดียว โดยการทำเครื่องหมายที่ {""}
              <input type="checkbox" className="h-4 w-4 mb-1 mx-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 align-middle pointer-events-none" readOnly /> ในหัวข้อที่คุณต้องการ จากนั้นคลิกปุ่มสีเขียวที่ระบุ "ลงทะเบียน"
            </span>
          </div>
        )}

        {loading && <p>Loading classes...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <>
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => {
                  const isFull =
                    cls.max_participants !== 999 &&
                    cls.registered_users.length >= cls.max_participants;
                  const isRegistered = isUserRegistered(cls);                  
                  const isInTargetGroup = isUserInTargetGroup(cls);
                  const isRegisterable = !isFull && !isRegistered && cls.status !== "closed" && isInTargetGroup;

                  const StatusBadge = () => {
                    if (isRegistered) {
                      return (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                          ลงทะเบียนแล้ว
                        </div>
                      );
                    }
                    if (isFull) {
                      return (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                          เต็มแล้ว
                        </div>
                      );
                    }
                    return null;
                  };

                  let registerButtonTooltip = "";
                  if (!isInTargetGroup) {
                    registerButtonTooltip = "คุณไม่มีสิทธิ์ในการลงทะเบียนเนื่องจากบทบาทของคุณไม่ตรงกับกลุ่มเป้าหมาย";
                  }


                  return (
                    <div
                      key={cls.class_id}
                      className="bg-white rounded-xl shadow-lg flex flex-col hover:shadow-xl transition-shadow duration-300 relative overflow-hidden cursor-pointer"
                      onClick={() => handleOpenDescriptionModal(cls)}
                    >
                      <StatusBadge />
                      {isRegisterable && (
                        <div className="absolute top-4 right-4 z-10">
                          <input
                            type="checkbox"
                            className="h-6 w-6 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            checked={selectedClasses.includes(cls.class_id)}
                            onChange={() => handleSelectClass(cls.class_id)}
                            onClick={(e) => e.stopPropagation()} // Prevent card click
                          />
                        </div>
                      )}
                      <div className="p-6 flex-grow flex flex-col">
                        <h2 className="text-xl font-bold text-purple-800 mb-2 pr-12 break-words">
                          {cls.title}
                        </h2>
                        <p className="text-xs text-gray-400 mb-4">
                          ID: {cls.class_id}
                        </p>

                        <div className="space-y-3 text-gray-700 text-sm mb-4 flex-grow">
                          <div className="flex items-start gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>
                              <strong>วิทยากร:</strong> {cls.speaker}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>
                              <strong>วันที่:</strong>{" "}
                              {new Date(cls.start_date).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>
                              <strong>เวลา:</strong>{" "}
                              {cls.start_time.substring(0, 5)} -{" "}
                              {cls.end_time.substring(0, 5)} น.
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            <span>
                              <strong>รูปแบบ:</strong> {cls.format}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.077 17.077 0 003.293-3.643 19.024 19.098 0 01-2.06-3.056A1 1 0 013.266 6.05a17.204 17.204 0 001.78 2.802 16.76 16.76 0 01-.656-1.852H4a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 011 1v1h5.292a1 1 0 110 2H17v6a1 1 0 11-2 0v-6h-2.292a1 1 0 110-2H15V9a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span><strong>ภาษา:</strong> {cls.language === 'TH' ? 'ไทย' : cls.language === 'EN' ? 'อังกฤษ' : 'ไทยและอังกฤษ'}</span>
                          </div>
                          {cls.format === "ONSITE" && cls.location && (
                            <div className="flex items-start gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span>
                                <strong>สถานที่:</strong> {cls.location}
                              </span>
                            </div>
                          )}
                          {cls.target_groups && (
                            <div className="flex items-start gap-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              <span>
                                <strong>กลุ่มเป้าหมาย:</strong>{" "}
                                {cls.target_groups}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDescriptionModal(cls);
                              }}
                              className="text-purple-700 font-semibold hover:underline hover:text-purple-900 transition-colors"
                            >
                              ดูรายละเอียดเพิ่มเติม
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-auto">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-bold text-gray-800">
                                {cls.registered_users.length} /{" "}
                                {cls.max_participants === 999
                                  ? "ไม่จำกัด"
                                  : cls.max_participants}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                isRegistered
                                  ? handleCancelRegistration(cls.class_id)
                                  : handleRegister(cls.class_id)
                                }
                              }
                              title={registerButtonTooltip}
                              disabled={
                                (!isRegistered && isFull) ||
                                  cls.status === "closed" ||
                                  !isInTargetGroup
                              }
                              className={`py-2 px-4 rounded-md font-semibold text-white text-sm transition-colors duration-300 ${
                                  !isInTargetGroup
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : cls.status === "closed"
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : isRegistered
                                  ? "bg-yellow-500 hover:bg-yellow-600"
                                  : isFull
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {!isInTargetGroup
                                ? "ไม่สามารถลงทะเบียนได้"
                                : cls.status === "closed"
                                ? "จบการสอนแล้ว"
                                : isRegistered
                                ? "ยกเลิก"
                                : isFull
                                ? "เต็มแล้ว"
                                : "ลงทะเบียน"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700">
                  ไม่พบห้องเรียน
                </h3>
                <p className="text-gray-500 mt-2">
                  ไม่มีห้องเรียนที่ตรงกับตัวกรองที่คุณเลือก
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClassCatalog;
