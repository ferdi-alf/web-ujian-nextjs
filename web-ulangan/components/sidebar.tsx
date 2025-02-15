// components/sidebar.tsx
import HeadSidebar from "./fragments/head-sidebar";
import { SidebarContent } from "@/components/fragments/sidebar-content";
import SideItems from "./fragments/side-items";

const Sidebar = async () => {
  return (
    <SidebarContent>
      <HeadSidebar />
      <SideItems />
    </SidebarContent>
  );
};

export default Sidebar;
