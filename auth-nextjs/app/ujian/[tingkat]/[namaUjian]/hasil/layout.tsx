import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const Layout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status: "SELESAI_UJIAN",
      },
    });
  }
  return <>{children}</>;
};

export default Layout;
