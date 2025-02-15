import { useEffect, useState } from "react";
import { ButtonSignOut } from "@/components/button";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
const NavAvatar = () => {
  const [user, setUser] = useState<{
    username: string;
    role: string;
    image: string;
  } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch("/api/user");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const { data } = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    fetchUserData();
  }, []);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah klik pada avatar menutup dropdown
    setDropdownOpen(!dropdownOpen);
  };

  //   const closeDropdown = () => {
  //     setDropdownOpen(false);
  //   };

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    const handleOutsideClick = () => {
      setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [dropdownOpen]);

  if (!user) {
    return null; // Tampilkan kosong saat data belum ada
  }

  return (
    <div className="relative inline-block">
      {/* Avatar Button */}
      <img
        id="avatarButton"
        onClick={toggleDropdown}
        className="w-10 h-10 rounded-full cursor-pointer"
        src={
          user.image
            ? user.image
            : user.role === "PROKTOR"
            ? "/avatar.png"
            : "https://github.com/shadcn.png"
        }
        alt={`${user.username}'s avatar`}
      />

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          id="userDropdown"
          className="absolute right-0 mt-2 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 border border-slate-400"
          onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam dropdown menutupnya
        >
          <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
            <div>{user.username}</div>
            <div className="font-medium truncate">{user.role}</div>
          </div>
          <ul
            className="py-2 text-sm text-gray-700 dark:text-gray-200"
            aria-labelledby="avatarButton"
          >
            <li>
              <Link
                href="/profile"
                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Profile
              </Link>
            </li>
          </ul>
          <div className="py-1 hover:bg-slate-100">
            {/* <SignOut /> */}
            <ButtonSignOut />
          </div>
        </div>
      )}
    </div>
  );
};

export default NavAvatar;
