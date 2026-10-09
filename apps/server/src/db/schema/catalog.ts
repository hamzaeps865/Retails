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

export const categories = sqliteTable('categories', {
  ...getBaseColumns(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  profile: text('profile').notNull().default('custom'), // clothing | cosmetic | perfume | custom
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const brands = sqliteTable('brands', {
  ...getBaseColumns(),
  name: text('name').notNull().unique(),
});

export const products = sqliteTable('products', {
  ...getBaseColumns(),
  name: text('name').notNull(),
  brandId: integer('brand_id').references(() => brands.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  gender: text('gender').notNull().default('unisex'), // men | women | unisex
  description: text('description'),
  hasExpiry: integer('has_expiry', { mode: 'boolean' }).notNull().default(false),
  returnRule: text('return_rule').notNull().default('allowed'), // allowed | not_if_opened | never
  imagePath: text('image_path'),
  customFields: json('custom_fields'),
});

export const productVariants = sqliteTable('product_variants', {
  ...getBaseColumns(),
  productId: integer('product_id').notNull().references(() => products.id),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').unique(),
  costPrice: integer('cost_price').notNull(), // minor units
  salePrice: integer('sale_price').notNull(), // minor units
  reorderLevel: integer('reorder_level').notNull().default(0),
  isTester: integer('is_tester', { mode: 'boolean' }).notNull().default(false),
  customFields: json('custom_fields'),
});

export const attributeDefinitions = sqliteTable('attribute_definitions', {
  ...getBaseColumns(),
  name: text('name').notNull(),
  inputType: text('input_type').notNull().default('text'), // text | number | select | color | date
  options: json('options'),
  isVariantAxis: integer('is_variant_axis', { mode: 'boolean' }).notNull().default(true),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const categoryAttributes = sqliteTable('category_attributes', {
  ...getBaseColumns(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  attributeId: integer('attribute_id').notNull().references(() => attributeDefinitions.id),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const variantAttributeValues = sqliteTable('variant_attribute_values', {
  ...getBaseColumns(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  attributeId: integer('attribute_id').notNull().references(() => attributeDefinitions.id),
  value: text('value').notNull(),
});
