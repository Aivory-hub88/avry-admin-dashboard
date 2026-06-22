"use client";

import React from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const calculateStrength = (pwd: string): PasswordStrength => {
    if (!pwd) {
      return { score: 0, label: "", color: "bg-gray-200" };
    }

    let score = 0;

    // Length check
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;

    // Character variety
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    // Complexity bonus
    if (pwd.length >= 16 && score >= 4) score++;

    const strength = Math.min(score, 5);

    const strengths: PasswordStrength[] = [
      { score: 0, label: "Very Weak", color: "bg-red-500" },
      { score: 1, label: "Weak", color: "bg-orange-500" },
      { score: 2, label: "Fair", color: "bg-yellow-500" },
      { score: 3, label: "Good", color: "bg-green-400" },
      { score: 4, label: "Strong", color: "bg-green-600" },
      { score: 5, label: "Very Strong", color: "bg-green-700" },
    ];

    return strengths[strength];
  };

  const strength = calculateStrength(password);

  if (strength.score === 0 && password.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">Password Strength</span>
        <span
          className={`text-sm font-medium ${strength.score >= 3 ? "text-green-600" : "text-orange-600"}`}
        >
          {strength.label}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${strength.color}`}
          style={{ width: `${(strength.score / 5) * 100}%` }}
        />
      </div>
      {password.length > 0 && password.length < 8 && (
        <p className="mt-1 text-xs text-gray-500">
          Password must be at least 8 characters
        </p>
      )}
    </div>
  );
}