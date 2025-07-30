import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      const res = await fetch(
        `http://localhost:5000/api/classes?email=${encodeURIComponent(
          user.email
        )}`
      );
      const data = await res.json();
      setClasses(data);
      setLoading(false);
    };
    fetchClasses();
  }, [user.email]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    const [h, m] = timeStr.split(":");
    if (!h || !m) return timeStr;
    return `${h}:${m} น.`;
  };

  return (
    <div className="flex w-screen">
      <Sidebar />
      <div className="flex-2 flex-row p-8 w-fit">
        <h1 className="text-2xl font-bold mb-6 text-center"> ภาพรวม </h1>
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-bold mb-[10px] text-[1.25rem]">
            รายการห้องเรียนที่คุณสร้าง
          </h2>
          <table className="w-full border-separate border-spacing">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">Class ID</th>
                <th className="px-4 py-2">ชื่อวิชาเรียน</th>
                <th className="px-4 py-2">วิทยากร</th>
                <th className="px-4 py-2">วันเริ่มเรียน</th>
                <th className="px-4 py-2">วันสิ้นสุด</th>
                <th className="px-4 py-2">เวลาเริ่มเรียน-สิ้นสุด</th>
                <th className="px-4 py-2">แก้ไข/ลบ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.class_id} className="bg-gray-100">
                    <td className="px-4 py-2 text-center">{cls.class_id}</td>
                    <td className="px-4 py-2">{cls.title}</td>
                    <td className=" px-4 py-2">
                      {Array.isArray(cls.speaker)
                        ? cls.speaker.join(", ")
                        : typeof cls.speaker === "string" &&
                          cls.speaker.startsWith("[")
                        ? JSON.parse(cls.speaker).join(", ")
                        : cls.speaker}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatDate(cls.start_date)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatDate(cls.end_date)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {cls.start_time && cls.end_time
                        ? `${formatTime(cls.start_time)} - ${formatTime(
                            cls.end_time
                          )}`
                        : "-"}
                    </td>
                    <td className=" px-4 py-2 text-center">
                      <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded mr-2">
                        แก้ไข
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;