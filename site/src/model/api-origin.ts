const DEFAULT_API_PORT = "8787";

function loopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "[::1]") return true;

  const octets = normalized.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) &&
    Number(octets[0]) === 127
  );
}

/**
 * Validate and canonicalize the origin used by server-side development code.
 * Plain HTTP is deliberately limited to the loopback interface.
 */
export function normalizeApiOrigin(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new TypeError("MINICMS_API_URL must be an absolute HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(
      "MINICMS_API_URL must be an HTTP(S) origin without credentials, path, query, or hash."
    );
  }

  if (url.protocol === "http:" && !loopbackHostname(url.hostname)) {
    throw new TypeError(
      "MINICMS_API_URL must use HTTPS unless it points to localhost or a loopback IP address."
    );
  }

  return url.origin;
}

export function getDevelopmentApiOrigin(
  configuredUrl: string | undefined,
  port: string | undefined
): string {
  const value = configuredUrl?.trim()
    ? configuredUrl.trim()
    : `http://127.0.0.1:${port?.trim() || DEFAULT_API_PORT}`;

  return normalizeApiOrigin(value);
}
