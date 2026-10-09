import { sqliteTable, text, integer, customType } from 'drizzle-orm/sqlite-core';
import { getBaseColumns } from './_base';
import { users } from './core';
import { productVariants } from './catalog';
import { batches } from './inventory';

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

export const customers = sqliteTable('customers', {
  ...getBaseColumns(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  creditLimit: integer('credit_limit').notNull().default(0), // minor units
  openingBalance: integer('opening_balance').notNull().default(0), // minor units
  customFields: json('custom_fields'),
});

export const sales = sqliteTable('sales', {
  ...getBaseColumns(),
  invoiceNo: text('invoice_no').notNull().unique(), // unique, sequential
  customerId: integer('customer_id').references(() => customers.id),
  cashierId: integer('cashier_id').notNull().references(() => users.id),
  subtotal: integer('subtotal').notNull(), // minor units
  discount: integer('discount').notNull().default(0), // minor units
  tax: integer('tax').notNull().default(0), // minor units
  total: integer('total').notNull(), // minor units
  paid: integer('paid').notNull(), // minor units
  change: integer('change').notNull().default(0), // minor units
  status: text('status').notNull().default('completed'), // completed | voided
  voidedBy: integer('voided_by').references(() => users.id),
  voidReason: text('void_reason'),
  customFields: json('custom_fields'),
});

export const saleItems = sqliteTable('sale_items', {
  ...getBaseColumns(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  batchId: integer('batch_id').references(() => batches.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // minor units
  unitCost: integer('unit_cost').notNull(), // minor units
  discount: integer('discount').notNull().default(0), // minor units
  lineTotal: integer('line_total').notNull(), // minor units
});

export const salePayments = sqliteTable('sale_payments', {
  ...getBaseColumns(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  method: text('method').notNull(), // cash | card | bank | credit
  amount: integer('amount').notNull(), // minor units
  reference: text('reference'),
});
