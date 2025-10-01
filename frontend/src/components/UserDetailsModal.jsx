import React, { useState, useEffect } from "react";
import profilePlaceholder from "../assets/abstract-user.png";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  const [attendedClasses, setAttendedClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchAttendedClasses = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `http://localhost:5000/api/classes/registered/closed?email=${encodeURIComponent(
              user.email
            )}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch attended classes.");
          }
          const data = await response.json();
          const sortedAndSliced = data
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
            .slice(0, 5);
          setAttendedClasses(sortedAndSliced);
        } catch (error) {
          console.error("Error fetching attended classes:", error);
          setAttendedClasses([]);
        } finally {
          setLoading(false);
        }
      };
      fetchAttendedClasses();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 gap-y-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <img
                src={user.photo ? `http://localhost:5000/uploads/${user.photo}` : profilePlaceholder}
                alt="Profile"
                className="w-24 h-24 object-cover rounded-full border-4 border-gray-200 flex-shrink-0"
              />
              <div className="text-center sm:text-left">
                <p className="text-md font-bold text-blue-600">{user.name}</p>
                <p className="text-md text-gray-600">{user.email}</p>
                <p className="text-md text-gray-500 mt-1">{user.roles.join(", ")}</p>
                <span
                  className={`px-2 mt-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
            </div>

            <div className="lg:pl-8">
              <dl className="divide-y divide-gray-200">
                <div className="py-1 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">โทร</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user.phone || "-"}
                  </dd>
                </div>
                <div className="py-1 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">PDPA</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.pdpa === 1 ? 'ยอมรับแล้ว' : 'ยังไม่ยอมรับ'}</dd>
                </div>
                <div className="py-1 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">สร้างเมื่อ</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user.created_at ? new Date(user.created_at).toLocaleString('th-TH') : '-'}
                  </dd>
                </div>
                <div className="py-1 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">อัปเดตล่าสุด</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {user.updated_at ? new Date(user.updated_at).toLocaleString('th-TH') : '-'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 pt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              ประวัติการเรียนล่าสุด (สูงสุด 5 รายการ)
            </h3>
            {loading ? (
              <p>กำลังโหลดประวัติ...</p>
            ) : attendedClasses.length > 0 ? (
              <ul className="space-y-3">
                {attendedClasses.map((cls) => (
                  <li key={cls.class_id} className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="font-semibold">
                      <span className="text-red-500 font-bold">{cls.class_id}</span> <span className="text-purple-800 pl-1">{cls.title}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      วันที่เรียน:{" "}
                      {new Date(cls.start_date).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">ไม่พบประวัติการเข้าเรียน</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
