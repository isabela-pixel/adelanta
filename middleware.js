import { NextResponse } from "next/server";
import { COOKIE, tokenEsperado } from "./lib/auth";

export async function middleware(req) {
  const ok = req.cookies.get(COOKIE)?.value === (await tokenEsperado());
  if (ok && process.env.DASHBOARD_PASSWORD) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Todo requiere sesión menos el login, el endpoint de recordatorios (usa su propia clave) y los estáticos.
  matcher: ["/((?!login|api/login|api/remind|_next|favicon|manifest|icon).*)"],
};
