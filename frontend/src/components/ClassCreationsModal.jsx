// ClassCreationsModal.jsx (ไฟล์ใหม่ที่คุณต้องสร้างในโฟลเดอร์ components)

import React, { useState, useEffect, useRef } from "react";

const ClassCreationModal = ({
  onClose,
  initialData,
  onSubmit,
  isEditing,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    speaker: [],
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    description: "",
    format: "ห้องเรียนและออนไลน์",
    join_link: "",
    location: "",
    target_groups: ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"],
    max_participants: "1",
    files: [], // Ensure files array is initialized
  });

  const [speakerInput, setSpeakerInput] = useState("");
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const formatDate = (d) => {
        if (!d) return "";
        const date = new Date(d);
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 10);
        }
        return d;
      };

      let groups = [];
      if (Array.isArray(initialData.target_groups)) {
        groups = initialData.target_groups;
      } else if (typeof initialData.target_groups === "string") {
        try {
          const parsed = JSON.parse(initialData.target_groups);
          if (Array.isArray(parsed)) {
            groups = parsed;
          }
        } catch {
          groups = initialData.target_groups
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");
        }
      }

      let speakers = [];
      if (Array.isArray(initialData.speaker)) {
        speakers = initialData.speaker;
      } else if (typeof initialData.speaker === "string") {
        try {
          const parsed = JSON.parse(initialData.speaker);
          if (Array.isArray(parsed)) {
            speakers = parsed;
          }
        } catch {
          speakers = initialData.speaker
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");
        }
      }

      setFormData({
        ...initialData,
        class_id: initialData.class_id,
        speaker: speakers,
        start_date: formatDate(initialData.start_date),
        end_date: formatDate(initialData.end_date),
        location: initialData.location || "",
        target_groups: groups.length > 0 ? groups : ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"],
        max_participants: initialData.max_participants || "1",
        // Ensure files are handled correctly when loading initial data
        files: Array.isArray(initialData.files)
          ? initialData.files
          : initialData.files && typeof initialData.files === "string" && initialData.files !== "[]"
          ? JSON.parse(initialData.files)
          : [],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...Array.from(files)],
      }));
    } else if (name === "speaker") {
      setSpeakerInput(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSpeakerKeyDown = (e) => {
    if (["Enter", ",", "Tab"].includes(e.key) && speakerInput.trim()) {
      e.preventDefault();
      if (!formData.speaker.includes(speakerInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          speaker: [...prev.speaker, speakerInput.trim()],
        }));
      }
      setSpeakerInput("");
    }
  };

  const handleRemoveSpeaker = (idx) => {
    setFormData((prev) => ({
      ...prev,
      speaker: prev.speaker.filter((_, i) => i !== idx),
    }));
  };

  // Function to handle removing files
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-white/75 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {isEditing ? "แก้ไขห้องเรียน" : "สร้างห้องเรียนใหม่"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">ชื่อวิชา</label>
            <input
              name="title"
              value={formData.title || ""}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">วิทยากร</label>
            <div className="w-full border px-4 py-2 rounded flex flex-wrap gap-2 min-h-[44px] bg-white">
              {formData.speaker.map((spk, idx) => (
                <span
                  key={idx}
                  className="text-black pl-[10px] border-[0.5px] border-black rounded flex items-center gap-1"
                >
                  {spk}
                  <button
                    type="button"
                    className="text-xs text-white hover:bg-red-800"
                    style={{ borderRadius: "0", background: "black" }}
                    onClick={() => handleRemoveSpeaker(idx)}
                  >
                    X
                  </button>
                </span>
              ))}
              <input
                name="speaker"
                value={speakerInput}
                onChange={handleChange}
                onKeyDown={handleSpeakerKeyDown}
                placeholder="พิมพ์ชื่อ-สกุล แล้ว Enter"
                className="flex-1 min-w-[120px] border-none outline-none"
              />
            </div>
            {formData.speaker.length === 0 && (
              <div className="text-red-500 text-xs mt-1">
                กรุณาระบุวิทยากรอย่างน้อย 1 คน
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
            <div>
              <label className="block font-medium mb-1">
                วันที่เรียน <span>(วัน/เดือน/ค.ศ.)</span>{" "}
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date || ""}
                onChange={handleChange}
                className="border px-4 py-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">
                วันที่สิ้นสุด <span>(วัน/เดือน/ค.ศ.)</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date || ""}
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
                value={formData.start_time || ""}
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
                value={formData.end_time || ""}
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
              value={formData.description || ""}
              onChange={handleChange}
              placeholder="ระบุรายละเอียดในรายวิชาของคุณ (ถ้ามี)"
              className="w-full border px-4 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">รูปแบบการเรียน</label>
            <select
              name="format"
              value={formData.format || "ห้องเรียนและออนไลน์"}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              required
            >
              <option value="ห้องเรียนและออนไลน์">ห้องเรียนและออนไลน์</option>
              <option value="ออนไลน์เท่านั้น">ออนไลน์เท่านั้น</option>
              <option value="ห้องเรียนเท่านั้น">ห้องเรียนเท่านั้น</option>
            </select>
          </div>

          {(formData.format === "ห้องเรียนเท่านั้น" ||
            formData.format === "ห้องเรียนและออนไลน์") && (
            <div>
              <label className="block font-medium mb-1">สถานที่เรียน</label>
              <input
                type="text"
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
                placeholder="ระบุอาคาร ชั้นและห้อง"
                className="w-full border px-4 py-2 rounded"
                required={formData.format !== "ออนไลน์เท่านั้น"}
              />
            </div>
          )}

          {(formData.format === "ออนไลน์เท่านั้น" ||
            formData.format === "ห้องเรียนและออนไลน์") && (
            <div>
              <label className="block font-medium mb-1">
                URL หรือ ลิงก์สำหรับห้องเรียนออนไลน์
              </label>
              <input
                type="url"
                name="join_link"
                value={formData.join_link || ""}
                onChange={handleChange}
                placeholder="โปรดระบุเป็น https:// ตามด้วยลิงก์ของท่าน"
                className="w-full border px-4 py-2 rounded"
                required={formData.format !== "ห้องเรียนเท่านั้น"}
              />
            </div>
          )}

          <div className="flex flex-rpw gap-2 item-center">
            <div className="block font-medium my-auto w-fit">
              จำนวนผู้เข้าร่วมได้สูงสุด
            </div>
            <input
              type="number"
              min="1"
              name="max_participants"
              value={formData.max_participants || "1"}
              onChange={handleChange}
              placeholder="ตั้งแต่ 1 ท่านขึ้นไป"
              className="w-max border px-4 py-2 rounded"
              required
            />
            <div className="block font-medium my-auto w-fit">ท่าน</div>
          </div>

          <div className="flex flex-rpw gap-2 item-center">
            <label className="block font-medium mr-3">สถานภาพของผู้เรียน</label>
            <div className="flex gap-4">
              {["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"].map((g) => (
                <label key={g}>
                  <input
                    type="checkbox"
                    checked={formData.target_groups.includes(g)}
                    onChange={() => handleAudienceChange(g)}
                  />
                  <span className="ml-1">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ส่วนที่เพิ่มกลับเข้ามา: แนบไฟล์ประกอบการเรียนการสอน */}
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
          {/* สิ้นสุดส่วนที่เพิ่มกลับเข้ามา */}

          <div className="flex gap-5 justify-center mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-gray-300 hover:bg-gray-400 w-[150px]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="bg-purple-700 text-white px-6 py-2 rounded hover:bg-purple-800 w-[150px]"
            >
              {isEditing ? "เปลี่ยนแปลง" : "สร้าง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassCreationModal;
