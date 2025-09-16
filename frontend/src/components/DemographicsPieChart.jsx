import React from 'react';
import { Chart } from 'react-google-charts';

const DemographicsPieChart = ({ demographics }) => {
  const data = [
    ['ประเภทผู้ลงทะเบียน', 'จำนวน', { role: 'tooltip', type: 'string' }],
    ...Object.entries(demographics).map(([status, count]) => [
      `${status}: ${count} คน`,
      count,
      `${status}: ${count} คน (${((count / Object.values(demographics).reduce((sum, val) => sum + val, 0)) * 100).toFixed(2)}%)`,
    ]),
  ];

  const options = {
    is3D: true,
    pieSliceText: 'value-and-percentage', // Keep this for now, can be changed to 'none' if desired
    colors: ['#FF9900', '#3366CC', '#990099', '#109618', '#DC3912', '#AAAAAA'],
    fontName: 'Sarabun',
    legend: {
      position: 'right',
      alignment: 'center',
      textStyle: {
        fontSize: 14,
        fontName: 'Sarabun',
      },
    },
    tooltip: {
      trigger: 'focus',
      textStyle: {
        fontName: 'Sarabun',
      },
    },
    chartArea: {
      left: 0,
      top: 0,
      width: '75%',
      height: '100%',
      backgroundColor: 'transparent',
    },
    backgroundColor: 'transparent',
    title: '',
    titleTextStyle: {
      fontName: 'Sarabun',
    },
  };

  return (
    <Chart
      chartType="PieChart"
      data={data}
      options={options}
      width="100%"
      height="100%"
      legendToggle
    />
  );
};

export default DemographicsPieChart;