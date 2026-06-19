"use client";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { useUnreadReports } from "@/hooks/useUnreadReports";
import { useSidebar } from "@/context/SidebarContext";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useTokenRefresh();
  const { count: unreadReports } = useUnreadReports();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const showExpanded = isExpanded || isHovered || isMobileOpen;
  const sidebarWidth = showExpanded ? 240 : 64;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#353531" }}>
      <AppSidebar unreadReports={unreadReports} />

      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <AppHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {children}
        </main>
      </div>

      <Backdrop />
    </div>
  );
}
