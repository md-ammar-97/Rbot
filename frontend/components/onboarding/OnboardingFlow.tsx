"use client";

import { useState } from "react";
import ResumeUploadStep from "./steps/ResumeUploadStep";
import LinkedInStep    from "./steps/LinkedInStep";
import GitHubStep      from "./steps/GitHubStep";
import RecoveryStep    from "./steps/RecoveryStep";
import { Logo } from "@/components/ui/Logo";

type Step = "resume" | "linkedin" | "github" | "recovery";

const STEPS: Step[] = ["resume", "linkedin", "github", "recovery"];

const STEP_LABELS: Record<Step, string> = {
  resume:   "Upload Resume",
  linkedin: "LinkedIn Export",
  github:   "GitHub Projects",
  recovery: "Resume Quality",
};

interface Props {
  user:           { id: string; email: string; name?: string };
  recoveryStatus: string;
}

export default function OnboardingFlow({ user, recoveryStatus }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>("resume");
  const [completed,   setCompleted]   = useState<Set<Step>>(new Set());
  const stepIndex = STEPS.indexOf(currentStep);

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
    }
  };

  const complete = (step: Step) => {
    setCompleted((prev) => new Set(prev).add(step));
    next();
  };

  return (
    <div className="min-h-screen bg-pmfit-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[600px]">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-3">
            <Logo variant="top" />
          </div>
          <p className="text-[15px] text-pmfit-text-secondary">
            {user.name ? `Let's set up your profile, ${user.name.split(" ")[0]}.` : "Let's set up your profile."}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((step, i) => {
            const isDone    = completed.has(step);
            const isCurrent = i === stepIndex;

            return (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors ${
                    isDone
                      ? "bg-pmfit-teal text-white"
                      : isCurrent
                      ? "bg-pmfit-blue text-white"
                      : "bg-pmfit-border text-pmfit-text-muted"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[13px] font-medium hidden sm:block ${
                    isCurrent ? "text-pmfit-text" : "text-pmfit-text-muted"
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-[2px] ${isDone ? "bg-pmfit-teal" : "bg-pmfit-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="card p-8">
          {currentStep === "resume"   && (
            <ResumeUploadStep userId={user.id} onNext={next} onComplete={() => complete("resume")} />
          )}
          {currentStep === "linkedin" && (
            <LinkedInStep userId={user.id} onNext={next} onComplete={() => complete("linkedin")} />
          )}
          {currentStep === "github"   && (
            <GitHubStep userId={user.id} onNext={next} onComplete={() => complete("github")} />
          )}
          {currentStep === "recovery" && (
            <RecoveryStep userId={user.id} recoveryStatus={recoveryStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
