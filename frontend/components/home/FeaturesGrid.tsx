"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";
import { GlowCard } from "@/components/ui/GlowCard";
import { FileSearch, Zap, PenLine, LayoutDashboard } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Resume Recovery Engine",
    desc: "Diagnoses 7 quality dimensions and rebuilds a master baseline grounded in what you actually built. No invented claims.",
    color: "#0052CC",
    glow: "rgba(0,82,204,0.12)",
    badge: "Step 1",
  },
  {
    icon: Zap,
    title: "Intelligent Job Discovery",
    desc: "Fresh PM roles from Greenhouse & Lever, scored against your profile every 4 hours. Fit Score + Evidence Confidence + Automation Eligibility.",
    color: "#6B5ACD",
    glow: "rgba(107,90,205,0.12)",
    badge: "Step 2",
  },
  {
    icon: PenLine,
    title: "Evidence-Gated Drafting",
    desc: "Tailored resumes and cover letters where every metric is traced to your profile. If evidence is missing, we tell you — not invent it.",
    color: "#20C997",
    glow: "rgba(32,201,151,0.12)",
    badge: "Step 3",
  },
  {
    icon: LayoutDashboard,
    title: "Application Tracker",
    desc: "Kanban pipeline from Discovered to Offer. Immutable event history. Optional auto-apply — always with your approval.",
    color: "#FF8C00",
    glow: "rgba(255,140,0,0.12)",
    badge: "Step 4",
  },
];

const containerV: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const cardV: Variants      = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export function FeaturesGrid() {
  const ref     = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="py-24 px-6 bg-pmfit-bg">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[13px] font-bold text-pmfit-blue tracking-widest uppercase mb-3">
            How PMFit works
          </p>
          <h2 className="text-[40px] font-bold text-pmfit-text">
            Quality over volume.
          </h2>
          <p className="text-[18px] text-pmfit-text-secondary mt-3 max-w-xl mx-auto">
            Most tools push you to apply to more jobs. PMFit asks a different question:{" "}
            <span className="font-semibold text-pmfit-text">how do we make each application count?</span>
          </p>
        </div>

        <motion.div
          ref={ref}
          variants={containerV}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={cardV}>
                <GlowCard className="p-7 h-full" glowColor={f.glow}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${f.color}18` }}
                    >
                      <Icon size={22} style={{ color: f.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${f.color}18`, color: f.color }}
                        >
                          {f.badge}
                        </span>
                      </div>
                      <h3 className="text-[18px] font-semibold text-pmfit-text mb-2">{f.title}</h3>
                      <p className="text-[14px] text-pmfit-text-secondary leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
