"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ShieldCheck, Cpu, GitBranch } from "lucide-react";

const cards = [
  {
    icon: ShieldCheck,
    title: "Evidence-Only Constraint",
    desc: "Every generated claim is traced to a source in your profile graph. If evidence is missing, the output is marked [NEEDS USER INPUT] — never invented.",
    gradient: "from-pmfit-blue to-pmfit-purple",
  },
  {
    icon: Cpu,
    title: "Policy Engine",
    desc: "A hard-coded decision layer sits before every external action. BLOCK, ESCALATE, RESTRICT, or ALLOW — your approval is always required before submission.",
    gradient: "from-pmfit-purple to-pmfit-teal",
  },
  {
    icon: GitBranch,
    title: "Immutable Audit Trail",
    desc: "Every state transition, LLM call, and policy decision is append-only. Nothing is overwritten. Full provenance from evidence to application.",
    gradient: "from-pmfit-teal to-pmfit-blue",
  },
];

export function DarkFeatureSection() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 px-6 bg-pmfit-navy overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          ref={ref}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-[38px] font-bold text-white">
            Built on trust,{" "}
            <span className="bg-gradient-to-r from-pmfit-blue-light to-pmfit-teal bg-clip-text text-transparent">
              not hope.
            </span>
          </h2>
          <p className="text-[17px] text-white/50 mt-3 max-w-lg mx-auto">
            PMFit enforces the same standards you would hold yourself to — at every step.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 overflow-hidden group"
              >
                {/* Gradient accent top line */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-[14px] text-white/50 leading-relaxed">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
