"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import {
  GridIcon,
  UserCircleIcon,
  BoxCubeIcon,
  ListIcon,
  PlugInIcon,
  TableIcon,
  PageIcon,
  GroupIcon,
  PieChartIcon,
  DocsIcon,
  TaskIcon,
  ServerIcon,
  EyeIcon,
} from "@/icons";

const allNavItems = [
  { name: "Overview", path: "/dashboard", icon: <GridIcon />, superadminOnly: false },
  { name: "Users & Credits", path: "/dashboard/users", icon: <UserCircleIcon />, superadminOnly: false },
  { name: "Agent Activity", path: "/dashboard/agents", icon: <BoxCubeIcon />, superadminOnly: false },
  { name: "Agent Management", path: "/dashboard/agent-management", icon: <BoxCubeIcon />, superadminOnly: false },
  { name: "Workflow Runs", path: "/dashboard/workflows", icon: <ListIcon />, superadminOnly: false },
  { name: "Deep Diagnostics", path: "/dashboard/diagnostics", icon: <PieChartIcon />, superadminOnly: false },
  { name: "Blueprints", path: "/dashboard/blueprints", icon: <DocsIcon />, superadminOnly: false },
  { name: "Blog", path: "/dashboard/blog", icon: <PageIcon />, superadminOnly: false },
  { name: "Roadmap", path: "/dashboard/roadmap", icon: <TaskIcon />, superadminOnly: false },
  { name: "Integrations", path: "/dashboard/integrations", icon: <PlugInIcon />, superadminOnly: false },
  { name: "Automation Templates", path: "/dashboard/templates", icon: <BoxCubeIcon />, superadminOnly: false },
  { name: "Careers", path: "/dashboard/careers", icon: <GroupIcon />, superadminOnly: false },
  { name: "Visitor Tracker", path: "/dashboard/visitors", icon: <GridIcon />, superadminOnly: false },
  { name: "Execution Logs", path: "/dashboard/logs", icon: <TableIcon />, superadminOnly: false },
  { name: "Impersonation History", path: "/dashboard/impersonation-history", icon: <EyeIcon />, superadminOnly: true },
  { name: "VPS Monitoring", path: "/dashboard/vps-monitoring", icon: <ServerIcon />, superadminOnly: false },
  { name: "Admin Accounts", path: "/dashboard/admin-accounts", icon: <GroupIcon />, superadminOnly: true },
  { name: "Settings", path: "/dashboard/settings", icon: <PageIcon />, superadminOnly: false },
];

interface AppSidebarProps {
  unreadReports?: number;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ unreadReports = 0 }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { role } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path));
  const showExpanded = isExpanded || isHovered || isMobileOpen;

  const navItems = allNavItems.filter(
    (item) => !item.superadminOnly || role === "superadmin"
  );

  return (
    <aside
      style={{
        width: showExpanded ? "240px" : "64px",
        minWidth: showExpanded ? "240px" : "64px",
        flexShrink: 0,
      }}
      className={`fixed top-0 left-0 flex flex-col bg-[#2a2a27] border-r border-white/[0.07] text-gray-100 h-screen transition-all duration-300 ease-in-out z-50
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center border-b border-white/[0.07] px-4 flex-shrink-0 ${
          !showExpanded ? "justify-center" : "justify-start"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          {showExpanded ? (
            <Image src="/admin/aivory-logo.svg" alt="Aivory Admin" width={120} height={30} />
          ) : (
            <Image src="/admin/aivory-icon.svg" alt="Aivory" width={28} height={28} />
          )}
        </Link>
      </div>

      {/* Role badge */}
      {showExpanded && role && (
        <div className="px-4 pt-3 pb-1">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              role === "superadmin"
                ? "bg-[#00e59e]/20 text-[#00e59e]"
                : "bg-white/10 text-gray-300"
            }`}
          >
            {role === "superadmin" ? "Superadmin" : "Admin"}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1 px-2 py-3">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const showBadge =
            item.path === "/dashboard" && role === "superadmin" && unreadReports > 0;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={!showExpanded ? item.name : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-[#00e59e]/15 text-[#00e59e]"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }
                ${!showExpanded ? "justify-center" : ""}
              `}
            >
              <span className={`flex-shrink-0 ${active ? "text-[#00e59e]" : "text-gray-400"}`}>
                {item.icon}
              </span>
              {showExpanded && <span className="truncate">{item.name}</span>}
              {showBadge && showExpanded && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {unreadReports > 99 ? "99+" : unreadReports}
                </span>
              )}
              {showBadge && !showExpanded && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
