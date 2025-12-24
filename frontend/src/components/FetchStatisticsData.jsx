import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Custom hook for fetching statistics data.
 * @param {object} user - The user object from useAuth.
 * @param {string} activeRole - The current active role.
 * @param {object} filters - An object containing filter criteria.
 * @returns {{stats: Array, loading: boolean, error: Error|null}}
 */
export const FetchStatisticsData = (user, activeRole, filters) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    const { filterType, year, month, startDate, endDate, roles } = filters;

    if (!user || activeRole !== "ผู้ดูแลระบบ") {
      setLoading(false);
      setStats([]); // Clear stats if not an admin
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('filterType', filterType);

        if (filterType === 'yearly') {
          params.append('year', year);
        } else if (filterType === 'monthly') {
          params.append('year', year);
          params.append('month', month);
        } else if (filterType === 'range') {
          // Always send startDate and endDate if the type is 'range',
          // even if one of them is empty. The backend should handle this.
          params.append('startDate', startDate);
          params.append('endDate', endDate);
        }
        
        // Append roles if they exist
        if (roles && roles.length > 0) {
          params.append('roles', JSON.stringify(roles));
        }

        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/admin/statistics/class-demographics?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeRole, filters, authFetch]);

  return { stats, loading, error };
};