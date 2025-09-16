import React from 'react';

const StatBar = ({ label, score, maxScore = 5 }) => {
  const percentage = (score / maxScore) * 100;
  return (
    <div className="flex items-center my-2">
      <span className="w-1/3 text-gray-600 text-right pr-4">{label}</span>
      <div className="w-2/3 bg-gray-200 rounded-full h-5">
        <div
          className="bg-purple-600 h-5 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none"
          style={{ width: `${percentage}%` }}
        >
          <span className="pl-2 font-bold">{score ? score.toFixed(2) : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

const EvaluationStatsDisplay = ({ evaluation }) => {
  if (!evaluation || evaluation.count === 0) {
    return <p className="text-gray-500 text-center mt-4">ยังไม่มีข้อมูลผลการประเมินสำหรับหลักสูตรนี้</p>;
  }

  const { count, content, material, duration, format, speaker } = evaluation;

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">
        ผลการประเมินความพึงพอใจ
        <span className="text-base font-normal text-gray-500 ml-2">
          (จาก {count} คน)
        </span>
      </h3>
      <div className="space-y-2">
        <StatBar label="เนื้อหา" score={content} />
        <StatBar label="เอกสารประกอบ" score={material} />
        <StatBar label="ระยะเวลา" score={duration} />
        <StatBar label="รูปแบบ/สถานที่" score={format} />
        <StatBar label="วิทยากร" score={speaker} />
      </div>
    </div>
  );
};

export default EvaluationStatsDisplay;