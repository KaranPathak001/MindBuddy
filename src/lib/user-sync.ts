import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateDbUser() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? `${user.id}@example.com`;
  const name = user.firstName 
    ? `${user.firstName} ${user.lastName || ""}`.trim() 
    : "Anonymous User";

  try {
    return await prisma.user.upsert({
      where: { id: user.id },
      update: {}, // Don't overwrite existing local profile info unnecessarily
      create: {
        id: user.id,
        email,
        name,
        passwordHash: "managed-by-clerk", 
        isAnonymous: !user.emailAddresses.length,
      },
    });
  } catch (e) {
    console.error("DB Sync Error:", e);
    // If Prisma is down or missing migration, fail gracefully
    return null;
  }
}
