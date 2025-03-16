"use server";

import { signOut } from "@/auth";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handleSignOut() {
  try {
    // Get the current user's session
    const session = await auth();

    // If there's a session and user ID, update the status to OFFLINE
    if (session && session.user?.id) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          status: "OFFLINE",
        },
      });
      console.log(`User ${session.user.id} status updated to OFFLINE`);
    }

    // Perform the signout
    await signOut({ redirectTo: "/" });
  } catch (error) {
    console.error("Error updating status during signout:", error);
    // Still attempt to sign out even if status update fails
    await signOut({ redirectTo: "/" });
  } finally {
    // Ensure prisma connection is closed
    await prisma.$disconnect();
  }
}
