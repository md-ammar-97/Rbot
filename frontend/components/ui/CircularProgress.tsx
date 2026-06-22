"use client";

import { PieChart, Pie, Cell } from "recharts";

interface CircularProgressProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 14,
  label,
  sublabel,
  color,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = color ?? (clamped >= 80 ? "#20C997" : clamped >= 60 ? "#0052CC" : clamped >= 40 ? "#FF8C00" : "#E63946");
  const data = [
    { value: clamped },
    { value: 100 - clamped },
  ];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          cx={size / 2}
          cy={size / 2}
          innerRadius={size / 2 - strokeWidth - 4}
          outerRadius={size / 2 - 4}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        >
          <Cell fill={fill} />
          <Cell fill="#F3F4F6" />
        </Pie>
      </PieChart>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        {label !== undefined ? (
          <span className="font-bold text-pmfit-text leading-none" style={{ fontSize: size * 0.18 }}>
            {label}
          </span>
        ) : (
          <span className="font-bold text-pmfit-text leading-none" style={{ fontSize: size * 0.2 }}>
            {clamped}%
          </span>
        )}
        {sublabel && (
          <span className="text-pmfit-text-secondary mt-1 leading-tight text-center" style={{ fontSize: size * 0.09 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
