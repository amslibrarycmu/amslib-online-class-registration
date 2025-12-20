import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import UserDetailsModal from "../components/UserDetailsModal";
import ProcessingOverlay from "../components/ProcessingOverlay";

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

  return (
    <span
      className={`font-bold uppercase text-sm text-white px-3 py-1 rounded-full ${statusStyle}`}
    >
      {statusText}
    </span>
  );
};

const RequestDetailModal = ({ request, onClose }) => {
  if (!request) return null;

  const detailItem = (label, value) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
        {value || "-"}
      </dd>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center w-full">
              รายละเอียดคำขอ
            </h2>
          </div>

          <dl className="divide-y divide-gray-200">
            {detailItem("หัวข้อ", request.title)}
            {detailItem(
              "เหตุผล",
              <p className="whitespace-pre-wrap">{request.reason}</p>
            )}
            {detailItem(
              "ผู้ขอ",
              `${request.requested_by_name} (${request.requested_by_email})`
            )}
            {detailItem(
              "วันที่ขอ",
              new Date(request.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            )}
            {detailItem(
              "วันที่เสนอ",
              request.start_date
                ? `${new Date(request.start_date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} - ${new Date(request.end_date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}`
                : "-"
            )}
            {detailItem(
              "เวลาที่เสนอ",
              request.start_time
                ? `${request.start_time.substring(
                    0,
                    5
                  )} - ${request.end_time.substring(0, 5)} น.`
                : "-"
            )}
            {detailItem("รูปแบบ", request.format)}
            {detailItem("วิทยากรที่แนะนำ", request.speaker)}
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <StatusBadge status={request.status} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewReasonModal = ({ isOpen, onClose, reason }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
            เหตุผลที่ไม่อนุมัติ
          </h3>
          <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
            {reason}
          </p>
        </div>
        <div className="bg-gray-100 px-4 py-3 sm:px-6 flex flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-800 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectionReasonModal = ({
  isOpen,
  onClose,
  onSubmit,
  reason,
  setReason,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-bold text-black text-center mb-4">
              ระบุเหตุผลที่ปฏิเสธคำขอ
            </h3>
            <textarea
              rows="4"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="กรุณาระบุเหตุผล..."
              required
            ></textarea>
          </div>
          <div className="bg-gray-100 px-4 py-3 sm:px-6 flex flex-row-reverse rounded-b-lg">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:bg-red-300"
            >
              {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันการปฏิเสธ"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminClassRequests = () => {
  const { user, activeRole, isSwitchingRole, authFetch } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pending"); // 'all', 'pending', 'approved', 'rejected'
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonToView, setReasonToView] = useState(null);
  const [isViewReasonModalOpen, setIsViewReasonModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userToView, setUserToView] = useState(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  useEffect(() => {
    // Redirect non-admins, but not during a role switch.
    if (user && activeRole && activeRole !== "ผู้ดูแลระบบ" && !isSwitchingRole) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      navigate("/");
    }
  }, [user, activeRole, navigate, isSwitchingRole]);

  useEffect(() => {
    fetchRequests();
  }, []); // Run once on component mount


  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`http://localhost:5000/api/admin/class-requests`);
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
    if (action === "reject") {
      setRequestToReject(requestId);
      setRejectionReason(""); // Clear previous reason
      setIsRejectionModalOpen(true);
      return;
    }

    if (action === "approve" && !window.confirm(`คุณต้องการอนุมัติคำขอ "${requests.find(r => r.request_id === requestId)?.title}" หรือไม่?`)) {
      return;
    }

    // Handle approval directly
    setIsProcessing(true);
    try {
      const response = await authFetch(
        `http://localhost:5000/api/admin/class-requests/${requestId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "approve", admin_email: user.email }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchRequests();
      alert("อนุมัติคำขอสำเร็จแล้ว");
    } catch (err) {
      console.error(`Error ${action}ing class request:`, err);
      setError(
        `ไม่สามารถ${action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}คำขอได้`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    setIsSubmitting(true);
    setIsProcessing(true);
    try {
      const response = await authFetch(
        `http://localhost:5000/api/admin/class-requests/${requestToReject}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "reject",
            reason: rejectionReason,
            admin_email: user.email,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchRequests(); // Refresh list
      alert("ปฏิเสธคำขอสำเร็จแล้ว");
    } catch (err) {
      console.error(`Error rejecting class request:`, err);
      setError(`ไม่สามารถปฏิเสธคำขอได้`);
    } finally {
      setIsSubmitting(false);
      setIsRejectionModalOpen(false);
      setRejectionReason("");
      setRequestToReject(null);
    }
    setIsProcessing(false);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
  };

  const handleViewReason = (reason) => {
    setReasonToView(reason);
    setIsViewReasonModalOpen(true);
  };

  const handleViewUser = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await authFetch(`http://localhost:5000/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
      }
      const userData = await response.json();
      setUserToView(userData);
      setIsUserDetailModalOpen(true);
    } catch (error) {
      alert("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") {
      return requests;
    }
    return requests.filter((req) => req.status === filterStatus);
  }, [requests, filterStatus]);

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
    <div className="flex h-screen w-screen flex-col lg:flex-row">
      {isProcessing && <ProcessingOverlay />}
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 text-center">
          ตรวจสอบคำขอ
        </h1>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <RejectionReasonModal
            isOpen={isRejectionModalOpen}
            onClose={() => setIsRejectionModalOpen(false)}
            onSubmit={handleRejectSubmit}
            reason={rejectionReason}
            setReason={setRejectionReason}
            isSubmitting={isSubmitting}
          />
          <ViewReasonModal
            isOpen={isViewReasonModalOpen}
            onClose={() => setIsViewReasonModalOpen(false)}
            reason={reasonToView}
          />
          {userToView && (
            <UserDetailsModal
              isOpen={isUserDetailModalOpen}
              onClose={() => setIsUserDetailModalOpen(false)}
              user={userToView}
            />
          )}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex flex-wrap space-x-8 gap-y-4" aria-label="Tabs">
              <button onClick={() => setFilterStatus("all")} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filterStatus === "all" ? "border-purple-500 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                ทั้งหมด
              </button>
              <button onClick={() => setFilterStatus("pending")} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filterStatus === "pending" ? "border-purple-500 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                รอตรวจสอบ
              </button>
              <button onClick={() => setFilterStatus("approved")} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filterStatus === "approved" ? "border-purple-500 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                อนุมัติแล้ว
              </button>
              <button onClick={() => setFilterStatus("rejected")} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none ${filterStatus === "rejected" ? "border-purple-500 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                ไม่อนุมัติ
              </button>
            </nav>
          </div>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-center text-md text-gray-500 mt-4">
                ไม่มีคำขอในสถานะนี้
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อห้องเรียน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ขอ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ขอ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.request_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black ">
                        <span
                          onClick={() => handleViewDetails(request)}
                          className="cursor-pointer hover:underline text-purple-700 font-semibold"
                        >
                          {request.title}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        <span
                          onClick={() => handleViewUser(request.requested_by_id)}
                          className="cursor-pointer hover:underline text-blue-600"
                        >
                          {request.requested_by_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black">
                        {new Date(request.created_at).toLocaleDateString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md text-black align-top">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={request.status} />
                          {request.status === "rejected" &&
                            request.rejection_reason && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReason(request.rejection_reason)
                                }}
                                className="text-blue-500 hover:text-blue-700 p-1 rounded-full transition-colors"
                                title="ดูเหตุผลที่ไม่อนุมัติ"
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
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-md font-medium">
                        {request.status === "pending" && (
                          <div className="flex items-center space-x-4">
                            <span
                              onClick={() =>
                                handleAction(request.request_id, "approve")
                              }
                              className="text-green-600 hover:text-green-800 cursor-pointer"
                              title="อนุมัติ"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                            <span
                              onClick={() =>
                                handleAction(request.request_id, "reject")
                              }
                              className="text-red-600 hover:text-red-800 cursor-pointer"
                              title="ปฏิเสธ"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </span>
                          </div>
                        )}
                        {request.status !== "pending" && (
                          <div className="text-xs text-gray-500">
                            {request.action_by_name ? (
                              <p>โดย: <span 
                                  onClick={() => handleViewUser(request.action_by_id)}
                                  className="cursor-pointer hover:underline text-blue-600"
                                >
                                  {request.action_by_name}
                                </span></p>
                            ) : <p>โดย: N/A</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Mobile View */}
          {filteredRequests.length > 0 && (
            <div className="block lg:hidden space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="border border-gray-200 rounded-lg p-4 shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      onClick={() => handleViewDetails(request)}
                      className="font-semibold text-lg text-purple-800 break-words pr-2 cursor-pointer hover:underline"
                    >
                      {request.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={request.status} />
                      {request.status === "rejected" &&
                        request.rejection_reason && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReason(request.rejection_reason)
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1 rounded-full transition-colors"
                            title="ดูเหตุผลที่ไม่อนุมัติ"
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
                        )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>ผู้ขอ:</strong> {request.requested_by_name}
                    </p>
                    <p>
                      <strong>อีเมล:</strong> {request.requested_by_email}
                    </p>
                    <p>
                      <strong>วันที่ขอ:</strong>{" "}
                      {new Date(request.created_at).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex items-center justify-end space-x-4 mt-4 pt-4 border-t">
                      <button
                        onClick={() =>
                          handleAction(request.request_id, "approve")
                        }
                        className="flex items-center gap-1 bg-green-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-green-600 transition-colors"
                        title="อนุมัติ" // This button does not need focus:outline-none as it's a larger, primary action button.
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>อนุมัติ</span>
                      </button>
                      <button
                        onClick={() =>
                          handleAction(request.request_id, "reject")
                        }
                        className="flex items-center gap-1 bg-red-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-red-600 transition-colors"
                        title="ปฏิเสธ" // This button also does not need it.
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span>ปฏิเสธ</span>
                      </button>
                    </div>
                  )}
                  {request.status !== "pending" && (
                    <div className="text-right mt-4 pt-4 border-t">
                      {request.action_by_name ? (
                        <p className="text-sm text-gray-500 italic">
                          ดำเนินการโดย: <span
                            onClick={() => handleViewUser(request.action_by_id)}
                            className="cursor-pointer hover:underline text-blue-600 not-italic"
                          >
                            {request.action_by_name}
                          </span></p>
                      ) : <p className="text-sm text-gray-500 italic">ดำเนินการโดย: N/A</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      </div>
    </div>
  );
};

export default AdminClassRequests;
