// components/sidebar-content.tsx
"use client";

import { useSidebar } from "@/components/providers/sidebar-provider";

export function SidebarContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();

  return (
    <aside
      id="logo-sidebar"
      className={`fixed p-2 md:relative top-0 left-0 z-40 w-64 h-screen md:pt-0 pt-20 transition-transform bg-white border-r border-gray-200  ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
      aria-label="Sidebar"
    >
      {children}
    </aside>
  );
}
