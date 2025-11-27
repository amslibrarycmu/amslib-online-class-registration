import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";
import DemographicsPieChart from "../components/DemographicsPieChart";
import CategoryBarChart from "../components/CategoryBarChart";
import { useStatisticsData } from "../components/UseStatisticsData";
import StatisticsFilterModal from "../components/StatisticsFilterModal";

const Statistics = () => {
  const { user, activeRole, isSwitchingRole } = useAuth();
  const navigate = useNavigate();

  // --- State สำหรับการกรองแบบใหม่ ---
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, yearly, monthly, range
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roles, setRoles] = useState([]); // State for roles filter
  // ------------------------------------

  const [searchTerm, setSearchTerm] = useState("");
  const [triggerSearchTerm, setTriggerSearchTerm] = useState("");

  const [sortKey, setSortKey] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("desc"); // Default to descending for newest classes first

  // --- แก้ไข: ใช้ useMemo เพื่อป้องกันการสร้าง object ใหม่ทุกครั้งที่ render ---
  const filters = useMemo(
    () => ({
      filterType,
      year,
      month,
      startDate,
      endDate,
      roles,
    }),
    [filterType, year, month, startDate, endDate, roles]
  );

  // --- เรียกใช้ Hook ด้วย Object ของ filters ที่ผ่านการ Memoize แล้ว ---
  const { stats, loading, error } = useStatisticsData(
    user,
    activeRole,
    filters
  );

  const [expandedClassIds, setExpandedClassIds] = useState([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 2021 + 1 },
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
    // Redirect non-admins, but not during a role switch.
    if (
      user &&
      activeRole &&
      activeRole !== "ผู้ดูแลระบบ" &&
      !isSwitchingRole
    ) {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      navigate("/");
    }
  }, [user, activeRole, navigate, isSwitchingRole]);

  const handleApplyFilters = (newFilters) => {
    setFilterType(newFilters.filterType);
    setYear(newFilters.year);
    setMonth(newFilters.month);
    setStartDate(newFilters.startDate);
    setEndDate(newFilters.endDate);
    setRoles(newFilters.roles || []);
  };

  const handleSearch = () => {
    setTriggerSearchTerm(searchTerm);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    const filtered = triggerSearchTerm
      ? stats.filter((classStat) => {
          const lowerCaseSearchTerm = triggerSearchTerm.toLowerCase();
          return (
            classStat.title.toLowerCase().includes(lowerCaseSearchTerm) ||
            classStat.class_id.toLowerCase().includes(lowerCaseSearchTerm)
          );
        })
      : stats;

    return filtered.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (sortKey === "start_date") {
        const dateA = new Date(a.start_date);
        const dateB = new Date(b.start_date);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      // Default numeric sort
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [stats, triggerSearchTerm, sortKey, sortOrder]);

  const totalParticipants = useMemo(() => {
    let total = 0;
    filteredAndSortedStats.forEach((classStat) => {
      for (const status in classStat.demographics) {
        total += classStat.demographics[status] || 0;
      }
    });
    return total;
  }, [filteredAndSortedStats]);

  const aggregatedDemographics = useMemo(() => {
    const aggregated = {};
    for (const classStat of filteredAndSortedStats) {
      for (const status in classStat.demographics) {
        aggregated[status] =
          (aggregated[status] || 0) + classStat.demographics[status];
      }
    }
    return aggregated;
  }, [filteredAndSortedStats]);

  const aggregatedEvaluationData = useMemo(() => {
    const scoreKeys = ["content", "material", "duration", "format", "speaker"];
    const totals = {};
    scoreKeys.forEach((key) => (totals[key] = 0));

    let totalEvaluations = 0;

    filteredAndSortedStats.forEach((classStat) => {
      if (classStat.total_evaluations > 0) {
        scoreKeys.forEach((key) => {
          totals[key] +=
            parseFloat(classStat[`avg_score_${key}`]) *
            classStat.total_evaluations;
        });
        totalEvaluations += classStat.total_evaluations;
      }
    });

    if (totalEvaluations === 0) return null;

    const result = {};
    for (const key of scoreKeys) {
      result[`avg_score_${key}`] = totals[key] / totalEvaluations;
    }
    return result;
  }, [filteredAndSortedStats]);

  const overallAverageScore = useMemo(() => {
    if (!aggregatedEvaluationData) {
      return 0;
    }
    const scores = Object.values(aggregatedEvaluationData);
    if (scores.length === 0) {
      return 0;
    }
    return scores.reduce((acc, score) => acc + score, 0) / scores.length;
  }, [aggregatedEvaluationData]);

  const renderActiveFilter = () => {
    switch (filterType) {
      case "yearly":
        return `ปี: ${parseInt(year, 10) + 543} (${year})`;
      case "monthly":
        const monthLabel = months.find((m) => m.value === month)?.label || "";
        return `เดือน: ${monthLabel} ${parseInt(year, 10) + 543} (${year})`;
      case 'range':
        const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString('th-TH', formatOptions) : '...';
        const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString('th-TH', formatOptions) : '...';
        if (startDate || endDate) {
          return `ช่วงวันที่: ${formattedStartDate} - ${formattedEndDate}`;
        }
        return "ช่วงวันที่ (ยังไม่สมบูรณ์)";
      case "all":
      default:
        // Show role filter status even when 'all' time filter is selected
        if (roles.length > 0) {
          return `สถานภาพ: ${roles.join(', ')}`;
        }
        return "ข้อมูลทั้งหมด";
    }
  };

  if (error) {
    return <p>Error loading data: {error.message}</p>;
  }

  if (!user || activeRole !== "ผู้ดูแลระบบ") {
    return <p>Loading...</p>;
  }

  const handleToggleExpand = (classId) => {
    setExpandedClassIds((prevIds) =>
      prevIds.includes(classId)
        ? prevIds.filter((id) => id !== classId)
        : [...prevIds, classId]
    );
  };

  const getSortIcon = (key) => {
    if (sortKey === key) {
      return sortOrder === "asc" ? "▲" : "▼";
    }
    return "";
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Class ID",
      "ชื่อห้องเรียน",
      "วันที่เปิดสอน",
      "จำนวนผู้ลงทะเบียน",
      "นักศึกษาปริญญาตรี (คน)",
      "นักศึกษาบัณฑิต (คน)",
      "อาจารย์/นักวิจัย (คน)",
      "บุคลากร (คน)",
      "จำนวนผู้ประเมิน",
      "คะแนนเนื้อหา (เฉลี่ย)",
      "คะแนนเอกสาร/สื่อ (เฉลี่ย)",
      "คะแนนระยะเวลา (เฉลี่ย)",
      "คะแนนรูปแบบ (เฉลี่ย)",
      "คะแนนวิทยากร (เฉลี่ย)",
    ];

    const demographicsKeys = [
      "นักศึกษาปริญญาตรี",
      "นักศึกษาบัณฑิต",
      "อาจารย์/นักวิจัย",
      "บุคลากร",
    ];
    const scoreKeys = ["content", "material", "duration", "format", "speaker"];

    const rows = filteredAndSortedStats.map((stat) => {
      const totalParticipants = Object.values(stat.demographics).reduce(
        (sum, count) => sum + count,
        0
      );
      const row = [
        stat.class_id,
        `"${stat.title.replace(/"/g, '""')}"`, // Escape double quotes
        new Date(stat.start_date).toLocaleDateString("th-TH"),
        totalParticipants,
        ...demographicsKeys.map((key) => stat.demographics[key] || 0),
        stat.total_evaluations,
        ...scoreKeys.map((key) =>
          stat[`avg_score_${key}`]
            ? parseFloat(stat[`avg_score_${key}`]).toFixed(2)
            : "N/A"
        ),
      ];
      return row.join(",");
    });

    // Add summary row
    const summaryRow = [
      "รวมทั้งหมด",
      "", // Empty for title
      "", // Empty for date
      totalParticipants,
      ...demographicsKeys.map((key) => aggregatedDemographics[key] || 0),
      filteredAndSortedStats.reduce(
        (sum, stat) => sum + stat.total_evaluations,
        0
      ),
      ...scoreKeys.map((key) =>
        aggregatedEvaluationData
          ? parseFloat(aggregatedEvaluationData[`avg_score_${key}`]).toFixed(2)
          : "N/A"
      ),
    ].join(",");

    const csvContent = [
      headers.join(","),
      ...rows,
      "", // Add a blank line for separation
      summaryRow,
    ].join("\n");

    // Create a Blob with BOM to ensure Excel opens UTF-8 correctly
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "statistics_export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen w-screen">
      <StatisticsFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="flex justify-center items-center gap-x-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            สถิติ
          </h1>
          <button
            onClick={handleDownloadCSV}
            className="p-2 text-gray-600  rounded-3xl shadow-md hover:bg-gray-100 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            title="ดาวน์โหลดข้อมูล (CSV)"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {/* Filters and Tools Card */}
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              {/* Left Side: Filter Info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>ตัวกรอง</span>
                </button>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">กำลังแสดง:</span>{" "}
                  {renderActiveFilter()}
                </div>
              </div>

              {/* Right Side: Search */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  id="search"
                  type="text"
                  placeholder="ระบุ Class ID หรือชื่อห้องเรียน"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full md:w-72 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="h-80 w-full lg:w-1/2 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-80 w-full lg:w-1/2 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            ) : Object.keys(aggregatedDemographics).length > 0 ? (
              <div className="flex flex-col lg:flex-row lg:justify-around items-center gap-4">
                <div className="relative h-80 w-full lg:w-1/2 min-w-[300px] flex-1">
                  <DemographicsPieChart demographics={aggregatedDemographics} />
                </div>
                <div className="relative h-80 w-full lg:w-1/2 min-w-[300px] flex-1">
                  {aggregatedEvaluationData ? (
                    <CategoryBarChart data={aggregatedEvaluationData} />
                  ) : (
                    <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                      <p>ไม่มีข้อมูลการประเมิน</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                <p>ไม่มีข้อมูลสำหรับแสดงผล</p>
              </div>
            )}
          </div>

          {/* Summary Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center">
              <h3 className="text-lg font-semibold text-gray-500 mb-2">
                จำนวนผู้เข้าเรียนทั้งหมด
              </h3>
              {loading ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-4xl font-bold text-indigo-600">
                  {totalParticipants}
                </p>
              )}
              <p className="text-gray-500 mt-1">คน</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center">
              <h3 className="text-lg font-semibold text-gray-500 mb-2">
                คะแนนเฉลี่ยรวม
              </h3>
              {loading ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-4xl font-bold text-teal-600">
                  {aggregatedEvaluationData
                    ? overallAverageScore.toFixed(2)
                    : "N/A"}
                </p>
              )}
              <p className="text-gray-500 mt-1">จาก 5</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center">
              <h3 className="text-lg font-semibold text-gray-500 mb-2">
                จบการสอนแล้ว
              </h3>
              {loading ? (
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-4xl font-bold text-amber-600">
                  {filteredAndSortedStats.length}
                </p>
              )}
              <p className="text-gray-500 mt-1">ห้อง</p>
            </div>
          </div>
        </div>

        {/* Class List Card */}
        <div className="bg-white p-6 rounded-xl shadow-md mt-8">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-800">
              สถิติรายห้องเรียน
            </h2>
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-by"
                className="text-sm font-medium text-gray-700"
              >
                เรียงตาม:
              </label>
              <select
                id="sort-by"
                value={sortKey}
                onChange={(e) => handleSort(e.target.value)}
                className="block w-auto text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="start_date">วันที่เปิดสอน</option>
                <option value="class_id">Class ID</option>
                <option value="title">ชื่อห้องเรียน</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                title="สลับทิศทางการเรียง"
              >
                {sortOrder === "asc" ? "▲" : "▼"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-50 p-4 rounded-lg animate-pulse"
                >
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : filteredAndSortedStats.length > 0 ? (
              filteredAndSortedStats.map((classStat) => (
                <div
                  key={classStat.class_id}
                  className="border-gray-200 rounded-lg shadow overflow-hidden mb-2"
                >
                  <div
                    className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleToggleExpand(classStat.class_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-purple-800">
                          <span className="text-red-500 pr-1">
                            {classStat.class_id}
                          </span>{" "}
                          {classStat.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          เปิดเมื่อ{" "}
                          {new Date(classStat.start_date).toLocaleDateString(
                            "th-TH",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </p>
                      </div>
                      <span
                        className={`transform transition-transform duration-300 ${
                          expandedClassIds.includes(classStat.class_id)
                            ? "rotate-180"
                            : ""
                        }`}
                      >
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
                      </span>
                    </div>
                  </div>
                  {expandedClassIds.includes(classStat.class_id) && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      {Object.keys(classStat.demographics).length > 0 ? (
                        <div className="flex flex-col lg:flex-row lg:justify-around gap-4">
                          <div className="flex flex-col gap-y-2 relative h-70 w-full lg:w-1/2 min-w-[300px]">
                            <span className="text-lg font-semibold">
                              จำนวนของผู้เข้าเรียน คือ{" "}
                              {Object.values(classStat.demographics).reduce(
                                (sum, count) => sum + count,
                                0
                              )}{" "}
                              คน
                            </span>
                            <DemographicsPieChart
                              demographics={classStat.demographics}
                            />
                          </div>
                          <div className="relative h-70 w-full lg:w-1/2 min-w-[300px]">
                            {classStat.total_evaluations > 0 ? (
                              <CategoryBarChart data={classStat} />
                            ) : (
                              <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                                <p>ยังไม่มีผู้ประเมิน</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          ยังไม่มีผู้ลงทะเบียนในห้องเรียนนี้
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                ไม่พบข้อมูลห้องเรียนตามตัวกรองที่เลือก
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
