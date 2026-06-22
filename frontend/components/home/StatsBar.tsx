"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const stats = [
  { label: "PM roles tracked daily",    target: 2400, suffix: "+" },
  { label: "Avg fit score improvement", target: 34,   suffix: "%" },
  { label: "Minutes to first baseline", target: 8,    suffix: "min" },
];

export function StatsBar() {
  return (
    <section className="py-14 px-6 bg-pmfit-navy">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[40px] font-bold text-white">
              <AnimatedCounter target={s.target} suffix={s.suffix} />
            </p>
            <p className="text-[14px] text-white/50 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
