import React from "react";

const AdminPanel = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <p>
        ยินดีต้อนรับสู่หน้าผู้ดูแลระบบ คุณสามารถจัดการคลาส วิทยากร
        และรายงานได้ที่นี่
      </p>
      {/* ส่วนอื่น ๆ ของผู้ดูแลระบบจะมาเติมต่อได้ */}
    </div>
  );
};

export default AdminPanel;
