import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ClassCreation() {
  const [showForm, setShowForm] = useState(false);
  const [classId, setClassId] = useState(null);
  const handleCreateNew = () => {
    setClassId(Math.floor(100000 + Math.random() * 900000));
    setShowForm(true);
  };

  const [formData, setFormData] = useState({
    title: "",
    speaker: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    description: "",
    format: "",
    join_link: "",
    target_groups: [],
    max_participants: "",
    files: [],
    evaluation_link: "",
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...Array.from(files)],
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleAudienceChange = (value) => {
    setFormData((prev) => {
      const exists = prev.target_groups.includes(value);
      return {
        ...prev,
        target_groups: exists
          ? prev.target_groups.filter((g) => g !== value)
          : [...prev.target_groups, value],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newForm = new FormData();

    newForm.append("class_id", classId);
    newForm.append("title", formData.title);
    newForm.append("speaker", formData.speaker);
    newForm.append("start_date", formData.start_date);
    newForm.append("end_date", formData.end_date);
    newForm.append("start_time", formData.start_time);
    newForm.append("end_time", formData.end_time);
    newForm.append("description", formData.description);
    newForm.append("format", formData.format);
    newForm.append("join_link", formData.join_link);
    newForm.append("max_participants", formData.max_participants);
    newForm.append("evaluation_link", formData.evaluation_link);
    newForm.append("target_groups", JSON.stringify(formData.target_groups));

    formData.files.forEach((file) => {
      newForm.append("files", file); // name "files" ต้องตรงกับใน multer
    });

    try {
      const res = await fetch("http://localhost:5000/api/classes", {
        method: "POST",
        body: newForm,
      });

      if (res.ok) {
        alert("✅ ส่งข้อมูลสำเร็จพร้อมไฟล์");
      } else {
        alert("❌ ส่งข้อมูลไม่สำเร็จ");
      }
    } catch (error) {
      console.error("💥 error", error);
      alert("⚠️ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์");
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-8 flex flex-col gap-4">
        <div className="flex flex-row gap-x-10">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreateNew}
              className="text-white font-bold cursor-pointer hover:underline bg-transparent border-none p-0 m-0 w-[300px]"
            >
              สร้างใหม่ทั้งหมด
            </button>
            <button
              onClick={() => alert("เปิดฟอร์มโดยการใช้ข้อมูลเดิม")}
              className="text-white font-bold cursor-pointer hover:underline bg-transparent border-none p-0 m-0 w-[300px]"
            >
              สร้างโดยแก้ไขจากข้อมูลเดิม
            </button>
            <button
              onClick={() => alert("สร้างจากแบบร่าง")}
              className="text-white font-bold cursor-pointer hover:underline bg-transparent border-none p-0 m-0 w-[300px]"
            >
              สร้างจากแบบร่างที่บันทึกไว้
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="w-screen max-w-2xl space-y-5 bg-white text-black p-6 rounded shadow m-10"
        >
          <h1 className="font-bold text-center mb-8">สร้างห้องเรียนใหม่</h1>

          <div>
            <label className="block font-medium mb-1">
              รหัสห้องเรียน (Class ID)
            </label>
            <input
              value={classId ?? ""}
              readOnly
              className="w-full border px-4 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">ชื่อวิชา</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="โปรดระบุชื่อวิชา"
              className="w-full border px-4 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">วิทยากร</label>
            <input
              name="speaker"
              value={formData.speaker}
              onChange={handleChange}
              placeholder="โปรดระบุชื่อวิทยากร"
              className="w-full border px-4 py-2 rounded"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
            <div>
              <label className="block font-medium mb-1">วันที่เรียน</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">วันที่สิ้นสุด</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">เวลา</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">ถึง</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">รายละเอียด</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="ระบุรายละเอียดในรายวิชาของคุณ (ถ้ามี)"
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">รูปแบบการเรียน</label>
            <select
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              required
            >
              <option value="ห้องเรียนและออนไลน์">ห้องเรียนและออนไลน์</option>
              <option value="ออนไลน์เท่านั้น">ออนไลน์เท่านั้น</option>
              <option value="ห้องเรียนเท่านั้น">ห้องเรียนเท่านั้น</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">
              URL หรือ ลิงก์สำหรับห้องเรียนออนไลน์
            </label>
            <input
              type="url"
              name="join_link"
              value={formData.join_link}
              onChange={handleChange}
              placeholder=" ไม่ต้องระบุหากรูปแบบการเรียนเป็น 'ห้องเรียนเท่านั้น'"
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div className="flex flex-rpw gap-2 item-center ">
            <div className="block font-medium my-auto w-fit">
              จำนวนผู้เข้าร่วมได้สูงสุด
            </div>
            <input
              type="number"
              min="1"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              placeholder="ตั้งแต่ 1 ท่านขึ้นไป"
              className="w-max border px-4 py-2 rounded"
              required
            />
            <div className="block font-medium my-auto w-fit">ท่าน</div>
          </div>

          <div className="flex flex-rpw gap-2 item-center ">
            <label className="block font-medium mr-3">สถานภาพของผู้เรียน</label>
            <div className="flex gap-4">
              {["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"].map((g) => (
                <label key={g}>
                  <input
                    type="checkbox"
                    checked={formData.target_groups.includes(g)}
                    onChange={() => handleAudienceChange(g)}
                    required
                  />
                  <span className="ml-1">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block font-medium">
              แนบไฟล์ประกอบการเรียนการสอน
            </label>

            <label className="inline-block w-fit bg-black text-white px-4 py-2 rounded cursor-pointer hover:bg-purple-800">
              เพิ่มไฟล์เอกสาร
              <input
                type="file"
                multiple
                onChange={handleChange}
                className="hidden"
              />
            </label>

            {formData.files.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {formData.files.map((file, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded"
                  >
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-white hover:text-red-800 text-xs font-bold"
                    >
                      ❌ ลบ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-5 justify-center mt-6">
            <button
              type="submit"
              className="bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800 w-[150px]"
            >
              สร้าง
            </button>
            <button
              type="button"
              onClick={() => alert("บันทึกแบบร่าง")}
              className="bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800 w-[150px]"
            >
              บันทึกแบบร่าง
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
