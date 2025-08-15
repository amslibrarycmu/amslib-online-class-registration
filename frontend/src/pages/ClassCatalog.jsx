import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const ClassCatalog = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'available', 'registered'

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
      setClasses(parsedData);
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
        fetchPromotedClasses();
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
        fetchPromotedClasses();
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
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch (e) {
      return speakerData.replace(/["[\\]]/g, "").replace(/,/g, ", ");
    }
    return speakerData;
  };

  const isUserRegistered = (cls) => {
    if (!user || !Array.isArray(cls.registered_users)) return false;
    return cls.registered_users.some(
      (registeredUser) => registeredUser.email === user.email
    );
  };

  const getFilteredClasses = () => {
    if (filter === 'available') {
      return classes.filter(cls => !isUserRegistered(cls) && cls.registered_users.length < cls.max_participants);
    }
    if (filter === 'registered') {
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
          ? 'bg-purple-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-screen flex">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          ห้องเรียนทั้งหมด
        </h1>
        
        <div className="mb-6 p-2 bg-gray-200 rounded-lg inline-flex space-x-2">
            {renderNavButton('all', 'ทั้งหมด')}
            {renderNavButton('available', 'ลงทะเบียนได้')}
            {renderNavButton('registered', 'ลงทะเบียนแล้ว')}
        </div>

        {loading && <p>Loading classes...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <>
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredClasses.map((cls) => (
                  <div
                    key={cls.class_id}
                    className="bg-white rounded-lg shadow-lg p-6 flex flex-col hover:shadow-xl transition-shadow duration-300"
                  >
                    <h2 className="text-xl font-bold text-purple-800 mb-1">
                      {cls.title}
                    </h2>
                    <p className="text-xs text-gray-500 mb-2">ID: {cls.class_id}</p>
                    <p className="text-gray-600 mb-1">
                      <strong>วิทยากร: </strong> {cls.speaker}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <strong>วันที่: </strong>{" "}
                      {new Date(cls.start_date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' })} ถึง{" "}
                      {new Date(cls.end_date).toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-gray-600 mb-4">
                      <strong>ตั้งแต่เวลา:</strong> {cls.start_time.substring(0, 5)}{" "}
                      <strong>ถึง </strong> {cls.end_time.substring(0, 5)} น.
                    </p>
                    <p className="text-gray-700 mb-4 flex-grow">
                      <strong>รายละเอียด </strong> <br/>
                      {cls.description}
                    </p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-gray-600">
                        ลงทะเบียนแล้ว:
                      </span>
                      <span className="font-bold text-lg text-gray-800">
                        {cls.registered_users.length} / {cls.max_participants}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        isUserRegistered(cls)
                          ? handleCancelRegistration(cls.class_id)
                          : handleRegister(cls.class_id)
                      }
                      disabled={
                        !isUserRegistered(cls) &&
                        cls.registered_users.length >= cls.max_participants
                      }
                      className={`w-full py-2 px-4 rounded font-semibold text-white transition-colors duration-300 ${
                        isUserRegistered(cls)
                          ? "bg-yellow-500 hover:bg-yellow-600"
                          : cls.registered_users.length >= cls.max_participants
                          ? "bg-red-600 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isUserRegistered(cls)
                        ? "ยกเลิกการจอง"
                        : cls.registered_users.length >= cls.max_participants
                        ? "ห้องเรียนเต็มแล้ว"
                        : "ลงทะเบียน"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700">ไม่พบห้องเรียน</h3>
                <p className="text-gray-500 mt-2">ไม่มีห้องเรียนที่ตรงกับตัวกรองที่คุณเลือก</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClassCatalog;
