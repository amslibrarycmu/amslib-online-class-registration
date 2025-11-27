import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../contexts/AuthContext";

const StatusBadge = ({ status }) => {
  let statusText;
  let statusStyle;

  switch (status) {
    case "pending":
      statusText = "รอตรวจสอบ";
      statusStyle = "bg-yellow-100 text-yellow-800";
      break;
    case "approved":
      statusText = "อนุมัติ";
      statusStyle = "bg-green-100 text-green-800";
      break;
    case "rejected":
      statusText = "ไม่อนุมัติ";
      statusStyle = "bg-red-100 text-red-800";
      break;
    default:
      statusText = status;
      statusStyle = "bg-gray-100 text-gray-800";
  }

  return (
    <span
      className={`text-xs font-medium me-2 px-2.5 py-0.5 rounded-full ${statusStyle}`}
    >
      {statusText}
    </span>
  );
};

const ReasonModal = ({ isOpen, onClose, reason }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            เหตุผลที่ไม่อนุมัติ
          </h3>
          <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-md border">
            {reason}
          </p>
        </div>
        <div className="bg-gray-100 px-4 py-3 sm:px-6 flex flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const ClassRequest = () => {
  const { user, authFetch } = useAuth();
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [format, setFormat] = useState("ONLINE");
  const [speaker, setSpeaker] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isViewing, setIsViewing] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  // --- 🟢 START: New states for topic dropdown ---
  const [classTitles, setClassTitles] = useState([]);
  const [otherTopic, setOtherTopic] = useState("");
  // --- 🟢 END: New states ---
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");

  const startDateRef = useRef(null);
  const startTimeRef = useRef(null);
  const endDateRef = useRef(null);
  const endTimeRef = useRef(null);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const getCurrentTimeString = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  // --- 🟢 START: Fetch unique class titles ---
  useEffect(() => {
    const fetchTitles = async () => {
      try {
        const response = await authFetch(`http://localhost:5000/api/classes/unique-titles`);
        if (response.ok) {
          const data = await response.json();
          setClassTitles(data);
        }
      } catch (error) {
        console.error("Error fetching class titles:", error);
      }
    };
    fetchTitles();
  }, [authFetch]);
  // --- 🟢 END: Fetch unique class titles ---

  const fetchRequests = async () => {
    if (!user || !user.email) {
      setMyRequests([]);
      setLoadingRequests(false);
      return;
    }
    setLoadingRequests(true);
    try {
      const response = await authFetch(`http://localhost:5000/api/requests`);
      if (!response.ok) {
        throw new Error("Failed to fetch class requests.");
      }
      const data = await response.json();
      setMyRequests(data);
    } catch (error) {
      console.error("Error fetching class requests:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลคำขอคลาสเรียน");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]); // Refetch when user changes

  const resetForm = () => {
    setTopic("");
    setReason("");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setFormat("ONLINE");
    setSpeaker("");
    setIsViewing(false);
    setOtherTopic(""); // Reset other topic field
    setEditingRequestId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = {
      title: topic,
      reason: reason,
      startDate,
      endDate,
      startTime,
      endTime,
      format,
      speaker,
    };

    // --- 🟢 START: Logic to handle "Other" topic ---
    if (topic === "other") {
      if (!otherTopic.trim()) {
        alert("กรุณาระบุหัวข้อที่สนใจในช่อง 'อื่นๆ'");
        return;
      }
      formData.title = otherTopic;
    }
    // --- 🟢 END: Logic to handle "Other" topic ---

    const isEditing = !!editingRequestId;
    const url = isEditing
      ? `http://localhost:5000/api/requests/${editingRequestId}`
      : "http://localhost:5000/api/requests";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await authFetch(url, {
        method: method,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${isEditing ? "update" : "submit"} class request.`
        );
      }

      alert(
        isEditing
          ? "อัปเดตคำขอสำเร็จแล้ว"
          : "ขอบคุณสำหรับข้อเสนอแนะ เราจะนำไปพิจารณาต่อไป"
      );
      resetForm();
      fetchRequests();
    } catch (error) {
      console.error("Error submitting class request:", error);
      alert(`เกิดข้อผิดพลาดในการส่งคำขอ: ${error.message}`);
    }
  };

  const handleDeleteRequest = async (request_id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคำขอนี้?")) {
      return;
    }

    try {
      const response = await authFetch(
        `http://localhost:5000/api/requests/${request_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete class request.");
      }

      alert("ลบคำขอสำเร็จแล้ว");
      fetchRequests(); // Refetch requests to update the list
      resetForm(); // Clear the form after deletion
    } catch (error) {
      console.error("Error deleting class request:", error);
      alert(`เกิดข้อผิดพลาดในการลบคำขอ: ${error.message}`);
    }
  };

  const handleRequestClick = (request) => {
    // Helper to format date to YYYY-MM-DD for the input
    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        return new Date(dateString).toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    };

    // --- 🟢 START: Logic to correctly display "Other" topic ---
    if (classTitles.includes(request.title)) {
      setTopic(request.title || "");
      setOtherTopic("");
    } else {
      setTopic("other");
      setOtherTopic(request.title || "");
    }
    // --- 🟢 END: Logic to correctly display "Other" topic ---
    setReason(request.reason || "");
    setStartDate(formatDate(request.start_date));
    setEndDate(formatDate(request.end_date));
    setStartTime(request.start_time || "");
    setEndTime(request.end_time || "");
    setFormat(request.format || "ONLINE");
    setSpeaker(request.speaker || "");
    setIsViewing(true);
  };

  const handleEditRequestClick = (request) => {
    const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
        return new Date(dateString).toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    };

    // --- 🟢 START: Logic to correctly display "Other" topic for editing ---
    if (classTitles.includes(request.title)) {
      setTopic(request.title || "");
      setOtherTopic("");
    } else {
      setTopic("other");
      setOtherTopic(request.title || "");
    }
    // --- 🟢 END: Logic to correctly display "Other" topic for editing ---
    setReason(request.reason || "");
    setStartDate(formatDate(request.start_date));
    setEndDate(formatDate(request.end_date));
    setStartTime(request.start_time || "");
    setEndTime(request.end_time || "");
    setFormat(request.format || "ONLINE");
    setSpeaker(request.suggested_speaker || "");
    setEditingRequestId(request.request_id);
    setIsViewing(false); // Ensure form is editable
  };

  const handleViewReason = (reason) => {
    setSelectedRejectionReason(reason);
    setIsReasonModalOpen(true);
  };

  const handleCloseReasonModal = () => {
    setIsReasonModalOpen(false);
    setSelectedRejectionReason("");
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    // If the new start date is after the current end date, update the end date as well.
    if (newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  };

  const handleStartTimeChange = (e) => {
    const newStartTime = e.target.value;
    // Validation: Prevent selecting a past time on the current day
    if (startDate === getTodayString() && newStartTime < getCurrentTimeString()) {
      alert("ไม่สามารถเลือกเวลาในอดีตได้");
      return;
    }
    setStartTime(newStartTime);

    // Auto-calculate end time to be 1 hour after start time
    if (newStartTime) {
      const [hours, minutes] = newStartTime.split(":").map(Number);
      const newEndDate = new Date();
      newEndDate.setHours(hours + 1, minutes, 0);
      const endHours = newEndDate.getHours().toString().padStart(2, "0");
      const endMinutes = newEndDate.getMinutes().toString().padStart(2, "0");
      setEndTime(`${endHours}:${endMinutes}`);
      // Also ensure end date is at least the start date
      if (endDate < startDate) setEndDate(startDate);
    }
  };

  const handleEndTimeChange = (e) => {
    const newEndTime = e.target.value;
    if (startDate === endDate && startTime && newEndTime < startTime) {
      alert("เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น");
      return; // Prevent setting the invalid time
    }
    setEndTime(newEndTime);
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <ReasonModal
          isOpen={isReasonModalOpen}
          onClose={handleCloseReasonModal}
          reason={selectedRejectionReason}
        />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-6">
          ยื่นคำขอเปิดห้องเรียน
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/2 bg-white p-6 rounded-xl shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="topic"
                  className="block text-sm font-medium text-gray-700"
                >
                  เลือกหัวข้อที่สนใจ <span className="text-red-500">*</span>
                </label>
                <select
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  disabled={isViewing}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
                >
                  <option value="">-- กรุณาเลือก --</option>
                  {classTitles.map((title, index) => (
                    <option key={index} value={title}>{title}</option>
                  ))}
                  <option value="other">อื่นๆ (โปรดระบุ)</option>
                </select>
              </div>

              {topic === "other" && (
                <div>
                  <label htmlFor="other-topic" className="block text-sm font-medium text-gray-700">
                    ระบุหัวข้ออื่นๆ <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="other-topic" value={otherTopic} onChange={(e) => setOtherTopic(e.target.value)}
                    required disabled={isViewing}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    placeholder="เช่น การใช้งานโปรแกรม SPSS" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="start-date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    เริ่มวันที่ (ระบุเป็นปี ค.ศ.){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="date"
                      id="start-date"
                      ref={startDateRef}
                      value={startDate}
                      required
                      min={getTodayString()}
                      onClick={() => startDateRef.current?.showPicker?.()}
                      onChange={handleStartDateChange}
                      disabled={isViewing}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="start-time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    เริ่มเวลา
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="time"
                      id="start-time"
                      ref={startTimeRef}
                      value={startTime}
                      required
                      onClick={() => startTimeRef.current?.showPicker?.()}
                      onChange={handleStartTimeChange}
                      min={
                        startDate === getTodayString() ? getCurrentTimeString() : undefined
                      }
                      onKeyDown={(e) => e.preventDefault()}
                      disabled={isViewing}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ถึงวันที่ (ระบุเป็นปี ค.ศ.)
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="date"
                      id="end-date"
                      ref={endDateRef}
                      value={endDate}
                      required
                      min={startDate}
                      onKeyDown={(e) => e.preventDefault()}
                      onClick={() => endDateRef.current?.showPicker?.()}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={isViewing || !startDate}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="end-time"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ถึงเวลา <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="time"
                      id="end-time"
                      ref={endTimeRef}
                      value={endTime}
                      required
                      min={
                        startDate === endDate ? startTime : undefined
                      }
                      onClick={() => endTimeRef.current?.showPicker?.()}
                      onChange={handleEndTimeChange}
                      disabled={isViewing || !startTime}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="format"
                  className="block text-sm font-medium text-gray-700"
                >
                  รูปแบบการเรียน <span className="text-red-500">*</span>
                </label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  required
                  disabled={isViewing}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="ONSITE">ONSITE</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="speaker"
                  className="block text-sm font-medium text-gray-700"
                >
                  วิทยากรที่แนะนำ (ถ้ามี)
                </label>
                <input
                  type="text"
                  id="speaker"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  disabled={isViewing}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700"
                >
                  เหตุผลที่ต้องการให้เปิดห้องเรียนดังกล่าว
                </label>
                <textarea
                  id="reason"
                  rows="4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isViewing}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                ></textarea>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                {isViewing ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    เลิกดู
                  </button>
                ) : (
                  <>
                    {editingRequestId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 focus:outline-none"
                      >
                        ยกเลิกการแก้ไข
                      </button>
                    )}
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      {editingRequestId ? "อัปเดตและส่งใหม่" : "ส่งแบบฟอร์ม"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="p-4 rounded-lg shadow-md bg-gray-50 mb-4">
              <h2 className="text-xl font-bold text-gray-800 text-center">
                ประวัติคำขอของคุณ
              </h2>
            </div>
            {loadingRequests ? (
              <p className="text-center">กำลังโหลดคำขอ...</p>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-700">
                  ไม่พบคำขอ
                </h3>
                <p className="text-gray-500 mt-2">
                  คุณยังไม่ได้ยื่นคำขอเปิดห้องเรียน
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => {
                  return (
                    <div
                      key={request.request_id}
                      className="p-4 rounded-lg shadow-md bg-white border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-purple-700">
                          {request.title}
                        </h3>
                        <div className="flex items-center">
                          <StatusBadge status={request.status} />
                          {request.status === "rejected" && // Check if the request was rejected
                            request.admin_comment && ( // Use admin_comment instead of rejection_reason
                              <button
                                onClick={() =>
                                  handleViewReason(request.admin_comment)
                                }
                                className="text-orange-500 hover:text-gray-700 rounded-full transition-colors"
                                style={{ padding: "0" }}
                                title="ดูเหตุผลที่ไม่อนุมัติ"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        ส่งเมื่อ{" "}
                        {new Date(request.updated_at).toLocaleString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )} น.
                      </p>
                      <div className="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleRequestClick(request)}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded-full transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path
                              fillRule="evenodd"
                              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {request.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleEditRequestClick(request)}
                              className="text-black hover:text-yellow-800 p-1 rounded-full transition-colors"
                              title="แก้ไขคำขอ"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path
                                  fillRule="evenodd"
                                  d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteRequest(request.request_id)
                              }
                              className="text-red-500 hover:text-red-700 p-1 rounded-full transition-colors"
                              title="ลบคำขอ"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassRequest;
