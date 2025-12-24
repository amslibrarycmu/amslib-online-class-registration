import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const TopicManagement = () => {
  const { user, activeRole, isSwitchingRole, authFetch } = useAuth();
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null); // State for the topic being edited
  const [editingTopicTitle, setEditingTopicTitle] = useState(""); // State for the title being edited

  // Redirect non-admin users
  useEffect(() => {
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

  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/topics`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTopics(data);
    } catch (err) {
      console.error("Error fetching topics:", err);
      setError("ไม่สามารถดึงข้อมูลหัวข้อได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeRole === "ผู้ดูแลระบบ") {
      fetchTopics();
    }
  }, [user, activeRole, authFetch]);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) {
      alert("กรุณาระบุชื่อหัวข้อ");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/topics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: newTopicTitle.trim() }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add topic.");
      }
      setNewTopicTitle("");
      fetchTopics(); // Refresh the list
      alert("เพิ่มหัวข้อสำเร็จ");
    } catch (err) {
      console.error("Error adding topic:", err);
      alert(`เพิ่มหัวข้อไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (topicItem) => {
    setEditingTopicId(topicItem.id);
    setEditingTopicTitle(topicItem.title);
  };

  const handleSaveEdit = async (topicId) => {
    if (!editingTopicTitle.trim()) {
      alert("กรุณาระบุชื่อหัวข้อ");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/topics/${topicId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: editingTopicTitle.trim() }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update topic title.");
      }
      setEditingTopicId(null);
      setEditingTopicTitle("");
      fetchTopics();
      alert("แก้ไขหัวข้อสำเร็จ");
    } catch (err) {
      console.error("Error saving topic title:", err);
      alert(`แก้ไขหัวข้อไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (topicId, currentStatus) => {
    if (
      !window.confirm(
        `คุณต้องการ${currentStatus ? "ปิด" : "เปิด"}ใช้งานหัวข้อนี้หรือไม่?`
      )
    ) {
      return;
    }
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/admin/topics/${topicId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update topic status.");
      }
      fetchTopics(); // Refresh the list
    } catch (err) {
      console.error("Error toggling topic status:", err);
      alert(`อัปเดตสถานะหัวข้อไม่สำเร็จ: ${err.message}`);
    }
  };

  const handleDeleteTopic = async (topicId, topicTitle) => {
    if (!window.confirm(`คุณต้องการลบหัวข้อ "${topicTitle}" อย่างถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    setIsSubmitting(true); // Use isSubmitting to disable buttons
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/admin/topics/${topicId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete topic.");
      }
      fetchTopics(); // Refresh the list
      alert("ลบหัวข้อสำเร็จ");
    } catch (err) {
      console.error("Error deleting topic:", err);
      alert(`ลบหัวข้อไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center">
          <p className="text-md text-black">กำลังโหลดข้อมูลหัวข้อ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center text-red-500">
          <p className="text-md text-black">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">จัดการหัวข้อ</h1>  
    
        <div className="bg-white p-6 rounded-lg shadow-md">
          {topics.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              ยังไม่มีหัวข้อที่ถูกเพิ่ม
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หัวข้อ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topics.map((topicItem) => (
                    <tr key={topicItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {editingTopicId === topicItem.id ? (
                          <>
                            <input
                              type="text"
                              value={editingTopicTitle}
                              onChange={(e) =>
                                setEditingTopicTitle(e.target.value)
                              }
                              className="p-1 border border-gray-300 rounded-md w-full"
                              disabled={isSubmitting}
                            />
                          </>
                        ) : (
                          topicItem.title
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            topicItem.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {topicItem.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium flex justify-center items-center gap-2 flex-wrap">
                        {editingTopicId === topicItem.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(topicItem.id)}
                              className="text-green-600 hover:text-green-800 disabled:text-gray-400"
                              disabled={isSubmitting}
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditingTopicId(null)}
                              className="text-gray-600 hover:text-gray-800"
                              disabled={isSubmitting}
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditClick(topicItem)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-full"
                              title="แก้ไข"
                              disabled={isSubmitting}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Toggle Active Button */}
                            <button
                              onClick={() => handleToggleActive(topicItem.id, topicItem.is_active)}
                              className={`p-1 rounded-full ${
                                topicItem.is_active
                                  ? "text-red-600 hover:text-red-800"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                              title={topicItem.is_active ? "ปิดใช้งานหัวข้อ" : "เปิดใช้งานหัวข้อ"}
                              disabled={isSubmitting}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                                />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteTopic(topicItem.id, topicItem.title)}
                              className="text-red-600 hover:text-red-800 p-1 rounded-full"
                              title="ลบ"
                              disabled={isSubmitting}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Original Toggle Active Button (for reference, will be removed)
                            <button
                              onClick={() =>
                                handleToggleActive(
                                  topicItem.id,
                                  topicItem.is_active
                                )
                              }
                              className={`text-indigo-600 hover:text-indigo-900 ${
                                topicItem.is_active
                                  ? "text-red-600 hover:text-red-800"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                            >
                              {topicItem.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                            </button>
                            */}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicManagement;
