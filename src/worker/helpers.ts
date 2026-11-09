// Shared response helpers — keep HTTP responses consistent across all handlers

/** Security headers applied to every API response */
const SECURITY_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: SECURITY_HEADERS,
  });
}

export function errorResponse(message: string, status = 400): Response {
  // Deliberately vague internal error messages — do not leak SQL or stack traces
  return jsonResponse({ error: message }, status);
}

/** Safely parse JSON body with size guard (100 KB max) */
export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 102_400) return null;

  try {
    const text = await request.text();
    if (text.length > 102_400) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Extract and validate a numeric route parameter */
export function extractId(pathParts: string[]): number | null {
  const raw = pathParts[pathParts.length - 1];
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0 || !Number.isFinite(id)) return null;
  return id;
}

/** Trim and validate a string field */
export function validateString(
  value: unknown,
  field: string,
  maxLength: number
): { value: string } | { error: string } {
  if (typeof value !== 'string') return { error: `${field} must be a string` };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { error: `${field} cannot be empty` };
  if (trimmed.length > maxLength) {
    return { error: `${field} must be at most ${maxLength} characters` };
  }
  return { value: trimmed };
}
