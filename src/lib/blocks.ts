import { prisma } from "@/lib/db";

/**
 * Returns a list of all user IDs that have blocked `userId` OR have been blocked by `userId`.
 * Essential for strict isolation across searches, matches, feeds, and direct chats.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const blocks = await prisma.userBlock.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.blockerId === userId) {
      ids.add(b.blockedId);
    } else {
      ids.add(b.blockerId);
    }
  }

  return Array.from(ids);
}

/**
 * Checks whether any block relationship exists between user A and user B.
 */
export async function isBlockedBetween(userIdA: string, userIdB: string): Promise<boolean> {
  if (!userIdA || !userIdB || userIdA === userIdB) return false;

  const count = await prisma.userBlock.count({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  });

  return count > 0;
}
