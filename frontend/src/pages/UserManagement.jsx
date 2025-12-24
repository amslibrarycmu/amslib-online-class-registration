import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import AdminAppointmentModal from "../components/AdminAppointmentModal";
import ProcessingOverlay from "../components/ProcessingOverlay";
import UserDetailsModal from "../components/UserDetailsModal";
import { useNavigate } from "react-router-dom";

const ADMIN_LEVEL_MAP = {
  1: "ผู้สอน",
  2: "ผู้จัดการเนื้อหา",
  3: "ผู้ดูแลระบบ",
};

const UserManagement = () => {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();

  // General State
  const [activeTab, setActiveTab] = useState("permissions"); // 'permissions' or 'users'
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Tab 1: Permissions State
  const [admins, setAdmins] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tab 2: All Users State
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [userSearchPerformed, setUserSearchPerformed] = useState(false);

  // --- TAB 1: PERMISSIONS FUNCTIONS ---
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/admins`);
      if (!response.ok) throw new Error("Failed to fetch admins");
      const data = await response.json();
      // Sort admins: current user first, then by level, then by name
      const sortedAdmins = data.sort((a, b) => {
        if (a.user_id === user.id) return -1;
        if (b.user_id === user.id) return 1;
        if (a.admin_level > b.admin_level) return -1;
        if (a.admin_level < b.admin_level) return 1;
        return a.name.localeCompare(b.name);
      });
      setAdmins(sortedAdmins);
    } catch (error) {
      console.error("Error fetching admins:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ดูแลระบบ");
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  // --- TAB 2: ALL USERS FUNCTIONS ---
  const triggerUserSearch = useCallback(async (query) => {
    if (!query) {
      setUserSearchPerformed(false);
      setAllUsers([]);
      return;
    }

    const isEmailSearch = query.includes('@');
    const hasSpace = query.includes(' ');

    if (!isEmailSearch && !hasSpace) {
      setUserSearchPerformed(false);
      setAllUsers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users?search=${query.trim()}`);
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      const data = await response.json();
      setAllUsers(data);
      setUserSearchPerformed(true);
    } catch (error) {
      console.error("Error fetching all users:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ทั้งหมด");
    } finally {
      setLoading(false);
    }
  }, [authFetch]); 

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchAdmins();
    } else {
      // Reset state when switching to the 'users' tab
      setAllUsers([]);
      setSearchTerm("");
      setUserSearchPerformed(false);
      setLoading(false);
    }
  }, [activeTab, fetchAdmins]);

  const handleAppointmentSuccess = () => {
    setIsModalOpen(false);
    fetchAdmins(); // Refresh the list
  };

  const handleLevelChange = async (userId, newLevel) => {
    if (window.confirm(`คุณต้องการเปลี่ยนระดับของผู้ใช้นี้เป็น "${ADMIN_LEVEL_MAP[newLevel]}" ใช่หรือไม่?`)) {
      setProcessing(true);
      try {
        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/admins/${userId}/level`, {
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
        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/admins/${userId}`, {
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

  const handleViewAdminDetails = async (adminId) => {
    if (!adminId) return;
    setProcessing(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/${adminId}`);
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      }
      const userData = await response.json();
      setSelectedUser(userData);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert("ไม่สามารถดึงข้อมูลผู้ใช้ได้: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- TAB 2: ALL USERS HANDLERS ---
  const handleToggleActiveStatus = async (userToToggle) => {
    if (userToToggle.id === user.id) {
      alert("คุณไม่สามารถเปลี่ยนสถานะของตัวเองได้");
      return;
    }
    const newStatus = !userToToggle.is_active;
    const actionText = newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน";
    if (!window.confirm(`คุณต้องการ${actionText}บัญชีของ ${userToToggle.name} หรือไม่?`)) return;

    setProcessing(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/${userToToggle.id}/status`, {
        method: 'PUT', body: { is_active: newStatus },
      });
      if (!response.ok) throw new Error('Failed to update user status.');
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userToToggle.id ? { ...u, is_active: newStatus } : u));
      alert("อัปเดตสถานะผู้ใช้สำเร็จ!");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user.id) {
      alert("คุณไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${userToDelete.name} ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    setProcessing(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user.');
      setAllUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      alert("ลบผู้ใช้สำเร็จ");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้");
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenDetailModal = (userToView) => {
    setSelectedUser(userToView);
    setIsDetailModalOpen(true);
  };

  const sortedAllUsers = useMemo(() => {
    let sortableUsers = [...allUsers];
    if (sortConfig.key !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (sortConfig.direction === 'ascending') {
          return String(aValue).localeCompare(String(bValue), 'th');
        }
        return String(bValue).localeCompare(String(aValue), 'th');
      });
    }
    return sortableUsers;
  }, [allUsers, sortConfig]);

  const SortableHeader = ({ columnKey, title, className = "" }) => {
    const isSorted = sortConfig.key === columnKey;
    const icon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';
    return (
      <th
        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 focus:outline-none ${className}`}
        onClick={() => {
          let direction = 'ascending';
          if (sortConfig.key === columnKey && sortConfig.direction === 'ascending') {
            direction = 'descending';
          }
          setSortConfig({ key: columnKey, direction });
        }}
      >
        {title} {icon}
      </th>
    );
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 pt-20 lg:pt-8 px-4 sm:px-6 lg:px-8 bg-gray-100 overflow-y-auto">
        {processing && <ProcessingOverlay message="กำลังดำเนินการ..." />}
        {isDetailModalOpen && selectedUser && (
          <UserDetailsModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} user={selectedUser} />
        )}
        <div className="max-w-7xl mx-auto">
          <div className="relative mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center py-2">
              สิทธิ์
            </h1>
          </div>

          {/* --- TABS --- */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button onClick={() => setActiveTab('permissions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'permissions' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                จัดการสิทธิ์
              </button>
              <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${activeTab === 'users' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                จัดการผู้ใช้ทั้งหมด
              </button>
            </nav>
          </div>

          {/* --- TAB CONTENT --- */}
          <div className="mt-8">
            {loading ? (
              <p className="text-center text-gray-500">กำลังโหลดข้อมูล...</p>
            ) : activeTab === 'permissions' ? (
              // --- TAB 1: PERMISSIONS CONTENT ---
              <div>
                <div className="text-right mb-4">
                  <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-purple-700 transition-colors focus:outline-none">
                    + แต่งตั้งผู้ดูแล
                  </button>
                </div>
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-สกุล</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ระดับสิทธิ์</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {admins.map((admin) => (
                          <tr key={admin.user_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span onClick={() => handleViewAdminDetails(admin.user_id)} className="cursor-pointer hover:underline text-blue-600 font-medium">{admin.name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{admin.email}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <select value={admin.admin_level} onChange={(e) => handleLevelChange(admin.user_id, parseInt(e.target.value))} disabled={admin.user_id === user.id} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed">
                                <option value="1">{ADMIN_LEVEL_MAP[1]}</option>
                                <option value="2">{ADMIN_LEVEL_MAP[2]}</option>
                                <option value="3">{ADMIN_LEVEL_MAP[3]}</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              {admin.user_id !== user.id ? (
                                <button onClick={() => handleRemoveAdmin(admin.user_id, admin.name)} className="text-red-600 hover:text-red-900 focus:outline-none">ถอนสิทธิ์</button>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {admins.length === 0 && <p className="text-center text-gray-500 mt-8">ไม่พบข้อมูลผู้ดูแลระบบ</p>}
              </div>
            ) : (
              // --- TAB 2: ALL USERS CONTENT ---
              <div>
                <div className="mb-4">
                  <input
                    type="text" 
                    placeholder="ค้นหาผู้ใช้ด้วยชื่อ หรือ อีเมล" 
                    value={searchTerm} 
                    onChange={(e) => { setSearchTerm(e.target.value); triggerUserSearch(e.target.value); }} 
                    className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <SortableHeader columnKey="name" title="ชื่อ-สกุล" className="text-left" />
                          <SortableHeader columnKey="email" title="อีเมล" className="text-left" />
                          <SortableHeader columnKey="roles" title="บทบาท" className="text-left" />
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAllUsers.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span onClick={() => handleOpenDetailModal(u)} className="cursor-pointer hover:underline text-blue-600 font-medium">{u.name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.roles.join(", ")}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {u.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                              {u.id !== user.id ? (
                                <>
                                  <button onClick={() => handleToggleActiveStatus(u)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors focus:outline-none ${u.is_active ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                                    {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                  </button>
                                  <button onClick={() => handleDeleteUser(u)} className="px-3 py-1 text-xs font-semibold rounded-md transition-colors bg-red-600 text-white hover:bg-red-700 focus:outline-none">
                                    ลบ
                                  </button>
                                </>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {!loading && userSearchPerformed && sortedAllUsers.length === 0 && (
                  <p className="text-center text-gray-500 mt-8">ไม่พบข้อมูลผู้ใช้</p>
                )}
                {!loading && !userSearchPerformed && (
                  <p className="text-center text-gray-500 mt-8">กรุณาใช้ชื่อ (ตามด้วยเว้นวรรค) หรือใช้อีเมลเพื่อค้นหา</p>
                )}
              </div>
            )}
          </div>
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
