"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Rocket } from "lucide-react";

export function CTABanner() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 px-6" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0052CC 0%, #1D7EFF 50%, #6B5ACD 100%)",
        }}
      >
        {/* Animated bg blobs */}
        <motion.div
          className="absolute top-[-40%] right-[-10%] w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 px-10 py-14 text-center">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-white/15 text-white text-[13px] font-semibold">
            <Rocket size={13} />
            Ready to activate your Co-Pilot?
          </div>
          <h2 className="text-[40px] font-bold text-white mb-4 leading-tight">
            Start with your resume.
            <br />
            <span className="text-white/80 text-[32px]">We&apos;ll take it from there.</span>
          </h2>
          <p className="text-[17px] text-white/70 mb-10 max-w-lg mx-auto">
            Upload in under a minute. PMFit tells you exactly what needs to improve
            and builds your baseline before you apply to a single job.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white text-pmfit-blue font-semibold text-[16px] rounded-xl hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Start Resume Recovery
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-white/15 text-white font-semibold text-[16px] rounded-xl hover:bg-white/25 transition-all border border-white/20 active:scale-[0.97]"
            >
              Sign in →
            </Link>
          </div>
          <p className="text-[13px] text-white/40 mt-6">
            Google OAuth · Evidence-gated · No auto-send without your approval
          </p>
        </div>
      </motion.div>
    </section>
  );
}
