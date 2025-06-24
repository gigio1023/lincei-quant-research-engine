import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';

// Load real environment variables for manual tests
dotenv.config({ path: '.env' });

// Polyfill crypto for Node.js test environment
if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      const buffer = randomBytes(arr.length);
      arr.set(buffer);
      return arr;
    },
    randomUUID: () => {
      return randomBytes(16).toString('hex');
    },
    subtle: {} as any,
  } as any;
}

// Set test environment
process.env.NODE_ENV = 'test';

// Use test database to avoid affecting production
process.env.DATABASE_PATH = 'data/test-manual.db';

// DO NOT MOCK LLM SERVICE FOR MANUAL TESTS
// We want to test real API calls

console.log('🔧 Manual test setup loaded');
console.log('🔑 Using real API keys from .env');
console.log('💾 Using test database: data/test-manual.db');
