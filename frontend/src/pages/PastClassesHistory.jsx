import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar'; // Assuming Sidebar is needed for layout

const PastClassesHistory = () => {
  const { user } = useAuth();
  const [pastClasses, setPastClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPastClasses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Assuming an endpoint that returns all classes a user registered for
      // We will filter by status === 'closed' on the client side
      const response = await fetch(`http://localhost:5000/api/classes/registered/closed?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch past classes.');
      }
      const data = await response.json();

      // The backend endpoint already filters for registered and closed classes,
      // so no further client-side filtering is needed for status or registration.
      const parsedData = data.map(cls => ({
        ...cls,
        speaker: parseAndJoin(cls.speaker),
        registered_users: JSON.parse(cls.registered_users || '[]'),
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
  }, [user]); // Re-fetch when user changes

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

  return (
    <div className="w-screen flex">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">ประวัติการเรียนที่ผ่านมา</h1>

        {loading && <p>กำลังโหลดข้อมูล...</p>}
        {error && <p className="text-red-500">เกิดข้อผิดพลาด: {error}</p>}

        {!loading && !error && (
          <>
            {pastClasses.length > 0 ? (
              <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3 px-6">
                        ชื่อห้องเรียน
                      </th>
                      <th scope="col" className="py-3 px-6">
                        วิทยากร
                      </th>
                      <th scope="col" className="py-3 px-6">
                        วันที่
                      </th>
                      <th scope="col" className="py-3 px-6">
                        รูปแบบ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastClasses.map((cls) => (
                      <tr key={cls.class_id} className="bg-white border-b hover:bg-gray-50">
                        <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                          {cls.title}
                        </td>
                        <td className="py-4 px-6">
                          {cls.speaker}
                        </td>
                        <td className="py-4 px-6">
                          {new Date(cls.start_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                          {" - "}
                          {new Date(cls.end_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                        </td>
                        <td className="py-4 px-6">
                          {cls.format}
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
  );
};

export default PastClassesHistory;
