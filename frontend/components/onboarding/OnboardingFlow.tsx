"use client";

import { useState } from "react";
import ResumeUploadStep from "./steps/ResumeUploadStep";
import LinkedInStep    from "./steps/LinkedInStep";
import GitHubStep      from "./steps/GitHubStep";
import RecoveryStep    from "./steps/RecoveryStep";

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
  const stepIndex = STEPS.indexOf(currentStep);

  const next = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
    }
  };

  return (
    <div className="min-h-screen bg-apple-surface flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[600px]">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[22px] font-bold text-apple-text mb-1">RBot</p>
          <p className="text-[15px] text-apple-text-secondary">
            {user.name ? `Let's set up your profile, ${user.name.split(" ")[0]}.` : "Let's set up your profile."}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors ${
                  i < stepIndex
                    ? "bg-apple-success text-white"
                    : i === stepIndex
                    ? "bg-apple-accent text-white"
                    : "bg-apple-border text-apple-text-tertiary"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <span
                className={`text-[13px] font-medium hidden sm:block ${
                  i === stepIndex ? "text-apple-text" : "text-apple-text-tertiary"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-[2px] ${i < stepIndex ? "bg-apple-success" : "bg-apple-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="card p-8">
          {currentStep === "resume"   && <ResumeUploadStep userId={user.id} onNext={next} />}
          {currentStep === "linkedin" && <LinkedInStep     userId={user.id} onNext={next} />}
          {currentStep === "github"   && <GitHubStep       userId={user.id} onNext={next} />}
          {currentStep === "recovery" && <RecoveryStep     userId={user.id} recoveryStatus={recoveryStatus} />}
        </div>
      </div>
    </div>
  );
}
