import { z } from 'zod';

// ──────────────────────────────────────────────
// Auth / User Schemas
// ──────────────────────────────────────────────

export const LoginBodySchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const CreateUserBodySchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(100),
  roleId: z.number().int().positive(),
  pinHash: z.string().optional(),
});
export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;

export const CreateRoleBodySchema = z.object({
  name: z.string().min(2).max(50),
  permissions: z.array(z.string()).min(1, 'Role must have at least one permission'),
});
export type CreateRoleBody = z.infer<typeof CreateRoleBodySchema>;

// ──────────────────────────────────────────────
// Pagination
// ──────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ──────────────────────────────────────────────
// Permissions (all permissions the app supports)
// ──────────────────────────────────────────────

export const ALL_PERMISSIONS = [
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',
  'products:read',
  'products:write',
  'inventory:read',
  'inventory:write',
  'sales:create',
  'sales:void',
  'reports:read',
  'settings:write',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const PermissionSchema = z.enum(ALL_PERMISSIONS);

// ──────────────────────────────────────────────
// Catalog Schemas
// ──────────────────────────────────────────────

export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.number().int().positive().optional(),
  profile: z.enum(['clothing', 'cosmetic', 'perfume', 'custom']).default('custom'),
});
export type CreateCategoryBody = z.infer<typeof CreateCategoryBodySchema>;

export const CreateBrandBodySchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateBrandBody = z.infer<typeof CreateBrandBodySchema>;

export const CreateProductBodySchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().optional(),
  gender: z.enum(['men', 'women', 'unisex']).default('unisex'),
  description: z.string().max(2000).optional(),
  hasExpiry: z.boolean().default(false),
  returnRule: z.enum(['allowed', 'not_if_opened', 'never']).default('allowed'),
  customFields: z.record(z.unknown()).optional(),
});
export type CreateProductBody = z.infer<typeof CreateProductBodySchema>;

export const CreateVariantBodySchema = z.object({
  productId: z.number().int().positive(),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  // Prices come in as major units (rupees), converted to minor (paisa) before DB save
  costPrice: z.number().positive(),
  salePrice: z.number().positive(),
  reorderLevel: z.number().int().min(0).default(0),
  isTester: z.boolean().default(false),
  customFields: z.record(z.unknown()).optional(),
});
export type CreateVariantBody = z.infer<typeof CreateVariantBodySchema>;

export const UpdateVariantPriceBodySchema = z.object({
  costPrice: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  reorderLevel: z.number().int().min(0).optional(),
});
export type UpdateVariantPriceBody = z.infer<typeof UpdateVariantPriceBodySchema>;

// ──────────────────────────────────────────────
// Sales / POS Schemas
// ──────────────────────────────────────────────

export const SaleItemInputSchema = z.object({
  variantId: z.number().int().positive(),
  quantity:  z.number().int().positive(),
  // Optional per-item discount in major units (Rs)
  discount:  z.number().min(0).default(0),
});
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;

export const SalePaymentInputSchema = z.object({
  method:    z.enum(['cash', 'card', 'bank', 'credit']),
  amount:    z.number().positive(),   // major units (Rs)
  reference: z.string().max(100).optional(),
});
export type SalePaymentInput = z.infer<typeof SalePaymentInputSchema>;

export const CreateSaleBodySchema = z.object({
  customerId:    z.number().int().positive().optional(),
  items:         z.array(SaleItemInputSchema).min(1, 'Sale must have at least one item'),
  payments:      z.array(SalePaymentInputSchema).min(1, 'Sale must have at least one payment'),
  // Optional sale-level discount in major units (Rs)
  discount:      z.number().min(0).default(0),
}).refine(
  (data) => data.items.length > 0,
  { message: 'At least one item is required' }
);
export type CreateSaleBody = z.infer<typeof CreateSaleBodySchema>;

export const VoidSaleBodySchema = z.object({
  reason: z.string().min(5, 'Please provide a reason for voiding this sale'),
});
export type VoidSaleBody = z.infer<typeof VoidSaleBodySchema>;

export const CreateCustomerBodySchema = z.object({
  name:           z.string().min(2).max(100),
  phone:          z.string().max(20).optional(),
  address:        z.string().max(500).optional(),
  creditLimit:    z.number().min(0).default(0),  // major units (Rs)
  openingBalance: z.number().min(0).default(0),  // major units (Rs)
});
export type CreateCustomerBody = z.infer<typeof CreateCustomerBodySchema>;
