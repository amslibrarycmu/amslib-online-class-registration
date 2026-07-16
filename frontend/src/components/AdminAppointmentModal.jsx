import React, { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import ProcessingOverlay from "./ProcessingOverlay";

const AdminAppointmentModal = ({ isOpen, onClose, onSuccess }) => {
  const { authFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // 🟢 เพิ่มคำอธิบายความสามารถของแต่ละ Level
  const LEVEL_DESCRIPTIONS = {
    1: "มีสิทธิ์ในการสร้าง แก้ไข ลบ ตรวจสอบผู้ลงทะเบียนเรียน จบการสอน รวมถึงการโปรโมทและดูผลประเมิน",
    2: "ทำได้ทุกอย่างที่ 'ผู้สอน' ทำได้ พร้อมเพิ่มเติมสิทธิ์ในการจัดการคำขอเปิดห้องเรียนและดูสถิติ",
    3: "ทำได้ทุกอย่างในระบบ รวมถึงการจัดการสิทธิ์ผู้ดูแลคนอื่นและดูประวัติการใช้งานทั้งหมด",
  };
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false); // 🟢 1. State ใหม่สำหรับติดตามการค้นหา
  const [processing, setProcessing] = useState(false);

  const handleSearch = useCallback(async (query) => {
    // --- 🟢 START: ตรรกะการค้นหาแบบใหม่ทั้งหมด 🟢 ---
    if (!query) {
      setSearchPerformed(false); // 🟢 2. รีเซ็ตสถานะเมื่อล้างช่องค้นหา
      setSearchResults([]);
      return;
    }

    const isEmailSearch = query.includes('@');
    const hasSpace = query.includes(' ');

    // เงื่อนไขที่จะ "ไม่" ค้นหา: ถ้าไม่ใช่การค้นหาอีเมล และยังไม่มีการเว้นวรรค
    if (!isEmailSearch && !hasSpace) {
      setSearchPerformed(false); // 🟢 2. รีเซ็ตสถานะ
      setSearchResults([]);
      return;
    }
    // --- END: ตรรกะการค้นหาแบบใหม่ทั้งหมด 🟢 ---

    setLoading(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/search?q=${query}`);
      setSearchPerformed(true); // 🟢 2. ตั้งค่าว่ามีการค้นหาเกิดขึ้นแล้ว
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      alert("กรุณาเลือกผู้ใช้ที่ต้องการแต่งตั้ง");
      return;
    }
    setProcessing(true);
    try {
      const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/users/admins/appoint`, {
        method: "POST",
        body: {
          user_id: selectedUser.id,
          admin_level: selectedLevel,
        },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to appoint admin");
      }
      alert("แต่งตั้งผู้ดูแลระบบสำเร็จ");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error appointing admin:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedLevel(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      {processing && <ProcessingOverlay message="กำลังแต่งตั้ง..." />}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              แต่งตั้งผู้ดูแลระบบ
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">ค้นหาผู้ใช้ (ชื่อ หรือ อีเมล)</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-md">
                    <span>{selectedUser.name} ({selectedUser.email})</span>
                    <button type="button" onClick={() => setSelectedUser(null)} className="text-red-500 font-bold">X</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        handleSearch(e.target.value); // เรียกใช้ handleSearch ที่มี Logic ใหม่
                      }}
                      className="w-full border px-4 py-2 rounded"
                      placeholder="พิมพ์เพื่อค้นหา..."
                    />
                    {/* 🟢 3. ปรับปรุงเงื่อนไขการแสดงผล */}
                    {searchPerformed && !loading && searchResults.length === 0 && (
                      <div className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg">
                        <p className="px-4 py-2 text-gray-500">ยังไม่พบข้อมูล</p>
                      </div>
                    )}
                    {searchResults.length > 0 && !loading && (
                      <ul className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map(user => (
                          <li 
                            key={user.id} 
                            onClick={() => !user.is_admin && handleSelectUser(user)} 
                            className={`px-4 py-2 ${user.is_admin ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}`}
                          >
                            {user.name} ({user.email})
                            {user.is_admin && (
                              <span className="text-xs text-red-600 ml-2">(ถูกแต่งตั้งแล้ว)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {loading && <div className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg"><p className="px-4 py-2 text-gray-500">กำลังค้นหา...</p></div>}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">กำหนดระดับ</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                  className="w-full border px-4 py-2 rounded bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                  disabled={!selectedUser}
                >
                  <option value={1}>ผู้สอน</option>
                  <option value={2}>ผู้จัดการเนื้อหา</option>
                  <option value={3}>ผู้ดูแลระบบ</option>
                </select>
                {/* 🟢 เพิ่มส่วนแสดงคำอธิบาย UI */}
                {selectedUser && (
                  <p className="text-sm text-gray-600 mt-2 px-1">
                    {LEVEL_DESCRIPTIONS[selectedLevel]}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-4">
            <button type="button" onClick={handleClose} className="px-6 py-2 rounded bg-gray-300 hover:bg-gray-400">
              ยกเลิก
            </button>
            <button type="submit" disabled={!selectedUser || processing} className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400">
              ยืนยันการแต่งตั้ง
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAppointmentModal;
