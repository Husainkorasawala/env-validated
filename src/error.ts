// ─── Secret Redaction ───────────────────────────────────────────────

const SENSITIVE_PATTERN = /_KEY$|_SECRET$|_TOKEN$|_PASSWORD$|_PASS$/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERN.test(key);
}

export function redactValue(key: string, value: string | undefined): string {
  if (value === undefined) return '(not set)';
  if (isSensitiveKey(key)) return '*****';
  return `"${value}"`;
}
