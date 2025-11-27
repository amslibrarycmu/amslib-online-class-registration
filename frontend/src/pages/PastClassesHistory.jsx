import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import FileViewerModal from "../components/FileViewerModal";
import EvaluationModal from "../components/EvaluationModal";

const PastClassesHistory = () => {
  const { user, authFetch } = useAuth(); // Use authFetch
  const [pastClasses, setPastClasses] = useState([]);
  const [evaluatedClasses, setEvaluatedClasses] = useState(new Set()); // 3. State for evaluated classes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for FileViewerModal
  const [isFileModalOpen, setFileModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedClassTitle, setSelectedClassTitle] = useState("");

  // 2. State for EvaluationModal
  const [isEvalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedClassForEval, setSelectedClassForEval] = useState(null);

  const fetchPastClasses = useCallback(async () => {
    if (!user) return;
    try {
      // Use authFetch and a more secure endpoint if available, but this one works for now
      const response = await authFetch(`http://localhost:5000/api/classes/registered/closed`);

      if (!response.ok) throw new Error("Failed to fetch past classes.");
      const data = await response.json();
      const parsedAndSortedData = data
        .map((cls) => ({
          ...cls,
          speaker: parseAndJoin(cls.speaker),
          // Safely parse materials: only parse if it's a non-empty string.
          materials: (cls.materials && typeof cls.materials === 'string') ? JSON.parse(cls.materials) : [],
        }))
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      setPastClasses(parsedAndSortedData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching past classes:", err);
    }
  }, [user, authFetch]);

  const fetchEvaluatedClasses = useCallback(async () => {
    if (!user) return;
    try {
      // Use authFetch and the correct endpoint
      const response = await authFetch(`http://localhost:5000/api/evaluations/user-status`);
      if (!response.ok) throw new Error("Failed to fetch evaluation status.");
      const data = await response.json();
      setEvaluatedClasses(new Set(data));
    } catch (err) {
      console.error("Error fetching evaluation status:", err);
    }
  }, [user, authFetch]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoading(true);
        await Promise.all([fetchPastClasses(), fetchEvaluatedClasses()]);
        setLoading(false);
      }
    };
    loadData();
  }, [user, fetchPastClasses, fetchEvaluatedClasses]);

  const parseAndJoin = (speakerData) => {
    if (!speakerData) return "N/A";
    try {
      const parsed = JSON.parse(speakerData);
      return Array.isArray(parsed) ? parsed.join(", ") : speakerData;
    } catch (e) {
      return speakerData;
    }
  };

  // Handlers for FileViewerModal
  const handleViewFiles = (files, title) => {
    setSelectedFiles(files);
    setSelectedClassTitle(title);
    setFileModalOpen(true);
  };

  // 5. Handlers for EvaluationModal
  const handleOpenEvalModal = (cls) => {
    setSelectedClassForEval(cls);
    setEvalModalOpen(true);
  };

  const handleCloseEvalModal = () => {
    setEvalModalOpen(false);
    setSelectedClassForEval(null);
  };

  // 6. Refresh evaluated classes list after submission
  const handleSubmitSuccess = () => {
    fetchEvaluatedClasses();
  };

  return (
    <>
      <div className="w-screen flex">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 min-h-screen">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 text-center">ประวัติการเข้าร่วม</h1>

          {loading && <p>กำลังโหลดข้อมูล...</p>}
          {error && <p className="text-red-500">เกิดข้อผิดพลาด: {error}</p>}

          {!loading && !error && (
            <>
              {pastClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pastClasses.map((cls) => (
                    <div key={cls.class_id} className="bg-white rounded-xl shadow-lg flex flex-col hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                      <div className="p-6 flex-grow flex flex-col">
                        <h2 className="text-xl font-bold text-purple-800 mb-2">{cls.title}</h2>
                        <p className="text-xs text-gray-400 mb-4">ID: {cls.class_id}</p>

                        <div className="space-y-3 text-gray-700 text-sm mb-4 flex-grow">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span><strong>วิทยากร:</strong> {cls.speaker}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                            <span><strong>เข้าร่วมเมื่อ:</strong> {new Date(cls.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-auto">
                          <div className="flex justify-end items-center space-x-2">
                            {!evaluatedClasses.has(cls.class_id) ? (
                              <button
                                title="ตอบแบบประเมินความพึงพอใจ"
                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-3 rounded-md transition-colors focus:outline-none"
                                onClick={() => handleOpenEvalModal(cls)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                <span>ประเมิน</span>
                              </button>
                            ) : (
                                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold py-2 px-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    <span>ประเมินแล้ว</span>
                                </div>
                            )}
                            <button
                              title="ดูไฟล์"
                              disabled={!cls.materials || cls.materials.length === 0}
                              className="text-green-600 hover:text-green-800 p-2 rounded-full disabled:text-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none"
                              onClick={() => handleViewFiles(cls.materials, cls.title)}
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                              </svg>
                            </button>
                            <button
                              title="ดูวิดีโอย้อนหลัง"
                              disabled={!cls.video_link}
                              className="text-purple-600 hover:text-purple-800 p-2 rounded-full disabled:text-gray-300 disabled:cursor-not-allowed transition-colors focus:outline-none"
                              onClick={() => window.open(cls.video_link, "_blank")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-700">ไม่พบประวัติการเรียนที่ผ่านมา</h3>
                  <p className="text-gray-500 mt-2">คุณยังไม่มีห้องเรียนที่จบการสอนแล้ว</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <FileViewerModal
        isOpen={isFileModalOpen}
        onClose={() => setFileModalOpen(false)}
        files={selectedFiles}
        classTitle={selectedClassTitle}
      />
      {/* 9. Render the EvaluationModal */}
      {selectedClassForEval && (
        <EvaluationModal
          isOpen={isEvalModalOpen}
          onClose={handleCloseEvalModal}
          classToEvaluate={selectedClassForEval}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}
    </>
  );
};

export default PastClassesHistory;