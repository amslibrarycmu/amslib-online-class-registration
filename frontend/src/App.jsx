import React from "react";
import {
  BrowserRouter as Router,
  Routes,

  Route, Outlet,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ClassIndex from "./pages/ClassIndex";
import ClassCreation from "./pages/ClassCreation";
import ClassCatalog from "./pages/ClassCatalog"; // Import the new component
import Statistics from './pages/Statistics.jsx';
import PastClassesHistory from "./pages/PastClassesHistory";
import ClassRequest from "./pages/ClassRequest";
import AdminClassRequests from "./pages/AdminClassRequests";
import UserManagement from "./pages/UserManagement";
import ActivityLogs from "./pages/ActivityLogs";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function ProtectedLayout() {
  const { user } = useAuth();
  // Outlet จะ render child route ที่ match กับ URL ปัจจุบัน
  return user ? <Outlet /> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/index" element={<ClassIndex />} />
            <Route path="/creations" element={<ClassCreation />} />
            <Route path="/classes" element={<ClassCatalog />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/past-classes" element={<PastClassesHistory />} />
            <Route path="/class-request" element={<ClassRequest />} />
            <Route path="/admin/class-requests" element={<AdminClassRequests />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;