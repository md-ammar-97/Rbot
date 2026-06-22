"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { FeaturesGrid } from "@/components/home/FeaturesGrid";
import { DarkFeatureSection } from "@/components/home/DarkFeatureSection";
import { CTABanner } from "@/components/home/CTABanner";

export default function HomePage() {
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 60], ["rgba(245,247,255,0)", "rgba(245,247,255,0.9)"]);
  const navBlur = useTransform(scrollY, [0, 60], ["blur(0px)", "blur(16px)"]);

  return (
    <main className="min-h-screen bg-pmfit-bg">
      {/* Navbar */}
      <motion.nav
        style={{ backgroundColor: navBg, backdropFilter: navBlur }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-transparent transition-colors"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo variant="top" size="sm" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[14px] text-pmfit-text-secondary hover:text-pmfit-text font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link href="/login" className="btn-primary text-[14px] h-9 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Sections */}
      <div className="pt-14">
        <HeroSection />
        <StatsBar />
        <FeaturesGrid />
        <DarkFeatureSection />
        <CTABanner />
      </div>

      {/* Footer */}
      <footer className="bg-pmfit-navy border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="top" size="sm" dark />
          <div className="flex items-center gap-6 text-[13px] text-white/30">
            <span>© 2026 PMFit. Built for PM job seekers who value quality over volume.</span>
          </div>
          <div className="flex gap-4 text-[13px] text-white/40">
            <a href="#how-it-works" className="hover:text-white/70 transition-colors">How it works</a>
            <Link href="/login" className="hover:text-white/70 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
