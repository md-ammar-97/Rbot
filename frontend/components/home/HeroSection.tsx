"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 pb-20 overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #0052CC 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #6B5ACD 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,#F5F7FF)]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-pmfit-blue/10 border border-pmfit-blue/20 text-pmfit-blue text-[13px] font-semibold">
            <Sparkles size={13} />
            AI Job Co-Pilot for Product Managers
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-[52px] sm:text-[68px] font-bold leading-[1.08] tracking-tight text-pmfit-text mb-6"
        >
          Your PM job search,
          <br />
          <span className="gradient-text">finally intelligent.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={itemVariants}
          className="text-[19px] text-pmfit-text-secondary max-w-2xl mx-auto leading-relaxed mb-10"
        >
          PMFit recovers your resume, finds the right roles, scores your fit
          with evidence, and drafts tailored applications — grounded in what you
          actually built.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary text-[16px] h-12 px-8 shadow-glow hover:shadow-lg"
          >
            Get Started Free
            <ArrowRight size={17} />
          </Link>
          <a
            href="#how-it-works"
            className="btn-secondary text-[16px] h-12 px-8"
          >
            See how it works
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.p variants={itemVariants} className="mt-8 text-[13px] text-pmfit-text-muted">
          Evidence-based matching · No hallucinated claims · Your data, isolated by RLS
        </motion.p>
      </motion.div>

      {/* Floating UI preview cards */}
      <motion.div
        className="mt-16 w-full max-w-3xl mx-auto relative"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
      >
        <div className="relative rounded-2xl overflow-hidden border border-pmfit-border shadow-card-lg bg-white p-5">
          {/* Mock job cards strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { title: "Staff PM", company: "Stripe", score: 91, color: "#20C997" },
              { title: "Senior PM", company: "Figma", score: 78, color: "#0052CC" },
              { title: "Product Lead", company: "Linear", score: 65, color: "#FF8C00" },
            ].map((job) => (
              <div key={job.company} className="rounded-xl border border-pmfit-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-pmfit-bg flex items-center justify-center text-[11px] font-bold text-pmfit-blue">
                    {job.company[0]}
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: job.color }}>
                    {job.score} FIT
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-pmfit-text">{job.title}</p>
                <p className="text-[11px] text-pmfit-text-muted">{job.company}</p>
                <div className="h-1.5 rounded-full bg-pmfit-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: job.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${job.score}%` }}
                    transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
