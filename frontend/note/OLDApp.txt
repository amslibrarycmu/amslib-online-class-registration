import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/index";
import RegisterForm from "./pages/RegisterForm";
import AdminPanel from "./pages/AdminPanel";
import ClassCreation from "./pages/ClassCreation";
import ClassList from "./components/ClassList";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import "./App.css";


function ProtectedRoute({ children }) {
  const { user } = useAuth();

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/index" element={<Dashboard />} />
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
          <Route
            path="/creations"
            element={
              <ProtectedRoute>
                <ClassCreation />
              </ProtectedRoute>
            }
          />
          {/* *** ลบหรือคอมเมนต์ Route นี้ออก หรือเปลี่ยนให้ชี้ไปที่ /index ถ้าคุณต้องการ fallback *** */}
          {/* ถ้าคุณตั้ง path="/" ชี้ไป Dashboard แล้ว Route นี้อาจไม่จำเป็น หรือปรับให้เข้ากับ path="/" */}
          {/* <Route path="*" element={<Navigate to="/index" />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
