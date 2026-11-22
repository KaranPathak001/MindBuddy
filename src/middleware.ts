import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in middleware.");
}
const key = new TextEncoder().encode(JWT_SECRET);

// Protected routes requiring authentication & authorization
const PROTECTED_PREFIXES = ["/expert", "/admin"];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  let isAuthenticated = false;
  let userPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key);
      isAuthenticated = true;
      userPayload = payload;
    } catch {
      isAuthenticated = false;
    }
  }

  // Handle protected page redirects
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (isAuthenticated && userPayload) {
    response.headers.set("x-is-authenticated", "true");
    response.headers.set("x-user-id", userPayload.userId || "");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
