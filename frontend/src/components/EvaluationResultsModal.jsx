import React from "react";

const EvaluationResultsModal = ({
  isOpen,
  onClose,
  evaluationData,
  classTitle,
}) => {
  if (!isOpen) return null;

  const { evaluations, suggestions } = evaluationData || {
    evaluations: [],
    suggestions: [],
  };

  const scoreHeaders = [
    "เนื้อหา",
    "เอกสาร/สื่อ",
    "ระยะเวลา",
    "รูปแบบ",
    "วิทยากร",
  ];

  return (
    <div className="fixed inset-0 bg-white/85 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold mb-6 text-gray-800 text-center">
          <span className="text-2xl"> ผลการประเมินสำหรับ <br/></span> 
          <span className="text-purple-700 text-2xl"> "{classTitle}" </span>
        </h2>

        {/* Evaluation Scores Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            มีผู้ให้คะแนนการประเมินแล้ว {evaluations.length} คน
          </h3>
          {evaluations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 shadow-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-md font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    {scoreHeaders.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-center text-md font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {evaluations.map((evaluation, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {evaluation.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {evaluation.score_content}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {evaluation.score_material}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {evaluation.score_duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {evaluation.score_format}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {evaluation.score_speaker}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">ยังไม่มีผู้ประเมิน</p>
          )}
        </div>

        {/* Suggestions Section */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">
            ข้อเสนอแนะ
          </h3>
          {suggestions.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-gray-50 p-4 rounded-md">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="text-gray-700">
                  {suggestion}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">ไม่มีข้อเสนอแนะ</p>
          )}
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationResultsModal;
