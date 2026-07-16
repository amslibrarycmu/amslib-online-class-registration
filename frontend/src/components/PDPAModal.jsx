import React from "react";
import amsliblogo from "../assets/amslib-logo.svg";

const PDPAModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex bg-black/60 justify-center items-center z-[60] p-4 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col items-center shrink-0 bg-gray-50">
          <img
            src={amsliblogo}
            alt="AMS Library Logo"
            className="mb-4"
            width={120}
          />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 text-center">
            นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-grow text-gray-700 leading-relaxed text-sm md:text-base space-y-4">
          <p>
            ห้องสมุดคณะเทคนิคการแพทย์ มหาวิทยาลัยเชียงใหม่ ให้ความสำคัญอย่างยิ่งต่อการคุ้มครองข้อมูลส่วนบุคคลของท่าน เพื่อให้สอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) เราจึงขอแจ้งให้ท่านทราบถึงรายละเอียดการเก็บรวบรวม ใช้ และเปิดเผยข้อมูล ดังนี้
          </p>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
              <span className="text-xl">📂</span> การเก็บรวบรวมข้อมูลส่วนบุคคล
            </h3>
            <p className="mb-2">ในการเข้าใช้งานและลงทะเบียนเรียน เรามีความจำเป็นต้องเก็บรวบรวมข้อมูลส่วนบุคคลของท่าน ได้แก่</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>ชื่อ-นามสกุล</li>
              <li>สถานภาพ (นักศึกษาหรือบุคลากรตำแหน่งใดๆ)</li>
              <li>หมายเลขโทรศัพท์</li>
              <li>อีเมล (E-mail)</li>
              <li>ข้อมูลจากการทำแบบทดสอบและแบบประเมินความพึงพอใจ</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span className="text-xl">🎯</span> วัตถุประสงค์
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>เพื่อใช้ในการลงทะเบียนและติดต่อสื่อสารกับผู้เข้าร่วม</li>
              <li>เพื่อวิเคราะห์และนำไปพัฒนาปรับปรุงการให้บริการของเว็บไซต์</li>
              <li>เพื่อจัดทำรายงานสรุปผลการดำเนินงาน</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
              <span className="text-xl">🔐</span> การรักษาความปลอดภัยและการเปิดเผยข้อมูล
            </h3>
            <p>
              ข้อมูลส่วนบุคคลของท่านจะถูกจัดเก็บรักษาไว้ในระบบอย่างปลอดภัยสูงสุดและจะไม่มีการเปิดเผยต่อบุคคลหรือหน่วยงานภายนอก เว้นแต่จะได้รับความยินยอมอย่างชัดแจ้งจากท่านหรือเป็นการปฏิบัติตามที่กฎหมายกำหนด
            </p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
              <span className="text-xl">✅</span> สิทธิของเจ้าของข้อมูล
            </h3>
            <p className="mb-2">
              ท่านมีสิทธิโดยชอบธรรมในการขอเข้าถึง แก้ไข ลบ หรือขอระงับการใช้ข้อมูลส่วนบุคคลของท่านได้ตลอดเวลา โดยสามารถติดต่อดำเนินการได้ที่ห้องสมุดคณะเทคนิคการแพทย์ มหาวิทยาลัยเชียงใหม่ โดยมีทั้งหมด 3 ช่องทางหลัก ดังนี้
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>โทร. 05-593-5071</li>
              <li>อีเมล: amslibref@gmail.com</li>
              <li>เพจ Facebook "AMS Library CMU : ห้องสมุดคณะเทคนิคการแพทย์ มหาวิทยาลัยเชียงใหม่"</li>
            </ul>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-gray-400 text-sm italic">
            <strong>หมายเหตุ:</strong> การกดเพื่อดำเนินการต่อหรือการเข้าร่วมนี้ ถือว่าท่านได้อ่านและให้ความยินยอมแก่ห้องสมุดคณะเทคนิคการแพทย์ในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่าน ตามวัตถุประสงค์ที่ได้ระบุไว้ข้างต้นทุกประการ
          </div>
        </div>

        {/* Footer with Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center shrink-0">
          <button
            onClick={onClose}
            className="w-full md:w-auto bg-purple-600 text-white font-bold py-2 px-8 rounded-lg shadow hover:bg-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer"
          >
            รับทราบ
          </button>
        </div>

      </div>
    </div>
  );
};

export default PDPAModal;
