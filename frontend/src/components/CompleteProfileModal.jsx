import React, { useState, useEffect } from "react";

const USER_ROLES = [
  "นักศึกษาปริญญาตรี",
  "นักศึกษาบัณฑิต",
  "อาจารย์/นักวิจัย",
  "บุคลากร",
];

const CompleteProfileModal = ({ isOpen, user, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    roles: [],
    phone: "",
    pdpa: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        roles: Array.isArray(user.roles) ? user.roles : [],
        phone: user.phone || "",
        pdpa: !!user.pdpa,
      });
    }
  }, [user]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "กรุณากรอกชื่อ-สกุล";
    if (formData.roles.length === 0)
      newErrors.roles = "กรุณาเลือกบทบาทอย่างน้อย 1 อย่าง";
    if (!formData.phone.trim()) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    if (!/^\d{9,10}$/.test(formData.phone))
      newErrors.phone = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (9-10 หลัก)";
    if (!formData.pdpa) newErrors.pdpa = "กรุณายอมรับข้อตกลง PDPA";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/50 flex justify-center items-center z-50 p-4 border">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              ลงทะเบียนเพื่อเข้าใช้งานในครั้งแรก
            </h2>
            <p className="text-center text-gray-600 mb-6">
              โปรดระบุข้อมูลส่วนตัวของคุณให้สมบูรณ์ก่อนเข้าสู่ระบบ
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">
                  อีเมล (ไม่สามารถแก้ไขได้)
                </label>
                <input
                  name="email"
                  value={formData.email}
                  className="w-full border px-4 py-2 rounded bg-gray-200"
                  disabled
                />
              </div>
              <div>
                <label className="block font-medium mb-1">ชื่อ-สกุล</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border px-4 py-2 rounded"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block font-medium mb-1">บทบาท</label>
                <div className="grid grid-cols-2 mt-2">
                  {USER_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center space-x-2 p-2 rounded-md has-[:checked]:bg-purple-50 has-[:checked]:border-purple-400"
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role)}
                        onChange={() => handleRoleChange(role)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
                {errors.roles && (
                  <p className="text-red-500 text-sm mt-1">{errors.roles}</p>
                )}
              </div>
              <div>
                <label className="block font-medium mb-1">เบอร์โทรศัพท์</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border px-4 py-2 rounded"
                  placeholder="08xxxxxxxx"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="pdpa"
                    checked={formData.pdpa}
                    onChange={handleChange}
                    className="h-5 w-5 mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-700">
                    ข้าพเจ้ายินยอมให้เก็บรวบรวมและใช้ข้อมูลส่วนบุคคลนี้เพื่อวัตถุประสงค์ในการลงทะเบียนและแจ้งข่าวสารที่เกี่ยวข้อง
                  </span>
                </label>
                {errors.pdpa && (
                  <p className="text-red-500 text-sm mt-1">{errors.pdpa}</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-purple-700 transition-all disabled:bg-gray-400 disabled:cursor-wait"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกและเข้าสู่ระบบ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
