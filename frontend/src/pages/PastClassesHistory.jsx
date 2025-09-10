import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import FileViewerModal from "../components/FileViewerModal"; // Import the modal

const PastClassesHistory = () => {
  const { user } = useAuth();
  const [pastClasses, setPastClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for the modal
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedClassTitle, setSelectedClassTitle] = useState("");

  const fetchPastClasses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/classes/registered/closed?email=${encodeURIComponent(
          user.email
        )}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch past classes.");
      }
      const data = await response.json();

      const parsedData = data.map((cls) => ({
        ...cls,
        speaker: parseAndJoin(cls.speaker),
        materials: cls.materials ? JSON.parse(cls.materials) : [],
        registered_users: JSON.parse(cls.registered_users || "[]"),
      }));

      setPastClasses(parsedData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching past classes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastClasses();
  }, [user]);

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

  // Handlers for the modal
  const handleViewFiles = (files, title) => {
    setSelectedFiles(files);
    setSelectedClassTitle(title);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFiles([]);
    setSelectedClassTitle("");
  };

  return (
    <>
      <div className="w-screen flex">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 min-h-screen">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">
            ประวัติการเข้าร่วม
          </h1>

          {loading && <p>กำลังโหลดข้อมูล...</p>}
          {error && <p className="text-red-500">เกิดข้อผิดพลาด: {error}</p>}

          {!loading && !error && (
            <>
              {pastClasses.length > 0 ? (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                  <table className="w-full text-md text-left text-gray-500">
                    <thead className="text-lg text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3 px-6">
                          Class ID
                        </th>
                        <th scope="col" className="py-3 px-6">
                          หลักสูตร
                        </th>
                        <th scope="col" className="py-3 px-6">
                          เข้าร่วมเมื่อ
                        </th>
                        <th scope="col" className="py-3 px-6 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastClasses.map((cls) => (
                        <tr
                          key={cls.class_id}
                          className="bg-white border-b hover:bg-gray-50"
                        >
                          <td className="py-4 px-6 font-bold text-red-600 whitespace-nowrap">
                            {cls.class_id}
                          </td>
                          <td className="py-4 px-6 font-bold text-purple-600">
                            {cls.title}
                          </td>
                          <td className="py-4 px-6">
                            {new Date(cls.start_date).toLocaleDateString(
                              "th-TH",
                              { year: "numeric", month: "long", day: "numeric" }
                            )}
                            {" - "}
                            {new Date(cls.end_date).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </td>
                          <td className="py-4 px-6 flex justify-end space-x-2">
                            <button
                              title="ดูไฟล์"
                              className="text-green-600 hover:text-green-800 p-1 rounded-full"
                              onClick={() =>
                                handleViewFiles(cls.materials, cls.title)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                                />
                              </svg>
                            </button>
                            <button
                              title="ดูวิดีโอย้อนหลัง"
                              className="text-purple-600 hover:text-purple-800 p-1 rounded-full"
                              onClick={() =>
                                window.open(cls.video_link, "_blank")
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-700">
                    ไม่พบประวัติการเรียนที่ผ่านมา
                  </h3>
                  <p className="text-gray-500 mt-2">
                    คุณยังไม่มีห้องเรียนที่จบการสอนแล้ว
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <FileViewerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        files={selectedFiles}
        classTitle={selectedClassTitle}
      />
    </>
  );
};

export default PastClassesHistory;
