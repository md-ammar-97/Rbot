"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

interface Question {
  id:           string;
  dimension:    string;
  question:     string;
  answer_type:  string;
  required:     boolean;
  answered:     boolean;
  options?:     string[];
}

interface EvidenceGapCardProps {
  question:  Question;
  onAnswer?: (questionId: string) => void;
}

const DIMENSION_COLORS: Record<string, string> = {
  achievement_density:  "badge-red",
  completeness:         "badge-orange",
  clarity:              "badge-blue",
  role_relevance:       "badge-purple",
  extractability:       "badge-red",
  timeline_consistency: "badge-orange",
  evidence_availability:"badge-blue",
};

const DIMENSION_LABELS: Record<string, string> = {
  achievement_density:  "Achievement Density",
  completeness:         "Completeness",
  clarity:              "Clarity",
  role_relevance:       "Role Relevance",
  extractability:       "Extractability",
  timeline_consistency: "Timeline Consistency",
  evidence_availability:"Evidence Availability",
};

export function EvidenceGapCard({ question, onAnswer }: EvidenceGapCardProps) {
  const badgeClass = DIMENSION_COLORS[question.dimension] ?? "badge-gray";
  const dimLabel   = DIMENSION_LABELS[question.dimension] ?? question.dimension;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`card p-4 border-l-4 ${
        question.answered
          ? "border-pmfit-teal bg-pmfit-teal-subtle/30"
          : question.required
          ? "border-pmfit-red"
          : "border-pmfit-orange"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {question.answered ? (
            <CheckCircle2 size={18} className="text-pmfit-teal" />
          ) : question.required ? (
            <AlertCircle size={18} className="text-pmfit-red" />
          ) : (
            <HelpCircle size={18} className="text-pmfit-orange" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={badgeClass}>{dimLabel}</span>
            {question.required && !question.answered && (
              <span className="badge-red">Required</span>
            )}
          </div>
          <p className="text-[14px] text-pmfit-text leading-snug">{question.question}</p>
        </div>
      </div>

      {!question.answered && onAnswer && (
        <div className="mt-3 pl-7">
          <button
            onClick={() => onAnswer(question.id)}
            className="btn-primary text-[13px] h-8 px-4"
          >
            Answer
          </button>
        </div>
      )}
    </motion.div>
  );
}
