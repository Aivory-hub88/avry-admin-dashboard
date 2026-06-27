"use client";
import React, { useEffect, useState } from "react";
import { fetchMonitoringUsers, MonitoringUser } from "@/lib/monitoring";

interface UserSelectorProps {
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export function UserSelector({ selectedUserId, onUserChange }: UserSelectorProps) {
  const [users, setUsers] = useState<MonitoringUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchMonitoringUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="user-selector"
        className="text-sm font-medium"
        style={{ color: "#a3a3a0" }}
      >
        View:
      </label>
      <select
        id="user-selector"
        value={selectedUserId ?? "__global__"}
        onChange={(e) =>
          onUserChange(e.target.value === "__global__" ? null : e.target.value)
        }
        disabled={isLoading}
        className="rounded-lg border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[#b7cba6]/40 transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          color: "#f7f7f7",
          minWidth: 200,
        }}
      >
        <option value="__global__" style={{ background: "#2a2a27" }}>
          🌐 Global (All Users)
        </option>
        {users.map((user) => (
          <option key={user.userId} value={user.userId} style={{ background: "#2a2a27" }}>
            👤 {user.userId} ({user.tier})
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs" style={{ color: "#f5a623" }}>
          Could not load users
        </span>
      )}
    </div>
  );
}
