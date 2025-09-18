import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const StatusBadge = ({ status }) => {
  let statusText;
  let statusStyle;

  switch (status) {
    case "pending":
      statusText = "รอ";
      statusStyle = "bg-orange-400";
      break;
    case "approved":
      statusText = "อนุมัติ";
      statusStyle = "bg-green-600";
      break;
    case "rejected":
      statusText = "ไม่อนุมัติ";
      statusStyle = "bg-red-600";
      break;
    default:
      statusText = status;
      statusStyle = "bg-gray-500";
  }

  return <span className={`font-bold uppercase text-sm text-white px-3 py-1 rounded-full ${statusStyle}`}>{statusText}</span>;
};

const AdminClassRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.status !== "ผู้ดูแลระบบ") {
      navigate("/"); // Redirect non-admins to home or another appropriate page
      return;
    }

    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/admin/class-requests", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching class requests:", err);
      setError("ไม่สามารถดึงข้อมูลคำขอห้องเรียนได้");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/class-requests/${requestId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Refresh the list of requests after action
      fetchRequests();
    } catch (err) {
      console.error(`Error ${action}ing class request:`, err);
      setError(`ไม่สามารถ${action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}คำขอได้`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center">
          <p className="text-md text-black">กำลังโหลดคำขอห้องเรียน...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen">
        <Sidebar />
        <div className="flex-1 p-8 bg-gray-100 flex items-center justify-center text-red-500">
          <p className="text-md text-black">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          จัดการคำขอ
        </h1>

        <div className="bg-white p-6 rounded-lg shadow-md">
          {requests.length === 0 ? (
            <p className="text-center text-md text-black">ไม่มีคำขอสร้างห้องเรียนในขณะนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-lg font-bold text-black uppercase tracking-wider">
                      ชื่อห้องเรียน
                    </th>
                    <th className="px-6 py-3 text-left text-lg font-bold text-black uppercase tracking-wider">
                      ผู้ขอ
                    </th>
                    <th className="px-6 py-3 text-left text-lg font-bold text-black uppercase tracking-wider">
                      วันที่ขอ
                    </th>
                    <th className="px-6 py-3 text-left text-lg font-bold text-black uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-lg font-bold text-black uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.request_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        {request.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        {request.requested_by_name} ({request.requested_by_email})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        {new Date(request.request_date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md font-medium">
                        {request.status === "pending" && (
                          <div className="flex items-center space-x-4">
                            <span
                              onClick={() => handleAction(request.request_id, "approve")}
                              className="text-green-600 hover:text-green-800 cursor-pointer"
                              title="อนุมัติ"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span
                              onClick={() => handleAction(request.request_id, "reject")}
                              className="text-red-600 hover:text-red-800 cursor-pointer"
                              title="ปฏิเสธ"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          </div>
                        )}
                        {request.status !== "pending" && (
                          <span className="text-gray-400">ดำเนินการแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClassRequests;