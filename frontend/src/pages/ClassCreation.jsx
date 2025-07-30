import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";

export default function ClassCreation() {
  const [showForm, setShowForm] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExistingList, setShowExistingList] = useState(false);
  const [location, setLocation] = useState("");
  const perPage = 5;
  const [classId, setClassId] = useState(null);
  const handleCreateNew = () => {
    setClassId(Math.floor(100000 + Math.random() * 900000));
    setShowForm(true);
  };
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
    target_groups: ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"],
    max_participants: "1",
    files: [],
  });
  const [speakerInput, setSpeakerInput] = useState("");
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
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
    newForm.append("speaker", JSON.stringify(formData.speaker));
    newForm.append("start_date", formData.start_date);
    newForm.append("end_date", formData.end_date);
    newForm.append("start_time", formData.start_time);
    newForm.append("end_time", formData.end_time);
    newForm.append("description", formData.description);
    newForm.append("format", formData.format);
    newForm.append("join_link", formData.join_link);
    newForm.append("max_participants", formData.max_participants);
    const allGroups = ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"];
    let groupsToSend = formData.target_groups.filter(
      (g) => g !== "" && g !== null
    );
    if (groupsToSend.length === 0) {
      groupsToSend = allGroups;
    }
    newForm.append("target_groups", JSON.stringify(groupsToSend));
    formData.files.forEach((file) => {
      newForm.append("files", file);
    });
    newForm.append("location", location);

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

  const handleEditExisting = (cls) => {
    const randomId = Math.floor(100000 + Math.random() * 900000);
    setClassId(randomId);

    const formatDate = (d) => {
      if (!d) return "";
      if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return d;
      }
      const date = new Date(d);
      if (!isNaN(date.getTime())) {
        const tzOffset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - tzOffset * 60000);
        return localDate.toISOString().slice(0, 10);
      }
      return d;
    };

    let groups = [];
    if (Array.isArray(cls.target_groups)) {
      groups = cls.target_groups;
    } else if (typeof cls.target_groups === "string") {
      try {
        const parsed = JSON.parse(cls.target_groups);
        if (Array.isArray(parsed)) {
          groups = parsed;
        } else if (typeof parsed === "string") {
          groups = [parsed];
        } else {
          groups = [];
        }
      } catch {
        groups = cls.target_groups.split(",").map((s) => s.trim());
      }
    }

    const allGroups = ["นักศึกษา", "อาจารย์", "พนักงาน", "บุคคลภายนอก"];
    groups = groups.filter((g) => allGroups.includes(g));

    let speakers = [];
    if (Array.isArray(cls.speaker)) {
      speakers = cls.speaker;
    } else if (typeof cls.speaker === "string") {
      try {
        const parsed = JSON.parse(cls.speaker);
        if (Array.isArray(parsed)) {
          speakers = parsed;
        } else if (typeof parsed === "string") {
          speakers = [parsed];
        } else {
          speakers = [];
        }
      } catch {
        if (cls.speaker.trim() !== "") {
          speakers = [cls.speaker.trim()];
        } else {
          speakers = [];
        }
      }
    }

    setFormData({
      title: cls.title || "",
      speaker: speakers,
      start_date: formatDate(cls.start_date),
      end_date: formatDate(cls.end_date),
      start_time: cls.start_time || "",
      end_time: cls.end_time || "",
      description: cls.description || "",
      format: cls.format || "",
      join_link: cls.join_link || "",
      target_groups: groups,
      max_participants: cls.max_participants || "",
      files: Array.isArray(cls.files)
        ? cls.files
        : cls.files && typeof cls.files === "string" && cls.files !== "[]"
        ? JSON.parse(cls.files)
        : [],
    });
    setLocation(cls.location || "");
    setShowForm(true);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/classes");
      const data = await res.json();
      setClassesList(data);
    } catch (err) {
      console.error("❌ โหลดข้อมูลคลาสล้มเหลว", err);
    }
  };

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex flex-col w-fit gap-5 min-h-screen p-5 item-center">
        <div className="flex flex-row gap-x-10 items-center w-[400px] justify-between">
          <div className="flex flex-col gap-3 w-full max-w-2xl">
            <button
              onClick={() => {
                handleCreateNew();
                setShowExistingList(false);
              }}
              className="text-white font-bold cursor-pointer hover:underline bg-transparent border-none"
            >
              สร้างใหม่ทั้งหมด
            </button>
            <button
              onClick={() => {
                fetchClasses();
                setShowExistingList(true);
              }}
              className="text-white font-bold cursor-pointer hover:underline bg-transparent border-none"
            >
              สร้างโดยแก้ไขจากข้อมูลเดิม
            </button>
          </div>
        </div>

        {showExistingList && (
          <div className="w-[400px] max-w-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold mb-4">
              สร้างโดยแก้ไขจากข้อมูลเดิม
            </h2>
            <ul className="space-y-2">
              {classesList
                .slice((currentPage - 1) * perPage, currentPage * perPage)
                .map((cls) => {
                  const createdDate = new Date(cls.created_at);

                  const formattedDate = createdDate.toLocaleDateString(
                    "th-TH",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  );

                  const formattedTime = createdDate.toLocaleTimeString(
                    "th-TH",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }
                  );

                  return (
                    <li
                      key={cls.class_id}
                      className="border p-3 rounded flex items-center gap-4 justify-between"
                    >
                      <div className="max-w-[225px]">
                        <strong>{cls.title}</strong>
                        <br />
                        สร้างเมื่อ {formattedDate}
                        <br />
                        เวลา {formattedTime} น.
                      </div>
                      <button
                        className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                        onClick={() => handleEditExisting(cls)}
                      >
                        เลือก
                      </button>
                    </li>
                  );
                })}
            </ul>

            <div className="flex justify-center mt-4 gap-2">
              {Array.from({
                length: Math.ceil(classesList.length / perPage),
              }).map((_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded-[100px] ${
                    currentPage === i + 1
                      ? "bg-purple-700 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="w-screen max-w-2xl space-y-5 bg-white text-black p-6 rounded shadow my-5"
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
              <div className="relative">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-purple-400 pr-10"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  ref={startDateRef}
                  onFocus={() => {
                    if (startDateRef.current?.showPicker) {
                      startDateRef.current.showPicker();
                    }
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="16"
                      rx="2"
                      strokeWidth="2"
                    />
                    <path d="M16 3v4M8 3v4M3 9h18" strokeWidth="2" />
                  </svg>
                </span>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">
                วันที่สิ้นสุด <span>(วัน/เดือน/ค.ศ.)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-purple-400 pr-10"
                  required
                  min={
                    formData.start_date || new Date().toISOString().slice(0, 10)
                  }
                  ref={endDateRef}
                  onFocus={() => {
                    if (endDateRef.current?.showPicker) {
                      endDateRef.current.showPicker();
                    }
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="16"
                      rx="2"
                      strokeWidth="2"
                    />
                    <path d="M16 3v4M8 3v4M3 9h18" strokeWidth="2" />
                  </svg>
                </span>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">เวลา</label>
              <div className="relative">
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-purple-400 pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  {/* clock icon */}
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path d="M12 7v5l3 3" strokeWidth="2" />
                  </svg>
                </span>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">ถึง</label>
              <div className="relative">
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="border px-4 py-2 rounded w-full focus:ring-2 focus:ring-purple-400 pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path d="M12 7v5l3 3" strokeWidth="2" />
                  </svg>
                </span>
              </div>
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

          {(formData.format === "ห้องเรียนเท่านั้น" ||
            formData.format === "ห้องเรียนและออนไลน์") && (
            <div>
              <label className="block font-medium mb-1">สถานที่เรียน</label>
              <input
                type="text"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
                value={formData.join_link}
                onChange={handleChange}
                placeholder="โปรดระบุเป็น https:// ตามด้วยลิงก์ของท่าน"
                className="w-full border px-4 py-2 rounded"
                required={formData.format !== "ห้องเรียนเท่านั้น"}
              />
            </div>
          )}

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
          </div>
        </form>
      )}
    </div>
  );
}
