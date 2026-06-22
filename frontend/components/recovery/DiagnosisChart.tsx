"use client";

import { PieChart, Pie, Cell } from "recharts";

interface DiagnosisChartProps {
  score: number; // 0–100
}

const LABELS: Record<string, string> = {
  extractability:       "Extractability",
  completeness:         "Completeness",
  clarity:              "Clarity",
  achievement_density:  "Achievement Density",
  role_relevance:       "Role Relevance",
  timeline_consistency: "Timeline Consistency",
  evidence_availability:"Evidence Availability",
};

export function DiagnosisDonut({ score }: DiagnosisChartProps) {
  const color = score >= 80 ? "#20C997" : score >= 60 ? "#0052CC" : score >= 40 ? "#FF8C00" : "#E63946";
  const data  = [{ value: score }, { value: 100 - score }];

  return (
    <div className="relative inline-flex items-center justify-center">
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          innerRadius={68}
          outerRadius={88}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
          isAnimationActive
          animationDuration={1000}
          animationEasing="ease-out"
        >
          <Cell fill={color} />
          <Cell fill="#F3F4F6" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[34px] font-bold text-pmfit-text leading-none">{Math.round(score)}%</span>
        <span className="text-[12px] text-pmfit-text-secondary mt-1 max-w-[100px] leading-tight">
          Your Completeness
        </span>
      </div>
    </div>
  );
}

interface DimensionBarsProps {
  dimensions: Record<string, { score: number; threshold: number; passed: boolean; note: string | null }>;
}

export function DimensionBars({ dimensions }: DimensionBarsProps) {
  return (
    <div className="space-y-3">
      {Object.entries(dimensions).map(([key, dim]) => {
        const pct   = Math.round(dim.score * 100);
        const color = dim.passed
          ? "#20C997"
          : dim.score >= dim.threshold * 0.8
          ? "#FF8C00"
          : "#E63946";

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-pmfit-text">
                {LABELS[key] ?? key}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold" style={{ color }}>
                  {pct}%
                </span>
                {dim.passed ? (
                  <span className="badge-teal">✓</span>
                ) : (
                  <span className="badge-red">!</span>
                )}
              </div>
            </div>
            <div className="h-2 bg-pmfit-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            {dim.note && (
              <p className="text-[11px] text-pmfit-text-muted mt-0.5">{dim.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
