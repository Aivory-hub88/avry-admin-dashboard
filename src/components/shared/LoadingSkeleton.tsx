import React from "react";

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export default function LoadingSkeleton({ rows = 5, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-[#2a2a27] overflow-hidden ${className}`}>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
