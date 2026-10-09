import { integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const getBaseColumns = () => ({
  id: integer('id').primaryKey({ autoIncrement: true }),
  uuid: text('uuid').notNull().unique().$defaultFn(() => randomUUID()),
  branchId: integer('branch_id').notNull().default(1),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  createdBy: integer('created_by'),
});
