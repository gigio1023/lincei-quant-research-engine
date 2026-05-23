import { createHash } from 'crypto';

export function hashObject(payload: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

export function hashString(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
