import React, { useState, useEffect } from 'react';

const CloseClassModal = ({ isOpen, onClose, onSubmit, classData, isEditing = false }) => {
  const [videoLink, setVideoLink] = useState('');
  const [newMaterials, setNewMaterials] = useState([]); // For new file uploads
  const [existingMaterials, setExistingMaterials] = useState([]); // For existing file names

  useEffect(() => {
    if (isOpen && classData) {
      setVideoLink(classData.video_link || '');
      try {
        const materials = typeof classData.materials === 'string' ? JSON.parse(classData.materials) : (classData.materials || []);
        setExistingMaterials(materials);
      } catch (error) {
        console.error("Error parsing materials:", error);
        setExistingMaterials([]);
      }
      // Reset new materials on open
      setNewMaterials([]);
    } else {
      setVideoLink('');
      setNewMaterials([]);
      setExistingMaterials([]);
    }
  }, [isOpen, classData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      video_link: videoLink, 
      new_materials: newMaterials, 
      existing_materials: existingMaterials 
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert("คุณสามารถอัปโหลดไฟล์ได้ไม่เกิน 5 ไฟล์ในแต่ละครั้ง");
      return;
    }
    setNewMaterials(prev => [...prev, ...files]);
    // Reset file input value to allow selecting the same file again
    e.target.value = null;
  };

  const handleDeleteExistingFile = (fileName) => {
    setExistingMaterials(existingMaterials.filter(file => file !== fileName));
  };

  const handleDeleteNewFile = (fileIndex) => {
    setNewMaterials(newMaterials.filter((_, index) => index !== fileIndex));
  };

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
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

          {/* --- File Management --- */}
          <div className="space-y-4">
            {/* Existing Materials */}
            {existingMaterials.length > 0 && (
              <div>
                <h4 className="block text-gray-700 font-semibold mb-2">ไฟล์ที่มีอยู่</h4>
                <ul className="list-disc space-y-2">
                  {existingMaterials.map((fileName, index) => (
                    <li key={`existing-${index}`} className="text-gray-800 flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span>{fileName}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteExistingFile(fileName)}
                        className="text-red-500 hover:text-red-700 font-semibold ml-4"
                      >
                        ลบ
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* New Materials to be Uploaded */}
            {newMaterials.length > 0 && (
              <div>
                <h4 className="block text-gray-700 font-semibold mb-2">ไฟล์ใหม่ที่เลือก</h4>
                <ul className="list-disc space-y-2">
                  {newMaterials.map((file, index) => (
                    <li key={`new-${index}`} className="text-gray-800 flex justify-between items-center bg-purple-50 text-purple-800 p-2 rounded">
                      <span>{file.name}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteNewFile(index)}
                        className="text-red-500 hover:text-red-700 font-semibold ml-4"
                      >
                        ลบ
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* File Input */}
            <div className="mb-6">
              <label htmlFor="materials" className="block text-gray-700 font-semibold mb-2">เพิ่มเอกสารใหม่</label>
              <input
                type="file"
                id="materials"
                multiple
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
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
