/** Stable sha256 prefixes for artifact and idempotency fingerprints across V1 ledgers. */
import { createHash } from 'crypto';

export function hashObject(payload: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

export function hashString(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
