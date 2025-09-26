import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ClassCreation() {
  const classId = Math.floor(100000 + Math.random() * 900000);
  const [formData, setFormData] = useState({
    title: "",
    speaker: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    description: "",
    format: "Online",
    join_link: "",
    target_groups: [],
    max_participants: 0,
    files: [],
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData({ ...formData, files: Array.from(files) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAudienceChange = (group) => {
    setFormData((prev) => {
      const exists = prev.target_groups.includes(group);
      return {
        ...prev,
        target_groups: exists
          ? prev.target_groups.filter((g) => g !== group)
          : [...prev.target_groups, group],
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("🎯 Class Created:", formData);
    alert("Class Created! ✅");
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-8 flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">สร้างห้องเรียนออนไลน์</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              name="title"
              placeholder="ชื่อวิชา"
              className="p-2 border rounded"
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <input
              name="speaker"
              placeholder="วิทยากร"
              className="p-2 border rounded"
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex flex-col flex-1">
              วันที่เริ่ม
              <input
                type="date"
                name="start_date"
                className="p-2 border rounded"
                onChange={handleChange}
                required
              />
            </label>
            <label className="flex flex-col flex-1">
              ถึง
              <input
                type="date"
                name="end_date"
                className="p-2 border rounded"
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex flex-col flex-1">
              เริ่มเวลา
              <input
                type="time"
                name="start_time"
                className="p-2 border rounded"
                onChange={handleChange}
              />
            </label>
            <label className="flex flex-col flex-1">
              ถึง
              <input
                type="time"
                name="end_time"
                className="p-2 border rounded"
                onChange={handleChange}
              />
            </label>
          </div>

          <textarea
            name="description"
            placeholder="รายละเอียดกิจกรรม"
            className="p-2 border rounded"
            onChange={handleChange}
          ></textarea>

          <label>
            รูปแบบการเรียน:
            <select
              name="format"
              className="p-2 border rounded ml-2"
              onChange={handleChange}
            >
              <option value="Online">Online</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </label>

          <input
            type="number"
            name="max_participants"
            placeholder="จำนวนผู้เข้าร่วมสูงสุด"
            className="p-2 border rounded"
            onChange={handleChange}
          />

          <label>
            แนบไฟล์:
            <input
              type="file"
              multiple
              className="ml-2"
              onChange={handleChange}
            />
          </label>

          <div>
            <p className="font-semibold">กลุ่มเป้าหมาย:</p>
            {["นิสิตแพทย์", "อาจารย์", "บุคลากร", "นักวิจัย"].map((group) => (
              <label key={group} className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  checked={formData.target_groups.includes(group)}
                  onChange={() => handleAudienceChange(group)}
                />
                <span className="ml-2">{group}</span>
              </label>
            ))}
          </div>

          <input
            name="join_link"
            placeholder="ลิงก์เข้าเรียนออนไลน์"
            className="p-2 border rounded"
            onChange={handleChange}
          />

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            สร้างห้องเรียน
          </button>
        </form>
      </div>
    </div>
  );
}
