import React, { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useAuth } from "../contexts/AuthContext";
import getCroppedImg from "../utils/CropUtils.jsx"; // อย่าลืมเช็คชื่อไฟล์ s ให้ตรงกับไฟล์จริงของคุณ

const LoadingSpinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
);

const ProfilePictureModal = ({ isOpen, onClose, onUpdateSuccess }) => {
  const { user, authFetch } = useAuth();
  const fileInputRef = useRef(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
      e.target.value = null;
    }
  };

  const handleSaveCrop = async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], "profile_cropped.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("email", user.email);

      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/users/profile-picture`,
        {
          method: "PUT",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("อัปโหลดรูปภาพไม่สำเร็จ");

      const data = await response.json();

      // --- สร้าง URL ชั่วคราวส่งกลับไป ---
      const localPreviewUrl = URL.createObjectURL(croppedImageBlob);
      onUpdateSuccess(data.user, data.token, localPreviewUrl);
      // --------------------------------

      alert("อัปเดตโปรไฟล์สำเร็จ");
      handleCloseAll();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการตัดหรืออัปโหลดภาพ");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.photo || isDeleting) return;

    if (window.confirm("คุณต้องการลบรูปโปรไฟล์หรือไม่?")) {
      setIsDeleting(true);
      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/users/profile-picture`,
          {
            method: "DELETE",
            params: { email: user.email },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "ลบรูปโปรไฟล์ไม่สำเร็จ");
        }

        const data = await response.json();
        // ส่ง null กลับไปเพื่อบอกว่าลบรูปแล้ว
        onUpdateSuccess(data.user, data.token, null);
        
        alert("ลบรูปโปรไฟล์สำเร็จ");
        handleCloseAll();
      } catch (error) {
        console.error("Delete photo error:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCloseAll = () => {
    setIsCropping(false);
    setImageSrc(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {isCropping ? (
        <div className="fixed inset-0 z-[9999] bg-white/85 flex flex-col items-center justify-center p-4" onClick={handleCloseAll}>
          <div className="bg-white rounded-lg p-4 w-full max-w-sm flex flex-col gap-4 h-[400px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-black">ปรับแต่งรูปโปรไฟล์</h3>
            <div className="relative w-full h-full bg-gray-100 rounded-md overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsCropping(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300">
                ยกเลิก
              </button>
              <button onClick={handleSaveCrop} disabled={isUploading} className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2">
                {isUploading && <LoadingSpinner />}
                บันทึกรูปภาพ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[9998] bg-white/85 flex items-center justify-center" onClick={handleCloseAll}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">แก้ไขรูปโปรไฟล์</h2>
            <div className="flex flex-col space-y-2 w-full">
              {user?.photo ? (
                <>
                  <button onClick={() => fileInputRef.current.click()} className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                    เปลี่ยนรูปโปรไฟล์
                  </button>
                  <button onClick={handleDeletePhoto} disabled={isDeleting} className="w-full px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center gap-2">
                    {isDeleting && <LoadingSpinner />}
                    ลบรูปโปรไฟล์
                  </button>
                </>
              ) : (
                <button onClick={() => fileInputRef.current.click()} className="w-full px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700">
                  เพิ่มรูปโปรไฟล์
                </button>
              )}
              <button onClick={handleCloseAll} className="w-full px-4 py-2 mt-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePictureModal;