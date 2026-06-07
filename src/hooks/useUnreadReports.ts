"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

interface UseUnreadReportsResult {
  count: number;
}

export function useUnreadReports(): UseUnreadReportsResult {
  const { role } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (role !== "superadmin") {
      setCount(0);
      return;
    }

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/admin/reports?unread=true");
        if (res.ok) {
          const data = await res.json();
          setCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    // Fetch immediately on mount
    fetchUnreadCount();

    // Then poll every 30 seconds
    intervalRef.current = setInterval(fetchUnreadCount, 30_000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [role]);

  return { count };
}
