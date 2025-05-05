"use client";

import {
  BookOpenCheck,
  ChartCandlestick,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  Clock,
  Home,
  LibraryBig,
  NotebookPen,
  NotebookText,
  School,
  University,
  User,
  UserCheck,
  UserCog,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Biodata Sekolah",
    url: "/biodata-sekolah",
    icon: University,
  },
  {
    title: "Kelas",
    url: "/kelas",
    icon: School,
  },
  {
    title: "Jadwal Ujian",
    url: "/jadwal-ujian",
    icon: Clock,
  },
  {
    title: "Users",
    url: "/users",
    icon: UserCog,
  },
  {
    title: "Siswa",
    url: "#",
    icon: UsersRound,
    subItems: [
      { title: "Tambah Siswa", url: "/tambah-siswa", icon: UserRoundPlus },
      { title: "Data Siswa", url: "/data-siswa", icon: User },
      { title: "Kehadiran Siswa", url: "/kehadiran-siswa", icon: UserCheck },
    ],
  },
  {
    title: "Bank Soal",
    url: "#",
    icon: LibraryBig,
    subItems: [
      // Menambahkan sub-item untuk "Siswa"
      { title: "Tambah Soal", url: "/tambah-soal", icon: NotebookPen },
      { title: "Data Soal", url: "/data-soal", icon: NotebookText },
    ],
  },
  {
    title: "Ujian",
    url: "/daftar-ujian",
    icon: BookOpenCheck,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartColumn,
  },
  {
    title: "Hasil",
    url: "/hasil",
    icon: ChartCandlestick,
  },
];

const SideItems = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    Siswa: false,
    BankSoal: false,
  });

  const handleNavigation = (url: string) => {
    router.push(url);
  };

  const handleDropdownClick = (title: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };
  return (
    <>
      <div className="mt-5">
        <p className="font-semibold text-slate-400">Platform</p>
        <div className="flex flex-col gap-y-1">
          {items.map((item) => (
            <div key={item.title}>
              {item.subItems ? (
                <>
                  <div
                    className="p-2 "
                    onClick={() => handleDropdownClick(item.title)} // Menggunakan fungsi umum
                  >
                    <div className="flex justify-between">
                      <div className="flex gap-x-3">
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                      {openDropdowns[item.title] ? (
                        <ChevronDown className="text-gray-400" />
                      ) : (
                        <ChevronRight className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  {/* Dropdown untuk sub-item */}
                  {openDropdowns[item.title] && (
                    <div className="pl-6 mt-2  ">
                      {item.subItems.map((subItem) => (
                        <div
                          key={subItem.title}
                          className={`p-2 border-l rounded-sm hover:bg-slate-50 ${
                            pathname === subItem.url ? "bg-slate-100" : ""
                          }`}
                          onClick={() => handleNavigation(subItem.url)}
                        >
                          <Link href={subItem.url} className="flex gap-x-3">
                            <subItem.icon />
                            <span>{subItem.title}</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`p-2 rounded-sm hover:bg-slate-50 ${
                    pathname === item.url ? "bg-slate-100" : ""
                  }`}
                  onClick={() => handleNavigation(item.url)}
                >
                  <Link href={item.url} className="flex gap-x-3">
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SideItems;
