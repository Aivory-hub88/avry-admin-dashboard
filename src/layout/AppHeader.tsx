"use client";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header
      className="sticky top-0 z-40 flex items-center w-full h-16 px-6 border-b border-white/[0.07] flex-shrink-0"
      style={{ background: "#2e2e2b" }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={handleToggle}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors mr-4"
        aria-label="Toggle Sidebar"
      >
        {isMobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 1C0 0.447715 0.447715 0 1 0H17C17.5523 0 18 0.447715 18 1C18 1.55228 17.5523 2 17 2H1C0.447715 2 0 1.55228 0 1ZM0 13C0 12.4477 0.447715 12 1 12H17C17.5523 12 18 12.4477 18 13C18 13.5523 17.5523 14 17 14H1C0.447715 14 0 13.5523 0 13ZM1 6C0.447715 6 0 6.44772 0 7C0 7.55228 0.447715 8 1 8H9C9.55228 8 10 7.55228 10 7C10 6.44772 9.55228 6 9 6H1Z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>

      {/* Mobile logo */}
      <Link href="/dashboard" className="lg:hidden mr-auto">
        <Image width={110} height={28} src="/admin/aivory-logo.svg" alt="Aivory Admin" />
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side — user dropdown only */}
      <UserDropdown />
    </header>
  );
};

export default AppHeader;
