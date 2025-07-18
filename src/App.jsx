import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RegisterForm from "./pages/RegisterForm";
import AdminPanel from "./pages/AdminPanel";
import ClassList from "./components/ClassList";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import "./App.css";

// ProtectedRoute ยังคงอยู่ แต่เราจะ Comment Out การใช้งานใน Dashboard ชั่วคราว
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  // คุณสามารถปรับให้มัน return children เสมอ ถ้า user เป็น null เพื่อปิดการป้องกันชั่วคราว
  // แต่แนะนำให้ Comment Out ProtectedRoute ใน Route ของ Dashboard แทน
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* *** เปลี่ยน Default Route ให้ไปที่ Dashboard แทน *** */}
          {/* จากเดิม <Route path="*" element={<Navigate to="/dashboard" />} /> */}
          {/* ให้เปลี่ยน path="/" (Root path) ไปที่ Dashboard */}
          <Route path="/" element={<Dashboard />} /> {/* <-- เพิ่มบรรทัดนี้ */}

          {/* *** คอมเมนต์บรรทัด ProtectedRoute สำหรับ Dashboard ชั่วคราว *** */}
          {/* <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          /> */}
          {/* หากคุณต้องการให้ /dashboard ยังทำงานปกติ (แต่ไม่ต้องผ่าน ProtectedRoute)
              ให้เปลี่ยนเป็น element={<Dashboard />} ตรงๆ ได้เลย (ไม่ต้องครอบ ProtectedRoute)
              แต่ถ้าคุณตั้ง path="/" ชี้ไปที่ Dashboard แล้ว อาจจะไม่จำเป็นต้องมี path="/dashboard" แยกอีก
              เว้นแต่คุณต้องการให้ /dashboard เป็นหน้าหลักจริง ๆ และ / เป็นแค่ redirect
          */}
          {/* ถ้าคุณต้องการเข้าถึง Dashboard จาก /dashboard โดยตรงโดยไม่ผ่าน ProtectedRoute */}
          <Route path="/dashboard" element={<Dashboard />} /> {/* <-- เพิ่ม/แก้ไขบรรทัดนี้ */}


          {/* ส่วน Route อื่นๆ ที่ต้องการการป้องกัน ก็ปล่อยไว้เหมือนเดิม */}
          <Route
            path="/register"
            element={
              <ProtectedRoute>
                <RegisterForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassList />
              </ProtectedRoute>
            }
          />

          {/* *** ลบหรือคอมเมนต์ Route นี้ออก หรือเปลี่ยนให้ชี้ไปที่ /dashboard ถ้าคุณต้องการ fallback *** */}
          {/* ถ้าคุณตั้ง path="/" ชี้ไป Dashboard แล้ว Route นี้อาจไม่จำเป็น หรือปรับให้เข้ากับ path="/" */}
          {/* <Route path="*" element={<Navigate to="/dashboard" />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;