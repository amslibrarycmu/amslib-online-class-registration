import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const ActivityLogs = () => {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 25;

  useEffect(() => {
    if (activeRole !== 'ผู้ดูแลระบบ') {
      navigate('/');
    }
  }, [activeRole, navigate]);

  const fetchLogs = async (pageNum) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/activity-logs?page=${pageNum}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลประวัติการใช้งานได้');
      }
      const data = await response.json();
      if (data.length < limit) {
        setHasMore(false);
      }
      setLogs(prevLogs => pageNum === 1 ? data : [...prevLogs, ...data]);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const getActionText = (log) => {
    const details = log.details ? JSON.parse(log.details) : {};
    switch (log.action_type) {
      case 'LOGIN_SUCCESS':
        return `เข้าสู่ระบบ`;
      case 'CREATE_USER':
        return `สร้างบัญชีผู้ใช้ใหม่`;
      case 'UPDATE_PROFILE':
        return `อัปเดตโปรไฟล์`;
      case 'UPDATE_PHOTO':
        return `อัปเดต/เปลี่ยนรูปโปรไฟล์`;
      case 'DELETE_PHOTO':
        return `ลบรูปโปรไฟล์`;
      case 'UPDATE_ROLE':
        return `เปลี่ยนสิทธิ์ของ ${details.target_user || 'N/A'} เป็น ${details.new_roles?.join(', ') || 'N/A'}`;
      case 'UPDATE_STATUS':
        return `เปลี่ยนสถานะของ ${details.target_user || 'N/A'} เป็น ${details.new_status || 'N/A'}`;
      case 'DELETE_USER':
        return `ลบบัญชีผู้ใช้ ${details.deleted_user_details?.name || 'N/A'}`;
      default:
        return log.action_type;
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          ประวัติการใช้งานระบบ
        </h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลา</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้กระทำ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_name} ({log.user_email})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getActionText(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <p className="text-center py-4">กำลังโหลด...</p>}
            {!loading && hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
                >
                  โหลดเพิ่มเติม
                </button>
              </div>
            )}
            {!loading && !hasMore && logs.length > 0 && (
              <p className="text-center text-gray-500 py-4">-- สิ้นสุดรายการ --</p>
            )}
             {!loading && logs.length === 0 && (
              <p className="text-center text-gray-500 py-8">ไม่พบประวัติการใช้งาน</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;