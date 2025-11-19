import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

import UserDetailsModal from "../components/UserDetailsModal";
// Constants for action types
const ACTION_TYPE_LABELS = {
  LOGIN_SUCCESS: "เข้าสู่ระบบ",
  LOGOUT: "ออกจากระบบ",
  CREATE_USER: "สร้างบัญชีผู้ใช้ใหม่",
  UPDATE_PROFILE: "อัปเดตโปรไฟล์",
  UPDATE_PHOTO: "อัปเดต/เปลี่ยนรูปโปรไฟล์",
  DELETE_PHOTO: "ลบรูปโปรไฟล์",
  UPDATE_ROLE: "เปลี่ยนสิทธิ์",
  UPDATE_STATUS: "เปลี่ยนสถานะ",
  DELETE_USER: "ลบบัญชีผู้ใช้",
  SWITCH_ROLE: "สลับบทบาท",
  CREATE_CLASS: "สร้างห้องเรียนใหม่",
  UPDATE_CLASS: "แก้ไขข้อมูลห้องเรียน",
  DELETE_CLASS: "ลบห้องเรียน",
  PROMOTE_CLASS: "โปรโมทห้องเรียน",
  UNPROMOTE_CLASS: "ยกเลิกโปรโมทห้องเรียน",
  CLOSE_CLASS: "จบการสอนและปิดห้องเรียน",
  UPDATE_CLOSED_CLASS: "แก้ไขข้อมูลห้องเรียนที่ปิดแล้ว",
  VIEW_ACTIVITY_LOGS: "เข้าดูหน้าประวัติการใช้งาน",
  REGISTER_CLASS: "ลงทะเบียนเรียน",
  CANCEL_CLASS_REGISTRATION: "ยกเลิกการลงทะเบียน",
  SUBMIT_EVALUATION: "ส่งแบบประเมิน",
  SUBMIT_CLASS_REQUEST: "ยื่นคำขอเปิดห้องเรียน",
  UPDATE_CLASS_REQUEST: "แก้ไขคำขอเปิดห้องเรียน",
  DELETE_CLASS_REQUEST: "ลบคำขอเปิดห้องเรียน",
  APPROVE_CLASS_REQUEST: "อนุมัติคำขอเปิดห้องเรียน",
  REJECT_CLASS_REQUEST: "ปฏิเสธคำขอเปิดห้องเรียน",
};

const ActivityLogs = () => {
  const { user, activeRole, isSwitchingRole, authFetch } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 25;

  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    // This effect should only handle redirection, not fetching.
    // Redirect non-admins, but not during a role switch.
    if (
      user &&
      activeRole &&
      activeRole !== "ผู้ดูแลระบบ" &&
      !isSwitchingRole
    ) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      navigate("/");
    }
  }, [user, activeRole, navigate, isSwitchingRole]);

  useEffect(() => {
    // Debounce search term
    // This effect will now only trigger re-fetches when filters change, not on initial mount.
    const handler = setTimeout(() => {
      setPage(1); // Reset page to 1 when filters change
      setHasMore(true);
      fetchLogs(1, searchTerm, actionTypeFilter);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, actionTypeFilter]);

  useEffect(() => {
    if (page > 1) {
      fetchLogs(page, searchTerm, actionTypeFilter); // This handles "Load More"
    }
  }, [page]);

  const fetchLogs = useCallback(
    async (pageNum, currentSearch, currentActionType) => {
      setLoading(true);
      try {
        if (pageNum === 1) {
          // Log only on the first page load of a filter/search
          authFetch("http://localhost:5000/api/log-activity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: user.id,
              user_name: user.name,
              user_email: user.email,
              action_type: "VIEW_ACTIVITY_LOGS",
            }),
          }).catch((err) => console.error("Failed to log activity:", err));
        }

        const query = new URLSearchParams({
          page: pageNum,
          limit,
          search: currentSearch,
          actionType: currentActionType,
        }).toString();
        const response = await authFetch(
          `http://localhost:5000/api/admin/activity-logs?${query}`
        );
        if (!response.ok)
          throw new Error("ไม่สามารถดึงข้อมูลประวัติการใช้งานได้");
        const data = await response.json();
        setTotalLogs(data.total);
        if (pageNum === 1) setLogs(data.logs);
        else setLogs((prevLogs) => [...prevLogs, ...data.logs]);
        if (data.logs.length < limit || pageNum * limit >= data.total)
          setHasMore(false);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
        alert(error.message);
      } finally {
        setLoading(false);
      }
    },
    [authFetch, user]
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleViewUser = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await authFetch(
        `http://localhost:5000/api/users/${userId}`
      );
      if (!response.ok) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }
      const userData = await response.json();
      setSelectedUser(userData);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionText = (log) => {
    // Safely parse details: Check if it's a string before parsing.
    // If it's already an object (pre-parsed by backend/mysql2), use it directly.
    const details =
      log.details && typeof log.details === "string"
        ? JSON.parse(log.details)
        : log.details || {};

    switch (log.action_type) {
      case "UPDATE_ROLE":
        return (
          <>
            เปลี่ยนสิทธิ์ของ {details.target_user || "N/A"} เป็น{" "}
            {details.new_roles?.join(", ") || "N/A"}
          </>
        );
      case "UPDATE_STATUS":
        return (
          <>
            เปลี่ยนสถานะของ {details.target_user || "N/A"} เป็น{" "}
            {details.new_status || "N/A"}
          </>
        );
      case "DELETE_USER":
        return <>ลบบัญชีผู้ใช้ {details.deleted_user_details?.name || "N/A"}</>;
      case "SWITCH_ROLE":
        return (
          <>
            สลับบทบาทจาก {details.from_role} เป็น {details.to_role}
          </>
        );
      case "UPDATE_CLASS":
        return <>แก้ไขข้อมูลห้องเรียน {details.class_title || "N/A"}</>;
      case "DELETE_CLASS":
        return <>ลบห้องเรียน {details.class_title || "N/A"}</>;
      case "PROMOTE_CLASS":
        return <>โปรโมทห้องเรียน ID: {details.class_id}</>;
      case "UNPROMOTE_CLASS":
        return <>ยกเลิกโปรโมทห้องเรียน ID: {details.class_id}</>;
      case "CLOSE_CLASS":
        return <>จบการสอนและปิดห้องเรียน ID: {details.class_id}</>;
      case "CREATE_CLASS":
        return <>สร้างห้องเรียนใหม่: {details.class_title || "N/A"}</>;
      case "REGISTER_CLASS":
        return <>ลงทะเบียนเรียน: {details.class_title || "N/A"}</>;
      case "CANCEL_CLASS_REGISTRATION":
        return <>ยกเลิกการลงทะเบียน: {details.class_title || "N/A"}</>;
      case "SUBMIT_CLASS_REQUEST":
        return <>ยื่นคำขอเปิดห้องเรียน: {details.request_title || "N/A"}</>;
      case "UPDATE_CLASS_REQUEST":
        return <>แก้ไขคำขอเปิดห้องเรียน: {details.request_title || "N/A"}</>;
      case "APPROVE_CLASS_REQUEST":
        return <>อนุมัติคำขอเปิดห้องเรียน: {details.request_title || "N/A"}</>;
      case "REJECT_CLASS_REQUEST":
        return <>ปฏิเสธคำขอเปิดห้องเรียน: {details.request_title || "N/A"}</>;
      default:
        return ACTION_TYPE_LABELS[log.action_type] || log.action_type;
    }
  };

  // Function to handle CSV export
  const handleExportCSV = async () => {
    alert("กำลังเตรียมข้อมูลสำหรับ Export...");
    try {
      const query = new URLSearchParams({
        search: searchTerm,
        actionType: actionTypeFilter,
      }).toString();

      const response = await authFetch(
        `http://localhost:5000/api/admin/activity-logs/all?${query}`
      );
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลสำหรับ Export ได้");
      }
      const allLogs = await response.json();

      if (allLogs.length === 0) {
        alert("ไม่พบข้อมูลสำหรับ Export");
        return;
      }

      const headers = [
        "เวลา",
        "ผู้กระทำ",
        "อีเมล",
        "การกระทำ",
        "รายละเอียด",
        "IP Address",
      ];
      const rows = allLogs.map((log) => [
        `"${new Date(log.timestamp).toLocaleString("th-TH")}"`,
        `"${log.user_name || ""}"`,
        `"${log.user_email || ""}"`,
        `"${ACTION_TYPE_LABELS[log.action_type] || log.action_type}"`,
        `"${getActionText(log).replace(/"/g, '""')}"`, // Escape double quotes
        `"${log.ip_address || ""}"`,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "activity_logs_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert(error.message);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {isDetailModalOpen && selectedUser && (
        <UserDetailsModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          user={selectedUser}
        />
      )}
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="flex justify-center items-center gap-x-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">ประวัติการใช้งาน</h1>
          <button
            onClick={handleExportCSV}
            className="p-2 text-gray-600 rounded-3xl shadow-md hover:bg-gray-100 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            title="ดาวน์โหลดข้อมูล (CSV)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
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
            <option value="">ทั้งหมด </option>
            {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600 my-2">พบ {totalLogs} รายการ</div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เวลา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้กระทำ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การกระทำ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString("th-TH")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      <span
                        onClick={() => handleViewUser(log.user_id)}
                        className="cursor-pointer hover:underline text-blue-600"
                      >
                        {log.user_name}
                      </span>
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
            {!loading &&
              !hasMore &&
              logs.length > 0 &&
              logs.length >= totalLogs && (
                <p className="text-center text-gray-500 py-4">
                  -- สิ้นสุดรายการ --
                </p>
              )}
            {!loading && logs.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                ไม่พบประวัติการใช้งาน
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
