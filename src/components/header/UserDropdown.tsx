"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Dropdown } from "../ui/dropdown/Dropdown";

// Generate a deterministic accent color from a string
function stringToColor(str: string): string {
  const colors = [
    "#00e59e", "#60a5fa", "#a78bfa", "#f472b6",
    "#34d399", "#fb923c", "#38bdf8", "#e879f9",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "A").toUpperCase();
}

function getDisplayName(email: string, fullName?: string): string {
  if (fullName && fullName.trim()) return fullName.trim();
  // Use email prefix before @
  return email.split("@")[0];
}

export default function UserDropdown() {
  const { user, role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const email = user?.email ?? "";
  const displayName = getDisplayName(email, user?.fullName);
  const initials = getInitials(displayName || email);
  // Role-specific avatar color: green for superadmin, gray for admin.
  const avatarColor =
    role === "superadmin" ? "#00e59e" : role === "admin" ? "#6b7280" : stringToColor(email || "admin");

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleSignOut() {
    closeDropdown();
    await logout();
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
        aria-label="User menu"
      >
        {/* Initials avatar */}
        <span
          className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold flex-shrink-0"
          style={{
            background: avatarColor,
            color: role === "superadmin" ? "#1a1a18" : "#ffffff",
          }}
        >
          {initials}
        </span>

        <span className="hidden sm:block text-sm font-medium text-gray-200 max-w-[120px] truncate">
          {displayName}
        </span>

        <svg
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 18 20"
          fill="none"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2 w-[240px] flex flex-col rounded-xl border-white/[0.07] bg-[#2a2a27] p-3 shadow-2xl z-50"
      >
        {/* User info */}
        <div className="px-1 pb-3 mb-2 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold flex-shrink-0"
              style={{
                background: avatarColor,
                color: role === "superadmin" ? "#1a1a18" : "#ffffff",
              }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{email}</p>
            </div>
          </div>
          {role && (
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  role === "superadmin"
                    ? "bg-[#00e59e]/20 text-[#00e59e]"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {role === "superadmin" ? "Superadmin" : "Admin"}
              </span>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          onClick={closeDropdown}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 4.5C7.85786 4.5 4.5 7.85786 4.5 12C4.5 16.1421 7.85786 19.5 12 19.5C16.1421 19.5 19.5 16.1421 19.5 12C19.5 7.85786 16.1421 4.5 12 4.5ZM3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12ZM12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5ZM10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12Z"
              fill="currentColor"
            />
          </svg>
          Settings
        </Link>

        {/* Admin Accounts (Superadmin only) */}
        {role === "superadmin" && (
          <Link
            href="/dashboard/admin-accounts"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            onClick={closeDropdown}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 4.5C10.067 4.5 8.5 6.067 8.5 8C8.5 9.933 10.067 11.5 12 11.5C13.933 11.5 15.5 9.933 15.5 8C15.5 6.067 13.933 4.5 12 4.5ZM7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8C17 10.7614 14.7614 13 12 13C9.23858 13 7 10.7614 7 8ZM5.25 21V19C5.25 16.6528 7.15279 14.75 9.5 14.75H14.5C16.8472 14.75 18.75 16.6528 18.75 19V21H20.25V19C20.25 15.8244 17.6756 13.25 14.5 13.25H9.5C6.32436 13.25 3.75 15.8244 3.75 19V21H5.25Z"
                fill="currentColor"
              />
            </svg>
            Admin Accounts
          </Link>
        )}

        {/* Divider */}
        <div className="h-px bg-white/[0.07] my-1 mx-1" />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
              fill="currentColor"
            />
          </svg>
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
