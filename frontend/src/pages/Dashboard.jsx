import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <Sidebar />

    </div>
  );
};

export default Dashboard;
