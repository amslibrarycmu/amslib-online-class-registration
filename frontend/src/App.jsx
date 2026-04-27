import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ClassIndex from "./pages/ClassIndex";
import ClassCreation from "./pages/ClassCreation";
import ClassCatalog from "./pages/ClassCatalog"; // Import the new component
import Statistics from "./pages/Statistics.jsx";
import PastClassesHistory from "./pages/PastClassesHistory";
import ClassRequest from "./pages/ClassRequest";
import AdminClassRequests from "./pages/AdminClassRequests";
import UserManagement from "./pages/UserManagement";
import ActivityLogs from "./pages/ActivityLogs";
import TopicManagement from './pages/TopicManagement';

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginCallback from "./contexts/LoginCallback.jsx";
import CompleteProfileModal from "./components/CompleteProfileModal.jsx";


function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppContent() {
  const { user, authFetch, login, newUserTempData, clearNewUserTempData } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (newUserTempData) {
      setIsProfileModalOpen(true);
    } else if (user && !user.profile_completed) {
      setIsProfileModalOpen(true);
    } else {
      setIsProfileModalOpen(false);
    }
  }, [user, newUserTempData]);

  const handleProfileSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      let apiResponse; 
      let finalUser;

      if (newUserTempData && newUserTempData.tempToken) {
        apiResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/complete-registration`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, temp_token: newUserTempData.tempToken }),
          }
        );

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(
            errorData.message || "Failed to complete registration"
          );
        }

        const { user: newUser, token: finalToken } = await apiResponse.json();
        finalUser = newUser;
        login(newUser, finalToken);
        setIsProfileModalOpen(false);
        clearNewUserTempData();
      } else if (user) {
        const payload = {
          ...formData,
          original_name: user.name,
        };

        apiResponse = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/users/update-profile`,
          {
            method: "PUT",
            body: payload,
          }
        );

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.message || "Failed to update profile");
        }

        const { user: updatedUser, token: newToken } = await apiResponse.json();
        finalUser = updatedUser;
        login(updatedUser, newToken);
        setIsProfileModalOpen(false);
      } else {
        throw new Error("No user session or temporary token found.");
      }

      if (
        Array.isArray(finalUser?.roles) &&
        finalUser?.roles.includes("ผู้ดูแลระบบ")
      ) {
        navigate("/index", { replace: true });
      } else {
        navigate("/classes", { replace: true });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        user={user || newUserTempData}
        onSubmit={handleProfileSubmit}
        isSubmitting={isSubmitting}
      />
      <Routes>
        <Route path="/login-callback" element={<LoginCallback />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/index" element={<ClassIndex />} />
          <Route path="/creations" element={<ClassCreation />} />
          <Route path="/classes" element={<ClassCatalog />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/past-classes" element={<PastClassesHistory />} />
          <Route path="/class-request" element={<ClassRequest />} />
          <Route
            path="/admin/class-requests"
            element={<AdminClassRequests />}
          />
          <Route path="/topic-management" element={<TopicManagement />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/activity-logs" element={<ActivityLogs />} />
          <Route path="/" element={<Navigate to="/index" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename="/library/amslibclass">
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
