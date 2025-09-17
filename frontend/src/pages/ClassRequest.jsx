import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../contexts/AuthContext";

const ClassRequest = () => {
  const { user } = useAuth();
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

  const fetchRequests = async () => {
    if (!user || !user.email) {
      setMyRequests([]);
      setLoadingRequests(false);
      return;
    }
    setLoadingRequests(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/requests?user_email=${user.email}`
      );
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
    fetchRequests();
  }, [user]); // Refetch when user changes

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = {
      title: topic,
      reason,
      startDate,
      endDate,
      startTime,
      endTime,
      format,
      speaker,
      requestedBy: user.email,
    };

    try {
      const response = await fetch("http://localhost:5000/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit class request.");
      }

      alert("ขอบคุณสำหรับข้อเสนอแนะ! เราจะนำไปพิจารณาต่อไป");
      // Reset form
      setTopic("");
      setReason("");
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setFormat("ONLINE");
      setSpeaker("");
      fetchRequests(); // Refetch requests after successful submission
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
      const response = await fetch(
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
    } catch (error) {
      console.error("Error deleting class request:", error);
      alert(`เกิดข้อผิดพลาดในการลบคำขอ: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center lg:text-center mb-6">
          เสนอแนะห้องเรียน
        </h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/2 bg-white p-8 rounded-lg shadow-md">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="topic"
                  className="block text-md font-medium text-black"
                >
                  หัวข้อที่สนใจ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="block text-md font-medium text-black"
                >
                  เหตุผลที่ต้องการให้เปิดห้องเรียนดังกล่าว
                </label>
                <textarea
                  id="reason"
                  rows="4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="start-date"
                    className="block text-md font-medium text-black"
                  >
                    เริ่มวันที่
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
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
                    htmlFor="end-date"
                    className="block text-md font-medium text-black"
                  >
                    ถึงวันที่
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="start-time"
                    className="block text-md font-medium text-black"
                  >
                    เริ่มเวลา
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="time"
                      id="start-time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
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
                    htmlFor="end-time"
                    className="block text-md font-medium text-black"
                  >
                    ถึงเวลา
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="time"
                      id="end-time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
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
                  className="block text-md font-medium text-black"
                >
                  รูปแบบการเรียน
                </label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="ONSITE">ONSITE</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="speaker"
                  className="block text-md font-medium text-black"
                >
                  วิทยากรที่แนะนำ (ถ้ามี)
                </label>
                <input
                  type="text"
                  id="speaker"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-md"
                />
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-md font-medium rounded-md text-white bg-purple-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  ส่งแบบฟอร์ม
                </button>
              </div>
            </form>
          </div>
          <div className="w-full lg:w-1/2 px-4 h-fit overflow-y-auto">
            {loadingRequests ? (
              <p className="text-center">กำลังโหลดคำขอ...</p>
            ) : myRequests.length === 0 ? (
              <p className="text-center">คุณยังไม่มีคำขอห้องเรียน</p>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => {
                  let statusText;
                  let statusStyle;
                  
                  // สร้างเงื่อนไขตาม status
                  switch (request.status) {
                    case "pending":
                      statusText = "รอ";
                      statusStyle =
                        "font-bold uppercase text-xl text-white bg-orange-400 px-4 py-1 rounded-3xl h-full";
                      break;
                    case "accepted":
                      statusText = "อนุมัติ";
                      statusStyle =
                        "font-bold uppercase text-xl text-white bg-green-600 px-4 py-1 rounded-3xl h-full";
                      break;
                    case "rejected":
                      statusText = "ไม่อนุมัติ";
                      statusStyle =
                        "font-bold uppercase text-xl text-white bg-red-600 px-4 py-1 rounded-3xl h-full";
                      break;
                    default:
                      statusText = request.status;
                      statusStyle =
                        "font-bold uppercase text-xl text-white bg-gray-500 px-4 py-1 rounded-3xl w-[115px] h-full";
                      break;
                  }

                  return (
                    <div
                      key={request.request_id}
                      className="p-4 rounded-md shadow-lg bg-gray-50 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-semibold text-purple-600">
                          {request.title}
                        </h3>
                        <p className="text-sm ml-auto">
                          <span className={statusStyle}>{statusText}</span>
                        </p>
                      </div>
                      <p className="text-sm mb-1 font-bold">
                        {new Date(request.start_date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date(request.end_date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        เวลา{" "}
                        {new Date(`2000-01-01T${request.start_time}`).toLocaleTimeString(
                          "th-TH",
                          { hour: "2-digit", minute: "2-digit", hour12: false }
                        )}{" "}
                        -{" "}
                        {new Date(`2000-01-01T${request.end_time}`).toLocaleTimeString(
                          "th-TH",
                          { hour: "2-digit", minute: "2-digit", hour12: false }
                        )}{" "}
                        น.
                      </p>
                      <p className="text-sm mb-1">
                        ส่งเมื่อ{" "}
                        {new Date(request.request_date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <div className="flex justify-end items-center mt-2">
                        <div className="w-24 ">                  
                        </div>
                        <button
                          onClick={() => handleDeleteRequest(request.request_id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          ลบ
                        </button>
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