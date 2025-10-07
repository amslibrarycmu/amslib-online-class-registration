import { useState, useEffect } from "react";

/**
 * Custom hook for fetching statistics data.
 * @param {object} user - The authenticated user object.
 * @param {string} selectedYear - The selected year for filtering.
 * @param {string} selectedMonth - The selected month for filtering.
 * @returns {{stats: Array, loading: boolean, error: Error|null}}
 */
export const useStatisticsData = (user, activeRole, selectedYear, selectedMonth) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || activeRole !== "ผู้ดูแลระบบ") {
      setLoading(false);
      return;
    }

    const fetchData = async () => {      
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ year: selectedYear, month: selectedMonth, roles: user.roles.join(',') });
        const response = await fetch(`http://localhost:5000/api/admin/statistics/class-demographics?${params}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err);
        console.error("Error fetching statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeRole, selectedYear, selectedMonth]);

  return { stats, loading, error };
};