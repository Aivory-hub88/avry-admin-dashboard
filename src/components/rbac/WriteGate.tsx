"use client";
import React from "react";
import { useAuth } from "@/hooks/useAuth";

interface WriteGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function WriteGate({ children, fallback = null }: WriteGateProps) {
  const { role } = useAuth();
  if (role === "superadmin") return <>{children}</>;
  return <>{fallback}</>;
}
