import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { getBaseColumns } from './_base';
import { productVariants } from './catalog';

export const stockLevels = sqliteTable('stock_levels', {
  ...getBaseColumns(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id).unique(),
  quantity: integer('quantity').notNull().default(0), // cached, updated only inside transactions
});

export const batches = sqliteTable('batches', {
  ...getBaseColumns(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  batchNo: text('batch_no').notNull(),
  expiryDate: text('expiry_date'),
  quantityRemaining: integer('quantity_remaining').notNull().default(0),
  purchaseItemId: integer('purchase_item_id'), // We'll link this in the purchases schema
});

export const stockMovements = sqliteTable('stock_movements', {
  ...getBaseColumns(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  batchId: integer('batch_id').references(() => batches.id),
  type: text('type').notNull(), // opening | purchase | sale | return_in | return_out | adjust | damage | transfer
  quantity: integer('quantity').notNull(), // +/-
  unitCost: integer('unit_cost'), // minor units
  refType: text('ref_type'), // sale, purchase, adjust
  refId: integer('ref_id'),
  note: text('note'),
});
