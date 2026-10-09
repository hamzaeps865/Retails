import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './shop.db',
  },
} satisfies Config;
