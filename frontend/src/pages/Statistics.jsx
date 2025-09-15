import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const Statistics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user data is not available or user is not an admin, redirect to login.
    if (!user || user.status !== 'ผู้ดูแลระบบ') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Render a loading state or null while checking the user and redirecting
  if (!user || user.status !== 'ผู้ดูแลระบบ') {
    return <p>Loading...</p>; // Or a spinner component
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">สถิติการลงทะเบียน</h1>
        <p>หน้านี้จะแสดงข้อมูลสถิติและแผนภูมิต่างๆ เกี่ยวกับผู้เข้าร่วม</p>
      </div>
    </div>
  );
};

export default Statistics;
