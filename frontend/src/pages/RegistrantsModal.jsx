import React from 'react';

const RegistrantsModal = ({ isOpen, onClose, classData }) => {
  if (!isOpen || !classData) {
    return null;
  }

  // Ensure registered_users is an array
  const registrants = Array.isArray(classData.registered_users) 
    ? classData.registered_users 
    : [];

  return (
    <div className="fixed inset-0 bg-white/85 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="text-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">รายชื่อผู้ลงทะเบียน</h2>
        </div>

        <div className="mb-4">
            <h3 className="text-xl font-semibold text-purple-800 mb-2">{classData.title}</h3>
            <p className="text-lg text-gray-700">
                <strong>จำนวนผู้ลงทะเบียน:</strong> 
                <span className="font-bold ml-2">{registrants.length} / {classData.max_participants === 999 ? 'ไม่จำกัด' : classData.max_participants}</span>
            </p>
        </div>

        <div className="overflow-y-auto flex-grow">
          {registrants.length > 0 ? (
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-2 px-4 border-b text-left">#</th>
                  <th className="py-2 px-4 border-b text-left">ชื่อ-สกุล</th>
                  <th className="py-2 px-4 border-b text-left">อีเมล</th>
                  <th className="py-2 px-4 border-b text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {registrants.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{index + 1}</td>
                    <td className="py-2 px-4 border-b">{user.name}</td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">
                      {(() => {
                        try {
                          let roles = Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles || '[]');
                          // If user has more than one role, filter out 'ผู้ดูแลระบบ'
                          if (roles.length > 1) {
                            roles = roles.filter(role => role !== 'ผู้ดูแลระบบ');
                          }
                          return roles.join(', ') || 'N/A';
                        } catch (e) {
                          return user.roles || ''; // Fallback for non-JSON string
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 mt-4">ยังไม่มีผู้ลงทะเบียน</p>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t">
            <button 
                onClick={onClose} 
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition-colors duration-300"
            >
                ปิด
            </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrantsModal;