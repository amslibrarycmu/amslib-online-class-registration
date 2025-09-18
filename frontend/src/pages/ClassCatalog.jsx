import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const ClassCatalog = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'available', 'registered'

  const fetchPromotedClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:5000/api/classes/promoted"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch classes.");
      }
      const data = await response.json();
      const parsedData = data.map((cls) => ({
        ...cls,
        speaker: parseAndJoin(cls.speaker),
        registered_users: JSON.parse(cls.registered_users || "[]"),
      }));
      // Filter out closed classes for ClassCatalog
      const activeClasses = parsedData.filter(cls => cls.status !== 'closed');
      setClasses(activeClasses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotedClasses();
  }, []);

  const handleRegister = async (classId) => {
    if (!user) {
      alert("Please log in to register.");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:5000/api/classes/${classId}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: user.name, email: user.email }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setClasses(prevClasses =>
            prevClasses.map(cls =>
                cls.class_id === classId
                    ? { ...cls, registered_users: [...cls.registered_users, user.email] }
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
      const response = await fetch(
        `http://localhost:5000/api/classes/${classId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setClasses(prevClasses =>
            prevClasses.map(cls =>
                cls.class_id === classId
                    ? { ...cls, registered_users: cls.registered_users.filter(email => email !== user.email) }
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

  const filteredClasses = getFilteredClasses();

  const renderNavButton = (key, label) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
        filter === key
          ? "bg-purple-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-screen flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 text-center">ห้องเรียน</h1>

        <div className="mb-6 p-2 bg-gray-200 rounded-lg inline-flex space-x-2">
          {renderNavButton("all", "ทั้งหมด")}
          {renderNavButton("available", "ลงทะเบียนได้")}
          {renderNavButton("registered", "ลงทะเบียนแล้ว")}
        </div>

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

                  const StatusBadge = () => {
                    if (isRegistered) {
                      return <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ลงทะเบียนแล้ว</div>;
                    }
                    if (isFull) {
                      return <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">เต็มแล้ว</div>;
                    }
                    return null;
                  };

                  return (
                    <div
                      key={cls.class_id}
                      className="bg-white rounded-xl shadow-lg flex flex-col hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
                    >
                      <StatusBadge />
                      <div className="p-6 flex-grow flex flex-col">
                        <h2 className="text-xl font-bold text-purple-800 mb-2">
                          {cls.title}
                        </h2>
                        <p className="text-xs text-gray-400 mb-4">
                          ID: {cls.class_id}
                        </p>

                        <div className="space-y-3 text-gray-700 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span><strong>วิทยากร:</strong> {cls.speaker}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                            <span><strong>วันที่:</strong> {new Date(cls.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            <span><strong>เวลา:</strong> {cls.start_time.substring(0, 5)} - {cls.end_time.substring(0, 5)} น.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                            <span><strong>รูปแบบ:</strong> {cls.format}</span>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 flex-grow">
                          {cls.description}
                        </p>

                        <div className="border-t border-gray-200 pt-4 mt-auto">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                              <span className="font-bold text-gray-800">
                                {cls.registered_users.length} / {cls.max_participants === 999 ? "ไม่จำกัด" : cls.max_participants}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                isRegistered
                                  ? handleCancelRegistration(cls.class_id)
                                  : handleRegister(cls.class_id)
                              }
                              disabled={(!isRegistered && isFull) || cls.status === 'closed'}
                              className={`py-2 px-4 rounded-md font-semibold text-white text-sm transition-colors duration-300 ${
                                cls.status === 'closed'
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : isRegistered
                                  ? "bg-yellow-500 hover:bg-yellow-600"
                                  : isFull
                                  ? "bg-red-500 cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {cls.status === 'closed'
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
