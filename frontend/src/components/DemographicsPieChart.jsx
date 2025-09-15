import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // Import the plugin

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels); // Register the plugin

const DemographicsPieChart = ({ demographics }) => {
  const labels = Object.keys(demographics);
  const dataValues = Object.values(demographics);

  // Define a more appealing color palette
  const backgroundColors = [
    'rgba(255, 159, 64, 0.8)',  // Orange
    'rgba(54, 162, 235, 0.8)',  // Blue
    'rgba(153, 102, 255, 0.8)', // Purple
    'rgba(75, 192, 192, 0.8)',  // Green
    'rgba(255, 99, 132, 0.8)',  // Red
    'rgba(255, 206, 86, 0.8)',  // Yellow
  ];
  const borderColors = [
    'rgba(255, 159, 64, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(255, 206, 86, 1)',
  ];

  const total = dataValues.reduce((sum, value) => sum + value, 0);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'จำนวนผู้ลงทะเบียน',
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2, // Thicker border
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 14, // Larger legend font
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              label += `${value} คน (${percentage}%)`;
            }
            return label;
          }
        }
      },
      datalabels: { // Configure datalabels plugin
        color: '#fff', // White color for labels
        formatter: (value, context) => {
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return percentage > 0 ? `${percentage}%` : ''; // Only show percentage if greater than 0
        },
        font: {
          weight: 'bold',
          size: 14,
        },
        textShadowBlur: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
      },
    },
  };

  return <Pie data={data} options={options} />;
};

export default DemographicsPieChart;