// components/sidebar-content.tsx
"use client";

import { useSidebar } from "@/components/providers/sidebar-provider";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function SidebarContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && sidebarRef.current) {
        const clickedElement = event.target as Node;
        if (!sidebarRef.current.contains(clickedElement)) {
          toggleSidebar();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen, toggleSidebar]);

  return (
    <aside
      id="logo-sidebar"
      className={`fixed md:relative top-0 left-0 z-40 md:w-auto w-full  h-screen md:pt-0  transition-transform bg-black/30 border-r border-gray-200  ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
      aria-label="Sidebar"
    >
      <div
        ref={sidebarRef}
        className="w-64  overflow-auto p-2 h-screen bg-white"
      >
        <div className="w-full md:hidden flex justify-end">
          <X onClick={() => toggleSidebar()} />
        </div>
        {children}
      </div>
    </aside>
  );
}
