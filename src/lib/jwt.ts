// src/lib/jwt.ts
type JwtPayload = { exp?: number; [k: string]: unknown };

function base64UrlToJson(b64Url: string) {
  const b64 = b64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(b64 + pad);
  return JSON.parse(raw) as JwtPayload;
}

export function getJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return base64UrlToJson(parts[1]);
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, leewaySeconds = 30): boolean {
  const payload = getJwtPayload(token);
  const exp = payload?.exp;
  if (!exp) return false;
  const now = Date.now() / 1000;
  return now >= exp - leewaySeconds;
}
