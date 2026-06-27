"use client";
import React from "react";

export interface ScreeningQuestion {
  question: string;
  required: boolean;
  type: "text" | "select" | "boolean";
}

interface ScreeningQuestionBuilderProps {
  questions: ScreeningQuestion[];
  onChange: (questions: ScreeningQuestion[]) => void;
}

const QUESTION_TYPES: { value: ScreeningQuestion["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Yes/No" },
];

export default function ScreeningQuestionBuilder({
  questions,
  onChange,
}: ScreeningQuestionBuilderProps) {
  const addQuestion = () => {
    onChange([...questions, { question: "", required: false, type: "text" }]);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: keyof ScreeningQuestion,
    value: string | boolean
  ) => {
    const updated = questions.map((q, i) =>
      i === index ? { ...q, [field]: value } : q
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Screening Questions
        </label>
        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#b7cba6] ring-1 ring-inset ring-[#b7cba6]/30 hover:bg-[#b7cba6]/10 transition"
        >
          <span className="text-base leading-none">+</span> Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-gray-500">
          No custom screening questions. Click &quot;Add Question&quot; to create
          one.
        </p>
      )}

      <div className="space-y-3">
        {questions.map((q, index) => (
          <div
            key={index}
            className="rounded-lg border border-white/[0.07] bg-[#1f1f1c] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(index, "question", e.target.value)
                  }
                  placeholder="Enter your question..."
                  className="w-full rounded-lg border border-white/[0.12] bg-transparent px-3 py-2 text-sm text-white/90 placeholder:text-gray-500 focus:border-[#b7cba6]/50 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/20"
                  aria-label={`Question ${index + 1} text`}
                />
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(index)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition"
                title="Remove question"
                aria-label={`Remove question ${index + 1}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Type selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Type:</span>
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(
                      index,
                      "type",
                      e.target.value as ScreeningQuestion["type"]
                    )
                  }
                  className="rounded-md border border-white/[0.12] bg-[#2a2a27] px-2.5 py-1 text-xs text-white/90 focus:border-[#b7cba6]/50 focus:outline-none focus:ring-1 focus:ring-[#b7cba6]/20"
                  aria-label={`Question ${index + 1} type`}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    updateQuestion(index, "required", e.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-white/[0.2] bg-transparent text-[#b7cba6] focus:ring-[#b7cba6]/20 focus:ring-offset-0"
                  aria-label={`Question ${index + 1} required`}
                />
                <span className="text-xs text-gray-400">Required</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
