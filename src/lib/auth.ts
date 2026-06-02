// Shared-password gate. A single APP_PASSWORD env var protects the whole
// app. When it is unset the gate disables itself (e.g. local dev with no
// password configured), so the app behaves exactly as it did before.

export const AUTH_COOKIE = 'todayo_auth';

// Opaque cookie value derived from the password, so the plaintext never
// lands in a cookie. The same input yields the same token in both the
// login route and the proxy, so a constant-equality check authenticates.
// Uses Web Crypto, which exists in both the Node and Edge runtimes.
export async function tokenFor(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`todayo:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// The token a valid cookie must match, or null when no password is set
// (gate disabled).
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return tokenFor(password);
}
