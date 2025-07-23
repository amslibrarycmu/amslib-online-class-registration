import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const RegisterForm = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [phone, setPhone] = useState("");
  const [pdpa, setPdpa] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const registrationData = {
      name: user.name,
      email: user.email,
      status,
      phone,
      pdpa,
    };
    console.log("📥 ส่งข้อมูลลงทะเบียน:", registrationData);
    alert("ลงทะเบียนสำเร็จ!");
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">แบบฟอร์มลงทะเบียนอบรม</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">ชื่อ - นามสกุล</label>
          <input
            value={user.name}
            readOnly
            className="w-full border px-4 py-2 rounded bg-gray-100"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            value={user.email}
            readOnly
            className="w-full border px-4 py-2 rounded bg-gray-100"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">สถานภาพ</label>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">เบอร์โทรศัพท์</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={pdpa}
            onChange={() => setPdpa(!pdpa)}
            required
          />
          <label className="text-sm">
            ข้าพเจ้ายินยอมให้เปิดเผยข้อมูลตาม PDPA
          </label>
        </div>

        <button
          type="submit"
          className="bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800"
        >
          ส่งแบบฟอร์มลงทะเบียน
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
