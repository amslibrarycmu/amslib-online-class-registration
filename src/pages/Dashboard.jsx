import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="flex w-screen">
     <Sidebar />
     
     <div className="w-screen text-wrap">
      
     </div>
    </div>
  );
};

export default Dashboard;
