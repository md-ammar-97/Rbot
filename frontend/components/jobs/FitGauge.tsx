"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface FitGaugeProps {
  score: number; // 0–100
  size?: number;
}

export function FitGauge({ score, size = 80 }: FitGaugeProps) {
  const color =
    score >= 75 ? "#20C997" :
    score >= 55 ? "#0052CC" :
    score >= 40 ? "#FF8C00" : "#E63946";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <RadialBarChart
        width={size}
        height={size}
        innerRadius={size * 0.35}
        outerRadius={size * 0.47}
        startAngle={90}
        endAngle={-270}
        data={[{ value: score, fill: color }]}
        barSize={size * 0.1}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={size * 0.05}
          background={{ fill: "#F3F4F6" }}
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-pmfit-text leading-none" style={{ fontSize: size * 0.22 }}>
          {score}
        </span>
        <span className="text-pmfit-text-muted font-semibold" style={{ fontSize: size * 0.11 }}>
          FIT
        </span>
      </div>
    </div>
  );
}
