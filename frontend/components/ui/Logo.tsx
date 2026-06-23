"use client";

import Image from "next/image";
import Link from "next/link";

type LogoVariant = "top" | "icon" | "black";

interface LogoProps {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg";
  href?: string;
  dark?: boolean; // true = on dark background (sidebar)
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, height: 22, text: "text-[16px]" },
  md: { icon: 40, height: 32, text: "text-[20px]" },
  lg: { icon: 48, height: 40, text: "text-[24px]" },
};

export function Logo({ variant = "top", size = "md", href = "/", dark = false, className = "" }: LogoProps) {
  const s = sizeMap[size];

  // On dark backgrounds the PNG (white bg) is wrapped in a white rounded chip
  // so the actual logo artwork is visible — no CSS filter tricks needed.
  const iconClass = dark
    ? "rounded-lg bg-white p-[3px]"
    : "rounded-lg mix-blend-multiply";

  const content = variant === "icon" ? (
    <Image
      src="/logo-icon.png"
      alt="PMFit"
      width={s.icon}
      height={s.icon}
      className={iconClass}
      priority
    />
  ) : variant === "black" ? (
    <Image
      src="/logo-black.png"
      alt="PMFit"
      width={120}
      height={s.height}
      className="mix-blend-multiply"
      priority
    />
  ) : (
    // top variant: icon chip + wordmark
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo-icon.png"
        alt="PMFit"
        width={s.icon}
        height={s.icon}
        className={iconClass}
        priority
      />
      <span
        className={`font-extrabold tracking-tight leading-none ${s.text} ${
          dark ? "text-white" : "text-pmfit-text"
        }`}
      >
        PM<span className={dark ? "text-pmfit-blue-light" : "text-pmfit-blue"}>Fit</span>
      </span>
    </div>
  );

  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      {content}
    </Link>
  );
}
