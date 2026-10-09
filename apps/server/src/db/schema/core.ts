import { sqliteTable, text, integer, customType } from 'drizzle-orm/sqlite-core';
import { getBaseColumns } from './_base';

const json = customType<{ data: any }>({
  dataType() {
    return 'text';
  },
  toDriver(val) {
    return JSON.stringify(val);
  },
  fromDriver(value) {
    return JSON.parse(value as string);
  },
});

export const roles = sqliteTable('roles', {
  ...getBaseColumns(),
  name: text('name').notNull().unique(),
  permissions: json('permissions').notNull(), // JSON list of permission keys
});

export const users = sqliteTable('users', {
  ...getBaseColumns(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  pinHash: text('pin_hash'),
  roleId: integer('role_id').notNull().references(() => roles.id),
  fullName: text('full_name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: integer('entity_id'),
  oldValue: json('old_value'),
  newValue: json('new_value'),
  at: text('at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // Stored as text, usually parsed as JSON if complex
});
