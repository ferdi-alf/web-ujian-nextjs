/* eslint-disable @next/next/no-img-element */
"use client";

import { ButtonSignOut } from "./button";

// import Image from "next/image";

const Navbar = () => {
  return (
    <nav className="bg-white/30 backdrop-blur-lg fixed top-0 w-full z-20 border-gray-200 border-b shadow-md">
      <div className="w-full flex flex-wrap items-center justify-between mx-auto p-4">
        <a
          href="https://flowbite.com/"
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img
            src="https://www.dbl.id/uploads/school/20139/679-SMK_NEGERI_4_PALEMBANG.png"
            className="h-8"
            alt="SMKN 4 Palembang Logo"
          />
          <span className="self-center text-lg font-light sm:text-xl whitespace-nowrap">
            SMKN 4 Palembang
          </span>
        </a>
        <ButtonSignOut />
      </div>
    </nav>
  );
};

export default Navbar;
