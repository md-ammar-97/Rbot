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
  sm: { icon: 24, height: 20 },
  md: { icon: 32, height: 28 },
  lg: { icon: 40, height: 34 },
};

export function Logo({ variant = "top", size = "md", href = "/", dark = false, className = "" }: LogoProps) {
  const s = sizeMap[size];

  const content = variant === "icon" ? (
    <Image
      src="/logo-icon.png"
      alt="PMFit"
      width={s.icon}
      height={s.icon}
      className={`rounded-lg ${dark ? "" : "mix-blend-multiply"}`}
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
    // top variant: icon + text, handled inline so we can color text for dark bg
    <div className="flex items-center gap-2">
      <Image
        src="/logo-icon.png"
        alt="PMFit"
        width={s.icon}
        height={s.icon}
        className={`rounded-lg ${dark ? "brightness-0 invert" : "mix-blend-multiply"}`}
        priority
      />
      <span
        className={`font-bold tracking-tight leading-none ${
          size === "sm" ? "text-[16px]" : size === "lg" ? "text-[22px]" : "text-[18px]"
        } ${dark ? "text-white" : "text-pmfit-text"}`}
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
