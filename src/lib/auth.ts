import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "healtech_karan_secure_jwt_2026";
const key = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = "token";

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await compare(password, hash);
}

export async function signToken(payload: { userId: string; email: string }): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.userId || typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: (payload.email as string) || "",
    };
  } catch {
    return null;
  }
}

export async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAnonymous: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Auth User Error:", error);
    return null;
  }
}
