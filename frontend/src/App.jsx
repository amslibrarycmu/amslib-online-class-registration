import React from "react";
import {
  BrowserRouter as Router,
  Routes,

  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ClassIndex from "./pages/ClassIndex";
import ClassCreation from "./pages/ClassCreation";
import ClassCatalog from "./pages/ClassCatalog"; // Import the new component
import Statistics from "./pages/Statistics";
import PastClassesHistory from "./pages/PastClassesHistory";
import ClassRequest from "./pages/ClassRequest";
import AdminClassRequests from "./pages/AdminClassRequests";
import UserManagement from "./pages/UserManagement";
import ActivityLogs from "./pages/ActivityLogs";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

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
          <Route
            path="/index"
            element={
              <ProtectedRoute>
                <ClassIndex />
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
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <Statistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/past-classes"
            element={
              <ProtectedRoute>
                <PastClassesHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/class-request"
            element={
              <ProtectedRoute>
                <ClassRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/class-requests"
            element={
              <ProtectedRoute>
                <AdminClassRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;