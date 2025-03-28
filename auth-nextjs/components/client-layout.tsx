// app/dashboard/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "@/components/sidebar";
import NavbarDashboard from "@/components/navbar-dashboard";
import { SidebarProvider } from "@/components/providers/sidebar-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Website Ulangan SMKN 4 Palembang",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} antialiased relative overflow-x-hidden bg-white`}
    >
      <SidebarProvider>
        <div className="flex">
          <div className="relative w-auto">
            <Sidebar />
          </div>
          <div className="flex relative w-full flex-col">
            <NavbarDashboard />
            <main>{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
