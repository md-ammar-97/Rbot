"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";
import { motion } from "framer-motion";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export function OTPInput({ length = 8, value, onChange, error, success, disabled }: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = value.padEnd(length, "").slice(0, length).split("");

  const focus = (i: number) => inputs.current[i]?.focus();

  const handleChange = (i: number, char: string) => {
    if (!/^[a-zA-Z0-9]*$/.test(char)) return;
    const arr = digits.slice();
    arr[i] = char.slice(-1);
    onChange(arr.join("").trimEnd());
    if (char && i < length - 1) focus(i + 1);
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[i]) {
        focus(i - 1);
      } else {
        const arr = digits.slice();
        arr[i] = "";
        onChange(arr.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft") {
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\s/g, "").slice(0, length);
    onChange(pasted);
    focus(Math.min(pasted.length, length - 1));
  };

  const boxColor = (i: number) => {
    if (error)   return "#E63946";
    if (success && digits[i]) return "#20C997";
    if (digits[i]) return "#0052CC";
    return "#E5E7EB";
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={digits[i] === " " ? "" : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={i === 0}
          autoComplete="off"
          className="w-10 h-12 rounded-xl text-center text-[18px] font-bold font-mono text-pmfit-text border-2 bg-white outline-none transition-colors disabled:opacity-50"
          style={{ borderColor: boxColor(i) }}
          animate={
            error
              ? { x: [-4, 4, -4, 4, 0] }
              : success && digits[i]
              ? { scale: [1, 1.1, 1] }
              : {}
          }
          transition={{ duration: 0.35 }}
          whileFocus={{ scale: 1.08, borderColor: "#0052CC" }}
        />
      ))}
    </div>
  );
}
