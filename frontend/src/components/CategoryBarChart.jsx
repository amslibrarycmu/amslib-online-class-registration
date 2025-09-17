import React from "react";
import { Chart } from "react-google-charts";

const CategoryBarChart = ({ data }) => {
  const chartData = [
    ["หมวดหมู่", "คะแนนเฉลี่ย", { role: "annotation" }, { role: "style" }],
    ["เนื้อหา", parseFloat(data.avg_score_content) || 0, `${(parseFloat(data.avg_score_content) || 0).toFixed(2)}`, "#3366CC"],
    ["เอกสาร", parseFloat(data.avg_score_material) || 0, `${(parseFloat(data.avg_score_material) || 0).toFixed(2)}`, "#DC3912"],
    ["ระยะเวลา", parseFloat(data.avg_score_duration) || 0, `${(parseFloat(data.avg_score_duration) || 0).toFixed(2)}`, "#FF9900"],
    ["รูปแบบ", parseFloat(data.avg_score_format) || 0, `${(parseFloat(data.avg_score_format) || 0).toFixed(2)}`, "#109618"],
    ["การนำเสนอ", parseFloat(data.avg_score_speaker) || 0, `${(parseFloat(data.avg_score_speaker) || 0).toFixed(2)}`, "#990099"],
  ];

  const options = {
    title: "",
    backgroundColor: "transparent",
    titleTextStyle: { color: "white" },
    chartArea: { width: "80%", height: "80%" },
    // Removed colors array
    hAxis: {
      title: "คะแนนเฉลี่ย", 
      titleTextStyle: { color: "black" },
      textStyle: { color: "black" },
      minValue: 0,
      maxValue: 5,
      fontName: "Sarabun",
    },
    vAxis: {
      title: "",
      titleTextStyle: { color: "black" },
      textStyle: { color: "black" },
      fontName: "Sarabun",
    },
    legend: { position: "none" },
    fontName: "Sarabun",
    annotations: {
      alwaysOutside: true, 
      textStyle: {
        color: "black",
        fontSize: 14,
        fontName: "Sarabun",
        bold: true, 
        auraColor: "none",
      },
    },
  };

  return (
    <Chart
      chartType="BarChart"
      width="100%"
      height="100%"
      data={chartData}
      options={options}
    />
  );
};

export default CategoryBarChart;