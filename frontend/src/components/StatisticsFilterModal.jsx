import React, { useState, useEffect, useRef } from "react";

const USER_ROLES = [
  "นักศึกษาปริญญาตรี",
  "นักศึกษาบัณฑิต",
  "อาจารย์/นักวิจัย",
  "บุคลากร",
];

const StatisticsFilterModal = ({
  isOpen,
  onClose,
  onApply,
  initialFilters,
}) => {
  const [filterType, setFilterType] = useState(
    initialFilters.filterType || "all"
  );
  const [year, setYear] = useState(
    initialFilters.year || new Date().getFullYear().toString()
  );
  const [month, setMonth] = useState(
    initialFilters.month || (new Date().getMonth() + 1).toString()
  );
  const [startDate, setStartDate] = useState(initialFilters.startDate || "");
  const [endDate, setEndDate] = useState(initialFilters.endDate || "");
  const [selectedRoles, setSelectedRoles] = useState(
    initialFilters.roles || []
  );

  // Populate years and months for dropdowns
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

  // Refs for date inputs
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  useEffect(() => {
    // Reset local state if modal is reopened
    if (isOpen) {
      setFilterType(initialFilters.filterType || "all");
      setYear(initialFilters.year || new Date().getFullYear().toString());
      setMonth(initialFilters.month || (new Date().getMonth() + 1).toString());
      setStartDate(initialFilters.startDate || "");
      setEndDate(initialFilters.endDate || "");
      setSelectedRoles(initialFilters.roles || []);
    }
  }, [isOpen, initialFilters]);

  const handleRoleChange = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleApply = () => {
    onApply({
      filterType,
      year,
      month,
      startDate,
      endDate,
      roles: selectedRoles,
    });
    onClose();
  };

  const handleReset = () => {
    // Reset all filters including roles
    onApply({
      filterType: "all",
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString(),
      startDate: "",
      endDate: "",
      roles: [],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            ตัวกรองข้อมูลสถิติ
          </h2>

          <div className="space-y-6">
            <div>
              <label
                htmlFor="filter-type"
                className="block text-sm font-medium text-gray-700 pb-1"
              >
                รูปแบบ
              </label>
              <select
                id="filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="all">ข้อมูลทั้งหมด</option>
                <option value="yearly">รายปี</option>
                <option value="monthly">รายเดือน</option>
                <option value="range">ช่วงเวลา</option>
              </select>
            </div>

            {filterType === "yearly" && (
              <div>
                <label
                  htmlFor="year-filter"
                  className="block text-sm font-medium text-gray-700"
                >
                  เลือกปี
                </label>
                <select
                  id="year-filter"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y} ({y + 543})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "monthly" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="month-filter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    เลือกเดือน
                  </label>
                  <select
                    id="month-filter"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="year-for-month-filter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ของปี
                  </label>
                  <select
                    id="year-for-month-filter"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y} ({y + 543})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {filterType === "range" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="start-date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    วันที่เริ่มต้น
                  </label>
                  <div className="relative mt-1">
                    <input
                      ref={startDateRef}
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onClick={() => startDateRef.current?.showPicker?.()}
                      onKeyDown={(e) => e.preventDefault()}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm cursor-pointer"
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
                    className="block text-sm font-medium text-gray-700"
                  >
                    วันที่สิ้นสุด
                  </label>
                  <div className="relative mt-1">
                    <input
                      ref={endDateRef}
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      onClick={() => endDateRef.current?.showPicker?.()}
                      onKeyDown={(e) => e.preventDefault()}
                      className="block w-full px-3 py-2 pr-10 bg-white border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm cursor-pointer"
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
            )}

            {/* Role Filter Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                สถานภาพ
              </label>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                {USER_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-800">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between rounded-b-lg">
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-full bg-white text-gray-500 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            title="รีเซ็ตตัวกรองทั้งหมด"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 w-[82.2px] rounded bg-purple-600 text-white hover:bg-purple-700 font-semibold"
            >
              ใช้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsFilterModal;
