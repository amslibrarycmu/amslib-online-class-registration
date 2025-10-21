import React from 'react';

const ProcessingOverlay = ({ message = "กำลังดำเนินการ..." }) => {
  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-[100]">
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-xl">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg font-semibold text-gray-700">{message}</p>
      </div>
    </div>
  );
};

export default ProcessingOverlay;