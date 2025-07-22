import React, { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function ClassCreation() {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [platform, setPlatform] = useState("");
  const [link, setLink] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [audience, setAudience] = useState([]);
  const [evaluationLink, setEvaluationLink] = useState("");
  const classId = Math.floor(100000 + Math.random() * 900000); // 6-digit ID

  const handleAudienceChange = (e) => {
    const { value, checked } = e.target;
    setAudience((prev) =>
      checked ? [...prev, value] : prev.filter((item) => item !== value)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newClass = {
      id: classId,
      startDate,
      endDate,
      startTime,
      endTime,
      activityName,
      description,
      speaker,
      platform,
      link,
      maxParticipants,
      audience,
      evaluationLink,
    };
    console.log("📌 ข้อมูลคลาสใหม่:", newClass);
    alert("สร้างคลาสใหม่สำเร็จ!");
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold mb-4">สร้างห้องเรียน</h1>
        <div className="flex flex-row gap-x-10">
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
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
          className="w-screen max-w-2xl space-y-4 bg-white text-black p-6 rounded shadow m-10"
        >
          <div>
            <label className="block font-medium mb-1">
              รหัสห้องเรียน (Class ID)
            </label>
            <input
              value={classId}
              readOnly
              className="w-full border px-4 py-2 rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">ชื่อห้องเรียน/วิชา</label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              required
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">วิทยากร</label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">วันที่เริ่ม</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">เวลาเริ่ม</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full border px-4 py-2 rounded"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">เวลาสิ้นสุด</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full border px-4 py-2 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">รายละเอียดกิจกรรม</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">รูปแบบของห้องเรียน</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            >
              <option value="">เลือกแพลตฟอร์ม</option>
              <option value="ออนไลน์ (Zoom)">ออนไลน์ </option>
              <option value="ห้องเรียน">ห้องเรียน </option>
              <option value="ห้องเรียนและออนไลน์">ห้องเรียนและออนไลน์  </option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">ลิงก์</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              จำนวนผู้เข้าร่วมสูงสุด
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">กลุ่มเป้าหมาย</label>
            <div className="flex gap-4">
              <label>
                <input
                  type="checkbox"
                  value="นักศึกษา"
                  onChange={handleAudienceChange}
                />
                {"  "}
                นักศึกษา
              </label>
              <label>
                <input
                  type="checkbox"
                  value="อาจารย์"
                  onChange={handleAudienceChange}
                />
                {"  "}
                อาจารย์
              </label>
              <label>
                <input
                  type="checkbox"
                  value="พนักงาน"
                  onChange={handleAudienceChange}
                />
                {"  "}
                พนักงาน
              </label>
              <label>
                <input
                  type="checkbox"
                  value="บุคคลภายนอก"
                  onChange={handleAudienceChange}
                />
                {"  "}
                บุคคลทั่วไป
              </label>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">
              ลิงก์แบบประเมิน (ถ้ามี)
            </label>
            <input
              type="url"
              value={evaluationLink}
              onChange={(e) => setEvaluationLink(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div className="flex gap-5 w-content-center justify-center mt-6">
            <button
              type="submit"
              className="bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800 w-[150px]"
            >
              สร้าง
            </button>

            <button
              type="submit"
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
