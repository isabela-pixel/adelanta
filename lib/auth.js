// Sesión simple con contraseña: la cookie guarda un hash de DASHBOARD_PASSWORD.
export const COOKIE = "isa_sesion";

export async function tokenEsperado() {
  const pass = process.env.DASHBOARD_PASSWORD || "";
  const data = new TextEncoder().encode(`isa-dashboard:${pass}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
