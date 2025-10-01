import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import UserDetailsModal from "../components/UserDetailsModal";

const UserManagement = () => {
  const { user, activeRole, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (activeRole !== "ผู้ดูแลระบบ") {
      navigate("/");
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users.");
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        alert("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, activeRole, navigate]);

  const handleToggleAdmin = async (targetUser) => {
    const isAdmin = targetUser.roles.includes("ผู้ดูแลระบบ");
    const actionText = isAdmin ? "ถอดสิทธิ์" : "มอบสิทธิ์";
    if (isAdmin) {
      const adminCount = users.filter((u) =>
        u.roles.includes("ผู้ดูแลระบบ")
      ).length;
      if (adminCount <= 1) {
        alert("ไม่สามารถถอดสิทธิ์ผู้ดูแลระบบคนสุดท้ายได้");
        return;
      }
    }

    if (
      !window.confirm(
        `คุณต้องการ ${actionText} 'ผู้ดูแลระบบ' ให้กับ ${targetUser.name} หรือไม่?`
      )
    ) {
      return;
    }

    let newRoles;
    if (isAdmin) {
      if (targetUser.roles.length === 1) {
        newRoles = ["บุคลากร"];
      } else {
        newRoles = targetUser.roles.filter((role) => role !== "ผู้ดูแลระบบ");
      }
    } else {
      newRoles = [...targetUser.roles, "ผู้ดูแลระบบ"];
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${targetUser.id}/roles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: newRoles }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update roles.");
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      if (isAdmin && targetUser.id === user.id) {
        alert("คุณได้ถอดสิทธิ์ผู้ดูแลระบบของตัวเองแล้ว ระบบจะทำการออกจากระบบ");
        logout();
        navigate("/login");
      } else {
        alert("อัปเดตสิทธิ์สำเร็จ!");
      }
    } catch (error) {
      console.error("Error updating roles:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์");
    }
  };

  const handleToggleActiveStatus = async (userToToggle) => {
    if (userToToggle.id === user.id) {
      alert("คุณไม่สามารถเปลี่ยนสถานะของตัวเองได้");
      return;
    }

    const newStatus = !userToToggle.is_active;
    const actionText = newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน";

    if (!newStatus && userToToggle.roles.includes("ผู้ดูแลระบบ")) {
      const activeAdminCount = users.filter(u => u.roles.includes("ผู้ดูแลระบบ") && u.is_active).length;
      if (activeAdminCount <= 1) {
        alert("ไม่สามารถปิดใช้งานผู้ดูแลระบบคนสุดท้ายที่ยังใช้งานได้");
        return;
      }
    }

    if (!window.confirm(`คุณต้องการ${actionText}บัญชีของ ${userToToggle.name} หรือไม่?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userToToggle.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user status.');

      setUsers(prevUsers => prevUsers.map(u => u.id === userToToggle.id ? { ...u, is_active: newStatus } : u));
      alert("อัปเดตสถานะผู้ใช้สำเร็จ!");
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้");
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user.id) {
      alert("คุณไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }

    const isAdmin = userToDelete.roles.includes("ผู้ดูแลระบบ");
    if (isAdmin) {
      const adminCount = users.filter((u) => u.roles.includes("ผู้ดูแลระบบ")).length;
      if (adminCount <= 1) {
        alert("ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้");
        return;
      }
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${userToDelete.name} ออกจากระบบ การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user.');
      }
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      alert("ลบผู้ใช้สำเร็จ");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("เกิดข้อผิดพลาดในการลบผู้ใช้");
    }
  };

  const filteredUsers = useMemo(() => {
    let filterableUsers = [...users];

    // If showAll is true and there's no search term, show all users
    if (showAll && !searchTerm.trim()) {
      // No additional filtering needed
    } else if (!searchTerm.trim()) {
      // Default view: show only admins if no search term
      filterableUsers = filterableUsers.filter((u) => u.roles.includes("ผู้ดูแลระบบ"));
    } else {
      // If there is a search term, filter all users
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      filterableUsers = filterableUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(lowercasedSearchTerm) ||
          u.email.toLowerCase().includes(lowercasedSearchTerm)
      );
    }

    // Sorting logic
    if (sortConfig.key !== null) {
      filterableUsers.sort((a, b) => {
        // ให้ผู้ใช้ปัจจุบันอยู่บนสุดเสมอ
        if (a.id === user.id) return -1;
        if (b.id === user.id) return 1;

        const aIsAdmin = a.roles.includes("ผู้ดูแลระบบ");
        const bIsAdmin = b.roles.includes("ผู้ดูแลระบบ");

        if (aIsAdmin && !bIsAdmin) {
          return -1;
        }
        if (!aIsAdmin && bIsAdmin) {
          return 1;
        }
        const aValue = sortConfig.key === 'roles' ? a.roles.join(', ') : a[sortConfig.key];
        const bValue = sortConfig.key === 'roles' ? b.roles.join(', ') : b[sortConfig.key];        
        if (sortConfig.direction === 'ascending') {
          return String(aValue).localeCompare(String(bValue), 'th');
        }
        return String(bValue).localeCompare(String(aValue), 'th');
      });
    }

    return filterableUsers;

  }, [users, searchTerm, showAll, sortConfig, user]);

  const handleToggleShowAll = () => {
    setShowAll(prevShowAll => !prevShowAll);
  };

  const handleOpenDetailModal = (userToView) => {
    setSelectedUser(userToView);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };
  const SortableHeader = ({ columnKey, title }) => {
    const isSorted = sortConfig.key === columnKey;
    const icon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';
    return (
      <th
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
      {isDetailModalOpen && selectedUser && (
        <UserDetailsModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          user={selectedUser}
        />
      )}
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          สิทธิ์
        </h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
              }}
              className="w-full sm:flex-grow p-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleToggleShowAll}
              className={`px-4 py-2 text-white font-semibold rounded-md transition-colors whitespace-nowrap ${showAll ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {showAll ? 'แสดงเฉพาะผู้ดูแล' : `ดูทั้งหมด ${users.length} คน`}
            </button>
          </div>
          {loading ? (
            <p>กำลังโหลด...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableHeader columnKey="name" title="ชื่อ-สกุล" />
                    <SortableHeader columnKey="email" title="อีเมล" />
                    <SortableHeader columnKey="roles" title="บทบาท" />
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => {
                    const isCurrentUserAdmin = u.roles.includes("ผู้ดูแลระบบ");
                    return (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          <span onClick={() => handleOpenDetailModal(u)} className="cursor-pointer hover:underline text-blue-600">
                            {u.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.roles.join(", ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                          {u.id !== user.id && (
                            <button onClick={() => handleToggleAdmin(u)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isCurrentUserAdmin ? "bg-red-500 text-white hover:bg-red-600" : "bg-green-500 text-white hover:bg-green-600"}`}>
                              {isCurrentUserAdmin ? "ถอดสิทธิ์" : "มอบสิทธิ์"}
                            </button>
                          )}
                          {u.id !== user.id && (
                            <button onClick={() => handleToggleActiveStatus(u)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${u.is_active ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                              {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                          )}
                          {u.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-gray-700 text-white hover:bg-gray-800"
                              title="ลบผู้ใช้"
                            >ลบ</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
