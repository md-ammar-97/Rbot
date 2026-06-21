import { clsx } from "clsx";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function FitScoreBadge({ score, size = "md" }: Props) {
  const color =
    score >= 75 ? "text-apple-success bg-apple-success-subtle border-apple-success/20"
    : score >= 55 ? "text-apple-warning bg-apple-warning-subtle border-apple-warning/20"
    : "text-apple-destructive bg-apple-destructive-subtle border-apple-destructive/20";

  const sizeClass =
    size === "sm" ? "text-[12px] px-2 py-0.5 font-semibold"
    : size === "lg" ? "text-[22px] px-4 py-2 font-bold"
    : "text-[14px] px-3 py-1 font-semibold";

  return (
    <span
      className={clsx(
        "rounded-lg border inline-flex items-center gap-1",
        color,
        sizeClass
      )}
      aria-label={`Fit Score: ${score} out of 100`}
    >
      {score}
      <span className="font-normal opacity-70">/ 100</span>
    </span>
  );
}
