import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar"; // 🟢 1. Import Sidebar
import AdminAppointmentModal from "../components/AdminAppointmentModal";
import ProcessingOverlay from "../components/ProcessingOverlay";

const ADMIN_LEVEL_MAP = {
  1: "ผู้สอน",
  2: "ผู้จัดการเนื้อหา",
  3: "ผู้ดูแลระบบ",
};

const UserManagement = () => {
  const { authFetch } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("http://localhost:5000/api/users/admins");
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ดูแลระบบ");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAppointmentSuccess = () => {
    setIsModalOpen(false);
    fetchAdmins(); // Refresh the list
  };

  const handleLevelChange = async (userId, newLevel) => {
    if (window.confirm(`คุณต้องการเปลี่ยนระดับของผู้ใช้นี้เป็น "${ADMIN_LEVEL_MAP[newLevel]}" ใช่หรือไม่?`)) {
      setProcessing(true);
      try {
        const response = await authFetch(`http://localhost:5000/api/users/admins/${userId}/level`, {
          method: 'PUT',
          body: { admin_level: newLevel },
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Failed to update level");
        }
        alert("เปลี่ยนระดับสำเร็จ");
        fetchAdmins();
      } catch (error) {
        console.error("Error changing admin level:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleRemoveAdmin = async (userId, userName) => {
     if (window.confirm(`คุณต้องการถอนสิทธิ์ผู้ดูแลระบบของ "${userName}" ใช่หรือไม่? การกระทำนี้จะลบผู้ใช้ออกจากตารางสิทธิ์เท่านั้น`)) {
      setProcessing(true);
      try {
        const response = await authFetch(`http://localhost:5000/api/users/admins/${userId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Failed to remove admin");
        }
        alert("ถอนสิทธิ์สำเร็จ");
        fetchAdmins();
      } catch (error) {
        console.error("Error removing admin:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
        setProcessing(false);
      }
    }
  };


  if (loading) {
    return <div className="p-8">กำลังโหลดข้อมูลผู้ดูแล...</div>;
  }

  return (
    // 🟢 2. เพิ่ม Layout หลักสำหรับจัดวาง Sidebar และเนื้อหา
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 pt-20 lg:pt-8 px-4 sm:px-6 lg:px-8 bg-gray-100 overflow-y-auto">
        {processing && <ProcessingOverlay message="กำลังดำเนินการ..." />}
        <div className="max-w-7xl mx-auto">
          {/* 🟢 START: ปรับปรุงส่วนหัวและปุ่ม */}
          <div className="relative mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center py-2">
              จัดการสิทธิ์ผู้ดูแล
            </h1>
            {/* --- Desktop Button --- */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="hidden md:block absolute top-0 right-0 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-purple-700 transition-colors"
            >
              + แต่งตั้งผู้ดูแล
            </button>
          </div>
          {/* --- Mobile Floating Action Button (FAB) --- */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="md:hidden fixed bottom-6 right-6 bg-purple-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-transform hover:scale-110 z-20"
            aria-label="แต่งตั้งผู้ใช้"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
          </button>
          {/* 🟢 END: ปรับปรุงส่วนหัวและปุ่ม */}

          <div className="bg-white shadow-md rounded-lg overflow-hidden mt-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      อีเมล
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ระดับสิทธิ์
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.user_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {admin.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <select
                          value={admin.admin_level}
                          onChange={(e) => handleLevelChange(admin.user_id, parseInt(e.target.value))}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                          <option value="1">{ADMIN_LEVEL_MAP[1]}</option>
                          <option value="2">{ADMIN_LEVEL_MAP[2]}</option>
                          <option value="3">{ADMIN_LEVEL_MAP[3]}</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleRemoveAdmin(admin.user_id, admin.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          ถอนสิทธิ์
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {admins.length === 0 && (
              <p className="text-center text-gray-500 mt-8">ไม่พบข้อมูลผู้ดูแลระบบ</p>
          )}
        </div>

        <AdminAppointmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAppointmentSuccess}
        />
      </div>
    </div>
  );
};

export default UserManagement;
