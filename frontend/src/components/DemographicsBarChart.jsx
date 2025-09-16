
import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

const Bar = ({ position, size, color, data, onPointerOver, onPointerOut }) => {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (ref.current) {
      ref.current.scale.y = THREE.MathUtils.lerp(
        ref.current.scale.y,
        hovered ? 1.2 : 1,
        0.1
      );
    }
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onPointerOver(data);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onPointerOut();
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

const DemographicsBarChart = ({ demographics }) => {
  const [tooltip, setTooltip] = useState(null);

  const data = useMemo(() => {
    return Object.entries(demographics)
      .map(([key, value]) => ({
        label: key,
        value: value,
      }))
      .filter((item) => item.value > 0);
  }, [demographics]);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((d) => d.value), 0);
  }, [data]);

  const colors = useMemo(() => {
    const colorPalette = [
      "#4e79a7",
      "#f28e2c",
      "#e15759",
      "#76b7b2",
      "#59a14f",
      "#edc949",
      "#af7aa1",
      "#ff9da7",
      "#9c755f",
      "#bab0ab",
    ];
    return data.map((_, index) => colorPalette[index % colorPalette.length]);
  }, [data]);

  const handlePointerOver = (data) => {
    setTooltip(data);
  };

  const handlePointerOut = () => {
    setTooltip(null);
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        ไม่มีข้อมูลสำหรับแสดงผล
      </div>
    );
  }

  const barWidth = 0.8;
  const barDepth = 0.5;
  const gap = 0.2;

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [2, 2, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <group>
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * 3; // Scale height
            const xPos = index * (barWidth + gap) - (data.length * (barWidth + gap)) / 2;
            return (
              <group key={item.label}>
                <Bar
                  position={[xPos, barHeight / 2, 0]}
                  size={[barWidth, barHeight, barDepth]}
                  color={colors[index]}
                  data={item}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
                <Text
                  position={[xPos, -0.2, 0]}
                  fontSize={0.2}
                  color="black"
                  anchorX="center"
                  anchorY="middle"
                  rotation={[-Math.PI / 4, 0, 0]}
                  background // Enable background
                  backgroundColor="white" // Set background color to white
                  backgroundOpacity={1} // Make background fully opaque
                  padding={0.05} // Add some padding around the text
                >
                  {item.label}
                </Text>
              </group>
            );
          })}
        </group>

        <OrbitControls />
      </Canvas>
      {tooltip && (
        <div
          className="absolute p-2 bg-gray-800 text-white rounded-md text-sm"
          style={{
            top: "10px",
            left: "10px",
            pointerEvents: "none",
          }}
        >
          {tooltip.label}: {tooltip.value}
        </div>
      )}
    </div>
  );
};

export default DemographicsBarChart;
