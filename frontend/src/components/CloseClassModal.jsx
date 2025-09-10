

import React, { useState, useEffect } from 'react';

const CloseClassModal = ({ isOpen, onClose, onSubmit, classData, isEditing = false }) => {
  const [videoLink, setVideoLink] = useState('');
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    if (isEditing && classData) {
      setVideoLink(classData.video_link || '');
      // For materials, we typically don't pre-fill file inputs for security reasons.
      // Users would re-select files if they want to update them.
      // If you want to display existing materials, you'd need a separate display logic.
    } else {
      setVideoLink('');
      setMaterials([]);
    }
  }, [isEditing, classData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ video_link: videoLink, materials });
  };

  const handleFileChange = (e) => {
    setMaterials([...e.target.files]);
  };

  return (
    <div className="fixed inset-0 bg-white/85 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isEditing ? "แก้ไขข้อมูลห้องเรียน" : "จบการสอน"} <br/>"{classData.title}"
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="video_link" className="block text-gray-700 font-semibold mb-2">ลิงก์วิดีโอย้อนหลัง</label>
            <input
              type="url"
              id="video_link"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="https://..."
            />
          </div>

          <div className="mb-6">
            <label htmlFor="materials" className="block text-gray-700 font-semibold mb-2">ไฟล์เอกสารประกอบการสอนเพิ่มเติม</label>
            <input
              type="file"
              id="materials"
              multiple
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 font-semibold"
            >
              {isEditing ? "บันทึก" : "ยืนยัน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseClassModal;
