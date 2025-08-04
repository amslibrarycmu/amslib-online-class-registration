import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  let firstname = "";
  let lastname = "";
  if (user?.name) {
    const parts = user.name.split(" ");
    firstname = parts[0] || "";
    lastname = parts.slice(1).join(" ") || "";
  }

  return (
    <div className="w-[325px] flex-shrink-0 min-h-screen text-center bg-[#f0f0f0] flex flex-col gap-[10px] p-[1rem]">
      <img src={amsliblogo} width={200} className="mx-auto" alt="logo" />
      <p className="text-[16px] font-semibold text-black">
        AMS Library Class Registration System (HSL KM)
      </p>
      <div className="flex items-center justify-center gap-[15px] my-[10px]">
        <img
          src={profile}
          width={75}
          height={75}
          className="w-[100px] h-[100px] object-cover rounded-full my-auto"
          alt="profile"
        />
        <div className="flex flex-col text-start px-0 grow text-black">
          <span>
            {firstname} {lastname}
          </span>{" "}
          <span className="text-xs text-gray-500">{user?.email}</span>
          <span className="text-xs text-gray-500 py-1">({user?.status})</span>
          <span
            className="font-semibold cursor-pointer hover:underline"
            style={{ color: "black" }}
          >
            <span className="font-semibold"> ออกจากระบบ </span>
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5">
        <span
          onClick={() => navigate("/dashboard")}
          className="text-black cursor-pointer hover:underline text-[1.25rem] "
          style={{ background: "transparent", borderColor: "" }}
        >
          ภาพรวม
        </span>
        <span
          onClick={() => {
            navigate("/creations");
            console.log("Navigating to class creation page");
          }}
          className="text-black cursor-pointer hover:underline text-[1.25rem]"
        >
          สร้างห้องเรียน
        </span>
      </div>
    </div>
  );
}
