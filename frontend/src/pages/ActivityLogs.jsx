import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, logFrontendActivity } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

// Constants for action types
const ACTION_TYPE_LABELS = {
  LOGIN_SUCCESS: 'เข้าสู่ระบบ',
  LOGOUT: 'ออกจากระบบ',
  CREATE_USER: 'สร้างบัญชีผู้ใช้ใหม่',
  UPDATE_PROFILE: 'อัปเดตโปรไฟล์',
  UPDATE_PHOTO: 'อัปเดต/เปลี่ยนรูปโปรไฟล์',
  DELETE_PHOTO: 'ลบรูปโปรไฟล์',
  UPDATE_ROLE: 'เปลี่ยนสิทธิ์',
  UPDATE_STATUS: 'เปลี่ยนสถานะ',
  DELETE_USER: 'ลบบัญชีผู้ใช้',
  SWITCH_ROLE: 'สลับบทบาท',
  CREATE_CLASS: 'สร้างห้องเรียนใหม่',
  UPDATE_CLASS: 'แก้ไขข้อมูลห้องเรียน',
  DELETE_CLASS: 'ลบห้องเรียน',
  PROMOTE_CLASS: 'โปรโมทห้องเรียน',
  UNPROMOTE_CLASS: 'ยกเลิกโปรโมทห้องเรียน',
  CLOSE_CLASS: 'จบการสอนและปิดห้องเรียน',
  UPDATE_CLOSED_CLASS: 'แก้ไขข้อมูลห้องเรียนที่ปิดแล้ว',
  VIEW_ACTIVITY_LOGS: 'เข้าดูหน้าประวัติการใช้งาน',
  REGISTER_CLASS: 'ลงทะเบียนเรียน',
  CANCEL_CLASS_REGISTRATION: 'ยกเลิกการลงทะเบียน',
  SUBMIT_EVALUATION: 'ส่งแบบประเมิน',
  SUBMIT_CLASS_REQUEST: 'ยื่นคำขอเปิดห้องเรียน',
  UPDATE_CLASS_REQUEST: 'แก้ไขคำขอเปิดห้องเรียน',
  DELETE_CLASS_REQUEST: 'ลบคำขอเปิดห้องเรียน',
};

const ActivityLogs = () => {
  const { user, activeRole, isSwitchingRole } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 25;

  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');

  useEffect(() => {
    // Redirect non-admins, but not during a role switch.
    if (user && activeRole && activeRole !== "ผู้ดูแลระบบ" && !isSwitchingRole) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      navigate("/");
    }
  }, [user, activeRole, navigate, isSwitchingRole]);

  useEffect(() => {
    // Log viewing this page once on mount
    logFrontendActivity(user, 'VIEW_ACTIVITY_LOGS');
  }, []); // Empty dependency array ensures it runs only once

  const fetchLogs = useCallback(async (pageNum, currentSearch, currentActionType) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: pageNum,
        limit,
        search: currentSearch,
        actionType: currentActionType,
      }).toString();

      const response = await fetch(`http://localhost:5000/api/activity-logs?${query}`);
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลประวัติการใช้งานได้');
      }
      const data = await response.json();
      setTotalLogs(data.total);

      if (pageNum === 1) {
        setLogs(data.logs);
      } else {
        setLogs(prevLogs => [...prevLogs, ...data.logs]);
      }

      if (data.logs.length < limit || (pageNum * limit) >= data.total) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // Debounce search term
    const handler = setTimeout(() => {
      setPage(1); // Reset page to 1 when filters change
      setHasMore(true);
      fetchLogs(1, searchTerm, actionTypeFilter);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, actionTypeFilter, fetchLogs]);

  useEffect(() => {
    if (page > 1) {
      fetchLogs(page, searchTerm, actionTypeFilter);
    }
  }, [page, fetchLogs, searchTerm, actionTypeFilter]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const getActionText = (log) => {
    const details = log.details ? JSON.parse(log.details) : {};
    switch (log.action_type) {
      case 'UPDATE_ROLE':
        return `เปลี่ยนสิทธิ์ของ ${details.target_user || 'N/A'} เป็น ${details.new_roles?.join(', ') || 'N/A'}`;
      case 'UPDATE_STATUS':
        return `เปลี่ยนสถานะของ ${details.target_user || 'N/A'} เป็น ${details.new_status || 'N/A'}`;
      case 'DELETE_USER':
        return `ลบบัญชีผู้ใช้ ${details.deleted_user_details?.name || 'N/A'}`;
      case 'SWITCH_ROLE':
        return `สลับบทบาทจาก ${details.from_role} เป็น ${details.to_role}`;
      case 'UPDATE_CLASS':
        return `แก้ไขข้อมูลห้องเรียน ${details.class_title || 'N/A'}`;
      case 'DELETE_CLASS':
        return `ลบห้องเรียน ${details.class_title || 'N/A'}`;
      case 'PROMOTE_CLASS':
        return `โปรโมทห้องเรียน ID: ${details.class_id}`;
      case 'UNPROMOTE_CLASS':
        return `ยกเลิกโปรโมทห้องเรียน ID: ${details.class_id}`;
      case 'CLOSE_CLASS':
        return `จบการสอนและปิดห้องเรียน ID: ${details.class_id}`;
      case 'CREATE_CLASS':
        return `สร้างห้องเรียนใหม่: ${details.class_title || 'N/A'}`;
      case 'REGISTER_CLASS':
        return `ลงทะเบียนเรียน: ${details.class_title || 'N/A'}`;
      case 'CANCEL_CLASS_REGISTRATION':
        return `ยกเลิกการลงทะเบียน: ${details.class_title || 'N/A'}`;
      case 'SUBMIT_CLASS_REQUEST':
        return `ยื่นคำขอเปิดห้องเรียน: ${details.request_title || 'N/A'}`;
      case 'UPDATE_CLASS_REQUEST':
        return `แก้ไขคำขอเปิดห้องเรียน: ${details.request_title || 'N/A'}`;
      default:
        return ACTION_TYPE_LABELS[log.action_type] || log.action_type;
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          ประวัติการใช้งาน
        </h1>
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">ทุกการกระทำ</option>
              {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 mt-4">
            พบ {totalLogs} รายการ
          </div>
        </div>

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
            {!loading && !hasMore && logs.length > 0 && logs.length >= totalLogs && (
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