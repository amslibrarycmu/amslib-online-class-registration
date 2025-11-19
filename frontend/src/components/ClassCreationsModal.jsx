import React, { useState, useEffect, useReducer, useRef } from "react";

const speakerOptions = [
  "กันตภณ พรมคำ",
  "จิตราภรณ์ ชัยมณี",
  "ทิพวรรณ สุขรวย",
  "วรรธนันทพร วิลัยรักษ์",
];

const AUDIENCE_OPTIONS = ["นักศึกษา", "อาจารย์/นักวิจัย", "บุคลากร"];

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

const initialFormState = {
  title: "",
  speaker: [],
  start_date: getTodayString(),
  start_time: "",
  end_date: getTodayString(),
  end_time: "",
  description: "",
  format: "ONLINE",
  join_link: "https://cmu-th.zoom.us/my/amslibclass",
  location: "ห้อง Group Study ห้องสมุดคณะเทคนิคการแพทย์",
  target_groups: [...AUDIENCE_OPTIONS],
  max_participants: "1",
  materials: [], // Changed from files to materials
  class_id: "",
};

function formReducer(state, action) {
  switch (action.type) {
    case "INITIALIZE_FORM":
      return { ...initialFormState, ...action.payload };
    case "SET_FIELD":
      return { ...state, [action.payload.name]: action.payload.value };
    case "ADD_SPEAKER":
      if (action.payload && !state.speaker.includes(action.payload)) {
        return { ...state, speaker: [...state.speaker, action.payload] };
      }
      return state;
    case "REMOVE_SPEAKER":
      return {
        ...state,
        speaker: state.speaker.filter((spk) => spk !== action.payload),
      };
    case "ADD_FILES":
      return { ...state, materials: [...state.materials, ...action.payload] }; // Changed to materials
    case "REMOVE_FILE":
      return {
        ...state,
        materials: state.materials.filter((_, i) => i !== action.payload), // Changed to materials
      };
    case "TOGGLE_AUDIENCE":
      const exists = state.target_groups.includes(action.payload);
      return {
        ...state,
        target_groups: exists
          ? state.target_groups.filter((g) => g !== action.payload)
          : [...state.target_groups, action.payload],
      };
    default:
      return state;
  }
}

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
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

const ClassCreationModal = ({
  onClose,
  initialData,
  onSubmit, mode
}) => {
  const [formData, dispatch] = useReducer(formReducer, initialFormState);
  const [speakerInput, setSpeakerInput] = useState("");
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  useEffect(() => {
    const randomId = () => Math.floor(100000 + Math.random() * 900000).toString();
    let preparedData = {};

    if (initialData) {
      const speakers = parseJsonField(initialData.speaker);
      const groups = parseJsonField(initialData.target_groups);
      const files = parseJsonField(initialData.materials); // Read from materials

      preparedData = {
        ...initialData,
        class_id: (mode === 'duplicate' || mode === 'fromRequest') ? randomId() : initialData.class_id,
        speaker: speakers,
        start_date: formatDate(initialData.start_date),
        end_date: formatDate(initialData.end_date),
        join_link: initialData.join_link || initialFormState.join_link,
        location: initialData.location || initialFormState.location,
        target_groups: groups.length > 0 ? groups : [...AUDIENCE_OPTIONS],
        max_participants:
          initialData.max_participants || initialFormState.max_participants,
        materials: files.map((f) => (typeof f === "string" ? { name: f } : f)), // Set to materials
      };
    } else {
      // For brand new classes, ensure end_date and end_time are cleared initially
      preparedData = {
        ...initialFormState,
        class_id: randomId(), // Generate a random ID for display
        end_date: getTodayString(), // Keep end_date same as start_date initially
        end_time: "", // Clear end_time
      };
    }

    if ((mode === 'duplicate' || mode === 'fromRequest') && preparedData.start_date < getTodayString()) {
      alert("วันที่ของต้นฉบับอยู่ในอดีต กรุณากำหนดวันและเวลาใหม่");
      preparedData.start_date = getTodayString();
      preparedData.end_date = getTodayString();
      preparedData.start_time = "";
      preparedData.end_time = ""; 
    }
    dispatch({ type: "INITIALIZE_FORM", payload: preparedData });
  }, [initialData, mode]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      dispatch({ type: "ADD_FILES", payload: Array.from(files) });
    } else if (name === "speaker") {
      setSpeakerInput(value);
    } else if (name === "start_date") {
      // If the new start_date is after the current end_date, update end_date as well.
      if (value > formData.end_date) {
        dispatch({ type: "SET_FIELD", payload: { name: "end_date", value } });
      }
      dispatch({ type: "SET_FIELD", payload: { name, value } });
    } else if (name === "start_time") {
      // Validation First: Prevent selecting a past time on the current day
      if (formData.start_date === getTodayString() && value < getCurrentTimeString()) {
        alert("ไม่สามารถเลือกเวลาในอดีตได้");
        return;
      }

      // When start_time is first set, or changed, calculate the default end_time (+1 hour)
      if (value) {
        const [hours, minutes] = value.split(":").map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0);
        startDate.setHours(startDate.getHours() + 1);

        const endHours = startDate.getHours().toString().padStart(2, "0");
        const endMinutes = startDate.getMinutes().toString().padStart(2, "0");
        const newEndTime = `${endHours}:${endMinutes}`;

        dispatch({ type: "SET_FIELD", payload: { name: "end_time", value: newEndTime } });
        dispatch({ type: "SET_FIELD", payload: { name: "end_date", value: formData.start_date } });
      }

      // If start_date and end_date are the same, and the new start_time is after the current end_time,
      // reset the end_time to match the new start_time to maintain validity.
      if (formData.start_date === formData.end_date && value > formData.end_time) {
        dispatch({ type: "SET_FIELD", payload: { name: "end_time", value } });
      }
      dispatch({ type: "SET_FIELD", payload: { name, value } });
    } else if (name === "end_date") {
      // If end_date is set to be the same as start_date, and end_time is before start_time, reset end_time.
      if (value === formData.start_date && formData.end_time < formData.start_time) {
        dispatch({ type: "SET_FIELD", payload: { name: "end_time", value: formData.start_time } });
      }
      dispatch({ type: "SET_FIELD", payload: { name, value } });
    } else if (name === "end_time") {
      if (formData.start_date === formData.end_date && value < formData.start_time) {
        alert("เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น");
        // Do not update state if the time is invalid
        return; // Stop the function here
      }
      // If the time is valid, proceed to update the state
      dispatch({ type: "SET_FIELD", payload: { name, value } });
    } else {
      dispatch({ type: "SET_FIELD", payload: { name, value } });
    }
  };

  const handleAddSpeaker = () => {
    if (speakerInput && !formData.speaker.includes(speakerInput)) {
      dispatch({ type: "ADD_SPEAKER", payload: speakerInput });
      setSpeakerInput("");
    }
  };

  const handleRemoveSpeaker = (speakerToRemove) => {
    dispatch({ type: "REMOVE_SPEAKER", payload: speakerToRemove });
  };

  const handleRemoveFile = (indexToRemove) => {
    dispatch({ type: "REMOVE_FILE", payload: indexToRemove });
  };

  const handleAudienceChange = (value) => {
    dispatch({ type: "TOGGLE_AUDIENCE", payload: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.speaker.length === 0) {
      alert("กรุณาระบุวิทยากรอย่างน้อย 1 คน");
      return;
    }
    const dataToSend = { ...formData };
    if (dataToSend.format === "ONLINE") {
      dataToSend.max_participants = 999;
    }
    onSubmit(dataToSend);
  };

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50">
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === 'edit'
            ? "แก้ไขห้องเรียน"
            : (mode === 'duplicate' || mode === 'fromRequest')
            ? "สร้างโดยแก้ไขจากข้อมูลเดิม"
            : "สร้างห้องเรียนใหม่"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Conditionally render Class ID for non-edit modes */}
          {mode !== 'edit' && (
            <div>
              <label className="block font-medium mb-1">Class ID</label>
              <input
                name="class_id"
                value={formData.class_id || ""}
                className="w-full border px-4 py-2 rounded bg-gray-100 font-bold"
                disabled
              />
            </div>
          )}

          <div>
            <label className="block font-medium mb-1">ชื่อวิชา</label>
            <input
              name="title"
              value={formData.title || ""}
              onChange={handleChange}
              className="w-full border px-4 py-2 rounded"
              maxLength="255"
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
                ref={startDateRef}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded"
                onClick={() => startDateRef.current?.showPicker?.()}
                min={getTodayString()}
                onKeyDown={(e) => e.preventDefault()}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">เวลา</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time || ""}
                ref={startTimeRef}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded"
                onClick={() => startTimeRef.current?.showPicker?.()}
                min={
                  formData.start_date === getTodayString() ? getCurrentTimeString() : undefined
                }
                onKeyDown={(e) => e.preventDefault()}
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
                ref={endDateRef}
                onChange={handleChange}
                className="w-full border px-4 py-2 rounded disabled:bg-gray-100"
                min={formData.start_date}
                onClick={() => endDateRef.current?.showPicker?.()}
                disabled={!formData.start_time}
                onKeyDown={(e) => e.preventDefault()}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">เวลา</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time || ""}
                ref={endTimeRef}
                onChange={handleChange}
                min={
                  formData.start_date === formData.end_date
                    ? formData.start_time
                    : ""
                }
                className="w-full border px-4 py-2 rounded disabled:bg-gray-100"
                disabled={!formData.start_time}
                onClick={() => endTimeRef.current?.showPicker?.()}
                onKeyDown={(e) => e.preventDefault()}
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

          {formData.format === "ONSITE" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label
                htmlFor="max_participants"
                className="block font-medium sm:my-auto w-fit flex-shrink-0"
              >
                จำนวนผู้เข้าร่วมได้สูงสุด
              </label>
              <input
                type="number"
                min="1"
                id="max_participants"
                name="max_participants"
                value={formData.max_participants || "1"}
                onChange={handleChange}
                placeholder="ตั้งแต่ 1 ท่านขึ้นไป"
                className="w-24 border px-4 py-2 rounded"
                required
              />
              <span className="block font-medium my-auto w-fit">ท่าน</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <label className="block font-medium mr-3 flex-shrink-0">
              สถานภาพของผู้เรียน
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
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
            <input
              type="file"
              name="files"
              id="files"
              multiple
              onChange={handleChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />

            {formData.materials.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {formData.materials.map((file, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded"
                  >
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-pink-600 hover:text-red-800 text-xs font-bold"
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
              {mode === 'edit' ? "เปลี่ยนแปลง" : "สร้าง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassCreationModal;
