import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login", "/signup", "/"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((r) => path.startsWith(r));
  const isPublic = publicRoutes.includes(path);

  // Better Auth session cookie (cookiePrefix "auth" → "auth.session_token")
  const sessionCookie =
    req.cookies.get("auth.session_token")?.value ??
    req.cookies.get("better-auth.session_token")?.value;

  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublic && sessionCookie && path !== "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};