import React, { useState, useEffect, useRef } from "react";

const speakerOptions = [
  "กันตภณ พรมคำ",
  "จิตราภรณ์ ชัยมณี",
  "ทิพวรรณ สุขรวย",
  "วรรธนันทพร วิลัยรักษ์",
];

const AUDIENCE_OPTIONS = [
  "นักศึกษา",
  "อาจารย์/นักวิจัย",
  "บุคลากร",
];

const ClassCreationModal = ({ onClose, initialData, onSubmit, isEditing, isDuplicating }) => {
  const [formData, setFormData] = useState({
    title: "",
    speaker: [],
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    description: "",
    format: "ONLINE",
    join_link: "",
    location: "",
    target_groups: [...AUDIENCE_OPTIONS],
    max_participants: "1",
    files: [],
    class_id: "",
  });

  const [speakerInput, setSpeakerInput] = useState("");

  useEffect(() => {
    const randomId = () => Math.floor(100000 + Math.random() * 900000);

    if (initialData) {
      const formatDate = (d) => {
        if (!d) return "";
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const parseJsonField = (field) => {
        if (Array.isArray(field)) return field;
        if (typeof field === "string") {
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [field];
          } catch (e) {
            return field ? [field] : [];
          }
        }
        return [];
      };

      const speakers = parseJsonField(initialData.speaker);
      const groups = parseJsonField(initialData.target_groups);
      const files = parseJsonField(initialData.files);

      setFormData({
        ...initialData,
        class_id: isDuplicating ? randomId() : initialData.class_id,
        speaker: speakers,
        start_date: formatDate(initialData.start_date),
        end_date: formatDate(initialData.end_date),
        location: initialData.location || "",
        target_groups: groups.length > 0 ? groups : [...AUDIENCE_OPTIONS],
        max_participants: initialData.max_participants || "1",
        files: files.map((f) => (typeof f === "string" ? { name: f } : f)),
      });
    } else {
        setFormData({
            title: "",
            speaker: [],
            start_date: "",
            end_date: "",
            start_time: "",
            end_time: "",
            description: "",
            format: "ONLINE",
            join_link: "",
            location: "",
            target_groups: [...AUDIENCE_OPTIONS],
            max_participants: "1",
            files: [],
            class_id: randomId(),
        });
    }
  }, [initialData, isEditing, isDuplicating]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, files: [...prev.files, ...Array.from(files)] }));
    } else if (name === "speaker") {
      setSpeakerInput(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddSpeaker = () => {
    if (speakerInput && !formData.speaker.includes(speakerInput)) {
      setFormData((prev) => ({ ...prev, speaker: [...prev.speaker, speakerInput] }));
      setSpeakerInput("");
    }
  };

  const handleRemoveSpeaker = (speakerToRemove) => {
    setFormData((prev) => ({ ...prev, speaker: prev.speaker.filter((spk) => spk !== speakerToRemove) }));
  };

  const handleRemoveFile = (indexToRemove) => {
    setFormData((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== indexToRemove) }));
  };

  const handleAudienceChange = (value) => {
    setFormData((prev) => {
      const exists = prev.target_groups.includes(value);
      return { ...prev, target_groups: exists ? prev.target_groups.filter((g) => g !== value) : [...prev.target_groups, value] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (dataToSend.format === 'ONLINE') {
      dataToSend.max_participants = 999;
    }
    onSubmit(dataToSend);
  };

  return (
    <div className="fixed inset-0 bg-white/75 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {isEditing ? "แก้ไขห้องเรียน" : (isDuplicating ? "สร้างโดยแก้ไขจากข้อมูลเดิม" : "สร้างห้องเรียนใหม่")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">
              Class ID
            </label>
            <input
              name="class_id"
              value={formData.class_id || ""}
              placeholder="ID"
              className="w-full border px-4 py-2 rounded bg-gray-100"
              disabled
            />
          </div>
          
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
            <div className="flex gap-2">
              <select
                name="speaker"
                value={speakerInput}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded"
              >
                <option value="">-- เลือกวิทยากร --</option>
                {speakerOptions
                  .filter((spk) => !formData.speaker.includes(spk))
                  .map((speaker) => (
                    <option key={speaker} value={speaker}>
                      {speaker}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddSpeaker}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                เพิ่ม
              </button>
            </div>
            {formData.speaker.length > 0 && (
              <div className="mt-2 space-y-1">
                {formData.speaker.map((spk, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded"
                  >
                    <span>{spk}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpeaker(spk)}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                className="w-full border px-4 py-2 rounded"
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
                className="w-full border px-4 py-2 rounded"
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
                className="w-full border px-4 py-2 rounded"
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
                className="w-full border px-4 py-2 rounded"
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
              value={formData.format}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              required
            >
              <option value="ONLINE">ONLINE</option>
              <option value="ONSITE">ONSITE</option>
            </select>
          </div>

          {formData.format === "ONSITE" && (
            <div>
              <label className="block font-medium mb-1">สถานที่เรียน</label>
              <input
                type="text"
                name="location"
                value={formData.location || ""}
                onChange={handleChange}
                placeholder="ระบุอาคาร ชั้นและห้อง"
                className="w-full border px-4 py-2 rounded"
                required
              />
            </div>
          )}

          {formData.format === "ONLINE" && (
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
                required
              />
            </div>
          )}

          {formData.format === 'ONSITE' && (
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
          )}

          <div className="flex flex-rpw gap-2 item-center">
            <label className="block font-medium mr-3">สถานภาพของผู้เรียน</label>
            <div className="flex gap-4">
              {["นักศึกษา", "อาจารย์/นักวิจัย", "บุคลากร"].map((g) => (
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