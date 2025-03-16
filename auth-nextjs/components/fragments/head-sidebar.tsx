"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const HeadSidebar = () => {
  const [user, setUser] = useState<{
    data: {
      id: string;
      username: string;
      role: string;
      image: string;
    };
  } | null>(null);

  const { data: userData, isLoading, error } = useSWR("/api/user", fetcher);
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  if (error) {
    return;
  }

  return (
    <div className="w-full flex items-center gap-x-3 border-b p-4">
      <Avatar>
        {isLoading ? (
          <div className="animate-pulse w-full rounded-full object-cover aspect-square bg-gray-200 "></div>
        ) : (
          <AvatarImage
            src={
              user?.data.image // Jika ada gambar di database
                ? user.data.image // Gunakan gambar dari database
                : user?.data.role === "PROKTOR" // Jika role adalah PROKTOR
                ? "/avatar.png" // Tampilkan avatar default
                : "/avatar-admin.jpg"
            } // Fallback lainnya}
          />
        )}

        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <p className="font-bold ">{user?.data.username}</p>
        <p className="text-slate-400">{user?.data.role}</p>
      </div>
    </div>
  );
};

export default HeadSidebar;
