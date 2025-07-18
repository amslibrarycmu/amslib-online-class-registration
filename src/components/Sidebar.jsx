import React from "react";
import amsliblogo from "../assets/amslib-logo.svg";
import profile from "../assets/abstract-user.png";

export default function Sidebar() {
  return (
    <>
      <div className="max-w-[400px] min-w-[200px||50%] text-center item-center justify bg-[#f0f0f0] flex flex-col gap-[10px] relative text-white p-[1rem] h-screen">
        <img src={amsliblogo} width={200} className="box mx-auto" />

        <p className="text-[16px] font-semibold text-black -p-[1rem]">
          AMS Library Class Registration System (HSL KM)
        </p>

        <div className="flex item-center justify-center gap-[15px] relative my-[10px]">
          <img
            src={profile}
            width={75}
            height={75}
            className="w-[100px] h-[100px] sm:w-[80px] sm:h-[80px] object-cover rounded-full my-auto"
          />
          <div className="flex flex-col text-start px-0 relative self-stretch grow text-black">
            <span className="relative self-stretch">
              {" "}
              **users** **lastname**{" "}
            </span>
            <span> (**your role**) </span>
            <a
              href=""
              onClick={() => alert("ออกจากระบบแล้ว")}
              className="my-[5px]"
            >
              <p className="font-bold cursor-pointer hover:underline">
                ลงชื่อออก
              </p>
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5 relative">
          <a href="" onClick={() => alert("ภาพรวม")}> <p className="text-black hover:underline text-[1.25rem] "> ภาพรวม </p> </a>
          <a href="" onClick={() => alert("สร้างห้องเรียน")}> <p className="text-black hover:underline text-[1.25rem]"> สร้างห้องเรียน </p></a>
          <a href="" onClick={() => alert("ติดตามผล")}> <p className="text-black hover:underline text-[1.25rem]"> ติดตามผล </p> </a>
        </div>
      </div>
    </>
  );
}
