import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "mindhaven_karan_secure_jwt_2026";
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, key);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Clone headers to pass authentication status if needed
  const response = NextResponse.next();
  if (isAuthenticated) {
    response.headers.set("x-is-authenticated", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
