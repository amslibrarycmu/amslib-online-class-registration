import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import DemographicsPieChart from "../components/DemographicsPieChart";

const Statistics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [searchTerm, setSearchTerm] = useState(""); // State for input field value
  const [triggerSearchTerm, setTriggerSearchTerm] = useState(""); // State to trigger search

  const [expandedClassId, setExpandedClassId] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2021 },
    (_, i) => currentYear - i
  );

  const months = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  useEffect(() => {
    if (user && user.status === "ผู้ดูแลระบบ") {
      setLoading(true);
      const url = new URL(
        "http://localhost:5000/api/statistics/class-demographics"
      );
      url.searchParams.append("year", selectedYear);
      url.searchParams.append("month", selectedMonth);

      fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setStats(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching statistics:", err);
          setLoading(false);
        });
    } else if (user) {
      navigate("/login");
    }
  }, [user, navigate, selectedYear, selectedMonth]);

  // Function to handle search button click
  const handleSearch = () => {
    setTriggerSearchTerm(searchTerm);
  };

  // Filter stats based on triggerSearchTerm
  const filteredStats = useMemo(() => {
    if (!triggerSearchTerm) {
      return stats;
    }
    const lowerCaseSearchTerm = triggerSearchTerm.toLowerCase();
    return stats.filter(
      (classStat) =>
        classStat.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        classStat.class_id.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [stats, triggerSearchTerm]); // Dependency changed to triggerSearchTerm

  // Calculate total participants from filteredStats
  const totalParticipants = useMemo(() => {
    let total = 0;
    filteredStats.forEach((classStat) => {
      for (const status in classStat.demographics) {
        total += classStat.demographics[status];
      }
    });
    return total;
  }, [filteredStats]);

  // Calculate aggregated demographics from filteredStats
  const aggregatedDemographics = useMemo(() => {
    const aggregated = {};
    filteredStats.forEach((classStat) => {
      for (const status in classStat.demographics) {
        if (aggregated[status]) {
          aggregated[status] += classStat.demographics[status];
        } else {
          aggregated[status] = classStat.demographics[status];
        }
      }
    });
    return aggregated;
  }, [filteredStats]);

  if (!user || user.status !== "ผู้ดูแลระบบ") {
    return <p>Loading...</p>;
  }

  const handleToggleExpand = (classId) => {
    setExpandedClassId(expandedClassId === classId ? null : classId);
  };

  return (
    <div className="flex h-screen w-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
          สถิติ
        </h1>

        {/* Filter UI */}
        <div className="flex gap-y-2 mb-8 p-4 rounded-lg shadow flex-col relative">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xl font-bold">
                ตั้งค่าการกรองข้อมูลได้ที่นี่
              </span>
              <div className="flex flex-row gap-x-5 mt-2">
                <span className="flex flex-row items-center gap-x-2">
                  <label
                    htmlFor="year-filter"
                    className="block text-md font-medium text-gray-700"
                  >
                    ปี:
                  </label>
                  <select
                    id="year-filter"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="block w-full text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">ทั้งหมด</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="flex flex-row items-center gap-x-2">
                  <label
                    htmlFor="month-filter"
                    className="block text-md font-medium text-gray-700"
                  >
                    เดือน:
                  </label>
                  <select
                    id="month-filter"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className=" block w-full text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">ทั้งหมด</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-x-2">
              <input
                type="text"
                placeholder="ค้นหาจาก Class ID หรือชื่อ"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-64 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                ค้นหา
              </button>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-lg font-semibold">
              จำนวนผู้เข้าร่วมทั้งหมด {totalParticipants} คน
            </span>
          </div>

          {Object.keys(aggregatedDemographics).length > 0 && (
            <div>
              <div className="flex flex-col lg:flex-row lg:justify-around items-center gap-4">
                <div className="relative h-80 w-full lg:w-1/2 min-w-[300px]">
                  <DemographicsPieChart demographics={aggregatedDemographics} />
                </div>

                <div className="relative h-80 w-full lg:w-1/2 min-w-[300px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                  <p>พื้นที่สำหรับแผนภูมิแท่ง</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow mt-8">
          <h2 className="text-xl font-bold mb-4">สถิติโดยแยกตามห้องเรียน</h2>
          <div>
            {loading ? (
              <p>กำลังโหลดข้อมูลสถิติ...</p>
            ) : (
              <div className="space-y-4">
                {filteredStats.length > 0 ? (
                  filteredStats.map((classStat) => (
                    <div
                      key={classStat.class_id}
                      className="bg-gray-50 p-4 rounded-lg shadow cursor-pointer transition-all duration-300 ease-in-out"
                      onClick={() => handleToggleExpand(classStat.class_id)}
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold pb-2">
                          <span className="text-red-500">
                            {classStat.class_id}{" "}
                          </span>
                          <span className="text-purple-800">
                            {classStat.title}
                          </span>
                          <p className="text-sm text-gray-600 mt-2">
                            เปิดเมื่อ{" "}
                            {new Date(classStat.start_date).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </h2>

                        <span>
                          {expandedClassId === classStat.class_id ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          )}
                        </span>
                      </div>

                      {expandedClassId === classStat.class_id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {Object.keys(classStat.demographics).length > 0 ? (
                            <div className="flex flex-col lg:flex-row lg:justify-around gap-4">
                              <div className="flex flex-col gap-y-4 relative h-70 w-full lg:w-1/2 min-w-[300px]">
                                <span className="text-lg font-semibold">
                                  จำนวนผู้เข้าร่วมทั้งหมด {totalParticipants} คน
                                </span>
                                <DemographicsPieChart
                                  demographics={classStat.demographics}
                                />
                              </div>
                              <div className="relative h-70 w-full lg:w-1/2 min-w-[300px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                                <p>พื้นที่สำหรับแผนภูมิแท่ง</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500">
                              ยังไม่มีผู้ลงทะเบียนในห้องเรียนนี้
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>ไม่พบข้อมูลเนื่องจากไม่มีห้องเรียนในช่วงเวลาที่คุณเลือก</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
