"use client";

import {
  BookOpenCheck,
  ChartCandlestick,
  ChartColumn,
  Home,
  LibraryBig,
  NotebookPen,
  NotebookText,
  School,
  User,
  UserCog,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Kelas",
    url: "/kelas",
    icon: School,
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
      // Menambahkan sub-item untuk "Siswa"
      { title: "Tambah Siswa", url: "/tambah-siswa", icon: UserRoundPlus },
      { title: "Data Siswa", url: "/data-siswa", icon: User },
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
    url: "/Analytics",
    icon: ChartColumn,
  },
  {
    title: "Nilai",
    url: "/nilai",
    icon: ChartCandlestick,
  },
];

const SideItems = () => {
  const pathname = usePathname();
  //   const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
  //     Siswa: false,
  //     BankSoal: false,
  //   });

  //   const handleDropdownClick = (title: string) => {
  //     setOpenDropdowns((prev) => ({
  //       ...prev,
  //       [title]: !prev[title],
  //     }));
  //   };
  return (
    <div className="mt-5">
      <p className="font-semibold text-slate-400">Platform</p>
      <div className="flex flex-col gap-y-1">
        {items.map((item) => (
          <div key={item.title}>
            {item.subItems ? (
              <>
                <div
                  className="p-2 "
                  // onClick={() => handleDropdownClick(item.title)} // Menggunakan fungsi umum
                >
                  <div className="flex justify-between">
                    <div className="flex gap-x-3">
                      <item.icon />
                      <span className="font-semibold">{item.title}</span>
                    </div>
                    {/* {openDropdowns[item.title] ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )} */}
                  </div>
                </div>
                {/* Dropdown untuk sub-item */}
                {/* {openDropdowns[item.title] && ( */}
                <div className="pl-6 mt-2">
                  {item.subItems.map((subItem) => (
                    <div
                      key={subItem.title}
                      className={`p-2 rounded-sm hover:bg-slate-50 ${
                        pathname === subItem.url ? "bg-slate-100" : ""
                      }`}
                    >
                      <Link href={subItem.url} className="flex gap-x-3">
                        <subItem.icon />
                        <span>{subItem.title}</span>
                      </Link>
                    </div>
                  ))}
                </div>
                {/* )} */}
              </>
            ) : (
              <div
                className={`p-2 rounded-sm hover:bg-slate-50 ${
                  pathname === item.url ? "bg-slate-100" : ""
                }`}
              >
                <Link href={item.url} className="flex gap-x-3">
                  <item.icon />
                  <span className="font-semibold">{item.title}</span>
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideItems;
