import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt-ts";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("adminpass", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: hashedPassword,
      role: "SUPERADMIN",
    },
  });

  console.log("Admin created:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
