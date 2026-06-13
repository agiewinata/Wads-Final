/**
 * Input sanitization applied at every API boundary before data is stored.
 * React's default JSX escaping provides a second layer at render time.
 *
 * Strips:
 *  - <script> blocks (and their content)
 *  - all remaining HTML/XML tags
 *  - javascript: and data: URI schemes
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .trim();
}

/** Sanitize nullable string fields; returns null when the result is empty. */
export function sanitizeOptional(input: string | null | undefined): string | null {
  if (input == null) return null;
  const out = sanitizeText(input);
  return out || null;
}
