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