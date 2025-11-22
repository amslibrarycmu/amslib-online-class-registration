import React from 'react';

const FileViewerModal = ({ isOpen, onClose, files, classTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">เอกสารประกอบวิชา <br/>"{classTitle}"</h2>
        <ul className="list-disc pl-5 mb-4">
          {files.map((file, index) => (
            <li key={index} className="text-gray-700">
              <a 
                href={`http://localhost:5000/uploads/materials/${file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 hover:underline"
              >
                {file}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button 
            onClick={onClose} 
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;