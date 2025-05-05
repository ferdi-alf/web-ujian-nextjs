"use client";
import "./globals.css";
import Navbar from "@/components/navbar";
import { usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

const disabledNavbar = ["/dashboard"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={`antialiased relative overflow-x-hidden bg-slate-100`}>
        {!disabledNavbar.includes(pathname) && (
          <>
            <Navbar />
            <Toaster position="top-right" />

            <div className="fixed et object-cover z-0 bottom-0 w-full h-[150px] ">
              <div className="waves">
                <div className="wave" id="wave1"></div>
                <div className="wave" id="wave2"></div>
                <div className="wave" id="wave3"></div>
              </div>
            </div>
          </>
        )}

        <main className="flex relative h-screen overflow-y-auto w-full flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
