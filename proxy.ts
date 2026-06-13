import { NextRequest, NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options":        "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy":        "strict-origin-when-cross-origin",
  "Permissions-Policy":     "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isApiRoute  = pathname.startsWith("/api/");
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isMutating  = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  // CSRF: double-submit cookie validation
  if (isMutating && isApiRoute && !isAuthRoute) {
    const cookieToken = req.cookies.get("csrf-token")?.value;
    const headerToken = req.headers.get("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 },
      );
    }
  }

  const res = NextResponse.next();

  // Security headers
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(name, value);
  }

  // Set CSRF cookie once per browser session
  if (!req.cookies.has("csrf-token")) {
    res.cookies.set("csrf-token", crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "strict",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   60 * 60 * 24,
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
