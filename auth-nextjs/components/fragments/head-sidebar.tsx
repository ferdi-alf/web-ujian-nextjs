import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HeadSidebar = async () => {
  const session = await auth();
  return (
    <div className="w-full flex items-center gap-x-3 border-b p-4">
      <Avatar>
        <AvatarImage
          src={
            session?.user?.image // Jika ada gambar di database
              ? session.user.image // Gunakan gambar dari database
              : session?.user?.role === "PROKTOR" // Jika role adalah PROKTOR
              ? "/avatar.png" // Tampilkan avatar default
              : "https://github.com/shadcn.png" // Fallback lainnya
          }
        />

        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <p className="font-bold ">{session?.user?.username}</p>
        <p className="text-slate-400">{session?.user?.role}</p>
      </div>
    </div>
  );
};

export default HeadSidebar;
