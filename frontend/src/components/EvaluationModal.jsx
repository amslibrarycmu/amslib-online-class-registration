import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const EvaluationModal = ({
  isOpen,
  onClose,
  classToEvaluate,
  onSubmitSuccess,
}) => {
  const { user } = useAuth();
  const [scores, setScores] = useState({
    score_content: 0,
    score_material: 0,
    score_duration: 0,
    score_format: 0,
    score_speaker: 0,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = {
    score_content: "เนื้อหาการบรรยาย",
    score_material: "เอกสารประกอบการบรรยาย",
    score_duration: "ระยะเวลาการบรรยาย",
    score_format: "รูปแบบการสอนมีความเหมาะสม",
    score_speaker: "วิธีการนำเสนอของวิทยากร",
  };

  useEffect(() => {
    // Reset state when the modal is reopened for a new class
    if (isOpen) {
      setScores({
        score_content: 0,
        score_material: 0,
        score_duration: 0,
        score_format: 0,
        score_speaker: 0,
      });
      setComment("");
      setError("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleScoreChange = (category, score) => {
    setScores((prevScores) => ({ ...prevScores, [category]: score }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const unanswered = Object.keys(scores).filter((key) => scores[key] === 0);
    if (unanswered.length > 0) {
      setError("กรุณาให้คะแนนทุกหัวข้อ");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...scores,
          comment,
          class_id: classToEvaluate.class_id,
          user_email: user.email,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit evaluation.");
      }

      onSubmitSuccess(); // Callback to refresh parent component
      onClose(); // Close modal
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/85 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center"></div>
        <h2 className="text-2xl font-bold text-gray-800 text-center w-full">
          แบบประเมินความพึงพอใจ
        </h2>
        <p className="text-2xl font-semibold text-purple-700 mb-4 text-center mb-2">
          {classToEvaluate.title}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            {Object.entries(categories).map(([key, label]) => (
              <div key={key} className="flex items-end justify-between py-3 border-b last:border-b-0">
                <span className="text-lg font-medium text-gray-800">{label}</span>
                <div className="flex items-center space-x-3 sm:space-x-5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <div key={value} className="flex flex-col items-center cursor-pointer" onClick={() => handleScoreChange(key, value)}>
                      <label htmlFor={`${key}-${value}`} className="text-md text-gray-700 cursor-pointer">{value}</label>
                      <input
                        type="radio"
                        id={`${key}-${value}`}
                        name={key}
                        value={value}
                        checked={scores[key] === value}
                        onChange={() => handleScoreChange(key, value)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <label
              htmlFor="comment"
              className="block text-lg font-medium text-gray-700 mb-2"
            >
              ข้อเสนอแนะเพิ่มเติม
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="ระบุข้อเสนอแนะเพิ่มเติม (ถ้ามี)"
              className="p-4 mt-1 block w-full rounded-md border-gray-300 shadow focus:border-indigo-500 focus:ring-indigo-500 sm:text-md"
            ></textarea>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {submitting ? "กำลังส่ง..." : "ส่งแบบประเมิน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationModal;