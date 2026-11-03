// Server-only: signs and verifies short-lived admin session tokens (HMAC-SHA256).
const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret) throw new Error("Admin session secret missing");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signAdminToken(): Promise<string> {
  const exp = String(Date.now() + 1000 * 60 * 60 * 12);
  return `${exp}.${await hmac(exp)}`;
}

export async function assertAdmin(token: unknown): Promise<void> {
  if (typeof token !== "string") throw new Error("Unauthorized");
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) throw new Error("Unauthorized");
  const expected = await hmac(exp);
  if (expected.length !== sig.length) throw new Error("Unauthorized");
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) throw new Error("Unauthorized");
}
